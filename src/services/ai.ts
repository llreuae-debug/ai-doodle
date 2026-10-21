import type { Mood, WordTime } from '../model/types';

/**
 * The browser side of the AI API. Supports both server-side proxy mode (/api) and direct
 * client-side Google Gemini API mode when deployed statically (Vercel, Netlify) or when
 * the server isn't available.
 */

export class AiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const API_KEY_STORAGE = 'gemini_api_key';

export function getClientApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(API_KEY_STORAGE)?.trim() || '';
}

export function setClientApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  const k = key.trim();
  if (k) {
    localStorage.setItem(API_KEY_STORAGE, k);
    // Also notify dev/prod server to store in .env.local if reachable
    fetch('/api/ai/set-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: k }),
    }).catch(() => {});
  } else {
    localStorage.removeItem(API_KEY_STORAGE);
  }
}

const CANDIDATE_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];

export async function testApiKey(key: string): Promise<{ ok: boolean; model?: string; error?: string }> {
  for (const model of CANDIDATE_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string; status?: string } };
      if (res.ok) {
        return { ok: true, model };
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        return { ok: false, error: data.error?.message || 'Google AI rejected the API key.' };
      }
      // If 429 quota exhausted on this model, try next model in loop
      if (res.status === 429) {
        continue;
      }
    } catch (err: unknown) {
      void err;
    }
  }
  return { ok: false, error: 'Could not connect to Google AI or quota exhausted on free models.' };
}

async function callDirectGemini(prompt: string, key: string, schema?: object, signal?: AbortSignal): Promise<string> {
  let lastErr = 'Google AI request failed.';
  for (const model of CANDIDATE_MODELS) {
    try {
      const body: Record<string, unknown> = {
        contents: [{ parts: [{ text: prompt }] }],
      };
      if (schema) {
        body.generationConfig = {
          responseMimeType: 'application/json',
          responseSchema: schema,
        };
      }
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });
      const data = (await res.json().catch(() => ({}))) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        error?: { message?: string; status?: string };
      };
      if (res.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
      if (res.status === 429) {
        lastErr = 'Daily quota limit reached for free models. Try adding a paid key or wait a while.';
        continue;
      }
      if (data.error?.message) {
        lastErr = data.error.message;
      }
    } catch (err) {
      if (signal?.aborted) throw new AiError('cancelled', 'Cancelled.');
      void err;
    }
  }
  throw new AiError('api_error', lastErr);
}

const FALLBACK_VOICES: VoiceCatalog = {
  defaults: { storyteller: 'Sulafat', kids: 'Zephyr', documentary: 'Charon' },
  voices: [
    { id: 'Zephyr', name: 'Zephyr', gender: 'female', style_tags: ['bright', 'kids'], languages: ['en', 'ur', 'hi', 'ar'], provider: 'gemini', previewUrl: '/assets/voices/previews/Zephyr.mp3' },
    { id: 'Puck', name: 'Puck', gender: 'male', style_tags: ['upbeat', 'kids'], languages: ['en', 'ur', 'hi', 'ar'], provider: 'gemini', previewUrl: '/assets/voices/previews/Puck.mp3' },
    { id: 'Sulafat', name: 'Sulafat', gender: 'female', style_tags: ['warm', 'storyteller'], languages: ['en', 'ur', 'hi', 'ar'], provider: 'gemini', previewUrl: '/assets/voices/previews/Sulafat.mp3' },
    { id: 'Charon', name: 'Charon', gender: 'male', style_tags: ['deep', 'documentary'], languages: ['en', 'ur', 'hi', 'ar'], provider: 'gemini', previewUrl: '/assets/voices/previews/Charon.mp3' },
  ],
  langSupport: {
    en: { engine: 'gemini', note: 'Full Gemini TTS support' },
    ur: { engine: 'gemini', note: 'Supported' },
    hi: { engine: 'gemini', note: 'Supported' },
    ar: { engine: 'gemini', note: 'Supported' },
  },
};

