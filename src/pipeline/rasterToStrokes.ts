import type { Point, Stroke } from '../model/types';

/** RGBA pixels, like ImageData. */
export interface RasterImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface TraceOptions {
  /** How much darker than its surroundings (0–255) a pixel must be to count as ink. */
  contrast?: number;
  /** Pixels darker than this (0–255) always count as ink, so solid fills survive. Default: from Otsu. */
  darkCutoff?: number;
  /**
   * Stroke order. 'nearest' (default) hops to the closest stroke, starting top-left: right for drawings.
   * 'reading' writes line by line, left to right: right for text. Needs `lineHeight` and `lineTop`.
   */
  order?: 'nearest' | 'reading';
  /** With 'reading': write right to left (Urdu, Arabic). */
  rtl?: boolean;
  lineHeight?: number;
  lineTop?: number;
  /** Strokes shorter than this (px) are dropped. Default: the line width, at least 5. */
  minLength?: number;
}

export interface TraceResult {
  strokes: Stroke[];
  /** Average line thickness found, in px. */
  lineWidth: number;
}

const SIMPLIFY_EPSILON = 0.8;

/**
 * Turns a raster image into ordered centreline strokes for the draw-on effect:
 * threshold → drop specks → Zhang-Suen skeleton → trace into polylines → simplify → order.
 * Pure and synchronous; run it in a worker.
 */
export function rasterToStrokes(img: RasterImage, options: TraceOptions = {}): TraceResult {
  const { width: w, height: h } = img;
  const lum = luminance(img);
  const ink = binarize(lum, w, h, options.contrast ?? 14, options.darkCutoff ?? otsu(lum) * 0.6);
  const inkCount = removeSmallBlobs(ink, w, h, Math.max(8, Math.round((w * h) / 40000)));
  thin(ink, w, h);

  let skeletonCount = 0;
  for (let i = 0; i < ink.length; i++) skeletonCount += ink[i];
  const lineWidth = Math.min(40, Math.max(1, inkCount / Math.max(1, skeletonCount)));
  const minLength = options.minLength ?? Math.max(5, lineWidth);

  const paths = traceSkeleton(ink, w, h)
    .map((p) => simplify(p, SIMPLIFY_EPSILON))
    .filter((p) => pathLength(p) >= minLength);
  const ordered =
    options.order === 'reading' && options.lineHeight ? orderReading(paths, options.lineHeight, options.lineTop ?? 0, options.rtl) : orderPaths(paths);
  return { strokes: ordered.map((points) => ({ points, width: lineWidth })), lineWidth };
}

/** Luminance 0–255, with transparent pixels treated as white paper. */
function luminance({ width, height, data }: RasterImage): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let i = 0; i < out.length; i++) {
    const a = data[i * 4 + 3] / 255;
    const l = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    out[i] = Math.round(l * a + 255 * (1 - a));
  }
  return out;
}

function otsu(lum: Uint8Array): number {
  const hist = new Float64Array(256);
  for (let i = 0; i < lum.length; i++) hist[lum[i]]++;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = lum.length - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/** Adaptive threshold against the local mean, plus anything darker than `darkCutoff`. Border pixels stay 0. */
function binarize(lum: Uint8Array, w: number, h: number, contrast: number, darkCutoff: number): Uint8Array {
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += lum[y * w + x];
      integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + row;
    }
  }
  const r = Math.max(6, Math.round(Math.max(w, h) / 60));
  const ink = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(h, y + r + 1);
    for (let x = 1; x < w - 1; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w, x + r + 1);
      const sum =
        integral[y1 * (w + 1) + x1] - integral[y0 * (w + 1) + x1] - integral[y1 * (w + 1) + x0] + integral[y0 * (w + 1) + x0];
      const mean = sum / ((x1 - x0) * (y1 - y0));
      const l = lum[y * w + x];
      if (l < darkCutoff || (l < mean - contrast && l < 245)) ink[y * w + x] = 1;
    }
  }
  return ink;
}

