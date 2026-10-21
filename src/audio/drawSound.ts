import type { Interval } from '../engine/drawIntervals';
import type { DrawSoundConfig, DrawSoundType } from '../model/types';

export const SAMPLE_RATE = 48000;

/** Small seeded PRNG so the same project always sounds the same. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Creates a looping noise buffer. */
function createNoiseBuffer(ctx: BaseAudioContext, random: () => number, durationS = 3): AudioBuffer {
  const length = Math.ceil(SAMPLE_RATE * durationS);
  const buffer = ctx.createBuffer(1, length, SAMPLE_RATE);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = random() * 2 - 1;
  }
  return buffer;
}

/** Creates a chalk grainy crackle buffer: short 5-15 ms clicks at random 20-60 per second. */
function createChalkCrackleBuffer(ctx: BaseAudioContext, random: () => number, durationS = 3): AudioBuffer {
  const length = Math.ceil(SAMPLE_RATE * durationS);
  const buffer = ctx.createBuffer(1, length, SAMPLE_RATE);
  const data = buffer.getChannelData(0);
  const crackleCount = Math.floor(durationS * (30 + random() * 25)); // 30-55 per second
  for (let c = 0; c < crackleCount; c++) {
    const startIdx = Math.floor(random() * (length - SAMPLE_RATE * 0.02));
    const burstLen = Math.floor((0.005 + random() * 0.01) * SAMPLE_RATE); // 5-15 ms
    for (let i = 0; i < burstLen && startIdx + i < length; i++) {
      const decay = Math.exp(-i / (burstLen * 0.35));
      data[startIdx + i] += (random() * 2 - 1) * decay * 0.75;
    }
  }
  return buffer;
}

/** Cache for decoded custom pen sounds */
const customDecodeCache = new Map<string, AudioBuffer>();

export async function decodeCustomSound(ctx: BaseAudioContext, dataUrl: string): Promise<AudioBuffer | null> {
  const cached = customDecodeCache.get(dataUrl);
  if (cached) return cached;
  try {
    const res = await fetch(dataUrl);
    const ab = await res.arrayBuffer();
    const decoded = await ctx.decodeAudioData(ab);
    customDecodeCache.set(dataUrl, decoded);
    return decoded;
  } catch (err) {
    console.warn('Failed to decode custom pen sound:', err);
    return null;
  }
}

/**
 * Schedules procedural or custom pen/marker sound for each drawing interval into `ctx`,
 * routed to `destination`.
 *
 * Sound types:
 * - marker: white noise → bandpass ~2.8 kHz (Q 1.2) → highpass 900 Hz → gain.
 * - chalk: noise → bandpass ~1.6 kHz (Q 0.8) + grainy crackle bursts (5-15 ms clicks 20-60/s) → gain.
 * - pencil: noise → bandpass ~4.5 kHz (Q 2) → lower gain, softer.
 * - soft: marker sound with lowpass 2 kHz and half gain.
 * - custom: uploaded looped sample with same fade & volume rules.
 */