const FALLBACK_MUSIC_STYLES = {
  styles: [
    { id: 'acoustic', label: 'Acoustic Guitar', instruments: ['acoustic guitar', 'soft percussion'] },
    { id: 'ambient', label: 'Ambient & Calm', instruments: ['synth pad', 'gentle piano'] },
    { id: 'playful', label: 'Playful & Upbeat', instruments: ['ukulele', 'glockenspiel', 'marimba'] },
    { id: 'corporate', label: 'Corporate Tech', instruments: ['clean electric piano', 'muted guitar'] },
  ],
  moods: {
    happy: { bpm: 120, intensity: 'medium', words: 'cheerful, lighthearted' },
    tense: { bpm: 90, intensity: 'soft', words: 'suspenseful, mystery' },
    calm: { bpm: 80, intensity: 'very-soft', words: 'gentle, relaxing' },
    sad: { bpm: 70, intensity: 'soft', words: 'reflective, melancholic' },
    exciting: { bpm: 135, intensity: 'medium', words: 'dynamic, driving' },
  },
};

async function handleClientFallback<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const key = getClientApiKey();

  if (path === '/api/ai/status') {
    return { configured: !!key, provider: 'gemini', models: { text: 'gemini-3.5-flash-lite' } } as T;
  }
  if (path === '/api/voices') {
    return FALLBACK_VOICES as T;
  }
  if (path === '/api/music/styles') {
    return FALLBACK_MUSIC_STYLES as T;
  }

  if (!key) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-api-key-modal'));
    }
    throw new AiError('not_configured', 'Google Gemini API key required. Please enter your API key to use AI features.');
  }

  if (path === '/api/ai/voiceline') {
    const { items, title } = (body as { items?: string; title?: string }) || {};
    const prompt = `Write a natural, friendly voiceover line (1 to 2 sentences, under 35 words) for one slide of a whiteboard explainer video. The slide shows: ${items || 'nothing yet'}. Video title: "${title || 'Untitled'}". Reply with the spoken words only, no quotes.`;
    const text = await callDirectGemini(prompt, key, undefined, signal);
    return { text: text.trim().replace(/^"|"$/g, '') } as T;
  }

  if (path === '/api/story') {
    const r = body as StoryRequest;
    const prompt = `Write an engaging storyboard for a whiteboard explainer video titled "${r.title}".
Length: ${r.length} minutes. Type: ${r.type}. Target Audience: ${r.audience}. Tone: ${r.tone}. Language: ${r.language}.
Additional details to include: ${r.include || 'None'}.
Return a structured JSON with title, logline, takeaway, characters array (id, name, look, voice), acts array (name, slides), and slides array (n, narration, speaker, on_screen_text, visuals with type/ref/description/position, transition, mood).`;

    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        logline: { type: 'string' },
        takeaway: { type: 'string' },
        characters: {
          type: 'array',
          items: {
            type: 'object',
            properties: { id: { type: 'string' }, name: { type: 'string' }, look: { type: 'string' }, voice: { type: ['string', 'null'] } },
            required: ['id', 'name', 'look'],
          },
        },
        acts: {
          type: 'array',
          items: {
            type: 'object',
            properties: { name: { type: 'string' }, slides: { type: 'array', items: { type: 'integer' } } },
            required: ['name', 'slides'],
          },
        },
        slides: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              n: { type: 'integer' },
              narration: { type: 'string' },
              speaker: { type: 'string' },
              on_screen_text: { type: 'string' },
              visuals: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { type: { type: 'string', enum: ['character', 'element', 'scene'] }, ref: { type: ['string', 'null'] }, description: { type: 'string' }, position: { type: 'string', enum: ['left', 'right', 'center', 'background'] } },
                  required: ['type', 'ref', 'description', 'position'],
                },
              },
              transition: { type: 'string', enum: ['none', 'fade', 'wipe', 'push', 'iris'] },
              mood: { type: 'string', enum: ['happy', 'tense', 'calm', 'sad', 'exciting'] },
            },
            required: ['n', 'narration', 'speaker', 'on_screen_text', 'visuals', 'transition', 'mood'],
          },
        },
      },
      required: ['title', 'logline', 'takeaway', 'characters', 'acts', 'slides'],
    };

    const jsonStr = await callDirectGemini(prompt, key, schema, signal);
    try {
      const storyboard = JSON.parse(jsonStr) as Storyboard;
      return { storyboard, warnings: [] } as T;
    } catch {
      throw new AiError('bad_json', 'Google AI returned an invalid story format. Please try again.');
    }
  }

  if (path === '/api/slide') {
    const { slide, instruction } = (body as { slide: StorySlide; instruction: string }) || {};
    const prompt = `Rewrite this whiteboard video slide according to the instruction: "${instruction}".
Original narration: "${slide?.narration || ''}". On-screen text: "${slide?.on_screen_text || ''}". Mood: ${slide?.mood || 'happy'}.
Return JSON with { n: ${slide?.n ?? 1}, narration, speaker, on_screen_text, visuals, transition, mood }.`;
    const jsonStr = await callDirectGemini(prompt, key, undefined, signal);
    try {
      const rewritten = JSON.parse(jsonStr) as StorySlide;
      return { slide: { ...slide, ...rewritten } } as T;
    } catch {
      return { slide: { ...slide, narration: jsonStr.slice(0, 300) } } as T;
    }
  }

  if (path === '/api/element') {
    const req = body as ElementRequest;
    if (req.style === 'doodle' || req.style === 'colour-doodle') {
      const isColor = req.style === 'colour-doodle';
      const prompt = `Draw a clean whiteboard doodle line-art of: "${req.prompt}".
Type: ${req.type}. Color: ${isColor ? 'yes, include fills with hex colors' : 'black and white only'}.
ViewBox is 0 0 200 200. Return JSON with name, strokes (array of SVG path d strings using M, L, C, Q), and fills (array of {d, c} where c is hex color).`;
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          strokes: { type: 'array', items: { type: 'string' } },
          fills: { type: 'array', items: { type: 'object', properties: { d: { type: 'string' }, c: { type: 'string' } }, required: ['d', 'c'] } },
        },
        required: ['name', 'strokes', 'fills'],
      };
      const jsonStr = await callDirectGemini(prompt, key, schema, signal);
      try {
        const parsed = JSON.parse(jsonStr) as { name: string; strokes: string[]; fills: { d: string; c: string }[] };
        return {
          results: [{ kind: 'vector', name: parsed.name || req.prompt, strokes: parsed.strokes || [], fills: parsed.fills || [] }],
          failed: 0,
        } as T;
      } catch {
        throw new AiError('bad_drawing', 'Could not generate vector strokes. Try a simpler description.');
      }
    }
    throw new AiError('not_supported', 'Photo and 3D image raster rendering requires the local image pipeline. Use Doodle styles or run locally.');
  }

  throw new AiError('not_supported', `This operation requires the local server. Run the app with npm run dev or npm start.`);
}

