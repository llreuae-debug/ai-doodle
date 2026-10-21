import { spawn, spawnSync } from 'node:child_process';
import { generateJson, type Part } from './gemini.ts';

/** Gemini TTS audio: 24 kHz mono 16-bit little-endian PCM, as WAV or raw L16. */
const PCM_RATE = 24_000;

export interface Pcm {
  samples: Buffer;
  rate: number;
  channels: number;
}

/** Raw PCM from a WAV (finds the data chunk) or from headerless L16. */
export function toPcm(mimeType: string, data: Buffer): Pcm {
  if (data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WAVE') {
    let rate = PCM_RATE;
    let channels = 1;
    let off = 12;
    while (off + 8 <= data.length) {
      const id = data.toString('ascii', off, off + 4);
      const size = data.readUInt32LE(off + 4);
      if (id === 'fmt ') {
        channels = data.readUInt16LE(off + 10);
        rate = data.readUInt32LE(off + 12);
      }
      if (id === 'data') return { samples: data.subarray(off + 8, Math.min(data.length, off + 8 + size)), rate, channels };
      off += 8 + size + (size % 2);
    }
    return { samples: data.subarray(44), rate, channels };
  }
  const rate = Number(/rate=(\d+)/.exec(mimeType)?.[1]) || PCM_RATE;
  return { samples: data, rate, channels: 1 };
}

export const pcmSeconds = (p: Pcm): number => p.samples.length / 2 / p.channels / p.rate;

export function wav(p: Pcm): Buffer {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + p.samples.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(p.channels, 22);
  h.writeUInt32LE(p.rate, 24);
  h.writeUInt32LE(p.rate * p.channels * 2, 28);
  h.writeUInt16LE(p.channels * 2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(p.samples.length, 40);
  return Buffer.concat([h, p.samples]);
}

let ffmpegChecked: boolean | null = null;
export function hasFfmpeg(): boolean {
  if (ffmpegChecked === null) {
    try {
      ffmpegChecked = spawnSync(process.env.FFMPEG_PATH || 'ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
    } catch {
      ffmpegChecked = false;
    }
  }
  return ffmpegChecked;
}

/** Runs ffmpeg with stdin → stdout. */
function ffmpeg(args: string[], input: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const p = spawn(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], { stdio: ['pipe', 'pipe', 'ignore'] });
    const out: Buffer[] = [];
    p.stdout.on('data', (b: Buffer) => out.push(b));
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(`ffmpeg exited with ${code}`))));
    p.stdin.end(input);
  });
}

/**
 * The finished voice file. With ffmpeg: MP3 (and an optional tempo change that keeps pitch);
 * without it: WAV at the original speed.
 */
export async function encodeVoice(p: Pcm, tempo = 1): Promise<{ data: Buffer; ext: 'mp3' | 'wav'; mime: string; seconds: number }> {
  const seconds = pcmSeconds(p) / tempo;
  if (!hasFfmpeg()) return { data: wav(p), ext: 'wav', mime: 'audio/wav', seconds: pcmSeconds(p) };
  const filter = Math.abs(tempo - 1) > 0.001 ? ['-filter:a', `atempo=${tempo.toFixed(3)}`] : [];
  const data = await ffmpeg(['-f', 'wav', '-i', 'pipe:0', ...filter, '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '96k', '-f', 'mp3', 'pipe:1'], wav(p));
  return { data, ext: 'mp3', mime: 'audio/mpeg', seconds };
}

export interface WordTime {
  w: string;
  start: number;
  end: number;
}

/** Pause weight, in seconds, after a word ending in a comma or a full stop. */
const COMMA_PAUSE = 0.15;
const STOP_PAUSE = 0.3;

/**
 * Estimated word times: each word gets a share of the duration by its character length, plus a
 * pause after commas and full stops, then everything is rescaled to the real duration.
 */
export function estimateWords(text: string, seconds: number): WordTime[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const speak = words.map((w) => Math.max(1, w.replace(/[^\p{L}\p{N}\p{M}]/gu, '').length));
  const pause = words.map((w): number => (/[.!?۔؟।]["'”’)]*$/.test(w) ? STOP_PAUSE : /[,،;:]["'”’)]*$/.test(w) ? COMMA_PAUSE : 0));
  const charTotal = speak.reduce((a, b) => a + b, 0);
  // Pauses are in seconds; the rest of the time is shared by character length.
  const pauseTotal = Math.min(pause.reduce((a, b) => a + b, 0), seconds * 0.4);
  const pauseScale = pauseTotal / Math.max(1e-6, pause.reduce((a, b) => a + b, 0));
  const perChar = (seconds - pauseTotal) / charTotal;
  let t = 0;
  return words.map((w, i) => {
    const start = t;
    const end = start + speak[i] * perChar;
    t = end + pause[i] * pauseScale;
    return { w, start: +start.toFixed(3), end: +Math.min(end, seconds).toFixed(3) };
  });
}

const TIMING_SCHEMA = {
  type: 'object',
  properties: { words: { type: 'array', items: { type: 'object', properties: { w: { type: 'string' }, start: { type: 'number' }, end: { type: 'number' } }, required: ['w', 'start', 'end'] } } },
  required: ['words'],
};

/**
 * "Precise sync": Gemini listens to the audio and returns word start/end times. Rejected (null) unless
 * there's one time per word, times never go backwards, and everything sits inside the duration.
 */
export async function preciseWords(audio: { mime: string; data: Buffer }, text: string, seconds: number): Promise<WordTime[] | null> {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const parts: Part[] = [
    { inlineData: { mimeType: audio.mime, data: audio.data.toString('base64') } },
    {
      text: `This audio is a narrator reading the text below. Return the start and end time in seconds of every word, in order, exactly ${words.length} entries, using the words as written (split on spaces).\n\nText:\n${text}`,
    },
  ];
  try {
    const r = await generateJson<{ words?: WordTime[] }>(parts, TIMING_SCHEMA, { temperature: 0 });
    const list = r.words ?? [];
    if (list.length !== words.length) return null;
    let last = 0;
    for (const t of list) {
      if (!(t.start >= last - 0.02 && t.end >= t.start && t.end <= seconds + 0.25)) return null;
      last = t.start;
    }
    return list.map((t, i) => ({ w: words[i], start: +t.start.toFixed(3), end: +Math.min(t.end, seconds).toFixed(3) }));
  } catch {
    return null;
  }
}
