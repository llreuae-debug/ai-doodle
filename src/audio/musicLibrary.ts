/**
 * Soundtrack library: original background tracks synthesised in the browser (no samples, no
 * licences to track). Each renders as a seamless loop of whole bars, so it can repeat under a
 * video of any length.
 */

export interface TrackDef {
  id: string;
  name: string;
  mood: string;
  bpm: number;
  tier: 'free' | 'pro';
  /** Bars in the loop. */
  bars: number;
  /** Root note (MIDI) and a chord per bar as scale-relative semitone stacks. */
  root: number;
  chords: number[][];
  lead: 'arp' | 'melody' | 'none';
  leadWave: OscillatorType;
  drums: 'none' | 'soft' | 'pop' | 'lofi';
  pad: boolean;
  seed: number;
}

const MAJ = [0, 4, 7];
const MIN = [0, 3, 7];
const MAJ7 = [0, 4, 7, 11];
const MIN7 = [0, 3, 7, 10];
const chord = (offset: number, shape: number[]) => shape.map((n) => n + offset);

export const TRACKS: TrackDef[] = [
  { id: 'bright-ideas', name: 'Bright Ideas', mood: 'Upbeat', bpm: 112, tier: 'free', bars: 8, root: 60, chords: [chord(0, MAJ), chord(7, MAJ), chord(9, MIN), chord(5, MAJ)], lead: 'arp', leadWave: 'triangle', drums: 'pop', pad: false, seed: 11 },
  { id: 'calm-morning', name: 'Calm Morning', mood: 'Calm', bpm: 72, tier: 'free', bars: 8, root: 57, chords: [chord(0, MIN7), chord(5, MAJ7), chord(3, MAJ7), chord(10, MAJ)], lead: 'melody', leadWave: 'sine', drums: 'none', pad: true, seed: 23 },
  { id: 'corporate-steps', name: 'Corporate Steps', mood: 'Corporate', bpm: 100, tier: 'free', bars: 8, root: 62, chords: [chord(0, MAJ), chord(9, MIN), chord(5, MAJ), chord(7, MAJ)], lead: 'arp', leadWave: 'square', drums: 'soft', pad: true, seed: 37 },
  { id: 'playful-steps', name: 'Playful Steps', mood: 'Playful', bpm: 124, tier: 'pro', bars: 8, root: 65, chords: [chord(0, MAJ), chord(5, MAJ), chord(7, MAJ), chord(0, MAJ)], lead: 'melody', leadWave: 'sine', drums: 'pop', pad: false, seed: 41 },
  { id: 'lofi-notes', name: 'Lo-fi Notes', mood: 'Lo-fi', bpm: 80, tier: 'pro', bars: 8, root: 58, chords: [chord(0, MAJ7), chord(9, MIN7), chord(2, MIN7), chord(7, MIN7)], lead: 'none', leadWave: 'triangle', drums: 'lofi', pad: true, seed: 53 },
  { id: 'inspire', name: 'Inspire', mood: 'Inspiring', bpm: 90, tier: 'free', bars: 8, root: 55, chords: [chord(0, MAJ), chord(9, MIN), chord(5, MAJ), chord(7, MAJ)], lead: 'arp', leadWave: 'sine', drums: 'soft', pad: true, seed: 67 },
];

export const SAMPLE_RATE = 44100;
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16];

const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

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

/** Loop length in seconds. */
export const trackSeconds = (t: TrackDef) => (t.bars * 4 * 60) / t.bpm;

