import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { encodeVoice, estimateWords, preciseWords, toPcm, type WordTime } from './audio.ts';
import { HttpError, speak, type SpeechTurn } from './gemini.ts';
import { saveMedia } from './security.ts';

const here = path.dirname(fileURLToPath(import.meta.url));

export interface VoiceInfo {
  id: string;
  name: string;
  gender: 'female' | 'male';
  style_tags: string[];
  languages: string[];
  provider: 'gemini';
  previewUrl: string;
}

export const VOICES: { defaults: Record<string, string>; voices: VoiceInfo[] } = JSON.parse(fs.readFileSync(path.join(here, 'voices.json'), 'utf8'));
const voiceIds = new Set(VOICES.voices.map((v) => v.id));

/**
 * Which engine speaks each story language, from scripts/ai/check-languages.mjs (Gemini TTS read
 * each language aloud and Gemini transcribed it back). "unsupported" languages fail with a clear
 * message instead of producing bad audio; Cloud Text-to-Speech would be the fallback.
 */
export const LANG_SUPPORT: Record<string, { engine: 'gemini' | 'cloud-tts' | 'unsupported'; note: string }> = JSON.parse(
  fs.readFileSync(path.join(here, 'lang-support.json'), 'utf8'),
);

const TONE_STYLE: Record<string, string> = {
  warm: 'warmly and gently, like a storyteller',
  funny: 'playfully, with a smile in your voice',
  inspiring: 'with an uplifting, confident voice',
  calm: 'calmly and softly',
  dramatic: 'expressively, with dramatic pauses',
};
const MOOD_STYLE: Record<string, string> = {
  happy: 'cheerful',
  tense: 'a little tense and hushed',
  calm: 'relaxed',
  sad: 'gentle and a little sad',
  exciting: 'excited',
};
const SPEED_STYLE = (speed: number) => (speed < 0.97 ? 'slowly' : speed > 1.03 ? 'at a brisk pace' : 'at a natural pace');
/** Narration pace the speed setting aims at, in words per second at speed 1. */
const BASE_WPS = 2.5;
/** Fix the tempo when the voice ignored the speed setting by more than this. */
const SPEED_TOLERANCE = 0.08;

export const TtsRequest = z
  .object({
    text: z.string().trim().min(1).max(1200),
    voice: z.string().refine((v) => voiceIds.has(v), 'Unknown voice.'),
    language: z.string().max(5).default('en'),
    /** A tone (warm, funny...) or a free-form delivery note. */
    style: z.string().max(120).default('warm'),
    mood: z.enum(['happy', 'tense', 'calm', 'sad', 'exciting']).optional(),
    speed: z.number().min(0.8).max(1.2).default(1),
    /** Dialogue: up to 2 speakers, each with a voice. Their texts together replace `text`. */
    turns: z.array(z.object({ speaker: z.string().max(40), text: z.string().max(1200) })).max(12).optional(),
    voices: z.record(z.string(), z.string().refine((v) => voiceIds.has(v))).optional(),
    precise: z.boolean().default(false),
    audience: z.string().max(20).optional(),
    projectId: z.string().max(60).default('shared'),
  })
  .refine((r) => !r.turns || new Set(r.turns.map((t) => t.speaker)).size <= 2, 'At most 2 speakers per line.');
export type TtsRequest = z.infer<typeof TtsRequest>;

function deliveryStyle(r: TtsRequest): string {
  const tone = TONE_STYLE[r.style] ?? r.style;
  const mood = r.mood ? `, ${MOOD_STYLE[r.mood]}` : '';
  const kids = r.audience?.startsWith('kids') ? ', clearly for young children' : '';
  return `Say ${tone}${mood}${kids}, ${SPEED_STYLE(r.speed)}`;
}

export async function textToSpeech(r: TtsRequest): Promise<{ audioUrl: string; durationSec: number; words: WordTime[]; timing: 'estimate' | 'precise'; format: string }> {
  const lang = LANG_SUPPORT[r.language];
  if (!lang || lang.engine === 'unsupported') throw new HttpError(422, 'language_unsupported', `Google AI voices don't support this language yet (${r.language}).`);
  if (lang.engine === 'cloud-tts') throw new HttpError(422, 'language_unsupported', `${r.language} needs Google Cloud Text-to-Speech, which isn't set up on this server.`);

  const style = deliveryStyle(r);
  const turns: SpeechTurn[] = r.turns?.length ? r.turns.filter((t) => t.text.trim()).map((t) => ({ ...t, style })) : [{ speaker: 'Narrator', text: r.text, style }];
  const voiceMap: Record<string, string> = { Narrator: r.voice, ...(r.voices ?? {}) };
  for (const t of turns) voiceMap[t.speaker] ??= r.voice;
  const spoken = turns.map((t) => t.text).join(' ');

  const raw = await speak(turns, voiceMap);
  const pcm = toPcm(raw.mimeType, raw.data);
  const natural = pcm.samples.length / 2 / pcm.channels / pcm.rate;
  // Speed is asked for in the style; if the voice drifted more than 8% from it, stretch (pitch kept).
  let tempo = 1;
  if (Math.abs(r.speed - 1) > 0.001) {
    const words = spoken.split(/\s+/).filter(Boolean).length;
    const target = words / (BASE_WPS * r.speed);
    const ratio = natural / target;
    if (Math.abs(ratio - 1) > SPEED_TOLERANCE) tempo = Math.min(1.2, Math.max(0.85, ratio));
  }
  const file = await encodeVoice(pcm, tempo);
  const audioUrl = saveMedia(r.projectId, file.data, file.ext);
  let words = estimateWords(spoken, file.seconds);
  let timing: 'estimate' | 'precise' = 'estimate';
  if (r.precise) {
    const exact = await preciseWords({ mime: file.mime, data: file.data }, spoken, file.seconds);
    if (exact) {
      words = exact;
      timing = 'precise';
    }
  }
  return { audioUrl, durationSec: +file.seconds.toFixed(3), words, timing, format: file.ext };
}
