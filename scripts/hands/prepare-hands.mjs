#!/usr/bin/env node
/**
 * Turns generated hand photos into the app's drawing hands.
 *
 *   assets/hands/masters/<id>.png   (generated, plain light background, not in git)
 *     -> public/hands/<id>.webp + <id>.png   2048×2048, transparent, normalised pose
 *     -> public/hands/thumbs/<id>.webp       256×256 picker thumbnail
 *     -> public/hands/hands.json             [{ id, name, file, png, thumb, tipX, tipY, arm, premium, group }]
 *     -> assets/hands/_review/hands.png      contact sheet with a red dot on every pen tip
 *
 * Every hand is cut out (colour-matched against the background sampled from the corners), its
 * pen tip found (or taken from "tip" in hands.src.json), its forearm extended along its own
 * direction so it runs off the frame, then rotated and scaled to one shared pose with the tip
 * at the same pixel (in hands.src.json, "at" moves a hand's tip pixel and "rotate" in degrees and "scale" fine-tune it). Runs the image work in headless Chrome.
 *
 *   node scripts/hands/prepare-hands.mjs [id ...]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MASTERS = path.join(ROOT, 'assets/hands/masters');
const OUT_DIR = path.join(ROOT, 'public/hands');
const REVIEW = path.join(ROOT, 'assets/hands/_review');

/** Shared pose: output size, where the pen tip lands, the tip-to-hand distance and its angle. */
const POSE = { size: 2048, tip: [200, 200], reach: 1300, angleDeg: 48 };
/** Picker thumbnail: this square from the top-left of the posed hand, scaled to THUMB px. */
const THUMB_CROP = 1500;
const THUMB = 256;

const only = new Set(process.argv.slice(2));
const entries = JSON.parse(readFileSync(path.join(ROOT, 'scripts/hands/hands.src.json'), 'utf8'));
mkdirSync(path.join(OUT_DIR, 'thumbs'), { recursive: true });
mkdirSync(REVIEW, { recursive: true });

