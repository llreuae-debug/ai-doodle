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

const curves = new Map<string, Float32Array>();
/** Equal-power fade curve (sin for in, cos for out). */
function fadeCurve(dir: 'in' | 'out', peak: number): Float32Array {
  const key = `${dir}:${peak.toFixed(4)}`;
  let c = curves.get(key);
  if (!c) {
    c = new Float32Array(16);
    for (let i = 0; i < 16; i++) {
      const x = i / 15;
      c[i] = peak * (dir === 'in' ? Math.sin((x * Math.PI) / 2) : Math.cos((x * Math.PI) / 2));
    }
    curves.set(key, c);
  }
  return c;
}

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

/**
 * Schedules the pen sound for `strokes` into `ctx`, routed to `destination`. `capOffAt` plays the
 * marker cap-off sound at that time (seconds), when the bank has one.
 */
export function schedulePen(
  ctx: BaseAudioContext,
  destination: AudioNode,
  strokes: PenStroke[],
  bank: PenBank,
  opts: { volume: number; seed: number; capOffAt?: number },
): void {
  if (strokes.length === 0 || opts.volume <= 0) return;
  const rand = mulberry32(opts.seed);
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  const { map, buffer, ranked } = bank;

  // Output: dry plus a little room.
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

  /** One sample segment: optional delay, pitch (playback rate), gain and a short fade at the end. */
  const play = (seg: Segment, at: number, out: AudioNode, gain: number, rate = 1, maxDur = Infinity) => {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    const dur = Math.min(seg.dur, maxDur * rate);
    const real = dur / rate;
    g.gain.setValueAtTime(gain, at);
    g.gain.setValueAtTime(gain, at + Math.max(0, real - 0.012));
    g.gain.linearRampToValueAtTime(0, at + real);
    src.connect(g).connect(out);
    src.start(at, seg.start, dur);
  };

  if (opts.capOffAt !== undefined && map.cap?.off) play(map.cap.off, Math.max(0, opts.capOffAt), bus, 0.7);

  let prevGrain = -1;
  for (const s of strokes) {
    const dur = s.t1 - s.t0;
    const intensity = intensityOf(s.speed);
    const level = 0.35 + 0.65 * intensity;
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(s.pan0, s.t0);
    panner.pan.linearRampToValueAtTime(s.pan1, s.t1);
    panner.connect(bus);

    // 1. Pen down: a tap, a little random in level, pitch (±2 semitones) and timing (0–8 ms).
    if (map.taps.length) play(pick(map.taps), s.t0 + rand() * 0.008, panner, 0.5 + rand() * 0.3, 2 ** ((rand() * 4 - 2) / 12));

    // 4. Very short marks (dots, accents): one whole recorded short stroke, stretched to fit.
    const shorts = map.strokes.filter((x) => x.label === 'short');
    if (dur < SHORT_S && shorts.length) {
      const seg = pick(shorts);
      const rate = Math.max(0.75, Math.min(1.33, seg.dur / dur));
      play(seg, s.t0, panner, level, rate, dur);
    } else {
      // 2. Moving: grains back to back with equal-power crossfades, chosen by pen speed.
      const leg = ctx.createGain();
      // The drag starts just after the touch-down, so the tap is heard first.
      const dragAt = s.t0 + TAP_LEAD_S;
      leg.gain.setValueAtTime(0, s.t0);
      leg.gain.setTargetAtTime(level, dragAt, 0.03 / 3);
      // 3. Corners: a 10–20 ms dip, then a small catch (+2 dB for 15 ms), like a marker turning.
      for (const c of s.corners) {
        const dip = 0.01 + rand() * 0.01;
        leg.gain.setTargetAtTime(level * 0.35, c, dip / 3);
        leg.gain.setTargetAtTime(level * 1.26, c + dip, 0.005);
        leg.gain.setTargetAtTime(level, c + dip + 0.015, 0.01);
      }
      // 5. Pen up: grains fade out over 25 ms.
      leg.gain.setTargetAtTime(0, s.t1, 0.025 / 3);
      leg.connect(panner);

      let t = dragAt;
      while (t < s.t1) {
        // The nearest few grains to the pen's intensity, never the one just played.
        const near = ranked
          .map((r, idx) => ({ idx, d: Math.abs(r.score - intensity) + rand() * 0.08 }))
          .filter((x) => ranked[x.idx].grain !== map.grains[prevGrain])
          .sort((a, b) => a.d - b.d)
          .slice(0, 5);
        const choice = ranked[pick(near).idx].grain;
        prevGrain = map.grains.indexOf(choice);
        const rate = 0.94 + rand() * 0.12;
        const real = choice.dur / rate;
        const xf = 0.015 + rand() * 0.015;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.value = rate;
        const env = ctx.createGain();
        env.gain.value = 0;
        env.gain.setValueCurveAtTime(fadeCurve('in', 1), t, xf);
        env.gain.setValueCurveAtTime(fadeCurve('out', 1), t + real - xf, xf);
        src.connect(env).connect(leg);
        src.start(t, choice.start, choice.dur);
        t += real - xf;
      }
    }

    // 5. Pen up: a lift sound.
    if (map.lifts.length) play(pick(map.lifts), s.t1, panner, 0.4 + rand() * 0.3, 2 ** ((rand() * 2 - 1) / 12));
  }
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