/** Clears 8-connected blobs smaller than `minArea`. Returns the ink pixels left. */
function removeSmallBlobs(ink: Uint8Array, w: number, h: number, minArea: number): number {
  const seen = new Uint8Array(w * h);
  const blob = new Int32Array(w * h);
  let remaining = 0;
  for (let start = 0; start < ink.length; start++) {
    if (!ink[start] || seen[start]) continue;
    let size = 0;
    let head = 0;
    blob[size++] = start;
    seen[start] = 1;
    while (head < size) {
      const i = blob[head++];
      const x = i % w;
      for (let dy = -w; dy <= w; dy += w) {
        for (let dx = -1; dx <= 1; dx++) {
          const n = i + dy + dx;
          if (n < 0 || n >= ink.length || x + dx < 0 || x + dx >= w) continue;
          if (ink[n] && !seen[n]) {
            seen[n] = 1;
            blob[size++] = n;
          }
        }
      }
    }
    if (size < minArea) for (let k = 0; k < size; k++) ink[blob[k]] = 0;
    else remaining += size;
  }
  return remaining;
}

/** Zhang-Suen thinning, in place. Expects border pixels to be 0. */
function thin(img: Uint8Array, w: number, h: number): void {
  const remove = new Int32Array(w * h);
  let changed = true;
  while (changed) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      let count = 0;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (!img[i]) continue;
          const p2 = img[i - w];
          const p3 = img[i - w + 1];
          const p4 = img[i + 1];
          const p5 = img[i + w + 1];
          const p6 = img[i + w];
          const p7 = img[i + w - 1];
          const p8 = img[i - 1];
          const p9 = img[i - w - 1];
          const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (b < 2 || b > 6) continue;
          const a =
            +(!p2 && !!p3) + +(!p3 && !!p4) + +(!p4 && !!p5) + +(!p5 && !!p6) +
            +(!p6 && !!p7) + +(!p7 && !!p8) + +(!p8 && !!p9) + +(!p9 && !!p2);
          if (a !== 1) continue;
          if (pass === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;
          remove[count++] = i;
        }
      }
      for (let k = 0; k < count; k++) img[remove[k]] = 0;
      if (count > 0) changed = true;
    }
  }
}

/** Splits a 1-px skeleton into polylines that run between end points and junctions, plus closed loops. */
function traceSkeleton(sk: Uint8Array, w: number, h: number): Point[][] {
  // Clockwise from north, then the same ring with straight neighbours first so diagonals don't skip pixels.
  const ring = [-w, -w + 1, 1, w + 1, w, w - 1, -1, -w - 1];
  const stepOrder = [ring[0], ring[2], ring[4], ring[6], ring[1], ring[3], ring[5], ring[7]];
  const size = w * h;

  // Crossing number: 1 = end point, 2 = on a line, 3+ = junction. Anything but 2 is a node.
  const node = new Uint8Array(size);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!sk[i]) continue;
      let crossings = 0;
      for (let k = 0; k < 8; k++) if (!sk[i + ring[k]] && sk[i + ring[(k + 1) % 8]]) crossings++;
      if (crossings !== 2) node[i] = 1;
    }
  }

  const visited = new Uint8Array(size);
  const point = (i: number): Point => [(i % w) + 0.5, Math.floor(i / w) + 0.5];
  const walk = (from: number, first: number): Point[] => {
    const path = [point(from)];
    visited[from] = 1;
    let prev = from;
    let cur = first;
    for (;;) {
      path.push(point(cur));
      if (node[cur]) {
        visited[cur] = 1;
        break;
      }
      visited[cur] = 1;
      let next = -1;
      for (const d of stepOrder) {
        const n = cur + d;
        if (n !== prev && sk[n] && (node[n] || !visited[n])) {
          next = n;
          break;
        }
      }
      if (next < 0) break;
      prev = cur;
      cur = next;
    }
    return path;
  };

  const paths: Point[][] = [];
  for (let i = 0; i < size; i++) {
    if (!node[i]) continue;
    for (const d of stepOrder) {
      const n = i + d;
      if (sk[n] && !node[n] && !visited[n]) paths.push(walk(i, n));
    }
  }
  // What's left has no end points or junctions: closed loops.
  for (let i = 0; i < size; i++) {
    if (!sk[i] || node[i] || visited[i]) continue;
    visited[i] = 1;
    const first = stepOrder.map((d) => i + d).find((n) => sk[n] && !visited[n]);
    if (first === undefined) continue;
    const path = walk(i, first);
    const [lx, ly] = path[path.length - 1];
    const [sx, sy] = path[0];
    if (Math.abs(lx - sx) <= 1 && Math.abs(ly - sy) <= 1) path.push(path[0]);
    paths.push(path);
  }
  // Nodes no path touched: specks thinned to a pixel or two, like the dot on an i. Keep them as
  // one-point strokes; the length filter drops them unless the caller wants short strokes.
  for (let i = 0; i < size; i++) if (node[i] && !visited[i]) paths.push([point(i)]);
  return paths;
}

