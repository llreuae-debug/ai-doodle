import type { Mood, WordTime } from '../model/types';

/**
 * The browser side of the AI API (server/api). Every call goes to this app's own server, which holds
 * the Google AI key; the key never reaches the browser.
 */

export class AiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * An earlier build kept the Google AI key in this browser. Keys now live only on the server, so any
 * copy left in browser storage is deleted.
 */
try {
  if (typeof localStorage !== 'undefined') localStorage.removeItem('gemini_api_key');
} catch {
  // Storage unavailable: nothing to clean up.
}

async function call<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, body === undefined ? { signal } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  } catch (err) {
    if (signal?.aborted) throw new AiError('cancelled', 'Cancelled.');
    void err;
    throw new AiError('offline', "Couldn't reach the AI service. Check your connection.");
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data ?? {}) as { error?: string; message?: string };
    if (res.status === 404) throw new AiError('not_configured', "AI isn't available in this build. Run the app with `npm run dev` or `npm start`.");
    // No key on the server yet: the editor opens the "Google Gemini API Key" dialog.
    if (err.error === 'not_configured' && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('open-api-key-modal'));
    throw new AiError(err.error ?? 'error', err.message ?? `The AI service returned ${res.status}.`);
  }
  return data as T;
}

/** Downloads a generated file (voice, music, picture) from the server's media folder. */
export async function fetchMedia(url: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new AiError('media', `Couldn't download the generated file (${res.status}).`);
  return res.blob();
}

// ---------- elements ----------

export type ElementType = 'element' | 'character' | 'scene';
export type ElementStyle = 'doodle' | 'colour-doodle' | '3d' | 'flat' | 'watercolour' | 'charcoal' | 'photo' | 'anime';

export type ElementResult =
  | { kind: 'vector'; name: string; strokes: string[]; fills: { d: string; c: string }[] }
  | { kind: 'image'; name: string; url: string; width: number; height: number; transparent: boolean };

export interface ElementRequest {
  type: ElementType;
  style: ElementStyle;
  prompt: string;
  variations: 1 | 3 | 4;
  aspect?: string;
  projectId?: string;
  /** Reuse an earlier identical result (story builds). */
  reuse?: boolean;
  characterSheet?: { name: string; look: string; style?: ElementStyle; reference?: { mimeType: 'image/png'; data: string } };
}

export const generateElements = (r: ElementRequest, signal?: AbortSignal) => call<{ results: ElementResult[]; failed: number }>('/api/element', r, signal);

// ---------- story ----------

export type StoryType = 'kids' | 'explainer' | 'faith-islamic' | 'faith-christian' | 'business' | 'motivational' | 'true-life';
export type Audience = 'kids-4-8' | 'kids-9-12' | 'teens' | 'adults';
export type Tone = 'warm' | 'funny' | 'inspiring' | 'calm' | 'dramatic';
export type Language = 'en' | 'ur' | 'hi' | 'ar';

export interface StoryVisual {
  type: 'character' | 'element' | 'scene';
  ref: string | null;
  description: string;
  position: 'left' | 'right' | 'center' | 'background';
}
export interface StorySlide {
  n: number;
  narration: string;
  speaker: string;
  on_screen_text: string;
  on_screen_text_en?: string;
  visuals: StoryVisual[];
  transition: 'none' | 'fade' | 'wipe' | 'push' | 'iris';
  mood: Mood;
}
export interface Storyboard {
  title: string;
  logline: string;
  takeaway: string;
  characters: { id: string; name: string; look: string; voice: string | null }[];
  acts: { name: string; slides: number[] }[];
  slides: StorySlide[];
}
export interface StoryRequest {
  title: string;
  length: 3 | 5 | 8;
  type: StoryType;
  audience: Audience;
  tone: Tone;
  language: Language;
  englishText: boolean;
  include: string;
  revise?: { storyboard: Storyboard; instruction: string };
}

export const writeStory = (r: StoryRequest, signal?: AbortSignal) => call<{ storyboard: Storyboard; warnings: string[] }>('/api/story', r, signal);

export const rewriteSlide = (
  r: {
    storyContext: { title: string; logline?: string; language: Language; type: StoryType; audience: Audience; tone: Tone; englishText: boolean; characters: { id: string; name: string; look: string }[]; previous?: string; next?: string };
    slide: StorySlide;
    instruction: string;
  },
  signal?: AbortSignal,
) => call<{ slide: StorySlide }>('/api/slide', r, signal);

// ---------- voices ----------

export interface VoiceInfo {
  id: string;
  name: string;
  gender: 'female' | 'male';
  style_tags: string[];
  languages: string[];
  provider: 'gemini';
  previewUrl: string;
}
export interface VoiceCatalog {
  defaults: Record<'storyteller' | 'kids' | 'documentary', string>;
  voices: VoiceInfo[];
  langSupport: Record<string, { engine: 'gemini' | 'cloud-tts' | 'unsupported'; note: string }>;
}

let catalog: Promise<VoiceCatalog> | null = null;
export const listVoices = (): Promise<VoiceCatalog> => {
  catalog ??= call<VoiceCatalog>('/api/voices').catch((err) => {
    catalog = null;
    throw err;
  });
  return catalog;
};

export interface TtsRequest {
  text: string;
  voice: string;
  language: Language;
  style: string;
  mood?: Mood;
  speed: number;
  turns?: { speaker: string; text: string }[];
  voices?: Record<string, string>;
  precise?: boolean;
  audience?: string;
  projectId?: string;
}
export interface TtsResult {
  audioUrl: string;
  durationSec: number;
  words: WordTime[];
  timing: 'estimate' | 'precise';
  format: string;
}

export const speakText = (r: TtsRequest, signal?: AbortSignal) => call<TtsResult>('/api/tts', r, signal);

// ---------- music ----------

export interface MusicStyleInfo {
  id: string;
  label: string;
  instruments: string[];
}
export const musicStyles = () => call<{ styles: MusicStyleInfo[]; moods: Record<Mood, { bpm: number; intensity: string; words: string }> }>('/api/music/styles');

export interface MusicRequest {
  projectId: string;
  mode: 'whole' | 'by-section';
  totalSec: number;
  sections: { fromSec: number; toSec: number; mood: Mood }[];
  style: string;
  tempo?: number;
  intensity?: 'very-soft' | 'soft' | 'medium';
  instruments: string[];
  noPercussion: boolean;
  vocalsOff: true;
  extra: string;
  seed?: number;
}
export interface MusicResult {
  audioUrl: string;
  durationSec: number;
  loopable: true;
  seed: number;
  generated: number;
  sections: { fromSec: number; toSec: number; mood: Mood; url: string }[];
}
export const generateMusic = (r: MusicRequest, signal?: AbortSignal) => call<MusicResult>('/api/music', r, signal);

// ---------- misc ----------

export async function writeVoiceLine(items: string, title: string): Promise<string> {
  const r = await call<{ text?: unknown }>('/api/ai/voiceline', { items, title });
  const text = typeof r.text === 'string' ? r.text.trim() : '';
  if (!text) throw new AiError('empty', "Couldn't write a line right now. Try again in a moment.");
  return text;
}

/** Sends a Google AI key to the server, which checks it with Google and saves it to .env.local. */
export const setAiApiKey = (key: string) => call<{ success: boolean; provider: string }>('/api/ai/set-key', { key });

export const getAiStatus = () => call<{ configured: boolean; provider: string | null }>('/api/ai/status');
