#!/usr/bin/env node
/**
 * render-cast-review.mjs
 *
 * Renders:
 * 1. assets/library/_review/cast-batch-01.png:
 *    Contact sheet showing the first 10 original characters with Colour and Line tiles side by side,
 *    matching the reference tile design (12px rounded white tile, grey caption bar "Role – Name",
 *    gold star badge on premium).
 * 2. assets/library/_review/character-poses-faraz.png:
 *    Full pose sheet for Faraz (standing, walking, pointing, thinking) in both colour and line.
 * 3. Draw-order step previews for 3 sample characters.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { CHARACTERS } from './characters-data.mjs';
import { renderCharacter } from './caricature.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REVIEW_DIR = path.join(ROOT, 'assets/library/_review');
const ARTIFACTS_DIR = '/Users/dilnawaz/.gemini/antigravity-ide/brain/a8b8ccd5-c535-46d2-86fc-051d03b512e9';

mkdirSync(REVIEW_DIR, { recursive: true });

async function main() {
  const batchNum = parseInt(process.argv[2] || '2', 10);
  console.log(`Launching headless Chromium to render review sheets for Batch ${batchNum}...`);
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  await page.setContent('<!doctype html><title>review</title><body></body>');

  const startIdx = (batchNum - 1) * 10;
  const batchCharacters = CHARACTERS.slice(startIdx, startIdx + 10);
  if (batchCharacters.length === 0) {
    console.error(`No characters found for batch ${batchNum}`);
    await browser.close();
    return;
  }

  // 1. 10 characters in standing pose for Batch review
  const batchItems = batchCharacters.map((c) => {
    const item = renderCharacter(c, 'standing');
    return {
      id: item.id,
      name: item.name,
      premium: item.premium,
      colorSvg: item.colorSvg,
      lineSvg: item.lineSvg,
      strokes: item.strokes,
    };
  });

  const batchStr = String(batchNum).padStart(2, '0');
  const castSheetPng = await page.evaluate(renderTilesSheetInPage, {
    title: `Original Character Cast · Batch ${batchStr} (10 Characters · 20 Tiles)`,
    subtitle: 'Colour caricature (left) and comic pen-and-ink line art (right) in side-by-side tile pairs',
    pairs: batchItems,
    pairsPerRow: 2,
  });

  const castSheetFile = path.join(REVIEW_DIR, `cast-batch-${batchStr}.png`);
  writeFileSync(castSheetFile, Buffer.from(castSheetPng.slice(castSheetPng.indexOf(',') + 1), 'base64'));
  console.log('✓ Generated:', castSheetFile);

  // 2. Full pose sheet for a featured character from this batch across all 4 poses
  // In Batch 2, Chef Rocco is featured!
  const featuredChar = batchCharacters[2] || batchCharacters[0];
  const charPoses = featuredChar.poses.map((p) => {
    const item = renderCharacter(featuredChar, p);
    return {
      id: item.id,
      name: `${featuredChar.role} – ${featuredChar.name} (${p})`,
      premium: featuredChar.premium,
      colorSvg: item.colorSvg,
      lineSvg: item.lineSvg,
    };
  });

  const poseSheetPng = await page.evaluate(renderTilesSheetInPage, {
    title: `Character Consistency Sheet: ${featuredChar.role} – ${featuredChar.name} (All Poses)`,
    subtitle: 'Demonstrating consistent hair, facial features, proportions and outfit across all 4 poses',
    pairs: charPoses,
    pairsPerRow: 2,
  });

  const poseSheetFile = path.join(REVIEW_DIR, `character-poses-${featuredChar.slug}.png`);
  writeFileSync(poseSheetFile, Buffer.from(poseSheetPng.slice(poseSheetPng.indexOf(',') + 1), 'base64'));
  console.log('✓ Generated:', poseSheetFile);

  // 3. Draw order previews for 3 sample characters from this batch
  const sample3 = [batchItems[0], batchItems[2], batchItems[batchItems.length - 1]];
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

  // Copy all to artifact directory
  const copyTargets = [
    `cast-batch-${batchStr}.png`,
    `character-poses-${featuredChar.slug}.png`,
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