/** Runs inside the browser page; must be self-contained. */
async function processHand({ dataUrl, pose, thumb, tipOverride, extraRotateDeg, extraScale }) {
  const img = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const w = img.width;
  const h = img.height;
  const PAD = 2600;
  const W = w + PAD;
  const H = h + PAD;
  const big = new OffscreenCanvas(W, H);
  const g = big.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const image = g.getImageData(0, 0, W, H);
  const d = image.data;
  const at = (x, y) => (y * W + x) * 4;

  // 1. Background colour: median of three corners that never hold the arm.
  const rs = [];
  const gs = [];
  const bs = [];
  for (const [cx, cy] of [[0, 0], [w - 40, 0], [0, h - 40]]) {
    for (let y = cy; y < cy + 40; y += 4) for (let x = cx; x < cx + 40; x += 4) {
      const i = at(x, y);
      rs.push(d[i]);
      gs.push(d[i + 1]);
      bs.push(d[i + 2]);
    }
  }
  const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
  const bg = [med(rs), med(gs), med(bs)];
  const bgLum = 0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2];
  const isBg = (i) => {
    const r = d[i], gg = d[i + 1], b = d[i + 2];
    if (Math.hypot(r - bg[0], gg - bg[1], b - bg[2]) < 40) return true;
    // Soft grey shadows cast on the background (never lighter than it).
    const lum = 0.299 * r + 0.587 * gg + 0.114 * b;
    const chroma = Math.max(r, gg, b) - Math.min(r, gg, b);
    return chroma < 20 && lum <= bgLum + 2 && lum > bgLum - 80;
  };
  /** The fill only crosses smooth colour changes, so it stops at an outline (a white sleeve on grey). */
  const smooth = (i, j) => Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i + 2] - d[j + 2]) < 10;

  // 2. Flood-fill the background from the photo's border and make it transparent.
  const mask = new Uint8Array(w * h);
  const stack = [];
  const seed = (x, y, from) => {
    const p = y * w + x;
    const i = at(x, y);
    if (mask[p] || !isBg(i)) return;
    if (from >= 0 && !smooth(i, at(from % w, (from - (from % w)) / w))) return;
    mask[p] = 1;
    stack.push(p);
  };
  // Seed from the top and left edges only: the arm leaves through the bottom and right, and a
  // shaded sleeve there can look like background.
  for (let x = 0; x < w; x++) seed(x, 0, -1);
  for (let y = 0; y < h; y++) seed(0, y, -1);
  while (stack.length) {
    const p = stack.pop();
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) seed(x - 1, y, p);
    if (x < w - 1) seed(x + 1, y, p);
    if (y > 0) seed(x, y - 1, p);
    if (y < h - 1) seed(x, y + 1, p);
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const i = at(x, y);
      if (mask[p]) d[i + 3] = 0;
      else if ((x > 0 && mask[p - 1]) || (x < w - 1 && mask[p + 1]) || (y > 0 && mask[p - w]) || (y < h - 1 && mask[p + w])) d[i + 3] = 140;
    }
  }
  const solid = (x, y) => d[at(x, y) + 3] >= 200;

  // 3. Pen tip: the solid pixel furthest up-left, unless given.
  let tip = tipOverride;
  let cx = 0;
  let cy = 0;
  let n = 0;
  let best = Infinity;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!solid(x, y)) continue;
      if (!tipOverride && x + y * 0.35 < best) {
        best = x + y * 0.35;
        tip = [x, y];
      }
      if ((x & 3) === 0 && (y & 3) === 0) (cx += x, cy += y, n++);
    }
  }
  if (!tip || n === 0) throw new Error('no hand found');

  // 4. Extend the forearm along its direction past the right and bottom edges.
  let ex = 0, ey = 0, m = 0;
  for (let y = 0; y < h; y++) if (solid(w - 1, y)) (ex += w - 1, ey += y, m++);
  for (let x = 0; x < w - 1; x++) if (solid(x, h - 1)) (ex += x, ey += h - 1, m++);
  let dir = null;
  if (m) {
    ex /= m;
    ey /= m;
    let fx = 0, fy = 0, k = 0;
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
      const dist = Math.hypot(x - ex, y - ey);
      if (dist >= 200 && dist <= 420 && solid(x, y)) (fx += x, fy += y, k++);
    }
    if (k) {
      const vx = ex - fx / k, vy = ey - fy / k, len = Math.hypot(vx, vy);
      if (len > 0) dir = [vx / len, vy / len];
    }
  }
  if (dir) {
    const [dx, dy] = dir;
    for (let y = 0; y < H; y++) {
      for (let x = y < h ? w : 0; x < W; x++) {
        const t = Math.max(x >= w && dx > 0 ? (x - (w - 1)) / dx : 0, y >= h && dy > 0 ? (y - (h - 1)) / dy : 0);
        // Sample a few px inside the photo, past the soft cut-out rim.
        const sx = Math.round(x - (t + 6) * dx), sy = Math.round(y - (t + 6) * dy);
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
        const s = at(sx, sy);
        if (d[s + 3] >= 200) d.copyWithin(at(x, y), s, s + 4);
      }
    }
  }
  g.putImageData(image, 0, 0);

  // 5. Normalise: tip -> hand centre at a fixed angle and length, tip at a fixed pixel.
  const vx = cx / n - tip[0], vy = cy / n - tip[1];
  const rot = ((pose.angleDeg + extraRotateDeg) * Math.PI) / 180 - Math.atan2(vy, vx);
  const scale = (pose.reach * extraScale) / Math.hypot(vx, vy);
  const out = new OffscreenCanvas(pose.size, pose.size);
  const o = out.getContext('2d');
  o.imageSmoothingQuality = 'high';
  o.translate(pose.tip[0], pose.tip[1]);
  o.rotate(rot);
  o.scale(scale, scale);
  o.translate(-tip[0], -tip[1]);
  o.drawImage(big, 0, 0);
  const toUrl = async (type, quality) => {
    const blob = await out.convertToBlob({ type, quality });
    return new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(blob);
    });
  };
  const th = new OffscreenCanvas(thumb.size, thumb.size);
  const tg = th.getContext('2d');
  tg.imageSmoothingQuality = 'high';
  tg.drawImage(out, 0, 0, thumb.crop, thumb.crop, 0, 0, thumb.size, thumb.size);
  const thumbBlob = await th.convertToBlob({ type: 'image/webp', quality: 0.85 });
  const thumbUrl = await new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(thumbBlob);
  });
  return {
    thumb: thumbUrl,
    webp: await toUrl('image/webp', 0.9),
    png: await toUrl('image/png'),
    detectedTip: tip,
    background: bg,
    rotationDeg: Math.round((rot * 180) / Math.PI),
    scale: Math.round(scale * 1000) / 1000,
    armExtended: !!dir,
    // The forearm's direction in the output image: the app continues the arm along it.
    arm: dir ? [Math.cos(rot) * dir[0] - Math.sin(rot) * dir[1], Math.sin(rot) * dir[0] + Math.cos(rot) * dir[1]].map((v) => Math.round(v * 1e4) / 1e4) : null,
  };
}

