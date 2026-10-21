import { buildTimeline } from '../engine/timeline';
import { layoutText, measureCtx } from '../engine/geometry';
import type { Resources } from '../engine/resources';
import { LIBRARY, validStrokes, type DoodleDef } from '../library/doodles';
import { loadFont } from '../library/fonts';
import { loadLibraryManifest } from '../library/manifest';
import { newDoodle, newId, newImage, newProject, newScene, newText } from '../model/factories';
import { STAGE_SIZE, type AspectRatio, type BoardId, type CharacterSheet, type Mood, type Project, type Scene, type SceneElement, type TextElement, type Voice, type WordTime } from '../model/types';
import {
  AiError,
  fetchMedia,
  generateElements,
  generateMusic,
  listVoices,
  speakText,
  type Audience,
  type ElementStyle,
  type Language,
  type Storyboard,
  type StorySlide,
  type StoryType,
  type StoryVisual,
  type Tone,
} from './ai';
import { importImage } from './loaders';
import { musicFromResult } from './music';

/** Every stage runs at most this many requests at once. */
const CONCURRENCY = 3;
/** Narration pace for estimates when a voice is missing: words per second. */
const WORDS_PER_SEC = 2.5;
/** Safe margin on every side, as a share of the stage. */
const SAFE = 0.06;

export interface BuildSettings {
  title: string;
  length: 3 | 5 | 8;
  type: StoryType;
  audience: Audience;
  tone: Tone;
  language: Language;
  englishText: boolean;
  ratio: AspectRatio;
  board: BoardId;
  handId: string | null;
  style: ElementStyle;
  voiceId: string;
  speed: number;
  /** 'none', 'auto' (style picked from the story) or a music style id. */
  music: string;
  noDrums: boolean;
  precise: boolean;
}

export type StageId = 'visuals' | 'voice' | 'music' | 'slides';
export type Progress = Record<StageId, { done: number; total: number; failed: number }>;

export interface BuildResult {
  project: Project;
  /** Slides kept (all, or the finished ones after a cancel). */
  slides: number;
  cancelled: boolean;
  problems: string[];
}

const VERSE = /\[VERSE:\s*([^\]]+)\]/gi;
export const verseTopics = (s: string): string[] => [...s.matchAll(VERSE)].map((m) => m[1].trim());

/** Music style for "Auto": from the story type. */
export function autoMusicStyle(type: StoryType): string {
  if (type.startsWith('faith')) return 'humming-pad';
  if (type === 'kids') return 'playful-kids';
  if (type === 'business' || type === 'explainer') return 'corporate-light';
  if (type === 'motivational') return 'inspiring-cinematic';
  if (type === 'true-life') return 'warm-strings';
  return 'calm-piano';
}

const FONT_BY_LANG: Record<Language, string> = { en: 'Caveat', ur: 'Noto Nastaliq Urdu', ar: 'Noto Naskh Arabic', hi: 'Noto Sans Devanagari' };
/** Voices for characters, in order, skipping the narrator's. */
const CHARACTER_VOICES = ['Puck', 'Leda', 'Fenrir', 'Aoede', 'Achird', 'Laomedeia'];

// ---------- small helpers ----------

/** Waits before retrying a request that hit a per-minute limit or an overloaded model. */
const RETRY_WAITS_MS = [20_000, 45_000, 75_000];
const RETRYABLE = new Set(['rate_limited', 'api_error', 'offline', 'timeout']);

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => (clearTimeout(t), reject(new AiError('cancelled', 'Cancelled.'))), { once: true });
  });

/**
 * Free Google AI keys allow only a few requests a minute, so a long build waits and tries again
 * instead of giving up on the first "too many requests".
 */
async function patient<T>(fn: () => Promise<T>, signal: AbortSignal): Promise<T> {
  for (let i = 0; ; i++) {
    if (signal.aborted) throw new AiError('cancelled', 'Cancelled.');
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof AiError) || !RETRYABLE.has(err.code) || i >= RETRY_WAITS_MS.length) throw err;
      await sleep(RETRY_WAITS_MS[i], signal);
    }
  }
}

/** Runs at most `n` tasks at once. */
function limiter(n: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= n) await new Promise<void>((r) => queue.push(r));
    active++;
    try {
      return await task();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}

