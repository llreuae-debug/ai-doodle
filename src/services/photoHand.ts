import { createSurface } from '../engine/canvas';
import type { HandTail, LoadedHand } from '../engine/resources';
import type { HandPhoto } from '../model/types';

/** Photo hands are drawn this fraction of the stage's shorter side wide (the full 2048 image). */
export const PHOTO_HAND_FIT = 0.42;
/** A pixel counts as solid above this alpha. */
const SOLID = 200;
/** The edge strip is taken this far inside the image, past the soft cut-out rim. */
const EDGE_INSET = 2;
/** The arm's direction is measured between the edge strip and a strip this far further in. */
const SLOPE_SPAN = 240;
/** How far the tail runs, in multiples of the image size: past any stage corner. */
const TAIL_LENGTH = 8;
/** An edge is only swept if the arm heads out through it at least this steeply (unit vector part). */
const MIN_SWEEP = 0.15;

type Pixels = { d: Uint8ClampedArray; w: number; h: number };

/** Mean position and count of the solid pixels along a row (horizontal) or a column. */
function solidLine({ d, w, h }: Pixels, horizontal: boolean, at: number): { mean: number; count: number } {
  let sum = 0;
  let count = 0;
  const n = horizontal ? w : h;
  for (let k = 0; k < n; k++) {
    const i = horizontal ? (at * w + k) * 4 : (k * w + at) * 4;
    if (d[i + 3] < SOLID) continue;
    sum += k;
    count++;
  }
  return { mean: count ? sum / count : 0, count };
}

/** One row (or column) of the image as a 1 px strip, solid pixels only and fully opaque. */
function edgeStrip({ d, w, h }: Pixels, horizontal: boolean, at: number): OffscreenCanvas {
  const n = horizontal ? w : h;
  const strip = createSurface(horizontal ? n : 1, horizontal ? 1 : n);
  const out = strip.ctx.createImageData(horizontal ? n : 1, horizontal ? 1 : n);
  for (let k = 0; k < n; k++) {
    const i = horizontal ? (at * w + k) * 4 : (k * w + at) * 4;
    if (d[i + 3] < SOLID) continue;
    out.data.set([d[i], d[i + 1], d[i + 2], 255], k * 4);
  }
  strip.ctx.putImageData(out, 0, 0);
  return strip.canvas;
}

/**
 * The forearm's direction, when hands.json doesn't give it: from how far the arm's centre shifts
 * between the edge strip it leaves through (bottom or right, whichever has more arm) and a strip
 * SLOPE_SPAN further in.
 */
function measureArm(px: Pixels): [number, number] | null {
  const bottomY = px.h - 1 - EDGE_INSET;
  const rightX = px.w - 1 - EDGE_INSET;
  const bottom = solidLine(px, true, bottomY);
  const right = solidLine(px, false, rightX);
  if (bottom.count === 0 && right.count === 0) return null;
  const horizontal = bottom.count >= right.count;
  const inner = solidLine(px, horizontal, (horizontal ? bottomY : rightX) - SLOPE_SPAN);
  if (inner.count === 0) return null;
  const shift = (horizontal ? bottom.mean : right.mean) - inner.mean;
  const [x, y] = horizontal ? [shift, SLOPE_SPAN] : [SLOPE_SPAN, shift];
  const len = Math.hypot(x, y);
  return [x / len, y / len];
}

/**
 * Where the forearm leaves the image through the bottom or right edge, that edge's last row (or
 * column) of pixels swept outward along the arm, so the arm carries on seamlessly.
 */
function armTails(px: Pixels, arm: [number, number] | null): HandTail[] {
  const { w, h } = px;
  const tails: HandTail[] = [];
  if (!arm) return tails;
  const [ax, ay] = arm;
  const length = Math.max(w, h) * TAIL_LENGTH;
  const bottomY = h - 1 - EDGE_INSET;
  const rightX = w - 1 - EDGE_INSET;
  // Bottom: x moves by ax / ay per px down. Right: y moves by ay / ax per px right.
  if (ay > MIN_SWEEP && solidLine(px, true, bottomY).count > 0) {
    tails.push({ image: edgeStrip(px, true, bottomY), width: w, height: length, transform: [1, 0, ax / ay, 1, 0, bottomY] });
  }
  if (ax > MIN_SWEEP && solidLine(px, false, rightX).count > 0) {
    tails.push({ image: edgeStrip(px, false, rightX), width: length, height: h, transform: [1, ay / ax, 0, 1, rightX, 0] });
  }
  return tails;
}

async function fetchBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return createImageBitmap(await res.blob());
}

/**
 * A photo hand from public/hands (already cut out and posed by scripts/hands/prepare-hands.mjs),
 * with its forearm continued past the image edges. Falls back to the PNG if the WebP can't be decoded.
 */
export async function loadPhotoHand(id: string, photo: HandPhoto): Promise<LoadedHand> {
  const bitmap = await fetchBitmap(photo.file).catch(() => fetchBitmap(photo.png));
  const w = bitmap.width;
  const h = bitmap.height;
  const surface = createSurface(w, h);
  surface.ctx.drawImage(bitmap, 0, 0);
  const d = surface.ctx.getImageData(0, 0, w, h).data;
  return {
    id,
    image: bitmap,
    width: w,
    height: h,
    tipX: photo.tipX,
    tipY: photo.tipY,
    scale: 1,
    fit: PHOTO_HAND_FIT,
    tails: armTails({ d, w, h }, photo.arm ?? measureArm({ d, w, h })),
  };
}
