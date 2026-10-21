import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { z } from 'zod';
import { FFMPEG } from './audio.ts';
import { currentKey, HttpError } from './gemini.ts';
import { cacheGet, cachePut, saveMedia } from './security.ts';

/**
 * Background music with Lyria RealTime (see MUSIC_NOTES.md). The model streams short clips; this
 * file turns them into a track of any length:
 *  1. one base clip per mood at the requested BPM (cached by prompt + seed + settings),
 *  2. a bar-aligned loop cut from it, its seam crossfaded over 2 s,
 *  3. the loops laid out section by section to totalSec + 2 s, 3 s crossfades where the mood
 *     changes, 2 s fade-in, 4 s fade-out,
 *  4. loudness-normalised to −20 LUFS and encoded as MP3 192 kbps (ffmpeg).
 */
export const MUSIC_MODEL = process.env.GOOGLE_MUSIC_MODEL || 'models/lyria-realtime-exp';
const WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateMusic';
const RATE = 48_000;
const CH = 2;
/** Length of each generated base clip, and the warm-up skipped at its start. */
const BASE_SEC = 40;
const WARMUP_SEC = 2;
const SEAM_FADE = 2;
const SECTION_FADE = 3;
const FADE_IN = 2;
const FADE_OUT = 4;
const TAIL = 2;
const MAX_TOTAL_SEC = 15 * 60;

export const MUSIC_STYLES = {
  'calm-piano': { label: 'Calm piano', prompt: 'calm solo piano', instruments: ['piano'] },
  'acoustic-guitar': { label: 'Soft acoustic guitar', prompt: 'soft fingerpicked acoustic guitar', instruments: ['acoustic guitar'] },
  'warm-strings': { label: 'Warm strings', prompt: 'warm string ensemble', instruments: ['strings', 'cello'] },
  'lofi-gentle': { label: 'Lo-fi gentle', prompt: 'gentle lo-fi with mellow keys', instruments: ['electric piano', 'soft bass'] },
  'ambient-pads': { label: 'Ambient pads', prompt: 'ambient synth pads', instruments: ['synth pads'] },
  'playful-kids': { label: 'Playful kids', prompt: 'playful kids music', instruments: ['marimba', 'ukulele', 'light claps'] },
  'inspiring-cinematic': { label: 'Inspiring cinematic (soft)', prompt: 'soft inspiring cinematic score', instruments: ['piano', 'strings', 'soft horns'] },
  'corporate-light': { label: 'Corporate light', prompt: 'light corporate background music', instruments: ['piano', 'plucked guitar', 'soft synth'] },
  'eastern-ambient': { label: 'Eastern ambient', prompt: 'soft eastern ambient', instruments: ['bansuri flute', 'santoor', 'tanpura drone'] },
  'humming-pad': { label: 'Voice-free humming pad', prompt: 'soft vocal-like humming pads with no instruments, wordless', instruments: [] },
} as const;
export type MusicStyle = keyof typeof MUSIC_STYLES;

export const MOODS = ['calm', 'happy', 'tense', 'sad', 'exciting'] as const;
export type Mood = (typeof MOODS)[number];
/** Mood → default tempo, intensity and colour. */
export const MOOD_DEFAULTS: Record<Mood, { bpm: number; intensity: Intensity; words: string }> = {
  calm: { bpm: 66, intensity: 'very-soft', words: 'calm' },
  happy: { bpm: 95, intensity: 'soft', words: 'happy, bright' },
  tense: { bpm: 75, intensity: 'very-soft', words: 'tense, with a low drone' },
  sad: { bpm: 60, intensity: 'very-soft', words: 'sad, in a minor key' },
  exciting: { bpm: 105, intensity: 'medium', words: 'exciting, uplifting' },
};
type Intensity = 'very-soft' | 'soft' | 'medium';
const INTENSITY: Record<Intensity, { label: string; density: number; brightness: number }> = {
  'very-soft': { label: 'low', density: 0.2, brightness: 0.35 },
  soft: { label: 'low to medium', density: 0.35, brightness: 0.45 },
  medium: { label: 'medium', density: 0.5, brightness: 0.55 },
};
const AVOID = 'vocals, singing, lyrics, harsh drums, distortion, sudden loud hits';

