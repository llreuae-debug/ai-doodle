#!/usr/bin/env node
/**
 * Builds the clipart library from scripts/library/items/*.mjs (all original artwork):
 *
 *   public/library/<cat>/<id>.json          { id, cat, name, tags, strokes, fills, source: "original" }
 *   public/library/<cat>/<id>.svg           line thumbnail
 *   public/library/<cat>/<id>.color.svg     colour thumbnail
 *   public/library/manifest.json            [{ id, cat, name, tags, file, thumb, thumbColor }]
 *   assets/library/_review/<cat>.png        contact sheet: line row over colour row
 *
 * Every item is validated first and nothing is written if any item fails:
 *   - 8–60 strokes in drawing order, 2–10 fills
 *   - path data uses absolute commands only (M L C Q A Z) and every subpath starts with M
 *   - total stroke length 600–9000 (measured by Chrome's SVG engine)
 *   - strokes and fills stay within 15–185 of the 200×200 viewBox
 *
 *   node scripts/library/build-library.mjs [--no-sheets]
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ITEMS = path.join(ROOT, 'scripts/library/items');
const OUT = path.join(ROOT, 'public/library');
const REVIEW = path.join(ROOT, 'assets/library/_review');

/** Category order in the manifest and the panel. */
export const CATEGORIES = ['characters', 'faces', 'business', 'realestate', 'education', 'faith', 'tech', 'health', 'food', 'nature', 'transport', 'shapes'];
const LIMITS = { strokes: [8, 60], fills: [2, 10], length: [600, 9000], bounds: [15, 185] };
const INK = '#1B1B1B';
const LINE_WIDTH = 3.4;

const items = [];
for (const file of readdirSync(ITEMS).filter((f) => f.endsWith('.mjs')).sort()) {
  const mod = await import(pathToFileURL(path.join(ITEMS, file)).href);
  items.push(...mod.default);
}

// ---------- static checks ----------

const problems = [];
const fail = (it, msg) => problems.push(`${it.id ?? '?'}: ${msg}`);
const ids = new Set();

/** Absolute M L C Q A Z only; the first command and every command after Z is M. */
function checkPath(d) {
  if (/[^MLCQAZ0-9.,\s-]/.test(d)) return `uses commands other than absolute M L C Q A Z: ${d.slice(0, 40)}`;
  const cmds = d.match(/[MLCQAZ]/g) ?? [];
  if (cmds[0] !== 'M') return 'does not start with M';
  for (let i = 1; i < cmds.length; i++) if (cmds[i - 1] === 'Z' && cmds[i] !== 'M') return 'a subpath after Z does not start with M';
  return null;
}

