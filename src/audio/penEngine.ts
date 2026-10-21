import { elementBox } from '../engine/geometry';
import { artKey, type Resources } from '../engine/resources';
import { drawPhaseEnd, type Timeline } from '../engine/timeline';
import { STAGE_SIZE, type DrawSoundConfig, type DrawSoundType, type Project } from '../model/types';

/**
 * Sample-based pen sound. Real recordings (public/pen-sounds/<type>.mp3 + .json, made by
 * tools/prepare-pen-sounds.mjs) are played back granularly, driven by the same strokes and timing
 * the hand follows: a tap when the pen touches down, grains chosen by pen speed while it moves
 * (slow = quieter and darker, fast = louder and brighter), a dip and a small catch at sharp
 * corners, a whole recorded stroke for very short marks, and a lift when the pen leaves the board.
 * Everything is scheduled into an AudioContext from a seeded random source, so preview and MP4
 * export (both rendered offline by audio/mix.ts) sound exactly the same every time.
 */

export const SAMPLE_RATE = 48000;

// ---------- sample banks ----------

interface Segment {
  start: number;
  dur: number;
}
interface Grain extends Segment {
  rms: number;
  centroid: number;
}
export interface PenBankMap {
  type: string;
  grains: Grain[];
  strokes: (Segment & { label: 'short' | 'medium' | 'long' })[];
  taps: Segment[];
  lifts: Segment[];
  cap?: { off?: Segment; on?: Segment };
}
export interface PenBank {
  map: PenBankMap;
  buffer: AudioBuffer;
  /** Grains in order of loudness + brightness (0 = softest/darkest). */
  ranked: { grain: Grain; score: number }[];
}

/** Built-in pen types with recorded banks. 'soft' is the soft (felt) marker. */
export const BANK_TYPES: DrawSoundType[] = ['marker', 'chalk', 'pencil', 'soft', 'ballpoint'];
const bankUrl = (type: string, ext: 'json' | 'mp3') => `/pen-sounds/${type}.${ext}`;

const banks = new Map<string, Promise<PenBank>>();

function rank(map: PenBankMap, buffer: AudioBuffer): PenBank {
  const byRms = [...map.grains].sort((a, b) => a.rms - b.rms);
  const byCentroid = [...map.grains].sort((a, b) => a.centroid - b.centroid);
  const n = Math.max(1, map.grains.length - 1);
  const ranked = map.grains
    .map((grain) => ({ grain, score: 0.6 * (byRms.indexOf(grain) / n) + 0.4 * (byCentroid.indexOf(grain) / n) }))
    .sort((a, b) => a.score - b.score);
  return { map, buffer, ranked };
}

/**
 * Loads and decodes a pen type's sprite once (AudioBuffers can be shared between contexts).
 * Other types load only when chosen.
 */
export function loadPenBank(type: DrawSoundType, ctx: BaseAudioContext): Promise<PenBank> {
  let job = banks.get(type);
  if (!job) {
    job = (async () => {
      const [mapRes, audioRes] = await Promise.all([fetch(bankUrl(type, 'json')), fetch(bankUrl(type, 'mp3'))]);
      if (!mapRes.ok || !audioRes.ok) throw new Error(`pen sound "${type}" is missing`);
      const map = (await mapRes.json()) as PenBankMap;
      const buffer = await ctx.decodeAudioData(await audioRes.arrayBuffer());
      return rank(map, buffer);
    })();
    job.catch(() => banks.delete(type));
    banks.set(type, job);
  }
  return job;
}

/**
 * An uploaded sound becomes a bank by slicing it into grains (no taps or lifts). Its grains are
 * ranked by loudness and brightness like the recorded banks.
 */
