#!/usr/bin/env node
/**
 * Builds the "Scenes" library category from scripts/library/scenes/set-*.mjs (original artwork):
 *
 *   public/library/scenes/<id>.json|.svg|.color.svg   (mirrored to assets/library/scenes)
 *   public/library/manifest.json                      (scenes entries replaced; others untouched)
 *   assets/library/manifest.json                      (same)
 *   assets/library/_review/scenes-NN.png              contact sheets, 10 scenes each
 *
 * Checks: 8–60 strokes, 2–30 fills, absolute M L C Q A Z, stroke length 600–12000,
 * everything within 15–185 of the 200×200 viewBox. Nothing is written if a check fails.
 *
 *   node scripts/library/build-scenes.mjs              build and write
 *   node scripts/library/build-scenes.mjs --preview    only render the contact sheets
 */
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SETS = path.join(ROOT, 'scripts/library/scenes');
const PUBLIC = path.join(ROOT, 'public/library');
const ASSETS = path.join(ROOT, 'assets/library');
const REVIEW = path.join(ASSETS, '_review');
const LIMITS = { strokes: [8, 60], fills: [2, 30], length: [600, 12000], bounds: [15, 185] };
const INK = '#1B1B1B';
const LINE_WIDTH = 3.4;
const preview = process.argv.includes('--preview');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');

const items = [];
for (const file of readdirSync(SETS).filter((f) => /^set-.*\.mjs$/.test(f)).sort()) {
  const mod = await import(pathToFileURL(path.join(SETS, file)).href);
  items.push(...mod.default.filter((it) => !only || only.some((o) => it.id.includes(o))));
}

