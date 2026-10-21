import type { Stroke } from '../model/types';
import type { Ctx2D } from './canvas';

/** Pen-up moves between strokes take this share of the time drawing the same distance would. */
export const TRAVEL_COST = 0.35;
/** 0.06 s lift pause at 1500 px/s (1x speed), scaled with drawing speed. */
export const LIFT_PAUSE_COST = 90;

/** Ease each stroke: start slightly slower, then steady (ease-in over the first 8% of each stroke). */
export function easeStrokeProgress(f: number): number {
  if (f <= 0) return 0;
  if (f >= 1) return 1;
  const T = 0.08;
  const v1 = 1 / (1 - 0.25 * T); // ~1.0204
  const v0 = 0.5 * v1; // ~0.5102
  const a = (v1 - v0) / (2 * T);
  if (f < T) {
    return a * f * f + v0 * f;
  }
  const gT = (v0 + v1) * 0.5 * T;
  return gT + v1 * (f - T);
}

export interface PreparedStroke {
  /** Flat x0, y0, x1, y1, … */
  pts: Float32Array;
  /** Length from the start of the stroke to each point. */
  cum: Float32Array;
  length: number;
  width: number;
}

interface Leg {
  draw: boolean;
  /** The stroke drawn, or travelled to. */
  stroke: number;
  start: number;
  cost: number;
}

export interface PreparedStrokes {
  strokes: PreparedStroke[];
  legs: Leg[];
  /** Weighted length (drawing plus discounted travel), in asset px. Drives timing. */
  total: number;
}

export interface PenState {
  x: number;
  y: number;
  /** false while travelling between strokes with the pen up. */
  drawing: boolean;
  stroke: number;
  /** Length drawn along `stroke`. */
  along: number;
  /** Strokes fully drawn. */
  completed: number;
}

export function prepareStrokes(strokes: Stroke[]): PreparedStrokes {
  const prepared: PreparedStroke[] = [];
  for (const s of strokes) {
    const n = s.points.length;
    if (n === 0) continue;
    const pts = new Float32Array(n * 2);
    const cum = new Float32Array(n);
    let length = 0;
    for (let i = 0; i < n; i++) {
      const [x, y] = s.points[i];
      if (i > 0) length += Math.hypot(x - pts[i * 2 - 2], y - pts[i * 2 - 1]);
      pts[i * 2] = x;
      pts[i * 2 + 1] = y;
      cum[i] = length;
    }
    prepared.push({ pts, cum, length, width: s.width });
  }

  const legs: Leg[] = [];
  let total = 0;
  prepared.forEach((s, i) => {
    if (i > 0) {
      const prev = prepared[i - 1].pts;
      const travelDist = Math.hypot(s.pts[0] - prev[prev.length - 2], s.pts[1] - prev[prev.length - 1]);
      const cost = travelDist * TRAVEL_COST + LIFT_PAUSE_COST;
      if (cost > 0) {
        legs.push({ draw: false, stroke: i, start: total, cost });
        total += cost;
      }
    }
    // Dots have no length but still take a moment to draw.
    const cost = Math.max(s.length, s.width, 1);
    legs.push({ draw: true, stroke: i, start: total, cost });
    total += cost;
  });
  return { strokes: prepared, legs, total };
}

/** Where the pen is at `progress` (0–1) through the whole drawing. */
export function penAt(p: PreparedStrokes, progress: number): PenState {
  const { strokes, legs } = p;
  if (legs.length === 0) return { x: 0, y: 0, drawing: false, stroke: 0, along: 0, completed: 0 };
  if (progress >= 1) {
    const last = strokes[strokes.length - 1];
    const n = last.pts.length;
    return {
      x: last.pts[n - 2],
      y: last.pts[n - 1],
      drawing: false,
      stroke: strokes.length - 1,
      along: last.length,
      completed: strokes.length,
    };
  }

  const at = Math.max(0, progress) * p.total;
  let lo = 0;
  let hi = legs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (legs[mid].start <= at) lo = mid;
    else hi = mid - 1;
  }
  const leg = legs[lo];
  const f = Math.min(1, (at - leg.start) / leg.cost);
  const s = strokes[leg.stroke];

  if (leg.draw) {
    const along = easeStrokeProgress(f) * s.length;
    const { x, y } = locate(s, along);
    return { x, y, drawing: true, stroke: leg.stroke, along, completed: leg.stroke };
  }
  const prev = strokes[leg.stroke - 1].pts;
  const px = prev[prev.length - 2];
  const py = prev[prev.length - 1];
  return {
    x: px + (s.pts[0] - px) * f,
    y: py + (s.pts[1] - py) * f,
    drawing: false,
    stroke: leg.stroke,
    along: 0,
    completed: leg.stroke,
  };
}

/** The segment containing `along` (index of its first point) and the point there. */
function locate(s: PreparedStroke, along: number): { i: number; x: number; y: number } {
  const { pts, cum } = s;
  const n = cum.length;
  if (n === 1 || along <= 0) return { i: 0, x: pts[0], y: pts[1] };
  if (along >= s.length) return { i: n - 2, x: pts[n * 2 - 2], y: pts[n * 2 - 1] };
  let lo = 0;
  let hi = n - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cum[mid] <= along) lo = mid;
    else hi = mid - 1;
  }
  const seg = cum[lo + 1] - cum[lo];
  const f = seg > 0 ? (along - cum[lo]) / seg : 0;
  return {
    i: lo,
    x: pts[lo * 2] + (pts[lo * 2 + 2] - pts[lo * 2]) * f,
    y: pts[lo * 2 + 1] + (pts[lo * 2 + 3] - pts[lo * 2 + 1]) * f,
  };
}

/** Reveal brush width: wider than the line so anti-aliased edges and small wobbles are covered. */
export const brushWidth = (s: PreparedStroke): number => s.width * 1.8 + 3;

export function setupBrush(ctx: Ctx2D): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000';
}

/** Strokes `s` from its start up to `along` (default: all of it) with the reveal brush. */
export function strokeOnto(ctx: Ctx2D, s: PreparedStroke, along = s.length): void {
  const { pts } = s;
  ctx.lineWidth = brushWidth(s);
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  // A tiny first segment so a dot (or the very start of a stroke) still paints a round cap.
  ctx.lineTo(pts[0] + 0.01, pts[1]);
  if (along >= s.length) {
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  } else {
    const { i, x, y } = locate(s, along);
    for (let k = 1; k <= i; k++) ctx.lineTo(pts[k * 2], pts[k * 2 + 1]);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}