export const MusicRequest = z
  .object({
    projectId: z.string().max(60).default('shared'),
    mode: z.enum(['whole', 'by-section']),
    totalSec: z.number().min(5).max(MAX_TOTAL_SEC),
    sections: z.array(z.object({ fromSec: z.number().min(0), toSec: z.number().min(0), mood: z.enum(MOODS) })).min(1).max(40),
    style: z.enum(Object.keys(MUSIC_STYLES) as [MusicStyle, ...MusicStyle[]]),
    /** BPM; when absent each mood uses its own default. */
    tempo: z.number().int().min(50).max(120).optional(),
    intensity: z.enum(['very-soft', 'soft', 'medium']).optional(),
    instruments: z.array(z.string().max(30)).max(6).default([]),
    noPercussion: z.boolean().default(true),
    vocalsOff: z.literal(true).default(true),
    extra: z.string().trim().max(120).default(''),
    seed: z.number().int().min(0).max(2_147_483_647).optional(),
  })
  .refine((r) => r.sections.every((s) => s.toSec > s.fromSec), 'Each section must end after it starts.');
export type MusicRequest = z.infer<typeof MusicRequest>;

interface ClipSpec {
  mood: Mood;
  bpm: number;
  intensity: Intensity;
  prompt: string;
  seed: number;
  noPercussion: boolean;
}

/** The server-side prompt: style + mood + tempo, always instrumental. */
export function musicPrompt(r: MusicRequest, mood: Mood): ClipSpec {
  const style = MUSIC_STYLES[r.style];
  const d = MOOD_DEFAULTS[mood];
  const bpm = r.tempo ?? d.bpm;
  const intensity = r.intensity ?? d.intensity;
  const instruments = r.instruments.length ? r.instruments : [...style.instruments];
  const prompt =
    `${style.prompt} background music for a whiteboard story video, ${d.words} mood, ${bpm} BPM, ${INTENSITY[intensity].label} intensity, ` +
    `${instruments.length ? `instruments: ${instruments.join(', ')}, ` : ''}gentle, steady, soft dynamics, leaves space for a narrator's voice, instrumental only, no vocals, no lyrics` +
    `${r.noPercussion ? ', no drums or percussion' : ''}${r.extra ? `, ${r.extra}` : ''}`;
  return { mood, bpm, intensity, prompt, seed: r.seed ?? 0, noPercussion: r.noPercussion };
}

const hash = (v: unknown) => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 24);

// ---------- generation (Lyria RealTime) ----------