for (const it of items) {
  if (!it.id || ids.has(it.id)) fail(it, 'missing or duplicate id');
  ids.add(it.id);
  if (!CATEGORIES.includes(it.cat)) fail(it, `unknown category ${it.cat}`);
  if (!it.name || !Array.isArray(it.tags) || it.tags.length === 0) fail(it, 'needs a name and tags');
  const [smin, smax] = LIMITS.strokes;
  const [fmin, fmax] = LIMITS.fills;
  if (it.strokes.length < smin || it.strokes.length > smax) fail(it, `${it.strokes.length} strokes (want ${smin}–${smax})`);
  if (it.fills.length < fmin || it.fills.length > fmax) fail(it, `${it.fills.length} fills (want ${fmin}–${fmax})`);
  for (const d of [...it.strokes, ...it.fills.map((f) => f.d)]) {
    const err = checkPath(d);
    if (err) fail(it, err);
  }
  for (const f of it.fills) if (!/^#[0-9A-Fa-f]{6}$/.test(f.c)) fail(it, `fill colour ${f.c} is not #RRGGBB`);
}

// ---------- measured checks (Chrome) ----------

const escAttr = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function svgOf(it, color) {
  const fills = color ? it.fills.map((f) => `<path d="${escAttr(f.d)}" fill="${f.c}"/>`).join('') : '';
  const strokes = it.strokes.map((d) => `<path d="${escAttr(d)}"/>`).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${fills}` +
    `<g fill="none" stroke="${INK}" stroke-width="${LINE_WIDTH}" stroke-linecap="round" stroke-linejoin="round">${strokes}</g></svg>\n`
  );
}

/** In the page: total stroke length and the extent of every stroke and fill, sampled along the path. */
function measure(list) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  document.body.append(svg);
  const p = document.createElementNS(ns, 'path');
  svg.append(p);
  const extent = (d) => {
    p.setAttribute('d', d);
    const len = p.getTotalLength();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const steps = Math.max(8, Math.ceil(len / 2));
    for (let i = 0; i <= steps; i++) {
      const q = p.getPointAtLength((len * i) / steps);
      x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y);
    }
    return { len, box: [x0, y0, x1, y1] };
  };
  return list.map((it) => {
    let length = 0;
    const box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [i, d] of [...it.strokes, ...it.fills.map((f) => f.d)].entries()) {
      const m = extent(d);
      if (i < it.strokes.length) length += m.len;
      box[0] = Math.min(box[0], m.box[0]); box[1] = Math.min(box[1], m.box[1]);
      box[2] = Math.max(box[2], m.box[2]); box[3] = Math.max(box[3], m.box[3]);
    }
    return { id: it.id, length: Math.round(length), box: box.map((v) => Math.round(v * 10) / 10) };
  });
}

/** In the page: one contact sheet, line versions on top, colour versions below, names under each. */
async function sheet({ title, cells }) {
  const cell = 180, cols = Math.min(cells.length, 8), rows = Math.ceil(cells.length / cols);
  const c = new OffscreenCanvas(cols * cell, rows * (cell * 2 + 26) + 40);
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#111';
  g.font = '600 20px sans-serif';
  g.fillText(title, 10, 27);
  for (const [i, { name, line, color }] of cells.entries()) {
    const x = (i % cols) * cell, y = 40 + Math.floor(i / cols) * (cell * 2 + 26);
    for (const [k, svg] of [line, color].entries()) {
      const img = new Image(cell, cell);
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await img.decode();
      g.strokeStyle = '#e4e4e4';
      g.strokeRect(x + 0.5, y + k * cell + 0.5, cell - 1, cell - 1);
      g.drawImage(img, x, y + k * cell, cell, cell);
    }
    g.fillStyle = '#333';
    g.font = '13px sans-serif';
    g.fillText(name.length > 24 ? `${name.slice(0, 23)}…` : name, x + 6, y + cell * 2 + 17);
  }
  const blob = await c.convertToBlob({ type: 'image/png' });
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(blob);
  });
}

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await page.setContent('<!doctype html><title>library</title><body></body>');
const measured = new Map((await page.evaluate(measure, items)).map((m) => [m.id, m]));
const [bmin, bmax] = LIMITS.bounds;
const [lmin, lmax] = LIMITS.length;
for (const it of items) {
  const m = measured.get(it.id);
  if (m.length < lmin || m.length > lmax) fail(it, `stroke length ${m.length} (want ${lmin}–${lmax})`);
  if (m.box[0] < bmin || m.box[1] < bmin || m.box[2] > bmax || m.box[3] > bmax) fail(it, `extends to [${m.box}] (want within ${bmin}–${bmax})`);
}

if (problems.length) {
  await browser.close();
  console.error(`${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

// ---------- write ----------

// Replace only what this script owns (category folders and the manifest); LICENSES.md stays.
for (const cat of CATEGORIES) rmSync(path.join(OUT, cat), { recursive: true, force: true });
mkdirSync(REVIEW, { recursive: true });
const manifest = [];
const ordered = [...items].sort((a, b) => CATEGORIES.indexOf(a.cat) - CATEGORIES.indexOf(b.cat));
for (const it of ordered) {
  const dir = path.join(OUT, it.cat);
  mkdirSync(dir, { recursive: true });
  const doc = { id: it.id, cat: it.cat, name: it.name, tags: it.tags, strokes: it.strokes, fills: it.fills, source: 'original' };
  writeFileSync(path.join(dir, `${it.id}.json`), `${JSON.stringify(doc)}\n`);
  writeFileSync(path.join(dir, `${it.id}.svg`), svgOf(it, false));
  writeFileSync(path.join(dir, `${it.id}.color.svg`), svgOf(it, true));
  manifest.push({ id: it.id, cat: it.cat, name: it.name, tags: it.tags, file: `/library/${it.cat}/${it.id}.json`, thumb: `/library/${it.cat}/${it.id}.svg`, thumbColor: `/library/${it.cat}/${it.id}.color.svg` });
}
writeFileSync(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 1)}\n`);

const counts = {};
for (const it of ordered) counts[it.cat] = (counts[it.cat] ?? 0) + 1;
if (!process.argv.includes('--no-sheets')) {
  for (const cat of CATEGORIES.filter((c) => counts[c])) {
    const list = ordered.filter((it) => it.cat === cat);
    const png = await page.evaluate(sheet, { title: `${cat} · ${list.length} items · line (top) / colour (bottom)`, cells: list.map((it) => ({ name: it.name, line: svgOf(it, false), color: svgOf(it, true) })) });
    writeFileSync(path.join(REVIEW, `${cat}.png`), Buffer.from(png.slice(png.indexOf(',') + 1), 'base64'));
  }
}
await browser.close();
console.log(`${items.length} items valid · ${Object.entries(counts).map(([c, n]) => `${c} ${n}`).join(' · ')}`);
console.log(`manifest: ${path.join(OUT, 'manifest.json')}`);
if (!process.argv.includes('--no-sheets')) console.log(`contact sheets: ${REVIEW}/<category>.png`);