export async function renderTrack(t: TrackDef): Promise<AudioBuffer> {
  const seconds = trackSeconds(t);
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * SAMPLE_RATE), SAMPLE_RATE);
  const beat = 60 / t.bpm;
  const rand = mulberry32(t.seed);
  const master = ctx.createGain();
  master.gain.value = 0.55;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);

  const noise = ctx.createBuffer(1, SAMPLE_RATE, SAMPLE_RATE);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = rand() * 2 - 1;

  const note = (time: number, freq: number, dur: number, gain: number, wave: OscillatorType, cutoff = 3000, attack = 0.005, pan = 0) => {
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = freq;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(gain, time + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    osc.connect(filter).connect(env).connect(panner).connect(master);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  };

  const hit = (time: number, kind: 'kick' | 'snare' | 'hat', gain: number) => {
    if (kind === 'kick') {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.frequency.setValueAtTime(130, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.18);
      env.gain.setValueAtTime(gain, time);
      env.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
      osc.connect(env).connect(master);
      osc.start(time);
      osc.stop(time + 0.32);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = kind === 'hat' ? 'highpass' : 'bandpass';
    filter.frequency.value = kind === 'hat' ? 7000 : 1800;
    const env = ctx.createGain();
    const len = kind === 'hat' ? 0.05 : 0.16;
    env.gain.setValueAtTime(gain, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + len);
    src.connect(filter).connect(env).connect(master);
    src.start(time, rand() * 0.5);
    src.stop(time + len + 0.02);
  };

  for (let bar = 0; bar < t.bars; bar++) {
    const tones = t.chords[bar % t.chords.length];
    const barStart = bar * 4 * beat;
    // Bass: root on beats 1 and 3.
    for (const b of [0, 2]) note(barStart + b * beat, midiHz(t.root - 24 + tones[0]), beat * 1.8, 0.32, 'triangle', 600);
    // Pad: the chord, held for the bar.
    if (t.pad) for (const n of tones) note(barStart, midiHz(t.root + n), 4 * beat, 0.06, 'sawtooth', 900, 0.4, (n % 3) * 0.2 - 0.2);
    // Chord stabs when there's no pad.
    if (!t.pad) for (const b of [0, 1.5, 2.5]) for (const n of tones) note(barStart + b * beat, midiHz(t.root + n), beat * 0.6, 0.05, t.leadWave, 2200);
    // Lead.
    if (t.lead === 'arp') {
      for (let i = 0; i < 8; i++) {
        const n = tones[i % tones.length] + (i >= 4 ? 12 : 0);
        note(barStart + i * beat * 0.5, midiHz(t.root + 12 + n), beat * 0.45, 0.07, t.leadWave, 2600, 0.004, i % 2 ? 0.25 : -0.25);
      }
    } else if (t.lead === 'melody') {
      for (let i = 0; i < 8; i++) {
        if (rand() < 0.3) continue;
        const n = PENTATONIC[Math.floor(rand() * PENTATONIC.length)];
        note(barStart + i * beat * 0.5, midiHz(t.root + 12 + n), beat * (rand() < 0.5 ? 0.45 : 0.9), 0.09, t.leadWave, 3200);
      }
    }
    // Drums.
    for (let b = 0; b < 4; b++) {
      const at = barStart + b * beat;
      if (t.drums === 'pop') {
        if (b === 0 || b === 2) hit(at, 'kick', 0.7);
        if (b === 1 || b === 3) hit(at, 'snare', 0.25);
        hit(at, 'hat', 0.08);
        hit(at + beat / 2, 'hat', 0.06);
      } else if (t.drums === 'soft') {
        if (b === 0) hit(at, 'kick', 0.5);
        if (b === 2) hit(at, 'kick', 0.35);
        hit(at + beat / 2, 'hat', 0.05);
      } else if (t.drums === 'lofi') {
        if (b === 0) hit(at, 'kick', 0.55);
        if (b === 2) hit(at + beat / 2, 'kick', 0.45);
        if (b === 1 || b === 3) hit(at, 'snare', 0.18);
        hit(at, 'hat', 0.05);
        hit(at + beat * 0.6, 'hat', 0.04);
      }
    }
  }
  return ctx.startRendering();
}

/** 16-bit PCM WAV, so a library track can be stored on the project like an uploaded file. */
export function toWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const bytes = 44 + frames * channels * 2;
  const view = new DataView(new ArrayBuffer(bytes));
  const str = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  view.setUint32(4, bytes - 8, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, frames * channels * 2, true);
  const data = [...Array(channels)].map((_, c) => buffer.getChannelData(c));
  let o = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const v = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([view], { type: 'audio/wav' });
}
