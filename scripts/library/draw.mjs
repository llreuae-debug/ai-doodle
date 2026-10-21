/**
 * Drawing helpers for library items. Every helper returns path data in absolute commands only
 * (M L C Q A Z), in the 200×200 viewBox, starting with M.
 */

const r1 = (n) => Math.round(n * 10) / 10;
export const pt = (x, y) => `${r1(x)},${r1(y)}`;

export const line = (x1, y1, x2, y2) => `M${pt(x1, y1)} L${pt(x2, y2)}`;

/** Open polyline through [x, y] points; closed with Z when `close`. */
export const poly = (pts, close = false) => `M${pts.map(([x, y]) => pt(x, y)).join(' L')}${close ? ' Z' : ''}`;

export const rect = (x, y, w, h) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true);

export const rrect = (x, y, w, h, r) =>
  `M${pt(x + r, y)} L${pt(x + w - r, y)} A${r1(r)},${r1(r)} 0 0,1 ${pt(x + w, y + r)} L${pt(x + w, y + h - r)} ` +
  `A${r1(r)},${r1(r)} 0 0,1 ${pt(x + w - r, y + h)} L${pt(x + r, y + h)} A${r1(r)},${r1(r)} 0 0,1 ${pt(x, y + h - r)} ` +
  `L${pt(x, y + r)} A${r1(r)},${r1(r)} 0 0,1 ${pt(x + r, y)} Z`;

export const ellipse = (cx, cy, rx, ry) =>
  `M${pt(cx - rx, cy)} A${r1(rx)},${r1(ry)} 0 1,0 ${pt(cx + rx, cy)} A${r1(rx)},${r1(ry)} 0 1,0 ${pt(cx - rx, cy)} Z`;

export const circle = (cx, cy, r) => ellipse(cx, cy, r, r);

const rad = (deg) => (deg * Math.PI) / 180;
const polar = (cx, cy, r, deg) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];

/** Open circular arc from angle a0 to a1 in degrees (0 = right, 90 = down), clockwise when a1 > a0. */
export function arc(cx, cy, r, a0, a1) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `M${pt(x0, y0)} A${r1(r)},${r1(r)} 0 ${large},${sweep} ${pt(x1, y1)}`;
}

/** Closed pie slice (for charts). */
export function wedge(cx, cy, r, a0, a1) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  return `M${pt(cx, cy)} L${pt(x0, y0)} A${r1(r)},${r1(r)} 0 ${a1 - a0 > 180 ? 1 : 0},1 ${pt(x1, y1)} Z`;
}

/** Quadratic curve from p0 through control c to p1. */
export const quad = ([x0, y0], [cx, cy], [x1, y1]) => `M${pt(x0, y0)} Q${pt(cx, cy)} ${pt(x1, y1)}`;

/** Cubic curve. */
export const cubic = ([x0, y0], [c1x, c1y], [c2x, c2y], [x1, y1]) => `M${pt(x0, y0)} C${pt(c1x, c1y)} ${pt(c2x, c2y)} ${pt(x1, y1)}`;

/** Closed shape through points joined by quadratic curves whose controls are the given points (a smooth blob). */
export function blob(pts) {
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const n = pts.length;
  let d = `M${pt(...mid(pts[n - 1], pts[0]))}`;
  for (let i = 0; i < n; i++) d += ` Q${pt(...pts[i])} ${pt(...mid(pts[i], pts[(i + 1) % n]))}`;
  return `${d} Z`;
}

/** Regular star or polygon: `points` tips between radius r and inner radius ri. */
export function star(cx, cy, r, ri, points, rot = -90) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) pts.push(polar(cx, cy, i % 2 ? ri : r, rot + (i * 180) / points));
  return poly(pts, true);
}

/** Short lines radiating around a centre (sun rays, sparkle). */
export const rays = (cx, cy, r0, r1_, count, rot = 0) =>
  Array.from({ length: count }, (_, i) => {
    const a = rot + (i * 360) / count;
    const [x0, y0] = polar(cx, cy, r0, a);
    const [x1, y1] = polar(cx, cy, r1_, a);
    return line(x0, y0, x1, y1);
  });

/** Evenly spaced parallel lines inside a box (hatching, text placeholders). */
export const hlines = (x, y, w, gap, count, shrinkLast = 0.6) =>
  Array.from({ length: count }, (_, i) => line(x, y + i * gap, x + (i === count - 1 ? w * shrinkLast : w), y + i * gap));

export const item = (cat, id, name, tags, strokes, fills) => ({ id, cat, name, tags, strokes: strokes.flat(), fills });

/** Rotates [x, y] points by `deg` around the origin, then moves them to (cx, cy). */
export const place = (pts, cx, cy, deg) =>
  pts.map(([x, y]) => [cx + x * Math.cos(rad(deg)) - y * Math.sin(rad(deg)), cy + x * Math.sin(rad(deg)) + y * Math.cos(rad(deg))]);

/** Crescent opening to the right: outer arc radius r, inner arc flatter by `thin` (> 1). */
export const crescent = (cx, cy, r, thin = 1.25) =>
  `M${pt(cx, cy - r)} A${r1(r)},${r1(r)} 0 1,0 ${pt(cx, cy + r)} A${r1(r * thin)},${r1(r * thin)} 0 0,1 ${pt(cx, cy - r)} Z`;

/** Scalloped closed outline (flower, thought cloud): `count` bumps on a circle of radius r. */
export function scallop(cx, cy, r, count, bump) {
  const pts = Array.from({ length: count }, (_, i) => polar(cx, cy, r, -90 + (i * 360) / count));
  return `M${pt(...pts[0])} ${pts.map((_, i) => `A${r1(bump)},${r1(bump)} 0 0,1 ${pt(...pts[(i + 1) % count])}`).join(' ')} Z`;
}

/** Several closed shapes as one path (one fill for many beads, windows, ...). */
export const join = (...paths) => paths.flat().join(' ');
