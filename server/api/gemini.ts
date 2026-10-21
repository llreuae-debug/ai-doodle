import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import { getSavedKey } from './savedKey.ts';
import path from 'node:path';

/**
 * Google AI (Gemini API) over REST, generateContent endpoint. Model IDs checked against
 * ai.google.dev and this key's model list on 2026-10-21; override any of them in .env.
 * Never logs keys, prompts or user text.
 */
export const MODELS = {
  text: process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash-lite',
  image: process.env.GEMINI_IMAGE_MODEL || 'gemini-nano-banana-2.1',
  tts: process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts',
};

/**
 * Speech models tried in order when one has used up its daily quota (free keys get a small daily
 * allowance per model, e.g. 10 requests for gemini-3.8-flash-tts).
 */
/** Text models tried in order when the main one has used up its daily quota (each has its own). */
/**
 * Story writing needs the stronger Flash models (the lite ones write thin narration); the general
 * text chain is used once these are out of quota.
 */
export const STORY_MODELS = (process.env.GEMINI_STORY_MODELS || 'gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

export const TEXT_FALLBACKS = (process.env.GEMINI_TEXT_FALLBACKS || 'gemini-3.8-flash,gemini-3.1-flash-lite,gemini-3-flash-preview,gemini-3.5-flash-lite')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

/** Models already known to be out of daily quota (cleared after a few hours). */
const exhausted = new Map<string, number>();
const EXHAUSTED_FOR_MS = 3 * 60 * 60 * 1000;

/**
 * Runs `fn` with the first model in the chain that has quota left. A used-up quota or an overloaded
 * model moves on to the next; any other error is returned straight away.
 */
export async function withFallback<T>(models: string[], fn: (model: string) => Promise<T>): Promise<T> {
  let last: unknown = null;
  for (const model of models) {
    const until = exhausted.get(model);
    if (until && until > Date.now()) continue;
    try {
      return await fn(model);
    } catch (err) {
      if (!(err instanceof HttpError) || !['daily_quota', 'no_quota', 'api_error'].includes(err.code)) throw err;
      // Out of quota: skip this model for a while. Overloaded (5xx after retries): just try the next one.
      if (err.code !== 'api_error') exhausted.set(model, Date.now() + EXHAUSTED_FOR_MS);
      last = err;
    }
  }
  throw last ?? new HttpError(429, 'daily_quota', 'Every Google AI model this key can use has reached its free daily limit. Try again later or turn on billing.');
}

export const TTS_FALLBACKS = (process.env.GEMINI_TTS_FALLBACKS || 'gemini-3.8-flash-lite-tts,gemini-3.1-flash-tts-preview,gemini-2.5-flash-preview-tts')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

/** Google AI address. GEMINI_API_BASE points it elsewhere for tests (the audit's failure mocks). */
export const API_ROOT = (process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
const BASE = `${API_ROOT}/v1beta/models`;
const MAX_RETRIES = 3;
/** One Google AI call gives up after this long (then it is retried), so a stalled answer can't hang a request. */
const CALL_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 180_000;

export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Reads a key from the environment, or from .env / .env.local next to the app. */
export function envKey(name: string): string | undefined {
  const v = process.env[name]?.trim();
  if (v) return v;
  for (const file of ['.env.local', '.env']) {
    try {
      const text = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
      const m = text.match(new RegExp(`^${name}=([^\\r\\n]+)`, 'm'));
      const val = m?.[1]?.trim().replace(/^['"]|['"]$/g, '');
      if (val) {
        process.env[name] = val;
        return val;
      }
    } catch {
      // No such file.
    }
  }
  return undefined;
}

/** The Google AI key: one saved from the key dialog (keystore.ts), else GEMINI_API_KEY. */
export const currentKey = (): string | undefined => getSavedKey() || envKey('GEMINI_API_KEY') || envKey('GOOGLE_API_KEY');

const apiKey = (): string => {
  const key = currentKey();
  if (!key) throw new HttpError(503, 'not_configured', 'AI is not set up. Add your Google AI key in the key dialog (or GEMINI_API_KEY in .env).');
  return key;
};

/**
 * Each API request gets a deadline (router.ts): on Vercel a function is stopped after 300 s, so work
 * gives up cleanly a little before that, with a message, instead of being cut off.
 */
export const requestDeadline = new AsyncLocalStorage<number>();
const remainingMs = () => (requestDeadline.getStore() ?? Infinity) - Date.now();
const tooLong = () => new HttpError(504, 'timeout', 'This took too long: Google AI is busy or this key is near its free limits. Try again in a few minutes.');

const sleep = (ms: number) => {
  if (ms > remainingMs() - 5000) throw tooLong();
  return new Promise((r) => setTimeout(r, ms));
};

export interface Part {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  speechMetadata?: { speaker?: string; style?: string };
}

interface Payload {
  candidates?: Array<{ content?: { parts?: Part[] }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string; details?: Array<{ '@type'?: string; retryDelay?: string; violations?: Array<{ quotaId?: string }> }> };
}

/** "28738s" → seconds. */
const delaySeconds = (payload: Payload): number | null => {
  const d = payload.error?.details?.find((x) => x.retryDelay)?.retryDelay;
  return d ? Number.parseFloat(d) : null;
};
const hours = (s: number) => (s >= 3600 ? `${Math.round(s / 3600)} h` : `${Math.max(1, Math.round(s / 60))} min`);

/** One generateContent call, retried on 429 and 5xx with exponential backoff (max 3 retries). */
export async function generate(model: string, parts: Part[], generationConfig: Record<string, unknown> = {}, systemInstruction?: string): Promise<Part[]> {
  const body = JSON.stringify({
    contents: [{ role: 'user', parts }],
    generationConfig,
    ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
  });
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      if (remainingMs() < 3000) throw tooLong();
      const left = remainingMs();
      res = await fetch(`${BASE}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey() },
        body,
        signal: AbortSignal.timeout(Math.min(CALL_TIMEOUT_MS, left - 1000)),
      });
    } catch (err) {
      if (err instanceof HttpError) throw err;
      if (remainingMs() < 5000) throw tooLong();
      if (attempt < MAX_RETRIES) {
        await sleep(800 * 2 ** attempt);
        continue;
      }
      throw new HttpError(502, 'offline', "Couldn't reach Google AI. Check the server's connection and try again.");
    }
    const payload = (await res.json().catch(() => ({}))) as Payload;
    if (res.ok) {
      if (payload.promptFeedback?.blockReason) throw new HttpError(422, 'refused', 'Google AI declined this request. Try different words.');
      const out = payload.candidates?.[0]?.content?.parts ?? [];
      if (out.length === 0) throw new HttpError(502, 'empty', 'Google AI returned nothing usable. Try again.');
      return out;
    }
    const detail = payload.error?.message ?? '';
    // Free keys have no quota at all for some models (pictures): retrying won't help.
    if (res.status === 429 && /limit: 0\b/.test(detail)) {
      throw new HttpError(402, 'no_quota', `This Google AI key has no quota for ${model}. Turn on billing for the key in Google AI Studio.`);
    }
    const wait = delaySeconds(payload);
    const daily = payload.error?.details?.some((x) => x.violations?.some((v) => /PerDay/i.test(v.quotaId ?? '')));
    // A daily limit (or a long wait) won't clear by retrying now.
    if (res.status === 429 && (daily || (wait !== null && wait > 60))) {
      throw new HttpError(429, 'daily_quota', `The free daily limit for ${model} is used up. It resets in about ${hours(wait ?? 3600)}, or turn on billing for the key.`);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      const retryAfter = wait ?? Number(res.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 60) * 1000 : 1000 * 2 ** attempt + Math.random() * 400);
      continue;
    }
    if (res.status === 429) throw new HttpError(429, 'rate_limited', 'Too many requests. Wait a minute and try again.');
    if (res.status === 400) throw new HttpError(400, 'bad_request', `Google AI rejected the request: ${detail.slice(0, 160)}`);
    if (res.status === 401 || res.status === 403) throw new HttpError(503, 'not_configured', 'Google AI rejected the API key. Check GEMINI_API_KEY.');
    throw new HttpError(502, 'api_error', `Google AI returned an error (${res.status}). Try again.`);
  }
}

/** Structured JSON output (responseJsonSchema). The caller validates the result; counts aren't enforced by the API. */
export async function generateJson<T = unknown>(
  prompt: string | Part[],
  schema: object,
  opts: { system?: string; temperature?: number; model?: string; models?: string[]; thinking?: 'minimal' | 'low' | 'medium' | 'high' } = {},
): Promise<T> {
  const parts = typeof prompt === 'string' ? [{ text: prompt }] : prompt;
  const chain = opts.model ? [opts.model] : [...new Set([...(opts.models ?? []), MODELS.text, ...TEXT_FALLBACKS])];
  const out = await withFallback(chain, (model) =>
    generate(
      model,
      parts,
      { temperature: opts.temperature ?? 0.7, responseMimeType: 'application/json', responseJsonSchema: schema, ...(opts.thinking ? { thinkingConfig: { thinkingLevel: opts.thinking } } : {}) },
      opts.system,
    ),
  );
  const text = out.map((p) => p.text ?? '').join('').trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(502, 'bad_output', 'Google AI returned malformed data. Try again.');
  }
}

/** A picture from the image model; optional reference images keep a character consistent. */
export async function generatePicture(prompt: string, refs: { mimeType: string; data: string }[] = [], aspectRatio = '1:1'): Promise<{ mimeType: string; data: Buffer }> {
  const parts: Part[] = [...refs.map((r) => ({ inlineData: r })), { text: prompt }];
  const out = await generate(MODELS.image, parts, { responseModalities: ['IMAGE'], imageConfig: { aspectRatio } });
  const img = out.find((p) => p.inlineData?.data);
  if (!img?.inlineData) throw new HttpError(502, 'empty', 'Google AI returned no picture. Try different words.');
  return { mimeType: img.inlineData.mimeType, data: Buffer.from(img.inlineData.data, 'base64') };
}

export interface SpeechTurn {
  speaker: string;
  text: string;
  style?: string;
}

/**
 * Speech. One speaker: a single voice. Two speakers (dialogue): multi-speaker mode, each turn
 * tagged with its speaker. Returns the audio bytes as sent (WAV, or raw 16-bit PCM).
 */
export async function speak(turns: SpeechTurn[], voices: Record<string, string>): Promise<{ mimeType: string; data: Buffer }> {
  const speakers = [...new Set(turns.map((t) => t.speaker))];
  const multi = speakers.length > 1;
  const parts: Part[] = turns.map((t) => ({ text: t.text, ...(multi || t.style ? { speechMetadata: { ...(multi ? { speaker: t.speaker } : {}), ...(t.style ? { style: t.style } : {}) } } : {}) }));
  const speechConfig = multi
    ? { multiSpeakerVoiceConfig: { speakerVoiceConfigs: speakers.map((s) => ({ speaker: s, voiceConfig: { prebuiltVoiceConfig: { voiceName: voices[s] } } })) } }
    : { voiceConfig: { prebuiltVoiceConfig: { voiceName: voices[speakers[0]] } } };
  // Older speech models don't take speechMetadata: they get the classic prompt form instead
  // ("Say warmly: ..." for one voice, "Name: line" turns for two).
  const classic: Part[] = multi
    ? [{ text: `${turns[0].style ? `${turns[0].style}.\n` : ''}${turns.map((t) => `${t.speaker}: ${t.text}`).join('\n')}` }]
    : [{ text: `${turns[0].style ? `${turns[0].style}: ` : ''}${turns.map((t) => t.text).join(' ')}` }];
  const out = await withFallback([MODELS.tts, ...TTS_FALLBACKS], async (model) => {
    const config = { responseModalities: ['AUDIO'], speechConfig };
    try {
      return await generate(model, parts, config);
    } catch (err) {
      if (err instanceof HttpError && err.code === 'bad_request' && /speech.?metadata/i.test(err.message)) return generate(model, classic, config);
      throw err;
    }
  });
  const audio = out.find((p) => p.inlineData?.data);
  if (!audio?.inlineData) throw new HttpError(502, 'empty', 'Google AI returned no audio. Try again.');
  return { mimeType: audio.inlineData.mimeType, data: Buffer.from(audio.inlineData.data, 'base64') };
}