/** Contact sheet: each hand on white and on a blackboard, with a red dot on the pen tip. */
async function reviewSheet({ items, pose }) {
  const cell = 320;
  const cols = 5;
  const rows = Math.ceil(items.length / cols);
  const c = new OffscreenCanvas(cols * cell, rows * (cell * 2 + 28));
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < items.length; i++) {
    const { name, webp, tip } = items[i];
    const img = await createImageBitmap(await (await fetch(webp)).blob());
    const x = (i % cols) * cell;
    const y = Math.floor(i / cols) * (cell * 2 + 28);
    for (const [k, bgc] of [[0, '#ffffff'], [1, '#22272b']]) {
      g.fillStyle = bgc;
      g.fillRect(x, y + k * cell, cell, cell);
      g.drawImage(img, x, y + k * cell, cell, cell);
      const s = cell / pose.size;
      g.fillStyle = '#ff2020';
      g.beginPath();
      g.arc(x + tip[0] * s, y + k * cell + tip[1] * s, 4, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#111';
    g.font = '600 16px sans-serif';
    g.fillText(name, x + 8, y + cell * 2 + 19);
  }
  const blob = await c.convertToBlob({ type: 'image/png' });
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(blob);
  });
}

const fromDataUrl = (url) => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await page.setContent('<!doctype html><title>hands</title>');

const manifestPath = path.join(OUT_DIR, 'hands.json');
const existing = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : [];
const byId = new Map(existing.map((h) => [h.id, h]));
const reviewed = [];

for (const entry of entries) {
  const master = path.join(MASTERS, `${entry.id}.png`);
  if (!existsSync(master) || (only.size && !only.has(entry.id))) continue;
  const dataUrl = `data:image/png;base64,${readFileSync(master).toString('base64')}`;
  const pose = { ...POSE, tip: entry.at ?? POSE.tip };
  const r = await page.evaluate(processHand, { dataUrl, pose, thumb: { crop: THUMB_CROP, size: THUMB }, tipOverride: entry.tip ?? null, extraRotateDeg: entry.rotate ?? 0, extraScale: entry.scale ?? 1 });
  writeFileSync(path.join(OUT_DIR, `${entry.id}.webp`), fromDataUrl(r.webp));
  writeFileSync(path.join(OUT_DIR, `${entry.id}.png`), fromDataUrl(r.png));
  writeFileSync(path.join(OUT_DIR, 'thumbs', `${entry.id}.webp`), fromDataUrl(r.thumb));
  byId.set(entry.id, {
    id: entry.id,
    name: entry.name,
    file: `/hands/${entry.id}.webp`,
    png: `/hands/${entry.id}.png`,
    thumb: `/hands/thumbs/${entry.id}.webp`,
    tipX: pose.tip[0],
    tipY: pose.tip[1],
    ...(r.arm ? { arm: r.arm } : {}),
    premium: entry.premium,
    group: entry.group,
  });
  reviewed.push({ name: entry.name, webp: r.webp, tip: pose.tip });
  console.log(`${entry.id}: tip ${r.detectedTip} · bg rgb(${r.background}) · rotate ${r.rotationDeg}° · scale ${r.scale} · arm ${r.armExtended ? 'extended' : 'not found'}`);
}

const order = new Map(entries.map((e, i) => [e.id, i]));
const manifest = [...byId.values()].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
if (reviewed.length) {
  const sheet = await page.evaluate(reviewSheet, { items: reviewed, pose: POSE });
  writeFileSync(path.join(REVIEW, 'hands.png'), fromDataUrl(sheet));
  console.log(`review sheet: ${path.join(REVIEW, 'hands.png')}`);
}
await browser.close();