/** Ramer-Douglas-Peucker. */
function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [a, b] = stack.pop()!;
    let maxDist = 0;
    let index = -1;
    for (let i = a + 1; i < b; i++) {
      const d = distanceToSegment(points[i], points[a], points[b]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > epsilon) {
      keep[index] = 1;
      stack.push([a, index], [index, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function distanceToSegment([px, py]: Point, [ax, ay]: Point, [bx, by]: Point): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function pathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return len;
}

/**
 * Handwriting order: line by line, then by each stroke's leftmost point, so letters are written left
 * to right. Each stroke starts at its upper-left end, the way a pen usually enters a letter.
 */
function orderReading(paths: Point[][], lineHeight: number, lineTop: number, rtl = false): Point[][] {
  // Right to left mirrors x: sort by the rightmost point and start strokes at their upper-right end.
  const dir = rtl ? -1 : 1;
  return paths
    .map((p) => {
      let lead = Infinity;
      let sumY = 0;
      for (const [x, y] of p) {
        lead = Math.min(lead, x * dir);
        sumY += y;
      }
      return { p, lead, line: Math.floor((sumY / p.length - lineTop) / lineHeight) };
    })
    .sort((a, b) => a.line - b.line || a.lead - b.lead)
    .map(({ p }) => {
      const [ax, ay] = p[0];
      const [bx, by] = p[p.length - 1];
      return bx * dir + by * 0.3 < ax * dir + ay * 0.3 ? p.slice().reverse() : p;
    });
}

/** Greedy nearest neighbour from the top-left corner, flipping a path when its far end is closer. */
function orderPaths(paths: Point[][]): Point[][] {
  const left = paths.slice();
  const out: Point[][] = [];
  let cx = 0;
  let cy = 0;
  while (left.length > 0) {
    let best = 0;
    let bestDist = Infinity;
    let flip = false;
    for (let i = 0; i < left.length; i++) {
      const p = left[i];
      const [ax, ay] = p[0];
      const [bx, by] = p[p.length - 1];
      const da = (ax - cx) ** 2 + (ay - cy) ** 2;
      const db = (bx - cx) ** 2 + (by - cy) ** 2;
      if (da < bestDist) {
        bestDist = da;
        best = i;
        flip = false;
      }
      if (db < bestDist) {
        bestDist = db;
        best = i;
        flip = true;
      }
    }
    const chosen = left[best];
    left[best] = left[left.length - 1];
    left.pop();
    const path = flip ? chosen.slice().reverse() : chosen;
    out.push(path);
    [cx, cy] = path[path.length - 1];
  }
  return out;
}