const customBanks = new Map<string, Promise<PenBank>>();
export function loadCustomBank(url: string, ctx: BaseAudioContext): Promise<PenBank> {
  let job = customBanks.get(url);
  if (!job) {
    job = (async () => {
      const buffer = await ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
      const data = buffer.getChannelData(0);
      const grains: Grain[] = [];
      const len = 0.16;
      for (let t = 0; t + len < buffer.duration; t += 0.12) {
        const a = Math.floor(t * buffer.sampleRate);
        const b = Math.floor((t + len) * buffer.sampleRate);
        let sum = 0;
        let cross = 0;
        for (let i = a; i < b; i++) {
          sum += data[i] * data[i];
          if (i > a && Math.sign(data[i]) !== Math.sign(data[i - 1])) cross++;
        }
        const rms = Math.sqrt(sum / (b - a));
        // Zero-crossing rate stands in for brightness.
        if (rms > 0.005) grains.push({ start: t, dur: len, rms, centroid: (cross / (b - a)) * buffer.sampleRate });
      }
      if (grains.length < 3) throw new Error('the uploaded pen sound is too quiet or too short');
      return rank({ type: 'custom', grains, strokes: [], taps: [], lifts: [] }, buffer);
    })();
    job.catch(() => customBanks.delete(url));
    customBanks.set(url, job);
  }
  return job;
}

// ---------- the pen's path ----------

/** One pen-down stroke as the hand draws it, in seconds and board (stage) pixels. */
export interface PenStroke {
  t0: number;
  t1: number;
  /** Board px per second. */
  speed: number;
  /** Stereo position at the start and end (−0.25 … +0.25, from the hand's x). */
  pan0: number;
  pan1: number;
  /** Times of sharp turns (> 60°). */
  corners: number[];
}

/** Hand x → stereo position. */
const PAN_RANGE = 0.25;
/** A turn sharper than this is a corner. */
const CORNER_DEG = 60;
/** Corners closer than this to each other or to a stroke end are skipped. */
const CORNER_GAP_S = 0.04;
/** Distance along the stroke used to measure direction, board px. */
const DIRECTION_STEP = 6;

/**
 * Every pen-down stroke in the project, from the same strokes and timing the renderer uses for the
 * hand. Slides with "Pen sound on this slide" off and hidden elements are skipped.
 */
export function penPath(project: Project, timeline: Timeline, resources: Resources): PenStroke[] {
  const W = STAGE_SIZE[project.aspectRatio].width;
  const pan = (x: number) => Math.max(-PAN_RANGE, Math.min(PAN_RANGE, ((x - W / 2) / (W / 2)) * PAN_RANGE));
  const out: PenStroke[] = [];
  project.scenes.forEach((scene, i) => {
    const st = timeline.scenes[i];
    if (!st || scene.drawSound === false) return;
    scene.elements.forEach((el, k) => {
      const et = st.elements[k];
      if (el.hidden || el.anim.type !== 'draw' || !et || et.end <= et.start) return;
      const box = elementBox(el, project);
      const key = artKey(el, project);
      const art = key ? resources.art.get(key) : undefined;
      const duration = et.end - et.start;
      if (!art || art.strokes.total <= 0) {
        // Text still being traced is swept left to right: one steady stroke.
        if (el.kind === 'text') {
          const t0 = et.start / 1000;
          const t1 = Math.min(et.end, st.end) / 1000;
          out.push({ t0, t1, speed: box.w / Math.max(0.1, t1 - t0), pan0: pan(box.x), pan1: pan(box.x + box.w), corners: [] });
        }
        return;
      }
      const ps = art.strokes;
      const k2 = box.w / art.width;
      const drawMs = drawPhaseEnd(duration) * duration;
      for (const leg of ps.legs) {
        if (!leg.draw) continue;
        const s = ps.strokes[leg.stroke];
        const t0 = (et.start + (leg.start / ps.total) * drawMs) / 1000;
        const t1 = Math.min(et.start + ((leg.start + leg.cost) / ps.total) * drawMs, st.end) / 1000;
        if (t1 <= t0) continue;
        const n = s.pts.length / 2;
        const sx = (j: number) => box.x + s.pts[j * 2] * k2;
        const len = s.length * k2;
        // Sharp turns: compare the direction a little before and after each point.
        const corners: number[] = [];
        let last = -Infinity;
        for (let j = 1; j < n - 1; j++) {
          const at = s.cum[j];
          const back = findAt(s.cum, at - DIRECTION_STEP / k2);
          const ahead = findAt(s.cum, at + DIRECTION_STEP / k2);
          if (back === j || ahead === j) continue;
          const ax = s.pts[j * 2] - s.pts[back * 2];
          const ay = s.pts[j * 2 + 1] - s.pts[back * 2 + 1];
          const bx = s.pts[ahead * 2] - s.pts[j * 2];
          const by = s.pts[ahead * 2 + 1] - s.pts[j * 2 + 1];
          const cos = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by) || 1);
          if (Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI) <= CORNER_DEG) continue;
          const t = t0 + (at / (s.length || 1)) * (t1 - t0);
          if (t - last < CORNER_GAP_S || t - t0 < CORNER_GAP_S || t1 - t < CORNER_GAP_S) continue;
          corners.push(t);
          last = t;
        }
        out.push({ t0, t1, speed: len / (t1 - t0), pan0: pan(sx(0)), pan1: pan(sx(n - 1)), corners });
      }
    });
  });
  return out.sort((a, b) => a.t0 - b.t0);
}