const STOP = new Set(['the', 'and', 'with', 'for', 'from', 'that', 'this', 'into', 'onto', 'over', 'under', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'its', 'his', 'her', 'their', 'small', 'big', 'little', 'large', 'very', 'some']);
const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w));

interface LibItem {
  id: string;
  name: string;
  tags: string[];
}

/** The best library item for a description: a word of its name must match, plus another word or tag. */
export function searchLibrary(description: string, items: LibItem[]): string | null {
  const want = new Set(tokens(description));
  let best: { id: string; score: number } | null = null;
  for (const it of items) {
    const name = new Set(tokens(it.name));
    const tags = new Set(it.tags.flatMap(tokens));
    let score = 0;
    let nameHit = false;
    for (const w of want) {
      if (name.has(w)) {
        score += 2;
        nameHit = true;
      } else if (tags.has(w)) score += 1;
    }
    if (nameHit && score >= 3 && (!best || score > best.score)) best = { id: it.id, score };
  }
  return best?.id ?? null;
}

const norm = (w: string) => w.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** When the on-screen text should appear: at its first matching spoken word, else 40% into the line. */
export function textCueMs(words: WordTime[], text: string, durationMs: number): number {
  const first = text.split(/\s+/).map(norm).find(Boolean);
  if (first) {
    const hit = words.find((w) => norm(w.w) === first) ?? words.find((w) => norm(w.w).startsWith(first) || first.startsWith(norm(w.w) || '\u0000'));
    if (hit) return Math.round(hit.start * 1000);
  }
  return Math.round(durationMs * 0.4);
}