const problems = [];
const fail = (it, msg) => problems.push(`${it.id}: ${msg}`);
const ids = new Set();
const absolute = (d) => {
  if (/[^MLCQAZ0-9.,\s-]/.test(d)) return false;
  const cmds = d.match(/[MLCQAZ]/g) ?? [];
  return cmds[0] === 'M' && cmds.every((c, i) => i === 0 || cmds[i - 1] !== 'Z' || c === 'M');
};
for (const it of items) {
  if (ids.has(it.id)) fail(it, 'duplicate id');
  ids.add(it.id);
  const [smin, smax] = LIMITS.strokes, [fmin, fmax] = LIMITS.fills;
  if (it.strokes.length < smin || it.strokes.length > smax) fail(it, `${it.strokes.length} strokes`);
  if (it.fills.length < fmin || it.fills.length > fmax) fail(it, `${it.fills.length} fills`);
  for (const d of [...it.strokes, ...it.fills.map((f) => f.d)]) if (!absolute(d)) fail(it, `bad path ${d.slice(0, 40)}`);
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const svgOf = (it, color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${color ? it.fills.map((f) => `<path d="${esc(f.d)}" fill="${f.c}"/>`).join('') : ''}` +
  `<g fill="none" stroke="${INK}" stroke-width="${LINE_WIDTH}" stroke-linecap="round" stroke-linejoin="round">${it.strokes.map((d) => `<path d="${esc(d)}"/>`).join('')}</g></svg>\n`;

function measure(list) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  document.body.append(svg);
  const p = document.createElementNS(ns, 'path');
  svg.append(p);
  return list.map((it) => {
    let length = 0;
    const box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [i, d] of [...it.strokes, ...it.fills.map((f) => f.d)].entries()) {
      p.setAttribute('d', d);
      if (i < it.strokes.length) length += p.getTotalLength();
      const b = p.getBBox();
      box[0] = Math.min(box[0], b.x); box[1] = Math.min(box[1], b.y);
      box[2] = Math.max(box[2], b.x + b.width); box[3] = Math.max(box[3], b.y + b.height);
    }
    return { id: it.id, length: Math.round(length), box: box.map((v) => Math.round(v)) };
  });
}

/** Contact sheet in the page: colour tiles on soft rounded cards, 5 across, name and stats below. */
async function sheet({ title, cells }) {
  const cell = cells.length <= 3 ? 560 : 300, gap = 24, cols = Math.min(5, cells.length), rows = Math.ceil(cells.length / cols);
  const c = new OffscreenCanvas(cols * (cell + gap) + gap, rows * (cell + gap + 40) + 60);
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#111';
  g.font = '600 24px sans-serif';
  g.fillText(title, gap, 38);
  for (const [i, { name, svg, note }] of cells.entries()) {
    const x = gap + (i % cols) * (cell + gap), y = 60 + Math.floor(i / cols) * (cell + gap + 40);
    g.fillStyle = '#F4F4F4';
    g.beginPath();
    g.roundRect(x, y, cell, cell, 64);
    g.fill();
    const img = new Image(cell, cell);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    g.drawImage(img, x, y, cell, cell);
    g.fillStyle = '#222';
    g.font = '600 15px sans-serif';
    g.fillText(name, x + 6, y + cell + 20);
    g.fillStyle = '#888';
    g.font = '12px sans-serif';
    g.fillText(note, x + 6, y + cell + 36);
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
await page.setContent('<!doctype html><title>scenes</title><body></body>');
const measured = new Map((await page.evaluate(measure, items)).map((m) => [m.id, m]));
for (const it of items) {
  const m = measured.get(it.id);
  if (m.length < LIMITS.length[0] || m.length > LIMITS.length[1]) fail(it, `stroke length ${m.length}`);
  if (m.box[0] < LIMITS.bounds[0] || m.box[1] < LIMITS.bounds[0] || m.box[2] > LIMITS.bounds[1] || m.box[3] > LIMITS.bounds[1]) fail(it, `extends to [${m.box}]`);
}

mkdirSync(REVIEW, { recursive: true });
for (let i = 0; i < items.length; i += 10) {
  const list = items.slice(i, i + 10);
  const n = String(i / 10 + 1).padStart(2, '0');
  const png = await page.evaluate(sheet, {
    title: `Scenes ${i + 1}–${i + list.length} of ${items.length}`,
    cells: list.map((it) => ({ name: it.name, svg: svgOf(it, true), note: `${it.id} · ${it.strokes.length} strokes · ${it.fills.length} fills · ${measured.get(it.id).length} long` })),
  });
  writeFileSync(path.join(REVIEW, `scenes-${n}.png`), Buffer.from(png.slice(png.indexOf(',') + 1), 'base64'));
}
await browser.close();

if (problems.length) {
  console.error(`${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
if (preview || only) {
  console.log(`${items.length} scenes valid · sheets in ${REVIEW}/scenes-NN.png (preview, nothing written)`);
  process.exit(0);
}

const dir = path.join(PUBLIC, 'scenes');
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const entries = [];
for (const it of items) {
  writeFileSync(path.join(dir, `${it.id}.json`), `${JSON.stringify({ id: it.id, cat: 'scenes', name: it.name, tags: it.tags, strokes: it.strokes, fills: it.fills, source: 'original' })}\n`);
  writeFileSync(path.join(dir, `${it.id}.svg`), svgOf(it, false));
  writeFileSync(path.join(dir, `${it.id}.color.svg`), svgOf(it, true));
  const base = `/library/scenes/${it.id}`;
  entries.push({ id: it.id, cat: 'scenes', name: it.name, role: 'Scene', tags: it.tags, premium: false, file: `${base}.json`, thumb: `${base}.svg`, thumbLine: `${base}.svg`, thumbColor: `${base}.color.svg`, strokeCount: it.strokes.length });
}
rmSync(path.join(ASSETS, 'scenes'), { recursive: true, force: true });
cpSync(dir, path.join(ASSETS, 'scenes'), { recursive: true });
for (const file of [path.join(PUBLIC, 'manifest.json'), path.join(ASSETS, 'manifest.json')]) {
  const manifest = JSON.parse(readFileSync(file, 'utf8')).filter((m) => m.cat !== 'scenes');
  writeFileSync(file, `${JSON.stringify([...manifest, ...entries], null, 1)}\n`);
}
console.log(`${items.length} scenes written to ${dir} and both manifests · sheets in ${REVIEW}/scenes-NN.png`);
