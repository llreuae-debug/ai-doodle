#!/usr/bin/env node
/**
 * scripts/library/build-props-batch.mjs
 *
 * Builds, validates, and renders review sheets for props batches.
 * Batch 1: Business & Money (20 items)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import bizItems from './items/business.mjs';
import { svgOf, validateItemStatic } from '../../tools/build-library.mjs';

import reItems from './items/realestate.mjs';
import eduItems from './items/education.mjs';
import faithItems from './items/faith.mjs';
import techItems from './items/tech.mjs';
import healthItems from './items/health.mjs';
import foodItems from './items/food.mjs';
import transportItems from './items/transport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ASSETS_OUT = path.join(ROOT, 'assets/library');
const PUBLIC_OUT = path.join(ROOT, 'public/library');
const REVIEW_DIR = path.join(ROOT, 'assets/library/_review');
const ARTIFACTS_DIR = '/Users/dilnawaz/.gemini/antigravity-ide/brain/a8b8ccd5-c535-46d2-86fc-051d03b512e9';
const PROGRESS_FILE = path.join(ROOT, 'tools/library-progress.json');

mkdirSync(REVIEW_DIR, { recursive: true });

const BATCH_CONFIGS = {
  1: { cat: 'business', title: 'Props · Batch 01: Business & Money (20 Items · 40 Tiles)', role: 'Business', items: bizItems, sampleIds: ['bz-savings-jar', 'bz-vault-safe', 'bz-credit-card'] },
  2: { cat: 'realestate', title: 'Props · Batch 02: Real Estate & Construction (20 Items · 40 Tiles)', role: 'Real Estate', items: reItems, sampleIds: ['re-crane', 're-blueprint', 're-cement-mixer'] },
  3: {
    cat: 'education-faith',
    title: 'Props · Batch 03: Education & Faith (30 Items · 60 Tiles)',
    role: 'Education / Faith',
    items: [...eduItems, ...faithItems],
    sampleIds: ['ed-microscope', 'fh-mosque', 'ed-chalkboard'],
  },
  4: {
    cat: 'tech-health',
    title: 'Props · Batch 04: Tech & Health (25 Items · 50 Tiles)',
    role: 'Tech / Health',
    items: [...techItems, ...healthItems],
    sampleIds: ['te-tablet-stylus', 'he-ambulance', 'te-smartwatch'],
  },
  5: {
    cat: 'food-transport',
    title: 'Props · Batch 05: Food & Transport (25 Items · 50 Tiles)',
    role: 'Food / Transport',
    items: [...foodItems, ...transportItems],
    sampleIds: ['fo-biryani', 'tr-rickshaw', 'fo-burger'],
  },
};

async function main() {
  const arg = process.argv[2] || '5';
  const batchNum = parseInt(arg, 10) || 5;
  const config = BATCH_CONFIGS[batchNum] || BATCH_CONFIGS[5];
  const items = config.items;

  console.log(`Building and validating Props Batch ${batchNum}: ${config.title} (${items.length} items)...`);

  // 1. Static validation
  const seenIds = new Set();
  const errors = [];
  for (const it of items) {
    const errs = validateItemStatic(it, seenIds);
    if (errs.length > 0) errors.push(`${it.id}: ${errs.join(', ')}`);
    seenIds.add(it.id);
  }
  if (errors.length > 0) {
    console.error('Validation errors found:');
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log(`✓ All ${items.length} items passed static validation`);

  // 2. Write item files (JSON, SVG line, SVG color)
  for (const it of items) {
    for (const base of [ASSETS_OUT, PUBLIC_OUT]) {
      const catDir = path.join(base, it.cat);
      mkdirSync(catDir, { recursive: true });
      const itemRole =
        it.cat === 'education' ? 'Education' :
        it.cat === 'faith' ? 'Faith' :
        it.cat === 'tech' ? 'Tech' :
        it.cat === 'health' ? 'Health' :
        it.cat === 'food' ? 'Food' :
        it.cat === 'transport' ? 'Transport' :
        config.role;
      const isPremium =
        it.id === 're-crane' ||
        it.id === 're-modern-villa' ||
        it.id === 'bz-vault-safe' ||
        it.id === 'bz-rotating-savings' ||
        it.id === 'bz-cash-stack' ||
        it.id === 'ed-microscope' ||
        it.id === 'ed-award-medal' ||
        it.id === 'fh-mosque' ||
        it.id === 'fh-lantern' ||
        it.id === 'te-tablet-stylus' ||
        it.id === 'te-smartwatch' ||
        it.id === 'te-robot-arm' ||
        it.id === 'he-heart-pulse' ||
        it.id === 'he-ambulance' ||
        it.id === 'fo-biryani' ||
        it.id === 'fo-cake' ||
        it.id === 'tr-rickshaw' ||
        it.id === 'tr-airplane' ||
        it.id === 'tr-train';
      const doc = {
        id: it.id,
        cat: it.cat,
        name: it.name,
        role: itemRole,
        tags: it.tags,
        premium: isPremium,
        strokes: it.strokes,
        fills: it.fills,
        source: 'original',
      };
      writeFileSync(path.join(catDir, `${it.id}.json`), `${JSON.stringify(doc, null, 2)}\n`);
      writeFileSync(path.join(catDir, `${it.id}.svg`), svgOf(it, false));
      writeFileSync(path.join(catDir, `${it.id}.color.svg`), svgOf(it, true));
    }
  }
  console.log(`✓ Wrote JSON and SVG files for all ${items.length} items`);

  // 3. Update manifest.json
  const manifestPath = path.join(PUBLIC_OUT, 'manifest.json');
  let manifest = [];
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch {
      manifest = [];
    }
  }

  // Remove existing items in these categories from manifest, then append new ones
  const currentCats = new Set(items.map((it) => it.cat));
  const otherItems = manifest.filter((it) => !currentCats.has(it.cat));
  const newCatManifest = items.map((it) => {
    const itemRole =
      it.cat === 'education' ? 'Education' :
      it.cat === 'faith' ? 'Faith' :
      it.cat === 'tech' ? 'Tech' :
      it.cat === 'health' ? 'Health' :
      it.cat === 'food' ? 'Food' :
      it.cat === 'transport' ? 'Transport' :
      config.role;
    const isPremium =
      it.id === 're-crane' ||
      it.id === 're-modern-villa' ||
      it.id === 'bz-vault-safe' ||
      it.id === 'bz-rotating-savings' ||
      it.id === 'bz-cash-stack' ||
      it.id === 'ed-microscope' ||
      it.id === 'ed-award-medal' ||
      it.id === 'fh-mosque' ||
      it.id === 'fh-lantern' ||
      it.id === 'te-tablet-stylus' ||
      it.id === 'te-smartwatch' ||
      it.id === 'te-robot-arm' ||
      it.id === 'he-heart-pulse' ||
      it.id === 'he-ambulance' ||
      it.id === 'fo-biryani' ||
      it.id === 'fo-cake' ||
      it.id === 'tr-rickshaw' ||
      it.id === 'tr-airplane' ||
      it.id === 'tr-train';
    return {
      id: it.id,
      cat: it.cat,
      name: it.name,
      role: itemRole,
      tags: it.tags,
      premium: isPremium,
      file: `/library/${it.cat}/${it.id}.json`,
      thumb: `/library/${it.cat}/${it.id}.svg`,
      thumbLine: `/library/${it.cat}/${it.id}.svg`,
      thumbColor: `/library/${it.cat}/${it.id}.color.svg`,
      strokeCount: it.strokes.length,
    };
  });

  const updatedManifest = [...otherItems, ...newCatManifest];
  writeFileSync(path.join(ASSETS_OUT, 'manifest.json'), `${JSON.stringify(updatedManifest, null, 1)}\n`);
  writeFileSync(path.join(PUBLIC_OUT, 'manifest.json'), `${JSON.stringify(updatedManifest, null, 1)}\n`);
  console.log(`✓ Updated manifest.json (${updatedManifest.length} total library items)`);

  // 4. Render review contact sheet and draw order frames using headless Chromium
  console.log('Launching headless Chromium to render review sheets...');
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  await page.setContent('<!doctype html><title>review</title><body></body>');

  const pairs = items.map((it) => {
    const itemRole =
      it.cat === 'education' ? 'Education' :
      it.cat === 'faith' ? 'Faith' :
      it.cat === 'tech' ? 'Tech' :
      it.cat === 'health' ? 'Health' :
      it.cat === 'food' ? 'Food' :
      it.cat === 'transport' ? 'Transport' :
      config.role;
    const isPremium =
      it.id === 're-crane' ||
      it.id === 're-modern-villa' ||
      it.id === 'bz-vault-safe' ||
      it.id === 'bz-rotating-savings' ||
      it.id === 'bz-cash-stack' ||
      it.id === 'ed-microscope' ||
      it.id === 'ed-award-medal' ||
      it.id === 'fh-mosque' ||
      it.id === 'fh-lantern' ||
      it.id === 'te-tablet-stylus' ||
      it.id === 'te-smartwatch' ||
      it.id === 'te-robot-arm' ||
      it.id === 'he-heart-pulse' ||
      it.id === 'he-ambulance' ||
      it.id === 'fo-biryani' ||
      it.id === 'fo-cake' ||
      it.id === 'tr-rickshaw' ||
      it.id === 'tr-airplane' ||
      it.id === 'tr-train';
    return {
      id: it.id,
      name: `${itemRole} – ${it.name}`,
      premium: isPremium,
      colorSvg: svgOf(it, true),
      lineSvg: svgOf(it, false),
      strokes: it.strokes,
    };
  });

  const sheetPng = await page.evaluate(renderTilesSheetInPage, {
    title: config.title,
    subtitle: 'Colour version (left) and pen-and-ink line art (right) in side-by-side tile pairs',
    pairs,
    pairsPerRow: 2,
  });

  const padBatch = String(batchNum).padStart(2, '0');
  const sheetFilename = `props-batch-${padBatch}-${config.cat}.png`;
  const sheetFile = path.join(REVIEW_DIR, sheetFilename);
  writeFileSync(sheetFile, Buffer.from(sheetPng.slice(sheetPng.indexOf(',') + 1), 'base64'));
  console.log('✓ Generated:', sheetFile);

  // 5. Draw order previews for 3 sample items
  const sample3 = config.sampleIds.map((id) => pairs.find((p) => p.id === id) || pairs[0]);

  for (const s of sample3) {
    const strokeSteps = [];
    const stepCount = Math.min(8, s.strokes.length);
    const stride = Math.max(1, Math.floor(s.strokes.length / stepCount));
    for (let st = 1; st <= stepCount; st++) {
      const partial = s.strokes.slice(0, Math.min(s.strokes.length, st * stride));
      strokeSteps.push(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">` +
        `<g fill="none" stroke="#111827" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${partial.map((d) => `<path d="${d}"/>`).join('')}</g></svg>`
      );
    }

    const orderPng = await page.evaluate(renderDrawOrderInPage, { item: s, steps: strokeSteps });
    const orderFile = path.join(REVIEW_DIR, `draw-order-${s.id}.png`);
    writeFileSync(orderFile, Buffer.from(orderPng.slice(orderPng.indexOf(',') + 1), 'base64'));
    console.log('✓ Generated:', orderFile);
  }

  await browser.close();

  // 6. Copy to artifact directory
  const copyTargets = [
    sheetFilename,
    `draw-order-${sample3[0].id}.png`,
    `draw-order-${sample3[1].id}.png`,
    `draw-order-${sample3[2].id}.png`,
  ];
  for (const f of copyTargets) {
    const src = path.join(REVIEW_DIR, f);
    const dst = path.join(ARTIFACTS_DIR, f);
    if (existsSync(src)) {
      writeFileSync(dst, readFileSync(src));
      console.log('✓ Copied to artifacts:', dst);
    }
  }

  // 7. Update progress file
  const progress = {
    phase: 'props',
    currentBatch: batchNum,
    totalBatches: 6,
    batchType: 'props',
    category: config.cat,
    itemsInBatch: items.length,
    tilesRendered: items.length * 2,
    lastBatchFile: sheetFile,
    status: 'awaiting_review',
    timestamp: new Date().toISOString(),
  };
  writeFileSync(PROGRESS_FILE, `${JSON.stringify(progress, null, 2)}\n`);
}

async function renderTilesSheetInPage({ title, subtitle, pairs, pairsPerRow = 2 }) {
  const tileW = 210;
  const thumbH = 160;
  const capH = 40;
  const tileH = thumbH + capH;
  const gap = 16;
  const pad = 24;

  const cols = pairsPerRow * 2;
  const rows = Math.ceil(pairs.length / pairsPerRow);

  const totalW = pad * 2 + cols * tileW + (cols - 1) * gap;
  const totalH = pad * 2 + 75 + rows * tileH + (rows - 1) * gap;

  const c = new OffscreenCanvas(totalW, totalH);
  const g = c.getContext('2d');
  g.fillStyle = '#f8fafc';
  g.fillRect(0, 0, c.width, c.height);

  g.fillStyle = '#0f172a';
  g.font = 'bold 24px system-ui, -apple-system, sans-serif';
  g.fillText(title, pad, 40);

  g.fillStyle = '#64748b';
  g.font = '14px system-ui, -apple-system, sans-serif';
  g.fillText(subtitle, pad, 66);

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

      g.save();
      g.fillStyle = '#ffffff';
      g.strokeStyle = '#e2e8f0';
      g.lineWidth = 1;
      g.beginPath();
      g.roundRect(x, y, tileW, tileH, 12);
      g.fill();
      g.stroke();
      g.clip();

      const img = new Image(tileW, thumbH);
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tile.svg)}`;
      await img.decode();
      g.drawImage(img, x + 8, y + 8, tileW - 16, thumbH - 16);

      if (tile.premium) {
        const bx = x + tileW - 32;
        const by = y + 8;
        g.fillStyle = '#ffffff';
        g.strokeStyle = '#e2e8f0';
        g.lineWidth = 1;
        g.beginPath();
        g.roundRect(bx, by, 24, 24, 6);
        g.fill();
        g.stroke();

        g.fillStyle = '#f59e0b';
        g.font = '14px system-ui, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('★', bx + 12, by + 12);
      }

      const capY = y + thumbH;
      g.fillStyle = '#f1f5f9';
      g.fillRect(x, capY, tileW, capH);
      g.strokeStyle = '#e2e8f0';
      g.beginPath();
      g.moveTo(x, capY);
      g.lineTo(x + tileW, capY);
      g.stroke();

      g.fillStyle = '#1e293b';
      g.font = '600 15px system-ui, -apple-system, sans-serif';
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      let captionText = tile.name;
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

async function renderDrawOrderInPage({ item, steps }) {
  const cell = 140;
  const count = steps.length;
  const c = new OffscreenCanvas(count * cell + 40, cell + 60);
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);

  g.fillStyle = '#0f172a';
  g.font = 'bold 14px system-ui, sans-serif';
  g.fillText(`Stroke draw order: ${item.name}`, 20, 24);

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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
