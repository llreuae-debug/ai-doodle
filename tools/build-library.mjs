#!/usr/bin/env node
/**
 * Tools: build-library.mjs
 *
 * Implements the batch generation, validation, contact sheet and animated draw-order preview
 * pipeline for the Chalkline Studio clipart library.
 *
 * Rules:
 *   - 200x200 viewBox, all content within 15-185 on both axes
 *   - Absolute commands only (M L C Q A Z), each stroke starts with M
 *   - 8-60 strokes in drawing order, 2-10 closed fills ending with Z and #RRGGBB
 *   - Stroke length 600-9000 units (measured via Chromium)
 *   - BATCHES of 20 items
 *   - Outputs /assets/library/<category>/<id>.json
 *   - Outputs /assets/library/manifest.json
 *   - Contact sheet /assets/library/_review/batch-NN.png
 *   - Draw-order preview for 3 items per batch
 *   - Updates tools/library-progress.json
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ITEMS_DIR = path.join(ROOT, 'scripts/library/items');
const ASSETS_OUT = path.join(ROOT, 'assets/library');
const PUBLIC_OUT = path.join(ROOT, 'public/library');
const REVIEW_DIR = path.join(ROOT, 'assets/library/_review');
const PROGRESS_FILE = path.join(ROOT, 'tools/library-progress.json');

export const CATEGORIES = [
  'characters',
  'faces',
  'business',
  'realestate',
  'education',
  'faith',
  'tech',
  'health',
  'food',
  'nature',
  'transport',
  'shapes',
];

const LIMITS = { strokes: [8, 60], fills: [2, 10], length: [600, 9000], bounds: [15, 185] };
const INK = '#1B1B1B';
const LINE_WIDTH = 3.4;
const BATCH_SIZE = 20;

// ---------- Load all items ----------
export async function loadAllItems() {
  const items = [];
  const files = readdirSync(ITEMS_DIR).filter((f) => f.endsWith('.mjs')).sort();
  for (const file of files) {
    if (file === 'draw.mjs') continue;
    const mod = await import(pathToFileURL(path.join(ITEMS_DIR, file)).href);
    if (Array.isArray(mod.default)) {
      items.push(...mod.default);
    }
  }
  return items;
}

// ---------- Static Path Validation ----------
export function validateItemStatic(it, seenIds = new Set()) {
  const errors = [];
  if (!it.id) errors.push('missing id');
  if (seenIds.has(it.id)) errors.push(`duplicate id: ${it.id}`);
  if (!it.name || it.name.length > 32) errors.push(`name must be 1-32 chars (got "${it.name}")`);
  if (!Array.isArray(it.tags) || it.tags.length === 0) errors.push('must have tags array');
  for (const t of it.tags || []) {
    if (t !== t.toLowerCase()) errors.push(`tag "${t}" must be lowercase`);
  }
  if (!CATEGORIES.includes(it.cat)) errors.push(`unknown category "${it.cat}"`);

  const [smin, smax] = LIMITS.strokes;
  if (!Array.isArray(it.strokes) || it.strokes.length < smin || it.strokes.length > smax) {
    errors.push(`strokes count ${it.strokes?.length} outside ${smin}-${smax}`);
  }

  const [fmin, fmax] = LIMITS.fills;
  if (!Array.isArray(it.fills) || it.fills.length < fmin || it.fills.length > fmax) {
    errors.push(`fills count ${it.fills?.length} outside ${fmin}-${fmax}`);
  }

  for (const [idx, d] of (it.strokes || []).entries()) {
    if (typeof d !== 'string') {
      errors.push(`stroke ${idx} is not string`);
      continue;
    }
    if (/[^MLCQAZ0-9.,\s-]/.test(d)) errors.push(`stroke ${idx} contains disallowed commands: ${d.slice(0, 30)}`);
    if (!d.startsWith('M')) errors.push(`stroke ${idx} does not start with M: ${d.slice(0, 20)}`);
    if (/NaN/.test(d)) errors.push(`stroke ${idx} contains NaN`);
  }

  for (const [idx, f] of (it.fills || []).entries()) {
    if (!f || typeof f.d !== 'string' || typeof f.c !== 'string') {
      errors.push(`fill ${idx} invalid structure`);
      continue;
    }
    if (!f.d.startsWith('M')) errors.push(`fill ${idx} does not start with M`);
    if (!f.d.trim().endsWith('Z')) errors.push(`fill ${idx} is not closed with Z`);
    if (!/^#[0-9A-Fa-f]{6}$/.test(f.c)) errors.push(`fill ${idx} color ${f.c} is not #RRGGBB`);
    if (/NaN/.test(f.d)) errors.push(`fill ${idx} contains NaN`);
  }

  return errors;
}

const escAttr = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function svgOf(it, color) {
  const fills = color ? it.fills.map((f) => `<path d="${escAttr(f.d)}" fill="${f.c}"/>`).join('') : '';
  const strokes = it.strokes.map((d) => `<path d="${escAttr(d)}"/>`).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${fills}` +
    `<g fill="none" stroke="${INK}" stroke-width="${LINE_WIDTH}" stroke-linecap="round" stroke-linejoin="round">${strokes}</g></svg>\n`
  );
}

// In-browser measurement function
function measureInPage(list) {
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
      x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y);
      x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y);
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

// In-browser contact sheet renderer
// In-browser contact sheet renderer matching Part 1 reference tile design
async function renderContactSheetInPage({ title, pairs }) {
  // Each pair is rendered as two tiles: Colour tile on left, Line tile on right
  const tileW = 200;
  const thumbH = 150;
  const capH = 38;
  const tileH = thumbH + capH;
  const gap = 16;
  const pad = 28;

  // 2 pairs per row (i.e. 4 tiles per row: Pair1-Col, Pair1-Line, Pair2-Col, Pair2-Line)
  const pairsPerRow = 2;
  const cols = pairsPerRow * 2;
  const rows = Math.ceil(pairs.length / pairsPerRow);

  const totalW = pad * 2 + cols * tileW + (cols - 1) * gap;
  const totalH = pad * 2 + 70 + rows * tileH + (rows - 1) * gap;

  const c = new OffscreenCanvas(totalW, totalH);
  const g = c.getContext('2d');
  g.fillStyle = '#f8fafc';
  g.fillRect(0, 0, c.width, c.height);

  // Header
  g.fillStyle = '#0f172a';
  g.font = 'bold 24px system-ui, -apple-system, sans-serif';
  g.fillText(title, pad, 42);

  g.fillStyle = '#64748b';
  g.font = '14px system-ui, -apple-system, sans-serif';
  g.fillText('Tile design: Colour caricature tile (left) and black ink Line tile (right) side by side in pairs', pad, 68);

  for (const [pairIdx, pair] of pairs.entries()) {
    const row = Math.floor(pairIdx / pairsPerRow);
    const colInRow = pairIdx % pairsPerRow;

    const tiles = [
      { type: 'color', svg: pair.colorSvg, name: pair.name, premium: pair.premium },
      { type: 'line', svg: pair.lineSvg, name: pair.name, premium: pair.premium },
    ];

    for (let t = 0; t < 2; t++) {
      const tile = tiles[t];
      const col = colInRow * 2 + t;
      const x = pad + col * (tileW + gap);
      const y = pad + 85 + row * (tileH + gap);

      // White tile card with 12px radius and 1px border
      g.save();
      g.fillStyle = '#ffffff';
      g.strokeStyle = '#e2e8f0';
      g.lineWidth = 1;
      g.beginPath();
      g.roundRect(x, y, tileW, tileH, 12);
      g.fill();
      g.stroke();
      g.clip();

      // Render SVG into thumb area
      const img = new Image(tileW, thumbH);
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tile.svg)}`;
      await img.decode();
      g.drawImage(img, x + 8, y + 8, tileW - 16, thumbH - 16);

      // Premium gold star badge
      if (tile.premium) {
        const bx = x + tileW - 30;
        const by = y + 8;
        g.fillStyle = '#ffffff';
        g.strokeStyle = '#e2e8f0';
        g.lineWidth = 1;
        g.beginPath();
        g.roundRect(bx, by, 22, 22, 6);
        g.fill();
        g.stroke();

        g.fillStyle = '#f59e0b';
        g.font = '13px system-ui, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('★', bx + 11, by + 11);
      }

      // Caption bar at the bottom: light grey background var(--panel-2) #f1f5f9
      const capY = y + thumbH;
      g.fillStyle = '#f1f5f9';
      g.fillRect(x, capY, tileW, capH);
      g.strokeStyle = '#e2e8f0';
      g.beginPath();
      g.moveTo(x, capY);
      g.lineTo(x + tileW, capY);
      g.stroke();

      // 15px semibold text "Role – Name", one line, ellipsis when long
      g.fillStyle = '#1e293b';
      g.font = '600 15px system-ui, -apple-system, sans-serif';
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      let captionText = tile.name;
      // Ellipsis measurement
      while (g.measureText(captionText).width > tileW - 20 && captionText.length > 3) {
        captionText = `${captionText.slice(0, -2)}…`;
      }
      g.fillText(captionText, x + 10, capY + capH / 2);

      g.restore();
    }
  }

  const blob = await c.convertToBlob({ type: 'image/png' });
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(blob);
  });
}

// In-browser draw order step sheet (draw progression)
async function renderDrawOrderFramesInPage({ item, steps }) {
  const cell = 140;
  const count = steps.length;
  const c = new OffscreenCanvas(count * cell + 40, cell + 60);
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);

  g.fillStyle = '#0f172a';
  g.font = 'bold 14px system-ui, sans-serif';
  g.fillText(`Stroke draw order: ${item.name} (${item.id})`, 20, 24);

  for (const [i, svg] of steps.entries()) {
    const x = 20 + i * cell;
    const y = 35;
    const img = new Image(cell, cell);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    g.strokeStyle = '#e2e8f0';
    g.strokeRect(x, y, cell - 6, cell - 6);
    g.drawImage(img, x, y, cell - 6, cell - 6);

    g.fillStyle = '#64748b';
    g.font = '10px monospace';
    g.fillText(`Step ${i + 1}/${count}`, x + 6, y + cell + 10);
  }

  const blob = await c.convertToBlob({ type: 'image/png' });
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(blob);
  });
}

// ---------- Main Runner ----------
export async function runBatch(batchNum = 1) {
  const allItems = await loadAllItems();
  const totalBatches = Math.ceil(allItems.length / BATCH_SIZE);
  const startIdx = (batchNum - 1) * BATCH_SIZE;
  const batchItems = allItems.slice(startIdx, startIdx + BATCH_SIZE);

  console.log(`\n========================================`);
  console.log(`Processing Batch ${batchNum} of ${totalBatches} (${batchItems.length} items)`);
  console.log(`========================================\n`);

  // Static checks
  const seenIds = new Set();
  const staticErrors = [];
  for (const it of batchItems) {
    const errs = validateItemStatic(it, seenIds);
    if (errs.length) staticErrors.push(`${it.id}: ${errs.join(', ')}`);
    seenIds.add(it.id);
  }

  if (staticErrors.length) {
    console.error(`Static validation failed on ${staticErrors.length} items:`);
    console.error(staticErrors.join('\n'));
    process.exit(1);
  }

  // Launch headless browser for measurements and previews
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  await page.setContent('<!doctype html><title>review</title><body></body>');

  // Chromium measurements
  const measured = new Map((await page.evaluate(measureInPage, batchItems)).map((m) => [m.id, m]));
  const measureErrors = [];
  const [bmin, bmax] = LIMITS.bounds;
  const [lmin, lmax] = LIMITS.length;

  for (const it of batchItems) {
    const m = measured.get(it.id);
    if (m.length < lmin || m.length > lmax) {
      measureErrors.push(`${it.id}: stroke length ${m.length} outside ${lmin}-${lmax}`);
    }
    if (m.box[0] < bmin || m.box[1] < bmin || m.box[2] > bmax || m.box[3] > bmax) {
      measureErrors.push(`${it.id}: extends to [${m.box}] (want inside ${bmin}-${bmax})`);
    }
  }

  if (measureErrors.length) {
    await browser.close();
    console.error(`Measurement validation failed on ${measureErrors.length} items:`);
    console.error(measureErrors.join('\n'));
    process.exit(1);
  }

  // Create review directories
  mkdirSync(REVIEW_DIR, { recursive: true });

  // 1. Render contact sheet
  const padBatch = String(batchNum).padStart(2, '0');
  const catName = batchItems[0]?.cat || 'library';
  const sheetPng = await page.evaluate(renderContactSheetInPage, {
    title: `Batch ${padBatch} · ${catName.toUpperCase()} · ${batchItems.length} Items`,
    pairs: batchItems.map((it) => ({
      id: it.id,
      name: it.name,
      premium: !!it.premium,
      lineSvg: svgOf(it, false),
      colorSvg: svgOf(it, true),
    })),
  });

  const sheetFile = path.join(REVIEW_DIR, `${catName}-batch-${padBatch}.png`);
  writeFileSync(sheetFile, Buffer.from(sheetPng.slice(sheetPng.indexOf(',') + 1), 'base64'));
  console.log(`✓ Contact sheet generated: ${sheetFile}`);

  // 2. Render stroke draw-order progression for 3 items
  const sampleItems = [batchItems[0], batchItems[Math.floor(batchItems.length / 2)], batchItems[batchItems.length - 1]].filter(Boolean);
  for (const sample of sampleItems) {
    const strokeSteps = [];
    const stepCount = Math.min(8, sample.strokes.length);
    const stride = Math.max(1, Math.floor(sample.strokes.length / stepCount));
    for (let s = 1; s <= stepCount; s++) {
      const partialStrokes = sample.strokes.slice(0, Math.min(sample.strokes.length, s * stride));
      strokeSteps.push(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">` +
        `<g fill="none" stroke="${INK}" stroke-width="${LINE_WIDTH}" stroke-linecap="round" stroke-linejoin="round">${partialStrokes.map((d) => `<path d="${escAttr(d)}"/>`).join('')}</g></svg>`
      );
    }
    const orderPng = await page.evaluate(renderDrawOrderFramesInPage, { item: sample, steps: strokeSteps });
    const orderFile = path.join(REVIEW_DIR, `draw-order-${sample.id}.png`);
    writeFileSync(orderFile, Buffer.from(orderPng.slice(orderPng.indexOf(',') + 1), 'base64'));
    console.log(`✓ Draw-order preview generated: ${orderFile}`);
  }

  // 3. Write individual item JSON and SVGs into assets/library and public/library
  for (const it of batchItems) {
    for (const baseDir of [ASSETS_OUT, PUBLIC_OUT]) {
      const catDir = path.join(baseDir, it.cat);
      mkdirSync(catDir, { recursive: true });
      const doc = {
        id: it.id,
        cat: it.cat,
        name: it.name,
        tags: it.tags,
        strokes: it.strokes,
        fills: it.fills,
        source: 'original',
      };
      writeFileSync(path.join(catDir, `${it.id}.json`), `${JSON.stringify(doc, null, 2)}\n`);
      writeFileSync(path.join(catDir, `${it.id}.svg`), svgOf(it, false));
      writeFileSync(path.join(catDir, `${it.id}.color.svg`), svgOf(it, true));
    }
  }

  // 4. Update manifest.json with all items up to current batch
  const processedSoFar = allItems.slice(0, startIdx + batchItems.length);
  const batchManifest = processedSoFar.map((it) => ({
    id: it.id,
    cat: it.cat,
    name: it.name,
    tags: it.tags,
    file: `/library/${it.cat}/${it.id}.json`,
    strokeCount: it.strokes.length,
    premium: false,
    thumb: `/library/${it.cat}/${it.id}.svg`,
    thumbColor: `/library/${it.cat}/${it.id}.color.svg`,
  }));

  const fullManifest = allItems.map((it) => ({
    id: it.id,
    cat: it.cat,
    name: it.name,
    tags: it.tags,
    file: `/library/${it.cat}/${it.id}.json`,
    strokeCount: it.strokes.length,
    premium: false,
    thumb: `/library/${it.cat}/${it.id}.svg`,
    thumbColor: `/library/${it.cat}/${it.id}.color.svg`,
  }));

  // Ensure all item files exist in public/library
  for (const it of allItems) {
    const catDir = path.join(PUBLIC_OUT, it.cat);
    mkdirSync(catDir, { recursive: true });
    const jsonPath = path.join(catDir, `${it.id}.json`);
    if (!existsSync(jsonPath)) {
      const doc = { id: it.id, cat: it.cat, name: it.name, tags: it.tags, strokes: it.strokes, fills: it.fills, source: 'original' };
      writeFileSync(jsonPath, `${JSON.stringify(doc, null, 2)}\n`);
      writeFileSync(path.join(catDir, `${it.id}.svg`), svgOf(it, false));
      writeFileSync(path.join(catDir, `${it.id}.color.svg`), svgOf(it, true));
    }
  }

  writeFileSync(path.join(ASSETS_OUT, 'manifest.json'), `${JSON.stringify(batchManifest, null, 1)}\n`);
  writeFileSync(path.join(PUBLIC_OUT, 'manifest.json'), `${JSON.stringify(fullManifest, null, 1)}\n`);

  // 5. Update tools/library-progress.json
  const progress = {
    currentBatch: batchNum,
    totalBatches,
    batchSize: BATCH_SIZE,
    itemsInBatch: batchItems.length,
    totalProcessed: processedSoFar.length,
    totalAvailable: allItems.length,
    lastProcessedCategory: catName,
    lastBatchFile: sheetFile,
    completedBatchIds: batchItems.map((b) => b.id),
    timestamp: new Date().toISOString(),
  };
  writeFileSync(PROGRESS_FILE, `${JSON.stringify(progress, null, 2)}\n`);

  await browser.close();

  console.log(`\n========================================`);
  console.log(`✓ Batch ${batchNum} Complete!`);
  console.log(`  Items validated & written: ${batchItems.length}`);
  console.log(`  Progress: ${processedSoFar.length} / ${allItems.length} items`);
  console.log(`  Manifest updated: ${path.join(ASSETS_OUT, 'manifest.json')}`);
  console.log(`  Contact Sheet: ${sheetFile}`);
  console.log(`========================================\n`);

  return { batchNum, totalBatches, sheetFile, sampleItems, batchItems };
}

// CLI invocation
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const batchArg = process.argv.find((a) => a.startsWith('--batch='));
  const targetBatch = batchArg ? parseInt(batchArg.split('=')[1], 10) : 1;
  await runBatch(targetBatch);
}