/** Splits a character's line into narrator and quoted speech, for two-voice (multi-speaker) audio. */
export function dialogueTurns(narration: string, character: string): { speaker: string; text: string }[] | null {
  const parts = narration.split(/["“”]/);
  if (parts.length < 3) return null;
  const turns = parts
    .map((t, i) => ({ speaker: i % 2 ? character : 'Narrator', text: t.trim() }))
    .filter((t) => t.text.replace(/[\s,.;:!?–—-]/g, '').length > 0);
  return new Set(turns.map((t) => t.speaker)).size === 2 ? turns : null;
}

// ---------- layout ----------

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Placed = { kind: 'scene' | 'character' | 'element'; visual: StoryVisual; box: Box };

/**
 * Picks a layout template for the slide and gives every visual and the text a box inside the 6% safe
 * margins. Character boxes are never shared with text, so text can't cover a face.
 *  - character + text: character one side, text the other (portrait: text above);
 *  - two characters facing each other, text across the top;
 *  - centred prop(s) with a caption below;
 *  - scene background with the text on top.
 */
export function layoutSlide(visuals: StoryVisual[], hasText: boolean, W: number, H: number): { placed: Placed[]; text: Box | null } {
  const m = { x: W * SAFE, y: H * SAFE };
  const inner: Box = { x: m.x, y: m.y, w: W - 2 * m.x, h: H - 2 * m.y };
  const scene = visuals.find((v) => v.type === 'scene');
  const chars = visuals.filter((v) => v.type === 'character').slice(0, 2);
  const elems = visuals.filter((v) => v.type === 'element').slice(0, 2);
  const placed: Placed[] = [];
  const portrait = H > W;
  if (scene) placed.push({ kind: 'scene', visual: scene, box: { x: 0, y: 0, w: W, h: H } });
  const split = (b: Box, n: number, vertical = false): Box[] =>
    Array.from({ length: n }, (_, i) => (vertical ? { x: b.x, y: b.y + (i * b.h) / n, w: b.w, h: b.h / n } : { x: b.x + (i * b.w) / n, y: b.y, w: b.w / n, h: b.h }));

  let text: Box | null = null;
  const band = (top: number, share: number): Box => ({ x: inner.x, y: top, w: inner.w, h: inner.h * share });

  if (chars.length === 2) {
    // Two characters facing each other; text across the top.
    text = hasText ? band(inner.y, 0.2) : null;
    const below: Box = { x: inner.x, y: inner.y + (hasText ? inner.h * 0.24 : 0), w: inner.w, h: inner.h * (hasText ? 0.76 : 1) };
    const sides = portrait ? split(below, 2, true) : split(below, 2);
    const order = chars[0].position === 'right' ? [chars[1], chars[0]] : chars;
    order.forEach((c, i) => placed.push({ kind: 'character', visual: c, box: sides[i] }));
    elems.slice(0, 1).forEach((e) => placed.push({ kind: 'element', visual: e, box: { x: inner.x + inner.w * 0.4, y: below.y + below.h * 0.55, w: inner.w * 0.2, h: below.h * 0.45 } }));
  } else if (chars.length === 1) {
    const c = chars[0];
    if (portrait) {
      text = hasText ? band(inner.y, 0.22) : null;
      const rest: Box = { x: inner.x, y: inner.y + (hasText ? inner.h * 0.25 : 0), w: inner.w, h: inner.h * (hasText ? 0.75 : 1) };
      placed.push({ kind: 'character', visual: c, box: { ...rest, h: rest.h * (elems.length ? 0.68 : 1) } });
      if (elems.length) split({ x: rest.x, y: rest.y + rest.h * 0.7, w: rest.w, h: rest.h * 0.3 }, elems.length).forEach((b, i) => placed.push({ kind: 'element', visual: elems[i], box: b }));
    } else {
      const right = c.position === 'right';
      const charBox: Box = { x: right ? inner.x + inner.w * 0.56 : inner.x, y: inner.y, w: inner.w * 0.44, h: inner.h };
      const other: Box = { x: right ? inner.x : inner.x + inner.w * 0.5, y: inner.y, w: inner.w * 0.5, h: inner.h };
      placed.push({ kind: 'character', visual: c, box: charBox });
      if (elems.length) {
        const top: Box = { ...other, h: other.h * (hasText ? 0.55 : 1) };
        split(top, elems.length).forEach((b, i) => placed.push({ kind: 'element', visual: elems[i], box: b }));
        text = hasText ? { ...other, y: other.y + other.h * 0.6, h: other.h * 0.4 } : null;
      } else text = hasText ? { ...other, y: other.y + other.h * 0.25, h: other.h * 0.5 } : null;
    }
  } else if (elems.length) {
    // Centred prop(s) with a caption.
    const area: Box = { x: inner.x, y: inner.y, w: inner.w, h: inner.h * (hasText ? 0.74 : 1) };
    const boxes = split(area, elems.length, portrait && elems.length > 1);
    elems.forEach((e, i) => placed.push({ kind: 'element', visual: e, box: boxes[i] }));
    text = hasText ? band(inner.y + inner.h * 0.78, 0.22) : null;
  } else if (hasText) {
    // Scene (or nothing) with the text on top.
    text = scene ? band(inner.y, 0.22) : band(inner.y + inner.h * 0.35, 0.3);
  }
  return { placed, text };
}

/** A text element that fits its box: the largest size up to 110 px whose width fits, wrapped to two lines if long. */
export async function fitText(text: string, box: Box, font: string, maxSize = 110, weight: TextElement['weight'] = 700): Promise<TextElement> {
  await loadFont(font, weight, text);
  const words = text.trim().split(/\s+/);
  const lines = words.length > 3 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')].join('\n') : text.trim();
  const el = newText(lines, box.x + box.w / 2, box.y + box.h / 2, maxSize, font, weight);
  for (let size = Math.min(maxSize, box.h * 0.6); size >= 24; size -= 4) {
    el.size = Math.round(size);
    const l = layoutText(measureCtx(), el);
    if (l.width <= box.w && l.height <= box.h) break;
  }
  return el;
}

/** A doodle or image element sized to fit a box (scenes cover the whole stage). */
function fitVisual(v: ResolvedVisual, box: Box, cover: boolean): SceneElement {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  if (v.kind === 'doodle') return newDoodle(v.defId, cx, cy, cover ? Math.max(box.w, box.h) : Math.min(box.w, box.h), v.color);
  const aspect = v.width / v.height;
  const width = cover ? Math.max(box.w, box.h * aspect) : Math.min(box.w, box.h * aspect);
  return newImage(v.assetId, cx, cy, width);
}

// ---------- visuals ----------

type ResolvedVisual = { kind: 'doodle'; defId: string; color: boolean } | { kind: 'image'; assetId: string; width: number; height: number };

// ---------- the build ----------

export async function buildStory(
  sb: Storyboard,
  s: BuildSettings,
  resources: Resources,
  opts: { signal: AbortSignal; onProgress: (p: Progress) => void },
): Promise<BuildResult> {
  const { signal } = opts;
  const W = STAGE_SIZE[s.ratio].width;
  const H = STAGE_SIZE[s.ratio].height;
  const project = newProject(sb.title || s.title, s.handId);
  project.aspectRatio = s.ratio;
  project.board = s.board;
  project.scenes = [];
  project.story = { title: sb.title, logline: sb.logline, type: s.type, audience: s.audience, tone: s.tone, language: s.language, acts: sb.acts };
  const problems: string[] = [];

  // Progress.
  const progress: Progress = { visuals: { done: 0, total: 0, failed: 0 }, voice: { done: 0, total: sb.slides.length, failed: 0 }, music: { done: 0, total: s.music === 'none' ? 0 : 1, failed: 0 }, slides: { done: 0, total: sb.slides.length, failed: 0 } };
  const tick = () => opts.onProgress(structuredClone(progress));

  // ---- Visuals: library first, else generate (each character once). ----
  const manifest = await loadLibraryManifest();
  const library: LibItem[] = [...LIBRARY.filter((d) => !d.tags.includes('decor')), ...manifest];
  const charById = new Map(sb.characters.map((c) => [c.id, c]));
  const keyOf = (v: StoryVisual) => (v.type === 'character' && v.ref && charById.has(v.ref) ? `char:${v.ref}` : `${v.type}:${v.description.trim().toLowerCase()}`);
  const visualJobs = new Map<string, Promise<ResolvedVisual>>();
  const genLimit = limiter(CONCURRENCY);
  const generated: DoodleDef[] = [];

  const resolve = (v: StoryVisual): Promise<ResolvedVisual> => {
    const key = keyOf(v);
    const existing = visualJobs.get(key);
    if (existing) return existing;
    progress.visuals.total++;
    const job = (async (): Promise<ResolvedVisual> => {
      const ch = v.type === 'character' && v.ref ? charById.get(v.ref) : undefined;
      if (!ch && v.type === 'element') {
        const hit = searchLibrary(v.description, library);
        if (hit) return { kind: 'doodle', defId: hit, color: s.style !== 'doodle' };
      }
      const prompt = ch ? `${ch.name}: ${ch.look}` : v.description;
      const r = await genLimit(() => patient(() => generateElements({ type: v.type, style: s.style, prompt: prompt.slice(0, 500), variations: 1, aspect: s.ratio, projectId: project.id, reuse: true }, signal), signal));
      const res = r.results[0];
      if (res.kind === 'vector') {
        const def: DoodleDef = { id: `ai-${newId()}`, cat: 'custom', name: (ch?.name ?? res.name).slice(0, 32), tags: [v.type, s.style, 'story'], strokes: validStrokes(res.strokes), fills: res.fills };
        generated.push(def);
        if (ch) project.characters = [...(project.characters ?? []), { id: newId(), name: ch.name, look: ch.look, style: s.style, reference: '' } satisfies CharacterSheet];
        return { kind: 'doodle', defId: def.id, color: def.fills.length > 0 };
      }
      const blob = await fetchMedia(res.url, signal);
      const { asset, art } = await importImage(blob, (ch?.name ?? res.name).slice(0, 40));
      project.assets[asset.id] = asset;
      resources.art.set(`img:${asset.id}`, art);
      return { kind: 'image', assetId: asset.id, width: asset.width, height: asset.height };
    })();
    job.then(
      () => {
        progress.visuals.done++;
        tick();
      },
      () => {
        progress.visuals.done++;
        progress.visuals.failed++;
        tick();
      },
    );
    visualJobs.set(key, job);
    return job;
  };

  // Characters first, so every later slide reuses the same drawing.
  for (const c of sb.characters) if (sb.slides.some((sl) => sl.visuals.some((v) => v.ref === c.id))) void resolve({ type: 'character', ref: c.id, description: c.look, position: 'left' }).catch(() => {});
  for (const sl of sb.slides) for (const v of sl.visuals) void resolve(v).catch(() => {});
  tick();

  // ---- Voice: one call per slide, three at a time (runs alongside the visuals). ----
  const ttsLimit = limiter(CONCURRENCY);
  const voiceOf = new Map<string, string>();
  const pool = CHARACTER_VOICES.filter((v) => v !== s.voiceId);
  // The storyboard may describe a voice in words; only real Google voice names are used as-is.
  const known = new Set((await listVoices().catch(() => null))?.voices.map((v) => v.id) ?? CHARACTER_VOICES);
  sb.characters.forEach((c, i) => voiceOf.set(c.id, c.voice && known.has(c.voice) ? c.voice : pool[i % pool.length]));

  const voiceFor = async (sl: StorySlide): Promise<{ voice: Voice | null; problem?: string }> => {
    const spoken = sl.narration.replace(VERSE, '').replace(/\s{2,}/g, ' ').trim();
    if (!spoken) return { voice: null, problem: 'No narration to speak.' };
    const ch = charById.get(sl.speaker);
    const turns = ch ? dialogueTurns(spoken, ch.name) : null;
    try {
      const r = await ttsLimit(() =>
        patient(
          () =>
            speakText(
              {
                text: spoken,
                voice: ch && !turns ? voiceOf.get(ch.id)! : s.voiceId,
                language: s.language,
                style: s.tone,
                mood: sl.mood,
                speed: s.speed,
                precise: s.precise,
                audience: s.audience,
                projectId: project.id,
                ...(turns && ch ? { turns, voices: { Narrator: s.voiceId, [ch.name]: voiceOf.get(ch.id)! } } : {}),
              },
              signal,
            ),
          signal,
        ),
      );
      const blob = await fetchMedia(r.audioUrl, signal);
      return {
        voice: { kind: 'file', name: `Slide ${sl.n} voice.${r.format}`, blob, durationMs: Math.round(r.durationSec * 1000), ai: { text: spoken, voiceId: s.voiceId, language: s.language, speed: s.speed, words: r.words } },
      };
    } catch (err) {
      if (err instanceof AiError && err.code === 'cancelled') throw err;
      return { voice: null, problem: `Voice failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  };

  // ---- Slides: each waits for its visuals and voice, then is laid out and timed. ----
  const scenes: (Scene | null)[] = sb.slides.map(() => null);
  const font = FONT_BY_LANG[s.language];

  const buildSlide = async (sl: StorySlide, index: number): Promise<void> => {
    const notes: string[] = [];
    const [{ voice, problem }, ...visualResults] = await Promise.all([
      voiceFor(sl),
      ...sl.visuals.map((v) =>
        resolve(v).then(
          (r) => ({ v, r }),
          (err: unknown) => {
            if (err instanceof AiError && err.code === 'cancelled') throw err;
            notes.push(`Couldn't draw "${v.description.slice(0, 40)}": ${err instanceof Error ? err.message : String(err)}`);
            return { v, r: null };
          },
        ),
      ),
    ]);
    if (signal.aborted) return;
    progress.voice.done++;
    if (problem) {
      progress.voice.failed++;
      notes.push(problem);
    }
    const verses = verseTopics(sl.narration);
    if (verses.length) notes.push(`Add the verse for: ${verses.join(', ')}`);
    tick();

    const ok = visualResults.filter((x): x is { v: StoryVisual; r: ResolvedVisual } => x.r !== null);
    const label = sl.on_screen_text.trim();
    const { placed, text } = layoutSlide(
      ok.map((x) => x.v),
      !!label,
      W,
      H,
    );
    const scene = newScene(index === 0 ? 'none' : sl.transition);
    scene.voice = voice;
    scene.syncVoice = !!voice;
    scene.storyMood = sl.mood;
    scene.holdMs = 250;

    // Timing: the first visual starts with the first word; the text at its first matching word.
    const durationMs = voice?.durationMs ?? Math.round((sl.narration.split(/\s+/).length / WORDS_PER_SEC) * 1000);
    const words = voice?.ai?.words ?? [];
    const firstWord = Math.round((words[0]?.start ?? 0) * 1000);
    const textAt = label ? textCueMs(words, label, durationMs) : durationMs;
    const drawn = placed.filter((p) => p.kind !== 'scene');
    const windowMs = Math.max(1200, Math.min(textAt, durationMs * 0.85) - firstWord - 200);
    const each = drawn.length ? Math.min(4500, Math.max(900, windowMs / drawn.length)) : 0;
    let clock = firstWord;
    const elements: SceneElement[] = [];
    for (const p of placed) {
      const r = ok.find((x) => x.v === p.visual)!.r;
      const el = fitVisual(r, p.box, p.kind === 'scene');
      const first = elements.length === 0;
      if (p.kind === 'scene') el.anim = { type: 'fade', durationMs: 700, delayMs: first ? firstWord : 0 };
      else el.anim = { type: 'draw', durationMs: Math.round(each), delayMs: first ? firstWord : 0 };
      // The clock starts at the first word, which is the first element's delay.
      clock += el.anim.durationMs as number;
      elements.push(el);
    }
    if (label && text) {
      const t = await fitText(label, text, font);
      t.anim = { type: 'draw', durationMs: 'auto', delayMs: Math.max(0, textAt - clock) };
      elements.push(t);
      const en = sl.on_screen_text_en?.trim();
      if (s.englishText && s.language !== 'en' && en) {
        const sub = await fitText(en, { x: text.x, y: text.y + text.h * 0.72, w: text.w, h: text.h * 0.28 }, 'Caveat', 48, 400);
        t.y -= text.h * 0.12;
        sub.anim = { type: 'fade', durationMs: 500, delayMs: 0 };
        elements.push(sub);
      }
    }
    if (ok.length === 0 && !label) notes.push('Nothing to draw on this slide.');
    scene.elements = elements;
    if (notes.length) {
      scene.attention = notes.join(' · ');
      progress.slides.failed++;
    }
    scenes[index] = scene;
    progress.slides.done++;
    tick();
  };

  let cancelled = false;
  const results = await Promise.allSettled(sb.slides.map((sl, i) => buildSlide(sl, i)));
  if (signal.aborted || results.some((r) => r.status === 'rejected' && r.reason instanceof AiError && r.reason.code === 'cancelled')) cancelled = true;
  for (const r of results) if (r.status === 'rejected' && !(r.reason instanceof AiError && r.reason.code === 'cancelled')) problems.push(String(r.reason));

  project.custom = generated.filter((d) => d.strokes.length > 0);
  project.scenes = scenes.filter((x): x is Scene => x !== null);
  if (project.scenes.length === 0) project.scenes = [newScene('none')];
  if (project.scenes[0]) project.scenes[0].transition = 'none';

  // Auto mood for each slide comes from its act (most common slide mood in the act).
  const actMood = new Map<number, Mood>();
  for (const act of sb.acts) {
    const moods = act.slides.map((n) => sb.slides[n - 1]?.mood).filter(Boolean) as Mood[];
    const top = [...new Set(moods)].sort((a, b) => moods.filter((m) => m === b).length - moods.filter((m) => m === a).length)[0];
    if (top) for (const n of act.slides) actMood.set(n, top);
  }
  if (!cancelled) project.scenes.forEach((sc, i) => (sc.storyMood = actMood.get(i + 1) ?? sc.storyMood));

  // ---- Music: once every voice length is known, follow the story's acts. ----
  if (!cancelled && s.music !== 'none') {
    try {
      const tl = buildTimeline(project, () => 0);
      const sections: { fromSec: number; toSec: number; mood: Mood }[] = [];
      tl.scenes.forEach((t, i) => {
        const mood = project.scenes[i].storyMood ?? 'calm';
        const last = sections[sections.length - 1];
        if (last && last.mood === mood) last.toSec = t.end / 1000;
        else sections.push({ fromSec: t.start / 1000, toSec: t.end / 1000, mood });
      });
      const style = s.music === 'auto' ? autoMusicStyle(s.type) : s.music;
      const totalSec = tl.duration / 1000;
      const r = await generateMusic({ projectId: project.id, mode: 'by-section', totalSec, sections, style, intensity: 'very-soft', instruments: [], noPercussion: s.noDrums, vocalsOff: true, extra: '' }, signal);
      project.music = await musicFromResult(r, { style, mode: 'by-section', intensity: 'very-soft', instruments: [], noPercussion: s.noDrums, extra: '', fittedSec: totalSec }, null);
      progress.music.done = 1;
    } catch (err) {
      if (signal.aborted) cancelled = true;
      else {
        progress.music.failed = 1;
        progress.music.done = 1;
        problems.push(`Music: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    tick();
  }
  return { project, slides: project.scenes.length, cancelled, problems };
}