export function scheduleDrawSound(
  ctx: BaseAudioContext,
  destination: AudioNode,
  intervals: Interval[],
  config: DrawSoundConfig,
  customBuffer?: AudioBuffer | null,
): void {
  if (intervals.length === 0 || config.enabled === false || config.muted || config.type === 'none') {
    return;
  }
  const volume = typeof config.volume === 'number' ? clamp(config.volume, 0, 1) : 0.35;
  if (volume <= 0) return;

  const type: DrawSoundType = config.type ?? 'marker';
  const random = mulberry32(0x5eed);

  // Overall envelope node that modulates drawing / lift intervals
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, 0);

  // Panner node for left/right panning (-0.3 .. +0.3)
  const hasStereoPanner = typeof ctx.createStereoPanner === 'function';
  const panner = hasStereoPanner ? ctx.createStereoPanner() : null;

  if (panner) {
    envelope.connect(panner);
    panner.connect(destination);
  } else {
    envelope.connect(destination);
  }

  // Filter references for dynamic speed/brightness modulation
  const modFilters: BiquadFilterNode[] = [];
  const baseFreqs: number[] = [];

  if (type === 'custom' && customBuffer) {
    const src = ctx.createBufferSource();
    src.buffer = customBuffer;
    src.loop = true;
    src.connect(envelope);
    src.start(0);
  } else {
    // Procedural synthesis
    const noiseBuffer = createNoiseBuffer(ctx, random, 3);
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    if (type === 'chalk') {
      // Chalk: noise → bandpass ~1.6 kHz (Q 0.8) + crackle clicks → gain
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1600;
      bp.Q.value = 0.8;
      modFilters.push(bp);
      baseFreqs.push(1600);

      const crackleBuffer = createChalkCrackleBuffer(ctx, random, 3);
      const crackleSrc = ctx.createBufferSource();
      crackleSrc.buffer = crackleBuffer;
      crackleSrc.loop = true;

      const crackleHp = ctx.createBiquadFilter();
      crackleHp.type = 'highpass';
      crackleHp.frequency.value = 1200;

      const crackleGain = ctx.createGain();
      crackleGain.gain.value = 0.6;

      noiseSrc.connect(bp).connect(envelope);
      crackleSrc.connect(crackleHp).connect(crackleGain).connect(envelope);

      crackleSrc.start(0);
    } else if (type === 'pencil') {
      // Pencil: noise → bandpass ~4.5 kHz (Q 2) → lower gain, softer
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 4500;
      bp.Q.value = 2.0;
      modFilters.push(bp);
      baseFreqs.push(4500);

      const pencilGain = ctx.createGain();
      pencilGain.gain.value = 0.45; // softer lower gain

      noiseSrc.connect(bp).connect(pencilGain).connect(envelope);
    } else if (type === 'soft') {
      // Soft: marker sound with lowpass 2 kHz and half gain
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2800;
      bp.Q.value = 1.2;
      modFilters.push(bp);
      baseFreqs.push(2800);

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 900;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2000;

      const softGain = ctx.createGain();
      softGain.gain.value = 0.5; // half gain

      noiseSrc.connect(bp).connect(hp).connect(lp).connect(softGain).connect(envelope);
    } else {
      // Marker on whiteboard (default):
      // white noise → bandpass ~2.8 kHz (Q 1.2) → highpass 900 Hz → gain
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2800;
      bp.Q.value = 1.2;
      modFilters.push(bp);
      baseFreqs.push(2800);

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 900;

      noiseSrc.connect(bp).connect(hp).connect(envelope);
    }

    noiseSrc.start(0);
  }

  // Schedule intervals
  for (const iv of intervals) {
    const t0 = iv.start / 1000;
    const t1 = iv.end / 1000;
    const dur = t1 - t0;
    if (dur <= 0.005) continue;

    // Map stroke speed to gain (0.6 - 1.0) and filter frequency (±15%)
    const spd = clamp(iv.speed ?? 1, 0.25, 3);
    const normSpd = (spd - 0.25) / (3 - 0.25);
    const speedGain = 0.6 + 0.4 * normSpd;
    const freqMult = 0.85 + 0.3 * normSpd;

    // Small random wobble so it sounds handmade
    const wobbleGain = 1.0 + (random() * 0.1 - 0.05);
    const wobbleFreq = 1.0 + (random() * 0.08 - 0.04);

    const targetGain = volume * speedGain * wobbleGain;

    // Brightness modulation on filters
    for (let f = 0; f < modFilters.length; f++) {
      const freq = baseFreqs[f] * freqMult * wobbleFreq;
      modFilters[f].frequency.setValueAtTime(freq, t0);
    }

    // Pan position (-0.3 .. +0.3)
    if (panner) {
      const panVal = clamp(iv.pan ?? 0, -0.3, 0.3);
      panner.pan.setValueAtTime(panVal, t0);
    }

    // Fade in on pen down (up to 20 ms), fade out in 40 ms on pen lift (no clicks)
    const fadeIn = Math.min(0.02, dur * 0.3);
    const fadeOut = Math.min(0.04, dur * 0.4);

    envelope.gain.setValueAtTime(0, t0);
    envelope.gain.linearRampToValueAtTime(targetGain, t0 + fadeIn);
    envelope.gain.setValueAtTime(targetGain, Math.max(t0 + fadeIn, t1 - fadeOut));
    envelope.gain.linearRampToValueAtTime(0, t1);
  }
}

/** Plays a 2-second test of the selected drawing sound. Returns a stop function. */
export async function testDrawSound(config: DrawSoundConfig): Promise<() => void> {
  const ctx = new AudioContext();
  await ctx.resume();

  let customBuffer: AudioBuffer | null = null;
  if (config.type === 'custom' && config.customUrl) {
    customBuffer = await decodeCustomSound(ctx, config.customUrl);
  }

  // 2-second test stroke with gentle pan and full 1x speed
  const testIntervals: Interval[] = [{ start: 50, end: 1950, pan: 0, speed: 1 }];

  scheduleDrawSound(ctx, ctx.destination, testIntervals, config, customBuffer);

  const timer = setTimeout(() => {
    void ctx.close();
  }, 2100);

  return () => {
    clearTimeout(timer);
    void ctx.close();
  };
}