async function call<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response | null = null;
  try {
    res = await fetch(path, body === undefined ? { signal } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  } catch (err) {
    if (signal?.aborted) throw new AiError('cancelled', 'Cancelled.');
    void err;
    // Network offline or failed to fetch /api -> use client direct mode
    return handleClientFallback<T>(path, body, signal);
  }

  if (res.ok) {
    const data: unknown = await res.json().catch(() => null);
    return data as T;
  }

  // 404 = static hosting or endpoint missing; 401 = session missing or expired -> fallback to client direct mode
  if (res.status === 404 || res.status === 401) {
    return handleClientFallback<T>(path, body, signal);
  }

  const data: unknown = await res.json().catch(() => null);
  const err = (data ?? {}) as { error?: string; message?: string };
  throw new AiError(err.error ?? 'error', err.message ?? `The AI service returned ${res.status}.`);
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
  variations: 1 | 4;
  aspect?: string;
  projectId?: string;
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
  catalog ??= call<VoiceCatalog>('/api/voices').catch(() => FALLBACK_VOICES);
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

export const setAiApiKey = (key: string) => {
  setClientApiKey(key);
  return call<{ success: boolean; provider: string }>('/api/ai/set-key', { key });
};

export const getAiStatus = () => call<{ configured: boolean; provider: string | null }>('/api/ai/status');
