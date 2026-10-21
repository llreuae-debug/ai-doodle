/**
 * Drawing kit for the "Scenes" library: small illustrations in a bold-ink doodle style with a
 * three-colour palette (lavender, salmon, olive), grey pencil hatching and speckles.
 *
 * A scene is built back to front. Shapes added later hide the lines and fills of earlier ones
 * (clipped with paper.js), so strokes never show through an object in front. The result is a
 * normal library item: strokes in drawing order, fills grouped by colour, all absolute M L C Z.
 */
import paper from 'paper';
import { poly, pt, rays, rrect } from '../draw.mjs';

paper.setup(new paper.Size(200, 200));

export * from '../draw.mjs';

export const C = {
  lav: '#B9A7E8',
  lavDot: '#8E78CF',
  pink: '#F2A68F',
  pinkDot: '#D9816B',
  olive: '#6F7C3C',
  oliveDot: '#525C27',
  grey: '#A3A3A3',
  pale: '#E9E9E9',
  white: '#FFFFFF',
  ink: '#1B1B1B',
};

// ---------- geometry ----------

const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const unit = (a) => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};

/** Catmull-Rom curve segments through pts, as " C ..." commands (no leading M). */
function tail(pts, closed) {
  const n = pts.length;
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = '';
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${pt(...c1)} ${pt(...c2)} ${pt(...p2)}`;
  }
  return d;
}

/** Smooth curve through [x, y] points; a closed loop when `closed`. */
export const sm = (pts, closed = false) => `M${pt(...pts[0])}${tail(pts, closed)}${closed ? ' Z' : ''}`;

/** Closed smooth outline: shorthand for sm(pts, true). */
export const shape = (pts) => sm(pts, true);

/** Moves, scales (and mirrors when f = -1) local points to (x, y). */
export const at = (pts, x, y, k = 1, f = 1, deg = 0) => {
  const r = (deg * Math.PI) / 180;
  return pts.map(([px, py]) => {
    const lx = px * k * f, ly = py * k;
    return [x + lx * Math.cos(r) - ly * Math.sin(r), y + lx * Math.sin(r) + ly * Math.cos(r)];
  });
};

/** A limb or sleeve: a rounded tube along pts, w0 wide at the start and w1 at the end. */
export function tube(pts, w0, w1 = w0) {
  const n = pts.length;
  const tan = (i) => unit(sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]));
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const t = tan(i), nrm = [-t[1], t[0]], w = (w0 + ((w1 - w0) * i) / (n - 1)) / 2;
    L.push(add(pts[i], mul(nrm, w)));
    R.push(sub(pts[i], mul(nrm, w)));
  }
  const tE = tan(n - 1), tS = tan(0), kE = (w1 / 2) * 1.33, kS = (w0 / 2) * 1.33;
  const Rr = [...R].reverse();
  return (
    `M${pt(...L[0])}${tail(L, false)}` +
    ` C${pt(...add(L[n - 1], mul(tE, kE)))} ${pt(...add(R[n - 1], mul(tE, kE)))} ${pt(...R[n - 1])}` +
    `${tail(Rr, false)}` +
    ` C${pt(...sub(R[0], mul(tS, kS)))} ${pt(...sub(L[0], mul(tS, kS)))} ${pt(...L[0])} Z`
  );
}

/** Ellipse outline as points (for smooth shapes and hatch regions). */
export const ring = (cx, cy, rx, ry, n = 12, deg = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, r = (deg * Math.PI) / 180;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    return [cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)];
  });

export const oval = (cx, cy, rx, ry, deg = 0) => shape(ring(cx, cy, rx, ry, 12, deg));

/** Seeded random numbers, so a scene looks the same every build. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cloud-like outline: `n` round bumps around an ellipse (each bump an arc bulging outwards). */
export function puff(cx, cy, rx, ry, n = 7, depth = 0.18, seed = 1) {
  const r = rng(seed);
  const pts = Array.from({ length: n }, (_, i) => {
    const a = ((i + r() * 0.3) / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * rx * (1 - depth), cy + Math.sin(a) * ry * (1 - depth)];
  });
  let d = `M${pt(...pts[0])}`;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const rad = (Math.hypot(b[0] - a[0], b[1] - a[1]) / 2) * (1.05 + r() * 0.25);
    d += ` A${rad.toFixed(1)},${rad.toFixed(1)} 0 0,1 ${pt(...b)}`;
  }
  return `${d} Z`;
}

/** Concentric motion arcs (the "wind" marks next to moving things). */
export function swoosh(cx, cy, r, a0, a1, count = 3, gap = 5) {
  const rad = (d) => (d * Math.PI) / 180;
  return Array.from({ length: count }, (_, i) => {
    const R = r + i * gap;
    const p = (a) => [cx + Math.cos(rad(a)) * R, cy + Math.sin(rad(a)) * R];
    const mid = (a0 + a1) / 2;
    return sm([p(a0), p(mid), p(a1)]);
  }).join(' ');
}

// ---------- scene builder ----------

const f1 = (n) => {
  const v = Math.round(n * 10) / 10;
  return Object.is(v, -0) ? '0' : String(v);
};
const fp = (p) => `${f1(p.x)},${f1(p.y)}`;

/** paper.js item → absolute path data, or '' when empty. Drops crumbs shorter than `min`. */
function toD(it, min = 0) {
  if (!it) return '';
  const paths = it.className === 'CompoundPath' ? it.children : [it];
  const out = [];
  for (const p of paths) {
    if (!p.segments?.length || p.segments.length < 2 || p.length < min) continue;
    const s = p.segments;
    let d = `M${fp(s[0].point)}`;
    for (let k = 0; k < (p.closed ? s.length : s.length - 1); k++) {
      const a = s[k], b = s[(k + 1) % s.length];
      if (a.handleOut.isZero() && b.handleIn.isZero()) d += ` L${fp(b.point)}`;
      else d += ` C${fp(a.point.add(a.handleOut))} ${fp(b.point.add(b.handleIn))} ${fp(b.point)}`;
    }
    out.push(p.closed ? `${d} Z` : d);
  }
  return out.join(' ');
}

const imp = (d) => {
  const it = new paper.CompoundPath(d);
  it.remove();
  return it;
};

/** Thin pencil slivers across a box at `angle`, `gap` apart. */
function hatchLines(box, angle, gap, w, seed) {
  const r = rng(seed);
  const a = (angle * Math.PI) / 180, dir = [Math.cos(a), Math.sin(a)], nrm = [-dir[1], dir[0]];
  const cx = box.center.x, cy = box.center.y, R = Math.hypot(box.width, box.height) / 2 + 4;
  const parts = [];
  for (let o = -R; o <= R; o += gap) {
    const c = add([cx, cy], mul(nrm, o + (r() - 0.5) * gap * 0.35));
    const p0 = sub(c, mul(dir, R)), p1 = add(c, mul(dir, R));
    const h = mul(nrm, w / 2);
    parts.push(`M${pt(...add(p0, h))} L${pt(...add(p1, h))} L${pt(...sub(p1, h))} L${pt(...sub(p0, h))} Z`);
  }
  return parts.join(' ');
}

/** Scatter of small dots inside a box. */
function dotField(box, n, rad, seed) {
  const r = rng(seed);
  const parts = [];
  for (let i = 0; i < n; i++) {
    const x = box.x + r() * box.width, y = box.y + r() * box.height, k = rad * (0.7 + r() * 0.6);
    parts.push(`M${pt(x - k, y)} A${f1(k)},${f1(k)} 0 1,0 ${pt(x + k, y)} A${f1(k)},${f1(k)} 0 1,0 ${pt(x - k, y)} Z`);
  }
  return parts.join(' ');
}

export function scene() {
  const els = [];
  let seed = 7;
  const s = {
    /** Outlined shape with a fill; hides whatever was drawn before it. */
    fill(d, c = C.white, line = true) {
      els.push({ d, fill: c, line, occlude: true });
      return s;
    },
    /** Black filled shape (shoes, hair, pupils). */
    solid(d) {
      return s.fill(d, C.ink);
    },
    /** Ink line only (open or closed); hides nothing. */
    line(...ds) {
      for (const d of ds.flat()) if (d) els.push({ d, line: true });
      return s;
    },
    /** Colour patch with no outline that sits on the shapes under it. */
    tint(d, c) {
      els.push({ d, fill: c, overlay: 1 });
      return s;
    },
    /** Grey pencil hatching clipped to a region. */
    hatch(region, { angle = -40, gap = 3.6, w = 1.1, c = C.grey } = {}) {
      els.push({ d: region, hatch: { angle, gap, w }, fill: c, overlay: 2, seed: seed++ });
      return s;
    },
    /** Speckles clipped to a region. */
    dots(region, c, n = 10, r = 1.1) {
      els.push({ d: region, dots: { n, r }, fill: c, overlay: 3, seed: seed++ });
      return s;
    },
    /** Builds the library item. */
    done(id, name, tags) {
      return build(id, name, tags, els);
    },
  };
  return s;
}

function build(id, name, tags, els) {
  const strokes = [];
  const base = [], over = [];
  let front = null;
  for (let i = els.length - 1; i >= 0; i--) {
    const e = els[i];
    const P = imp(e.d);
    if (e.line) {
      // Clip each subpath on its own: paper.js can't split an open compound path in one go.
      const parts = P.className === 'CompoundPath' ? P.children.map((c) => c.clone({ insert: false })) : [P.clone({ insert: false })];
      const d = parts
        .map((part) => toD(front ? part.subtract(front, { trace: false, insert: false }) : part, 1.2))
        .filter(Boolean)
        .join(' ');
      if (d) strokes.push(d);
    }
    if (e.fill) {
      let f;
      if (e.hatch || e.dots) {
        const raw = imp(e.hatch ? hatchLines(P.bounds, e.hatch.angle, e.hatch.gap, e.hatch.w, e.seed) : dotField(P.bounds, e.dots.n, e.dots.r, e.seed));
        f = raw.intersect(P, { insert: false });
      } else f = P.clone({ insert: false });
      if (front) f = f.subtract(front, { insert: false });
      const d = toD(f);
      if (d) (e.overlay ? over : base).push({ c: e.fill, d, k: e.overlay ?? 0 });
    }
    if (e.occlude) front = front ? front.unite(P, { insert: false }) : P.clone({ insert: false });
  }
  strokes.reverse();

  // Fills: shapes no longer overlap after clipping, so group them by colour; overlays go on top.
  const group = (list) => {
    const m = new Map();
    for (const f of list) m.set(`${f.k}${f.c}`, { c: f.c, d: [...(m.get(`${f.k}${f.c}`)?.d ?? []), f.d] });
    return [...m.values()].map((g) => ({ d: g.d.join(' '), c: g.c }));
  };
  const fills = [...group(base.reverse()), ...group(over.reverse().sort((a, b) => a.k - b.k))];

  // At most 60 strokes: join the shortest neighbouring pair until it fits.
  while (strokes.length > 60) {
    let best = 0, bestLen = Infinity;
    for (let i = 0; i < strokes.length - 1; i++) {
      const l = strokes[i].length + strokes[i + 1].length;
      if (l < bestLen) (bestLen = l), (best = i);
    }
    strokes.splice(best, 2, `${strokes[best]} ${strokes[best + 1]}`);
  }
  return { id, cat: 'scenes', name, tags: ['scene', 'illustration', ...tags], strokes, fills };
}

// ---------- people ----------

/** Head outline in local units (facing right, radius 1): round skull, bulb nose, small chin. */
const HEAD = [[-0.55, 0.86], [-0.97, 0.25], [-0.92, -0.45], [-0.52, -0.9], [0.12, -1.0], [0.68, -0.76], [0.94, -0.3], [1.02, 0.02], [1.4, 0.2], [1.3, 0.42], [1.0, 0.45], [0.93, 0.62], [0.68, 0.9], [0.15, 1.0]];

const HAIR = {
  dark: [[-1.04, 0.3], [-1.08, -0.45], [-0.62, -1.08], [0.18, -1.16], [0.8, -0.86], [0.92, -0.5], [0.45, -0.6], [0.05, -0.5], [-0.38, -0.4], [-0.55, 0.0], [-0.78, 0.35]],
  bob: [[-1.12, 0.75], [-1.12, -0.45], [-0.62, -1.1], [0.2, -1.16], [0.84, -0.84], [0.95, -0.42], [0.48, -0.62], [0.0, -0.55], [-0.42, -0.3], [-0.6, 0.3], [-0.82, 0.8]],
  cap: [[-0.98, -0.1], [-0.82, -0.82], [-0.1, -1.18], [0.66, -0.9], [0.98, -0.32], [1.65, -0.2], [1.62, -0.06], [0.9, -0.1], [-0.2, -0.22]],
};

/**
 * A head: outline, eye, brow, ear, mouth and hair. o.face 1 = right, -1 = left;
 * o.hair: 'dark' | 'bob' | 'cap' | 'bun' | 'tuft' | 'bald'; o.hairC colour; o.mood: 'smile' | 'calm' | 'shout' | 'sleep'.
 */
export function head(s, x, y, r, o = {}) {
  const f = o.face ?? 1, P = (pts) => at(pts, x, y, r, f, (o.tilt ?? 0) * f);
  const hair = o.hair ?? 'tuft', hc = o.hairC ?? C.ink;
  if (hair === 'bun') s.fill(oval(...P([[-0.72, -0.86]])[0], r * 0.36, r * 0.36), hc);
  if (hair === 'bob' || hair === 'long') s.fill(shape(P([[-1.1, -0.3], [-0.6, -1.0], [0.4, -1.0], [0.2, 0.2], [-0.2, 1.2], [-0.9, 1.5], [-1.3, 0.9]])), hc);
  s.fill(shape(P(HEAD)), o.skin ?? C.white);
  if (hair === 'dark' || hair === 'bun' || hair === 'cap') s.fill(shape(P(HAIR[hair === 'bun' ? 'dark' : hair])), hair === 'cap' ? (o.capC ?? C.olive) : hc);
  if (hair === 'bob' || hair === 'long') s.fill(shape(P(HAIR.bob.slice(0, 7).concat([[0.4, -0.6], [-0.3, -0.45]]))), hc);
  if (hair === 'tuft') s.line(sm(P([[-0.15, -0.98], [-0.05, -1.32], [0.22, -1.38], [0.28, -1.12]])), sm(P([[0.18, -1.0], [0.42, -1.28]])));
  const mood = o.mood ?? 'smile';
  if (mood === 'sleep' || mood === 'happy') s.line(sm(P([[0.3, -0.12], [0.45, -0.02], [0.6, -0.12]])));
  else s.solid(oval(...P([[0.48, -0.12]])[0], r * 0.1, r * 0.12));
  s.line(sm(P([[0.3, -0.42], [0.48, -0.5], [0.66, -0.44]])));
  if (o.glasses) s.line(oval(...P([[0.5, -0.12]])[0], r * 0.24, r * 0.22), sm(P([[0.26, -0.15], [-0.1, -0.18]])));
  if (mood === 'shout') s.fill(shape(P([[0.72, 0.5], [1.02, 0.5], [0.96, 0.82], [0.76, 0.8]])), C.ink);
  else if (mood === 'happy' || mood === 'grin') s.line(sm(P([[0.5, 0.56], [0.7, 0.72], [0.9, 0.62]])));
  return s;
}

/** Pointy black shoe at the ankle, toe pointing along f (1 right, -1 left), turned by deg. */
export const shoe = (x, y, f = 1, k = 1, deg = 0) => shape(at([[-6, -3.5], [3.5, -5], [11, -2.5], [16, 2], [9, 4.8], [-5, 4.3]], x, y, k, f, deg * f));

/** Mitten hand at (x, y). */
export const mitt = (x, y, r = 5, f = 1, deg = 0) => shape(at([[-0.9, -0.75], [0.2, -0.95], [1.05, -0.45], [1.1, 0.35], [0.4, 0.9], [-0.7, 0.8], [-1.1, 0.0]], x, y, r, 1, deg));

/** Preset poses, facing right, origin at the hips, y up negative. Arms and legs run root → hand/ankle. */
const POSES = {
  stand: { neck: [2, -38], armB: [[-3, -33], [-7, -18], [-6, -5]], armF: [[6, -33], [9, -18], [10, -5]], legB: [[-4, 0], [-5, 22], [-6, 43]], legF: [[4, 0], [5, 22], [6, 43]] },
  walk: { neck: [4, -38], armB: [[-1, -33], [-8, -20], [-12, -9]], armF: [[6, -33], [13, -20], [20, -11]], legB: [[-3, 0], [-10, 21], [-17, 40]], legF: [[3, 0], [12, 20], [16, 41]] },
  run: { neck: [12, -35], armB: [[8, -31], [20, -22], [31, -21]], armF: [[10, -31], [-2, -21], [-13, -27]], legB: [[-3, 0], [-16, 14], [-34, 8]], legF: [[3, 0], [21, 6], [22, 30]] },
  cheer: { neck: [1, -38], armB: [[-4, -33], [-14, -46], [-17, -62]], armF: [[6, -33], [16, -46], [21, -62]], legB: [[-4, 0], [-8, 22], [-11, 43]], legF: [[4, 0], [8, 22], [11, 43]] },
  hold: { neck: [3, -38], armB: [[0, -33], [10, -21], [22, -24]], armF: [[6, -33], [15, -20], [27, -22]], legB: [[-4, 0], [-5, 22], [-6, 43]], legF: [[4, 0], [5, 22], [7, 43]] },
  lift: { neck: [2, -38], armB: [[-2, -33], [6, -47], [14, -60]], armF: [[6, -33], [14, -47], [22, -60]], legB: [[-4, 0], [-7, 22], [-9, 43]], legF: [[4, 0], [8, 22], [10, 43]] },
  point: { neck: [2, -38], armB: [[-3, -33], [-7, -18], [-6, -5]], armF: [[6, -33], [20, -38], [34, -45]], legB: [[-4, 0], [-5, 22], [-6, 43]], legF: [[4, 0], [6, 22], [8, 43]] },
  sit: { neck: [-2, -38], armB: [[-5, -33], [2, -18], [14, -10]], armF: [[3, -33], [10, -18], [22, -10]], legB: [[-2, 0], [20, -2], [22, 22]], legF: [[2, 0], [24, -1], [27, 22]] },
  think: { neck: [2, -38], armB: [[-3, -33], [-7, -18], [-6, -5]], armF: [[6, -33], [16, -22], [12, -40]], legB: [[-4, 0], [-5, 22], [-6, 43]], legF: [[4, 0], [5, 22], [6, 43]] },
};

/**
 * A person standing on their feet with hips at (x, y). o.pose names a preset; o.k scales it;
 * o.face mirrors it; any of neck/armB/armF/legB/legF in o overrides the preset (local units).
 * Colours: o.shirt, o.pants ('hatch' = white trousers with pencil shading), o.sleeves.
 */
export function person(s, x, y, o = {}) {
  const k = o.k ?? 1, f = o.face ?? 1, p = { ...POSES[o.pose ?? 'stand'], ...o };
  const short = (pts) => pts.map(([a, b]) => [a * 0.85, b * 0.8]);
  const P = (pts) => at(pts, x, y, k, f);
  const shirt = o.shirt ?? C.white, pants = o.pants ?? 'hatch';
  const pantsC = pants === 'hatch' ? C.white : pants;
  const leg = (pts) => {
    const d = tube(P(pts), 13 * k, 11 * k);
    s.fill(d, pantsC);
    if (pants === 'hatch') s.hatch(d, { angle: -55 * f });
    const a = P(pts.slice(-2));
    const deg = (Math.atan2(a[1][1] - a[0][1], (a[1][0] - a[0][0]) * f) * 180) / Math.PI - 90;
    if (o.paws) s.fill(oval(a[1][0] + 3 * f * k, a[1][1] + 1 * k, 8.5 * k, 5 * k), pantsC);
    else s.solid(shoe(a[1][0], a[1][1] + 2 * k, f, k, o.shoeTurn ?? Math.max(-60, Math.min(60, deg * 0.6))));
  };
  const arm = (pts) => {
    const q = P(pts);
    s.fill(tube(q, 10.5 * k, 9 * k), o.sleeves ?? shirt);
    const e = q[q.length - 1], d = q[q.length - 2];
    s.fill(mitt(e[0] + (e[0] - d[0]) * 0.18, e[1] + (e[1] - d[1]) * 0.18, 5.6 * k, f, (Math.atan2(e[1] - d[1], e[0] - d[0]) * 180) / Math.PI), o.handC ?? C.white);
  };
  if (!o.noBackArm) arm(p.armB);
  leg(short(p.legB));
  leg(short(p.legF));
  const neck = P([p.neck])[0], hip = [x, y];
  const mid = [(neck[0] + hip[0]) / 2 + (o.belly ?? 1.5) * f * k, (neck[1] + hip[1]) / 2];
  s.fill(tube([hip, mid, neck], 29 * k, 24 * k), shirt);
  if (o.tummy) s.fill(oval(mid[0] + 2 * f * k, mid[1] + 3 * k, 9 * k, 11 * k), o.tummy);
  if (o.shirtDots) s.dots(tube([hip, mid, neck], 29 * k, 24 * k), o.shirtDots, 8, 1);
  if (o.tie) s.fill(shape(P([[p.neck[0] + 1, p.neck[1] + 3], [p.neck[0] + 4, p.neck[1] + 6], [p.neck[0] + 2, p.neck[1] + 22], [p.neck[0] - 1, p.neck[1] + 6]])), o.tie);
  const hv = unit(sub(neck, hip));
  const hx = neck[0] + hv[0] * 12 * k + 2 * f * k, hy = neck[1] + hv[1] * 12 * k;
  const drawHead = () => (o.headFn ? o.headFn(s, hx, hy - 2 * k, 15 * k, f) : head(s, hx, hy, 14 * k, { face: f, ...o.head }));
  if (!o.headLast) drawHead();
  if (!o.noFrontArm) arm(p.armF);
  if (o.headLast) drawHead();
  return s;
}

/** Handy point helper for scenes: where a pose's front hand ends up. */
export const handOf = (x, y, o = {}, which = 'armF') => {
  const p = { ...POSES[o.pose ?? 'stand'], ...o };
  const raw = which.startsWith('leg') ? p[which].map(([a, b]) => [a * 0.85, b * 0.8]) : p[which];
  const pts = at(raw, x, y, o.k ?? 1, o.face ?? 1);
  return pts[pts.length - 1];
};

/** Pencil scribble shadow on the ground. */
export const ground = (s, cx, cy, rx, ry = 5) => s.hatch(oval(cx, cy, rx, ry), { angle: -60, gap: 3.2 });

// ---------- animals ----------

/** Bear head (round ears, white muzzle). o.face, o.c colour, o.mood 'happy' | 'calm'. */
export function bear(s, x, y, r, o = {}) {
  const f = o.face ?? 1, c = o.c ?? C.lav, P = (pts) => at(pts, x, y, r, f);
  s.fill(oval(...P([[-0.62, -0.78]])[0], r * 0.3, r * 0.3), c);
  s.fill(oval(...P([[0.42, -0.9]])[0], r * 0.28, r * 0.28), c);
  s.fill(shape(P([[-1, 0.1], [-0.82, -0.6], [-0.1, -1.0], [0.62, -0.78], [1.0, -0.15], [0.95, 0.5], [0.4, 0.92], [-0.5, 0.88]])), c);
  if (o.dots !== false) s.dots(shape(P([[-0.9, 0.1], [-0.6, -0.7], [0.0, -0.9], [-0.3, 0.6]])), o.dotC ?? C.lavDot, 7, 0.8);
  s.fill(shape(P([[0.25, 0.05], [0.78, -0.1], [1.25, 0.1], [1.2, 0.45], [0.7, 0.6], [0.3, 0.45]])), C.white);
  s.solid(oval(...P([[1.12, 0.12]])[0], r * 0.13, r * 0.1));
  s.line(sm(P([[0.75, 0.42], [0.9, 0.5], [1.05, 0.4]])));
  if ((o.mood ?? 'happy') === 'happy') s.line(sm(P([[0.12, -0.3], [0.28, -0.42], [0.44, -0.3]])));
  else s.solid(oval(...P([[0.3, -0.3]])[0], r * 0.08, r * 0.1));
  return s;
}

/** Bear head seen from the front. */
export function bearFront(s, x, y, r, o = {}) {
  const c = o.c ?? C.lav, P = (pts) => at(pts, x, y, r);
  s.fill(oval(...P([[-0.72, -0.72]])[0], r * 0.3, r * 0.3), c).fill(oval(...P([[0.72, -0.72]])[0], r * 0.3, r * 0.3), c);
  s.fill(shape(P([[-1, 0.05], [-0.8, -0.65], [0, -0.95], [0.8, -0.65], [1, 0.05], [0.75, 0.75], [0, 0.95], [-0.75, 0.75]])), c);
  s.dots(shape(P([[-0.9, 0.0], [-0.6, -0.7], [0.0, -0.85], [-0.4, 0.5]])), o.dotC ?? C.lavDot, 6, 0.8);
  s.fill(oval(...P([[0, 0.38]])[0], r * 0.42, r * 0.32), C.white);
  s.solid(oval(...P([[0, 0.24]])[0], r * 0.14, r * 0.1));
  s.line(sm(P([[-0.16, 0.5], [0, 0.6], [0.16, 0.5]])));
  if ((o.mood ?? 'happy') === 'happy') s.line(sm(P([[-0.55, -0.15], [-0.4, -0.28], [-0.25, -0.15]])), sm(P([[0.25, -0.15], [0.4, -0.28], [0.55, -0.15]])));
  else s.solid(oval(...P([[-0.4, -0.18]])[0], r * 0.09, r * 0.11)).solid(oval(...P([[0.4, -0.18]])[0], r * 0.09, r * 0.11));
  return s;
}

/** Cat head with pointy ears and whiskers. */
export function cat(s, x, y, r, o = {}) {
  const f = o.face ?? 1, c = o.c ?? C.pink, P = (pts) => at(pts, x, y, r, f);
  s.fill(shape(P([[-0.95, 0.2], [-0.95, -0.55], [-0.85, -1.25], [-0.35, -0.85], [0.3, -0.85], [0.85, -1.25], [0.98, -0.5], [1.0, 0.25], [0.55, 0.85], [-0.5, 0.85]])), c);
  s.dots(shape(P([[-0.8, 0.5], [-0.8, -0.5], [0.0, -0.6], [-0.3, 0.6]])), o.dotC ?? C.pinkDot, 6, 0.7);
  if ((o.mood ?? 'happy') === 'sleep') s.line(sm(P([[-0.55, -0.1], [-0.38, 0.0], [-0.22, -0.1]])), sm(P([[0.22, -0.1], [0.38, 0.0], [0.55, -0.1]])));
  else s.solid(oval(...P([[-0.38, -0.12]])[0], r * 0.1, r * 0.13)).solid(oval(...P([[0.38, -0.12]])[0], r * 0.1, r * 0.13));
  s.solid(shape(P([[-0.1, 0.18], [0.1, 0.18], [0, 0.3]])));
  s.line(sm(P([[-0.18, 0.42], [0, 0.32], [0.18, 0.42]])), sm(P([[-0.55, 0.28], [-1.25, 0.18]])), sm(P([[-0.55, 0.42], [-1.2, 0.5]])), sm(P([[0.55, 0.28], [1.25, 0.18]])), sm(P([[0.55, 0.42], [1.2, 0.5]])));
  return s;
}

/** Round bird with a beak, wing and stick legs; body centre (x, y). */
export function bird(s, x, y, r, o = {}) {
  const f = o.face ?? 1, c = o.c ?? C.olive, P = (pts) => at(pts, x, y, r, f);
  if (o.legs !== false) s.line(sm(P([[-0.2, 0.8], [-0.25, 1.3]])), sm(P([[0.2, 0.8], [0.2, 1.3]])), sm(P([[-0.45, 1.32], [-0.05, 1.32]])), sm(P([[0.0, 1.32], [0.4, 1.32]])));
  s.fill(shape(P([[-1.0, 0.0], [-0.65, -0.75], [0.2, -1.0], [0.85, -0.55], [1.0, 0.15], [0.55, 0.85], [-0.4, 0.9], [-1.25, 0.45], [-1.5, 0.3]])), c);
  s.fill(shape(P([[0.92, -0.35], [1.45, -0.18], [0.95, 0.02]])), o.beak ?? C.pink);
  s.solid(oval(...P([[0.45, -0.4]])[0], r * 0.11, r * 0.13));
  s.fill(shape(P([[-0.55, -0.05], [0.1, -0.15], [0.35, 0.25], [-0.1, 0.55], [-0.65, 0.35]])), o.wing ?? C.lav);
  return s;
}

/** Dog head with floppy ears. */
export function dog(s, x, y, r, o = {}) {
  const f = o.face ?? 1, c = o.c ?? C.white, P = (pts) => at(pts, x, y, r, f);
  s.fill(shape(P([[-0.9, -0.2], [-0.55, -0.85], [0.25, -0.95], [0.8, -0.55], [0.95, 0.0], [1.5, 0.15], [1.45, 0.55], [0.8, 0.75], [-0.2, 0.9], [-0.85, 0.5]])), c);
  s.fill(shape(P([[-0.5, -0.75], [-0.05, -0.7], [-0.25, 0.25], [-0.65, 0.35], [-0.8, -0.2]])), o.ear ?? C.olive);
  s.solid(oval(...P([[1.42, 0.3]])[0], r * 0.14, r * 0.12));
  s.solid(oval(...P([[0.48, -0.32]])[0], r * 0.1, r * 0.12));
  s.line(sm(P([[1.0, 0.62], [1.2, 0.7], [1.38, 0.6]])));
  return s;
}

// ---------- props ----------

export const heart = (cx, cy, r, deg = 0) =>
  shape(at([[0, 0.95], [-0.55, 0.45], [-0.92, 0.0], [-1.0, -0.42], [-0.78, -0.82], [-0.38, -0.9], [-0.08, -0.62], [0, -0.5], [0.08, -0.62], [0.38, -0.9], [0.78, -0.82], [1.0, -0.42], [0.92, 0.0], [0.55, 0.45]], cx, cy, r, 1, deg));

/** Four-point sparkle. */
export const sparkle = (cx, cy, r) => poly([[cx, cy - r], [cx + r * 0.22, cy - r * 0.22], [cx + r, cy], [cx + r * 0.22, cy + r * 0.22], [cx, cy + r], [cx - r * 0.22, cy + r * 0.22], [cx - r, cy], [cx - r * 0.22, cy - r * 0.22]], true);

/** Leaf from its stem end (x, y), `len` long, pointing at deg. */
export const leaf = (x, y, len, deg = -90, w = 0.38) => shape(at([[0, 0], [len * 0.35, -len * w], [len, 0], [len * 0.35, len * w]], x, y, 1, 1, deg));

/** Sheet of paper centred at (x, y) with a folded corner and text lines, turned by deg. */
export function doc(s, x, y, w, h, deg = 0, o = {}) {
  const P = (pts) => at(pts, x, y, 1, 1, deg);
  const fold = Math.min(w, h) * 0.24;
  s.fill(poly(P([[-w / 2, -h / 2], [w / 2 - fold, -h / 2], [w / 2, -h / 2 + fold], [w / 2, h / 2], [-w / 2, h / 2]]), true), o.c ?? C.white);
  s.line(poly(P([[w / 2 - fold, -h / 2], [w / 2 - fold, -h / 2 + fold], [w / 2, -h / 2 + fold]])));
  const n = o.lines ?? Math.max(1, Math.floor((h - 14) / 7));
  s.line(Array.from({ length: n }, (_, i) => poly(P([[-w / 2 + 6, -h / 2 + 11 + i * 7], [w / 2 - 6 - (i === n - 1 ? w * 0.35 : i === 0 ? fold : 0), -h / 2 + 11 + i * 7]]))).join(' '));
  return s;
}

/** Speech bubble: rounded box centred at (x, y) with its tail tip at (tx, ty). */
export function bubble(s, x, y, w, h, tx, ty, c = C.white) {
  const l = x - w / 2, r = x + w / 2, t = y - h / 2, b = y + h / 2;
  const side = tx < x ? -1 : 1;
  const bx = x + side * w * 0.18;
  s.fill(shape([[l + 6, t], [x, t - 2], [r - 6, t], [r + 1, y], [r - 6, b], [bx + 6 * side, b], [tx, ty], [bx - 4 * side, b], [l + 6, b], [l - 1, y]]), c);
  return s;
}

/** Light bulb with rays; glass centre (x, y). */
export function bulb(s, x, y, r, c = C.white, glow = true) {
  if (glow) s.line(rays(x, y, r * 1.35, r * 1.75, 7, 200).filter((_, i) => i !== 1).join(' '));
  s.fill(shape([[x - r * 0.42, y + r * 1.15], [x - r * 0.5, y + r * 0.75], [x - r, y - r * 0.05], [x - r * 0.7, y - r * 0.8], [x, y - r], [x + r * 0.7, y - r * 0.8], [x + r, y - r * 0.05], [x + r * 0.5, y + r * 0.75], [x + r * 0.42, y + r * 1.15]]), c);
  s.fill(rrect(x - r * 0.46, y + r * 1.12, r * 0.92, r * 0.5, r * 0.12), C.ink);
  s.line(sm([[x - r * 0.25, y + r * 0.95], [x - r * 0.3, y + r * 0.2], [x, y - r * 0.05], [x + r * 0.3, y + r * 0.2], [x + r * 0.25, y + r * 0.95]]));
  return s;
}

/** Clock face; hands at hour h and minute m. */
export function clock(s, x, y, r, rim = C.pink, h = 10, m = 10) {
  s.fill(oval(x, y, r, r), rim).dots(oval(x, y, r, r), C.pinkDot, 8, 1);
  s.fill(oval(x, y, r * 0.8, r * 0.8), C.white);
  const tick = (i) => {
    const a = (i / 12) * Math.PI * 2;
    return poly([[x + Math.sin(a) * r * 0.64, y - Math.cos(a) * r * 0.64], [x + Math.sin(a) * r * 0.72, y - Math.cos(a) * r * 0.72]]);
  };
  s.line([0, 3, 6, 9].map(tick).join(' '));
  const ha = (h / 12) * Math.PI * 2, ma = (m / 60) * Math.PI * 2;
  s.line(poly([[x + Math.sin(ha) * r * 0.38, y - Math.cos(ha) * r * 0.38], [x, y], [x + Math.sin(ma) * r * 0.56, y - Math.cos(ma) * r * 0.56]]));
  s.solid(oval(x, y, r * 0.07, r * 0.07));
  return s;
}

/** Open laptop: screen box above a keyboard base; base front edge at y. Returns the screen box. */
export function laptop(s, x, y, w, screen = C.lav, o = {}) {
  const h = w * 0.62, base = poly([[x - w * 0.5, y - w * 0.1], [x + w * 0.5, y - w * 0.1], [x + w * 0.58, y], [x - w * 0.58, y]], true);
  s.fill(rrect(x - w * 0.5, y - w * 0.1 - h, w, h, 5), C.white);
  const sx = x - w * 0.43, sy = y - w * 0.1 - h + w * 0.07, sw = w * 0.86, sh = h - w * 0.14;
  s.fill(poly([[sx, sy], [sx + sw, sy], [sx + sw, sy + sh], [sx, sy + sh]], true), screen);
  if (o.dots !== false) s.dots(poly([[sx, sy], [sx + sw, sy], [sx + sw, sy + sh], [sx, sy + sh]], true), screen === C.olive ? C.oliveDot : screen === C.pink ? C.pinkDot : C.lavDot, 10, 1);
  s.fill(base, C.white).hatch(base, { angle: -20 });
  return { x: sx, y: sy, w: sw, h: sh };
}

/** Phone standing at (x, y) centre, turned by deg. */
export function phone(s, x, y, w, h, deg = 0, screen = C.lav) {
  const P = (pts) => at(pts, x, y, 1, 1, deg);
  s.fill(shape(P([[-w / 2, -h / 2 + 4], [-w / 2 + 4, -h / 2], [w / 2 - 4, -h / 2], [w / 2, -h / 2 + 4], [w / 2, h / 2 - 4], [w / 2 - 4, h / 2], [-w / 2 + 4, h / 2], [-w / 2, h / 2 - 4]])), C.ink);
  s.fill(poly(P([[-w / 2 + 4, -h / 2 + 8], [w / 2 - 4, -h / 2 + 8], [w / 2 - 4, h / 2 - 9], [-w / 2 + 4, h / 2 - 9]]), true), screen);
  return s;
}

/** Potted plant; pot rim centre (x, y). */
export function plant(s, x, y, k = 1, pot = C.pink) {
  const P = (pts) => at(pts, x, y, k);
  s.fill(leaf(...P([[-2, 0]])[0], 30 * k, -125), C.olive).fill(leaf(...P([[2, 0]])[0], 32 * k, -60), C.olive).fill(leaf(...P([[0, 0]])[0], 36 * k, -92, 0.3), C.olive);
  s.line(sm(P([[0, 0], [0, -26]])));
  const pt_ = P([[-14, 0], [14, 0], [10, 24], [-10, 24]]);
  s.fill(poly(pt_, true), pot).dots(poly(pt_, true), C.pinkDot, 6, 1);
  s.fill(rrect(x - 16 * k, y - 2 * k, 32 * k, 7 * k, 2), pot);
  return s;
}

/** Dashed path: `n` short dashes along fn(t) for t in [0, 1]. */
export const dashes = (fn, n = 8, fill = 0.55) =>
  Array.from({ length: n }, (_, i) => {
    const a = i / n, b = a + fill / n;
    return sm([fn(a), fn((a + b) / 2), fn(b)]);
  }).join(' ');