/** Index of the point closest to distance `d` along a stroke. */
function findAt(cum: Float32Array, d: number): number {
  let lo = 0;
  let hi = cum.length - 1;
  if (d <= 0) return 0;
  if (d >= cum[hi]) return hi;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < d) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// ---------- scheduling ----------

/** Small seeded PRNG so a project always sounds the same. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A project's sound seed, from its id. */
export function projectSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Pen speed (board px/s) that maps to the softest and the loudest grains. */
const SLOW = 250;
const FAST = 4000;
const intensityOf = (speed: number) => Math.max(0, Math.min(1, Math.log(Math.max(speed, 1) / SLOW) / Math.log(FAST / SLOW)));
/** Strokes shorter than this play one whole recorded stroke instead of grains. */
const SHORT_S = 0.25;
const ROOM_WET = 0.08;
/** Grains start this long after the tap. */
const TAP_LEAD_S = 0.02;
const ROOM_S = 0.15;

/** A short generated room so the pen sounds in a room, not in your ear (seeded noise, exponential decay). */
function roomImpulse(ctx: BaseAudioContext, rand: () => number): AudioBuffer {
  const n = Math.floor(ROOM_S * ctx.sampleRate);
  const ir = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (rand() * 2 - 1) * Math.exp((-6 * i) / n);
  }
  return ir;
}

/** Stereo output being written, plus the bank's samples (mono) resampled to the output rate. */
interface Out {
  L: Float32Array<ArrayBuffer>;
  R: Float32Array<ArrayBuffer>;
  sr: number;
  src: Float32Array;
  /** Bank sample rate / output sample rate. */
  ratio: number;
}

/** Equal-power pan (as StereoPannerNode does for a mono input): pan −1 … +1. */
const panGains = (pan: number): [number, number] => {
  const x = ((pan + 1) / 2) * (Math.PI / 2);
  return [Math.cos(x), Math.sin(x)];
};

/**
 * Adds one recorded segment at `at` seconds: playback rate (pitch), gain, a 12 ms fade at the end,
 * and pan (fixed, or ramped between two values). `gainAt`, if given, multiplies every sample (the
 * stroke's speed envelope); `fadeIn`/`fadeOut` give equal-power crossfades in seconds.
 */
function addSegment(
  o: Out,
  seg: Segment,
  at: number,
  opts: { gain: number; rate?: number; maxDur?: number; pan0: number; pan1?: number; fadeIn?: number; fadeOut?: number; gainAt?: (i: number) => number },
): void {
  const rate = opts.rate ?? 1;
  const segLen = Math.min(seg.dur, (opts.maxDur ?? Infinity) * rate);
  const outLen = Math.floor((segLen / rate) * o.sr);
  const i0 = Math.floor(at * o.sr);
  const s0 = seg.start * o.sr * o.ratio;
  const step = rate * o.ratio;
  const fin = Math.max(1, Math.floor((opts.fadeIn ?? 0) * o.sr));
  const fout = Math.max(1, Math.floor((opts.fadeOut ?? 0.012) * o.sr));
  const pan1 = opts.pan1 ?? opts.pan0;
  for (let k = 0; k < outLen; k++) {
    const i = i0 + k;
    if (i < 0) continue;
    if (i >= o.L.length) break;
    const pos = s0 + k * step;
    const j = Math.floor(pos);
    const f = pos - j;
    const v = (o.src[j] ?? 0) * (1 - f) + (o.src[j + 1] ?? 0) * f;
    let env = opts.gain;
    if (opts.fadeIn && k < fin) env *= Math.sin(((k / fin) * Math.PI) / 2);
    if (k > outLen - fout) env *= opts.fadeIn ? Math.cos((((k - (outLen - fout)) / fout) * Math.PI) / 2) : (outLen - k) / fout;
    if (opts.gainAt) env *= opts.gainAt(i);
    const p = pan1 === opts.pan0 ? opts.pan0 : opts.pan0 + (pan1 - opts.pan0) * (k / Math.max(1, outLen));
    const [gl, gr] = panGains(p);
    o.L[i] += v * env * gl;
    o.R[i] += v * env * gr;
  }
}