/** Streams `seconds` of music for one clip: 16-bit stereo PCM at 48 kHz. */
function streamClip(spec: ClipSpec, seconds: number): Promise<Buffer> {
  const key = currentKey();
  if (!key) return Promise.reject(new HttpError(503, 'not_configured', 'AI is not set up. Add GEMINI_API_KEY to .env.'));
  const want = Math.ceil(seconds * RATE) * CH * 2;
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}?key=${key}`);
    const chunks: Buffer[] = [];
    let got = 0;
    let finished = false;
    const finish = (err?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        // Already closed.
      }
      if (err && got < want / 2) reject(err);
      else resolve(Buffer.concat(chunks).subarray(0, want));
    };
    // Real time plus margin.
    const timer = setTimeout(() => finish(new HttpError(504, 'timeout', 'Music generation took too long. Try again.')), (seconds * 2 + 30) * 1000);
    ws.onopen = () => ws.send(JSON.stringify({ setup: { model: MUSIC_MODEL } }));
    ws.onmessage = async (e) => {
      const text = typeof e.data === 'string' ? e.data : Buffer.from(await (e.data as Blob).arrayBuffer()).toString('utf8');
      let m: { setupComplete?: unknown; serverContent?: { audioChunks?: { data: string }[] }; filteredPrompt?: { filteredReason?: string }; error?: { message?: string } };
      try {
        m = JSON.parse(text);
      } catch {
        return;
      }
      if (m.setupComplete) {
        ws.send(
          JSON.stringify({
            clientContent: {
              weightedPrompts: [
                { text: spec.prompt, weight: 1 },
                { text: AVOID, weight: -0.6 },
              ],
            },
          }),
        );
        ws.send(
          JSON.stringify({
            musicGenerationConfig: {
              bpm: spec.bpm,
              density: INTENSITY[spec.intensity].density,
              brightness: INTENSITY[spec.intensity].brightness,
              muteDrums: spec.noPercussion,
              seed: spec.seed,
              temperature: 1.0,
              guidance: 4.0,
            },
          }),
        );
        ws.send(JSON.stringify({ playbackControl: 'PLAY' }));
      }
      if (m.filteredPrompt) return finish(new HttpError(422, 'refused', 'Google AI filtered that music prompt. Try different words.'));
      for (const c of m.serverContent?.audioChunks ?? []) {
        const b = Buffer.from(c.data, 'base64');
        chunks.push(b);
        got += b.length;
      }
      if (got >= want) finish();
    };
    ws.onerror = () => finish(new HttpError(502, 'api_error', "Couldn't reach Google AI music generation. Try again."));
    ws.onclose = (e) => {
      if (got >= want) return finish();
      const reason = String(e.reason || '');
      if (/quota|exhausted|rate/i.test(reason)) return finish(new HttpError(429, 'rate_limited', 'Too many music requests. Wait a minute and try again.'));
      finish(new HttpError(502, 'api_error', `Music generation stopped early${reason ? `: ${reason.slice(0, 120)}` : ''}.`));
    };
  });
}

/** A base clip, from the cache or Lyria (retried with backoff on 429/5xx-like failures). */
async function baseClip(spec: ClipSpec, stats: { generated: number }): Promise<Float32Array> {
  const key = hash(spec);
  let pcm: Buffer;
  const hit = await cacheGet('music-clip', key);
  if (hit) pcm = hit;
  else {
    for (let attempt = 0; ; attempt++) {
      try {
        stats.generated++;
        pcm = await streamClip(spec, BASE_SEC + WARMUP_SEC);
        break;
      } catch (err) {
        const retry = err instanceof HttpError && ['rate_limited', 'api_error', 'timeout'].includes(err.code);
        if (!retry || attempt >= 2) throw err;
        await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
      }
    }
    await cachePut('music-clip', key, pcm);
  }
  const out = new Float32Array(pcm.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = pcm.readInt16LE(i * 2) / 32768;
  return out;
}

// ---------- looping ----------

/**
 * A seamless loop from a clip: starts on a bar line after the warm-up, lasts a whole number of
 * bars, and the seam is nudged (±40 ms) to where the waveform lines up best, then crossfaded.
 * Returns interleaved stereo samples whose end flows straight back into its start.
 */
export function makeLoop(clip: Float32Array, bpm: number): Float32Array {
  const frames = clip.length / CH;
  const bar = (4 * 60) / bpm;
  const start = Math.round(Math.ceil(WARMUP_SEC / bar) * bar * RATE);
  const usable = frames - start - SEAM_FADE * RATE;
  const bars = Math.max(1, Math.floor(usable / RATE / bar));
  let len = Math.round(bars * bar * RATE);
  // Best seam: the end of the loop that most resembles its start.
  const probe = Math.round(0.03 * RATE);
  let best = len;
  let bestErr = Infinity;
  for (let d = -Math.round(0.04 * RATE); d <= Math.round(0.04 * RATE); d += 4) {
    const L = len + d;
    if (start + L + probe >= frames) continue;
    let err = 0;
    for (let i = 0; i < probe; i++) for (let c = 0; c < CH; c++) err += Math.abs(clip[(start + L + i) * CH + c] - clip[(start + i) * CH + c]);
    if (err < bestErr) {
      bestErr = err;
      best = L;
    }
  }
  len = best;
  const fade = Math.min(SEAM_FADE * RATE, frames - start - len);
  const loop = new Float32Array(len * CH);
  for (let f = 0; f < len; f++) {
    for (let c = 0; c < CH; c++) {
      let v = clip[(start + f) * CH + c];
      // The first `fade` frames blend in the audio that follows the loop's end (equal power).
      if (f < fade) {
        const t = f / fade;
        v = v * Math.sin((t * Math.PI) / 2) + clip[(start + len + f) * CH + c] * Math.cos((t * Math.PI) / 2);
      }
      loop[f * CH + c] = v;
    }
  }
  return loop;
}

// ---------- assembly ----------

interface Section {
  fromSec: number;
  toSec: number;
  mood: Mood;
}

/** Merges neighbouring sections with the same mood and covers 0..total. */
function layout(sections: Section[], total: number): Section[] {
  const sorted = [...sections].sort((a, b) => a.fromSec - b.fromSec);
  const out: Section[] = [];
  for (const s of sorted) {
    const from = Math.max(0, Math.min(s.fromSec, total));
    const last = out[out.length - 1];
    if (last && last.mood === s.mood) last.toSec = Math.max(last.toSec, s.toSec);
    else out.push({ fromSec: from, toSec: s.toSec, mood: s.mood });
  }
  if (out.length === 0) return [{ fromSec: 0, toSec: total, mood: 'calm' }];
  out[0].fromSec = 0;
  for (let i = 0; i < out.length - 1; i++) out[i].toSec = out[i + 1].fromSec;
  out[out.length - 1].toSec = total;
  return out.filter((s) => s.toSec - s.fromSec > 0.5);
}

/**
 * Renders the whole track as 16-bit stereo, a block at a time (a 15-minute track never sits in
 * memory as floats): each section loops its clip, sections overlap by SECTION_FADE with an
 * equal-power crossfade, plus the fade-in and fade-out.
 */
function* render(sections: Section[], loops: Map<Mood, Float32Array>, totalSec: number): Generator<Buffer> {
  const total = Math.round(totalSec * RATE);
  const xf = SECTION_FADE * RATE;
  const block = RATE; // one second at a time
  for (let f0 = 0; f0 < total; f0 += block) {
    const n = Math.min(block, total - f0);
    const buf = Buffer.alloc(n * CH * 2);
    for (let k = 0; k < n; k++) {
      const f = f0 + k;
      const t = f / RATE;
      let l = 0;
      let r = 0;
      for (const s of sections) {
        const a = s.fromSec * RATE - (s.fromSec > 0 ? xf / 2 : 0);
        const b = s.toSec * RATE + (s.toSec * RATE < total ? xf / 2 : 0);
        if (f < a || f >= b) continue;
        let g = 1;
        if (s.fromSec > 0 && f < a + xf) g *= Math.sin(((f - a) / xf) * (Math.PI / 2));
        if (s.toSec * RATE < total && f > b - xf) g *= Math.cos(((f - (b - xf)) / xf) * (Math.PI / 2));
        const loop = loops.get(s.mood)!;
        const len = loop.length / CH;
        // Loops run on the track's clock, so a crossfade blends the same moment of both moods.
        const i = (f % len) * CH;
        l += loop[i] * g;
        r += loop[i + 1] * g;
      }
      let env = 1;
      if (t < FADE_IN) env = t / FADE_IN;
      const tailStart = totalSec - FADE_OUT;
      if (t > tailStart) env *= Math.max(0, (totalSec - t) / FADE_OUT);
      buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(l * env * 32767))), k * 4);
      buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(r * env * 32767))), k * 4 + 2);
    }
    yield buf;
  }
}

/** Pipes raw PCM through ffmpeg: loudness to −20 LUFS, MP3 192 kbps. */
function encode(blocks: Iterable<Buffer>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const p = spawn(
      FFMPEG,
      ['-hide_banner', '-loglevel', 'error', '-f', 's16le', '-ar', String(RATE), '-ac', String(CH), '-i', 'pipe:0', '-af', 'loudnorm=I=-20:TP=-2:LRA=11', '-ar', String(RATE), '-codec:a', 'libmp3lame', '-b:a', '192k', '-f', 'mp3', 'pipe:1'],
      { stdio: ['pipe', 'pipe', 'ignore'] },
    );
    const out: Buffer[] = [];
    p.stdout.on('data', (b: Buffer) => out.push(b));
    p.on('error', () => reject(new HttpError(500, 'no_ffmpeg', 'Music needs ffmpeg on the server. Install ffmpeg and try again.')));
    p.on('close', (code) => (code === 0 ? resolve(Buffer.concat(out)) : reject(new HttpError(500, 'encode', 'Encoding the music failed.'))));
    (async () => {
      for (const b of blocks) if (!p.stdin.write(b)) await new Promise((r) => p.stdin.once('drain', r));
      p.stdin.end();
    })().catch(reject);
  });
}

/** Loops are also saved as small MP3s so the editor can preview each section. */
async function loopUrl(projectId: string, loop: Float32Array): Promise<string> {
  function* one() {
    const buf = Buffer.alloc(loop.length * 2);
    for (let i = 0; i < loop.length; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(loop[i] * 32767))), i * 2);
    yield buf;
  }
  return saveMedia(projectId, await encode(one()), 'mp3');
}

export async function makeMusic(r: MusicRequest): Promise<{
  audioUrl: string;
  durationSec: number;
  loopable: true;
  seed: number;
  generated: number;
  sections: { fromSec: number; toSec: number; mood: Mood; url: string }[];
}> {
  const seed = r.seed ?? crypto.randomInt(0, 2_147_483_647);
  const req = { ...r, seed };
  const totalSec = Math.min(MAX_TOTAL_SEC, r.totalSec + TAIL);
  const sections = r.mode === 'whole' ? [{ fromSec: 0, toSec: totalSec, mood: r.sections[0].mood }] : layout(r.sections, totalSec);
  const moods = [...new Set(sections.map((s) => s.mood))];
  const stats = { generated: 0 };

  // Same request again (e.g. regenerate with the same seed, or refit to the same length) costs nothing.
  const trackKey = hash({ ...req, sections, totalSec });
  const cached = await cacheGet('music-track', trackKey);
  if (cached) return { ...JSON.parse(cached.toString('utf8')), generated: 0 };

  // Base clips, three at a time.
  const loops = new Map<Mood, Float32Array>();
  const queue = [...moods];
  await Promise.all(
    Array.from({ length: Math.min(3, queue.length) }, async () => {
      while (queue.length) {
        const mood = queue.shift()!;
        const spec = musicPrompt(req, mood);
        loops.set(mood, makeLoop(await baseClip(spec, stats), spec.bpm));
      }
    }),
  );

  const audio = await encode(render(sections, loops, totalSec));
  const loopUrls = new Map<Mood, string>();
  for (const mood of moods) loopUrls.set(mood, await loopUrl(r.projectId, loops.get(mood)!));
  const result = {
    audioUrl: await saveMedia(r.projectId, audio, 'mp3'),
    durationSec: +totalSec.toFixed(3),
    loopable: true as const,
    seed,
    sections: sections.map((s) => ({ ...s, url: loopUrls.get(s.mood)! })),
  };
  await cachePut('music-track', trackKey, Buffer.from(JSON.stringify(result)));
  return { ...result, generated: stats.generated };
}