/**
 * Renders the pen sound for `strokes` straight into stereo sample arrays (no audio node per stroke
 * or grain, so a long video renders in seconds rather than minutes). Same rules as before, from a
 * seeded random source, so preview and export are identical.
 */
export function renderPen(
  strokes: PenStroke[],
  bank: PenBank,
  opts: { seed: number; sampleRate: number; durationS: number; capOffAt?: number },
): { L: Float32Array<ArrayBuffer>; R: Float32Array<ArrayBuffer> } {
  const sr = opts.sampleRate;
  const n = Math.ceil(opts.durationS * sr);
  const o: Out = { L: new Float32Array(n), R: new Float32Array(n), sr, src: bank.buffer.getChannelData(0), ratio: bank.buffer.sampleRate / sr };
  const rand = mulberry32(opts.seed);
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  const { map, ranked } = bank;
  const shorts = map.strokes.filter((x) => x.label === 'short');

  if (opts.capOffAt !== undefined && map.cap?.off) addSegment(o, map.cap.off, Math.max(0, opts.capOffAt), { gain: 0.7, pan0: 0 });

  let prevGrain: Grain | null = null;
  for (const s of strokes) {
    const dur = s.t1 - s.t0;
    const intensity = intensityOf(s.speed);
    const level = 0.35 + 0.65 * intensity;
    const panAt = (t: number) => s.pan0 + (s.pan1 - s.pan0) * Math.max(0, Math.min(1, (t - s.t0) / Math.max(1e-6, dur)));

    // 1. Pen down: a tap, a little random in level, pitch (±2 semitones) and timing (0–8 ms).
    if (map.taps.length) {
      const tap = pick(map.taps);
      addSegment(o, tap, s.t0 + rand() * 0.008, { gain: 0.5 + rand() * 0.3, rate: 2 ** ((rand() * 4 - 2) / 12), pan0: s.pan0 });
    }

    if (dur < SHORT_S && shorts.length) {
      // 4. Very short marks (dots, accents): one whole recorded short stroke, stretched to fit.
      const seg = pick(shorts);
      addSegment(o, seg, s.t0, { gain: level, rate: Math.max(0.75, Math.min(1.33, seg.dur / dur)), maxDur: dur, pan0: s.pan0, pan1: s.pan1 });
    } else {
      // The stroke's gain over time: rises after the tap, dips and catches at corners (3), falls
      // over 25 ms at pen up (5). One-pole smoothing, like setTargetAtTime.
      const dragAt = s.t0 + TAP_LEAD_S;
      const a = Math.floor(s.t0 * sr);
      const z = Math.min(n, Math.ceil((s.t1 + 0.1) * sr));
      const targets: { at: number; value: number; tau: number }[] = [{ at: dragAt, value: level, tau: 0.01 }];
      for (const c of s.corners) {
        const dip = 0.01 + rand() * 0.01;
        targets.push({ at: c, value: level * 0.35, tau: dip / 3 }, { at: c + dip, value: level * 1.26, tau: 0.005 }, { at: c + dip + 0.015, value: level, tau: 0.01 });
      }
      targets.push({ at: s.t1, value: 0, tau: 0.025 / 3 });
      const env = new Float32Array(Math.max(0, z - a));
      let g = 0;
      let ti = 0;
      let cur = { value: 0, tau: 0.01 };
      for (let i = 0; i < env.length; i++) {
        const t = (a + i) / sr;
        while (ti < targets.length && targets[ti].at <= t) cur = targets[ti++];
        g += (cur.value - g) * (1 - Math.exp(-1 / (cur.tau * sr)));
        env[i] = g;
      }
      const gainAt = (i: number) => env[i - a] ?? 0;

      // 2. Moving: grains back to back with equal-power crossfades, chosen by pen speed.
      let t = dragAt;
      while (t < s.t1) {
        const near = ranked
          .filter((r) => r.grain !== prevGrain)
          .map((r) => ({ r, d: Math.abs(r.score - intensity) + rand() * 0.08 }))
          .sort((p, q) => p.d - q.d)
          .slice(0, 5);
        const choice = pick(near).r.grain;
        prevGrain = choice;
        const rate = 0.94 + rand() * 0.12;
        const real = choice.dur / rate;
        const xf = 0.015 + rand() * 0.015;
        addSegment(o, choice, t, { gain: 1, rate, pan0: panAt(t), pan1: panAt(t + real), fadeIn: xf, fadeOut: xf, gainAt });
        t += real - xf;
      }
    }

    // 5. Pen up: a lift sound.
    if (map.lifts.length) addSegment(o, pick(map.lifts), s.t1, { gain: 0.4 + rand() * 0.3, rate: 2 ** ((rand() * 2 - 1) / 12), pan0: s.pan1 });
  }
  return { L: o.L, R: o.R };
}

/**
 * Plays the rendered pen sound into `ctx`: one buffer, through a little room (8% wet), at the pen
 * volume, routed to `destination`.
 */
export function schedulePen(
  ctx: BaseAudioContext,
  destination: AudioNode,
  strokes: PenStroke[],
  bank: PenBank,
  opts: { volume: number; seed: number; capOffAt?: number },
): void {
  if (strokes.length === 0 || opts.volume <= 0) return;
  const durationS = Math.max(...strokes.map((s) => s.t1)) + 0.5;
  const { L, R } = renderPen(strokes, bank, { seed: opts.seed, sampleRate: ctx.sampleRate, durationS, capOffAt: opts.capOffAt });
  const buf = ctx.createBuffer(2, L.length, ctx.sampleRate);
  buf.copyToChannel(L, 0);
  buf.copyToChannel(R, 1);
  const rand = mulberry32(opts.seed ^ 0x51ab);
  const bus = ctx.createGain();
  bus.gain.value = opts.volume;
  const dry = ctx.createGain();
  dry.gain.value = 1 - ROOM_WET;
  const wet = ctx.createGain();
  wet.gain.value = ROOM_WET;
  const room = ctx.createConvolver();
  room.normalize = true;
  room.buffer = roomImpulse(ctx, rand);
  bus.connect(dry).connect(destination);
  bus.connect(room).connect(wet).connect(destination);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(bus);
  src.start(0);
}

/** The bank for a project's pen settings, or null for no pen sound. */
export async function penBankFor(config: DrawSoundConfig, ctx: BaseAudioContext): Promise<PenBank | null> {
  const type = config.type ?? 'marker';
  if (type === 'none') return null;
  if (type === 'custom') return config.customUrl ? loadCustomBank(config.customUrl, ctx) : null;
  return loadPenBank(type, ctx);
}

/** The "Test" button: a short scribble with slow and fast strokes, a corner and a dot. */
export async function testPenSound(config: DrawSoundConfig): Promise<() => void> {
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  await ctx.resume();
  const bank = await penBankFor(config, ctx);
  if (bank) {
    const at = ctx.currentTime + 0.05;
    schedulePen(
      ctx,
      ctx.destination,
      [
        { t0: at, t1: at + 0.7, speed: 600, pan0: -0.15, pan1: 0, corners: [at + 0.35] },
        { t0: at + 0.9, t1: at + 1.5, speed: 2600, pan0: 0, pan1: 0.15, corners: [] },
        { t0: at + 1.7, t1: at + 1.82, speed: 300, pan0: 0.1, pan1: 0.1, corners: [] },
      ],
      bank,
      { volume: config.volume ?? 0.35, seed: 7 },
    );
  }
  const timer = setTimeout(() => void ctx.close(), 2400);
  return () => {
    clearTimeout(timer);
    void ctx.close();
  };
}
