import { z } from 'zod';
import { generateJson, HttpError, STORY_MODELS } from './gemini.ts';

/** Narration pace and slide counts per video length (≈150 words a minute, a slide every 7–9 s). */
export const PACING = {
  3: { words: [420, 480], slides: [22, 26] },
  5: { words: [700, 780], slides: [36, 42] },
  8: { words: [1120, 1250], slides: [56, 65] },
} as const;

export const STORY_TYPES = ['kids', 'explainer', 'faith-islamic', 'faith-christian', 'business', 'motivational', 'true-life'] as const;
export const AUDIENCES = ['kids-4-8', 'kids-9-12', 'teens', 'adults'] as const;
export const TONES = ['warm', 'funny', 'inspiring', 'calm', 'dramatic'] as const;
export const LANGUAGES = ['en', 'ur', 'hi', 'ar'] as const;
const LANGUAGE_NAMES: Record<(typeof LANGUAGES)[number], string> = { en: 'English', ur: 'Urdu (Urdu script)', hi: 'Hindi (Devanagari script)', ar: 'Arabic (Arabic script)' };
const TYPE_NAMES: Record<(typeof STORY_TYPES)[number], string> = {
  kids: "a children's story",
  explainer: 'an explainer',
  'faith-islamic': 'an Islamic faith story',
  'faith-christian': 'a Christian faith story',
  business: 'a business / marketing story',
  motivational: 'a motivational story',
  'true-life': 'a true-life lesson',
};
const AUDIENCE_NAMES: Record<(typeof AUDIENCES)[number], string> = { 'kids-4-8': 'children aged 4–8', 'kids-9-12': 'children aged 9–12', teens: 'teenagers', adults: 'adults' };

export const StoryRequest = z.object({
  title: z.string().trim().min(2).max(120),
  length: z.union([z.literal(3), z.literal(5), z.literal(8)]),
  type: z.enum(STORY_TYPES),
  audience: z.enum(AUDIENCES),
  tone: z.enum(TONES),
  language: z.enum(LANGUAGES),
  englishText: z.boolean().default(false),
  include: z.string().trim().max(300).default(''),
  /** Rework an existing storyboard ("Make it funnier", "Simpler words", "Shorter"). */
  revise: z.object({ storyboard: z.unknown(), instruction: z.string().trim().min(2).max(200) }).optional(),
});
export type StoryRequest = z.infer<typeof StoryRequest>;

const Visual = z.object({
  type: z.enum(['character', 'element', 'scene']),
  ref: z.string().nullable(),
  description: z.string().min(2).max(240),
  position: z.enum(['left', 'right', 'center', 'background']),
});
export const Slide = z.object({
  n: z.number().int().min(1),
  narration: z.string().min(1).max(400),
  speaker: z.string().min(1).max(40),
  on_screen_text: z.string().max(80),
  on_screen_text_en: z.string().max(80).optional(),
  visuals: z.array(Visual).min(1).max(4),
  transition: z.enum(['none', 'fade', 'wipe', 'push', 'iris']),
  mood: z.enum(['happy', 'tense', 'calm', 'sad', 'exciting']),
});
export const Storyboard = z.object({
  title: z.string().min(1),
  logline: z.string(),
  takeaway: z.string(),
  characters: z.array(z.object({ id: z.string(), name: z.string(), look: z.string(), voice: z.string().nullable() })).max(4),
  acts: z.array(z.object({ name: z.enum(['Hook', 'Setup', 'Problem', 'Journey', 'Turn', 'Resolution', 'Takeaway']), slides: z.array(z.number().int()) })),
  slides: z.array(Slide).min(1).max(80),
});
export type Storyboard = z.infer<typeof Storyboard>;

const VISUAL_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['character', 'element', 'scene'] },
    ref: { type: ['string', 'null'] },
    description: { type: 'string' },
    position: { type: 'string', enum: ['left', 'right', 'center', 'background'] },
  },
  required: ['type', 'ref', 'description', 'position'],
};
const SLIDE_SCHEMA = {
  type: 'object',
  properties: {
    n: { type: 'integer' },
    narration: { type: 'string' },
    speaker: { type: 'string' },
    on_screen_text: { type: 'string' },
    on_screen_text_en: { type: 'string' },
    visuals: { type: 'array', items: VISUAL_SCHEMA },
    transition: { type: 'string', enum: ['none', 'fade', 'wipe', 'push', 'iris'] },
    mood: { type: 'string', enum: ['happy', 'tense', 'calm', 'sad', 'exciting'] },
  },
  required: ['n', 'narration', 'speaker', 'on_screen_text', 'visuals', 'transition', 'mood'],
};
const STORY_SCHEMA = {
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
        required: ['id', 'name', 'look', 'voice'],
      },
    },
    acts: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string', enum: ['Hook', 'Setup', 'Problem', 'Journey', 'Turn', 'Resolution', 'Takeaway'] }, slides: { type: 'array', items: { type: 'integer' } } },
        required: ['name', 'slides'],
      },
    },
    slides: { type: 'array', items: SLIDE_SCHEMA },
  },
  required: ['title', 'logline', 'takeaway', 'characters', 'acts', 'slides'],
};

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Words per slide that hit the total: the average, ±3. */
function perSlide(length: 3 | 5 | 8): [number, number] {
  const p = PACING[length];
  const avg = Math.round((p.words[0] + p.words[1]) / (p.slides[0] + p.slides[1]));
  return [avg - 3, Math.min(28, avg + 3)];
}

const EXPAND_SCHEMA = {
  type: 'object',
  properties: { slides: { type: 'array', items: { type: 'object', properties: { n: { type: 'integer' }, narration: { type: 'string' } }, required: ['n', 'narration'] } } },
  required: ['slides'],
};

/**
 * Repairs a script whose narration is too short (or long) overall: only the slides furthest from the
 * per-slide target are rewritten to that length, keeping their meaning and language.
 */
async function rebalance(sb: Storyboard, r: StoryRequest): Promise<Storyboard> {
  const p = PACING[r.length];
  const [lo, hi] = perSlide(r.length);
  const total = sb.slides.reduce((a, s) => a + wordCount(s.narration), 0);
  const short = total < p.words[0];
  const pick = sb.slides.filter((s) => s.n > 1 && (short ? wordCount(s.narration) < lo : wordCount(s.narration) > hi));
  if (pick.length === 0) return sb;
  const target = short ? `${lo}–${hi}` : `${lo}–${hi}`;
  const out = await generateJson<{ slides?: { n: number; narration: string }[] }>(
    `These narration lines from the story "${sb.title}" are too ${short ? 'short' : 'long'}. Rewrite each one to ${target} words, keeping its meaning, the story's tone and its language, adding vivid detail${short ? '' : ' only where needed'}. Keep any [VERSE: ...] placeholder exactly. Never add scripture.\n\n${JSON.stringify(pick.map((s) => ({ n: s.n, narration: s.narration })))}`,
    EXPAND_SCHEMA,
    { temperature: 0.7, models: STORY_MODELS },
  );
  const fixed = new Map((out.slides ?? []).filter((x) => wordCount(x.narration) <= 28).map((x) => [x.n, x.narration.trim()]));
  return { ...sb, slides: sb.slides.map((s) => (fixed.has(s.n) ? { ...s, narration: fixed.get(s.n)! } : s)) };
}

function rules(r: Pick<StoryRequest, 'type' | 'audience' | 'language' | 'englishText'>): string {
  const lines = [
    'Slide 1 is a hook: a question, a surprise or tension, spoken in under 8 seconds (under 18 words).',
    'Clear arc: setup → problem → rising attempts → turning point → resolution → takeaway. Fill "acts" with the slide numbers of each part.',
    'One idea per slide. Never repeat the previous slide\'s narration.',
    'At most 4 named characters, each with one consistent look described in one line (clothes, hair, colours, age) that an illustrator can repeat.',
    'The last slide states the takeaway and ends with a call to action such as "Subscribe for more stories" (in the story language).',
    'Each slide narration is at most 28 words. on_screen_text is at most 6 words (a key phrase from the narration) or empty.',
    '"speaker" is "narrator" or a character id. Use a character id only when that character speaks the whole line.',
    'Every slide has 1 to 3 visuals. Use "scene" (position "background") only for a full background; characters use their id in "ref". Descriptions are short and drawable, with no text or letters in the picture.',
    `Write narration and on_screen_text in ${LANGUAGE_NAMES[r.language]}.${r.englishText && r.language !== 'en' ? ' Also fill on_screen_text_en with an English version of on_screen_text.' : ' Leave on_screen_text_en empty.'} Visual descriptions are always in English.`,
  ];
  if (r.type.startsWith('faith')) {
    lines.push(
      'Never depict prophets, angels or holy figures, not even as visuals: show ordinary people, places and objects instead.',
      'Never invent or quote scripture: no Quran or Bible verses and no hadith. Where a verse would fit, write the placeholder [VERSE: topic] in the narration instead, e.g. [VERSE: patience].',
    );
  }
  if (r.audience.startsWith('kids')) lines.push('Use simple words and short sentences. Nothing violent or frightening.');
  return lines.map((l) => `- ${l}`).join('\n');
}

function problems(sb: Storyboard, length: 3 | 5 | 8): string[] {
  const p = PACING[length];
  const words = sb.slides.reduce((a, s) => a + wordCount(s.narration), 0);
  const out: string[] = [];
  if (sb.slides.length < p.slides[0] || sb.slides.length > p.slides[1]) out.push(`it has ${sb.slides.length} slides but needs ${p.slides[0]}–${p.slides[1]}`);
  if (words < p.words[0] || words > p.words[1]) out.push(`the narration totals ${words} words but needs ${p.words[0]}–${p.words[1]}`);
  const long = sb.slides.filter((s) => wordCount(s.narration) > 28).map((s) => s.n);
  if (long.length) out.push(`slides ${long.join(', ')} have more than 28 words of narration`);
  const empty = sb.slides.filter((s) => s.visuals.length === 0).map((s) => s.n);
  if (empty.length) out.push(`slides ${empty.join(', ')} have no visuals`);
  return out;
}

/** Numbers slides 1..n and keeps acts pointing at real slides. */
function tidy(sb: Storyboard): Storyboard {
  const slides = sb.slides.map((s, i) => ({ ...s, n: i + 1, narration: s.narration.trim() }));
  const acts = sb.acts.map((a) => ({ ...a, slides: a.slides.filter((n) => n >= 1 && n <= slides.length) }));
  return { ...sb, slides, acts };
}

/**
 * A full storyboard from Gemini's structured output. Invalid JSON is retried once; a script outside the
 * slide or word range is sent back with what's wrong, up to twice.
 */
export async function writeStory(r: StoryRequest): Promise<{ storyboard: Storyboard; warnings: string[] }> {
  const p = PACING[r.length];
  const base = r.revise
    ? `Rework this storyboard for the instruction "${r.revise.instruction}". Keep the same story, characters and title unless the instruction says otherwise.\n\nStoryboard:\n${JSON.stringify(r.revise.storyboard).slice(0, 60_000)}`
    : `Write ${TYPE_NAMES[r.type]} titled "${r.title}" for ${AUDIENCE_NAMES[r.audience]}, in a ${r.tone} tone.${r.include ? ` It must include: ${r.include}.` : ''}`;
  const prompt = `${base}

It is a ${r.length}-minute whiteboard-animation video narrated at about 150 words a minute, a new slide every 7–9 seconds:
- ${p.slides[0]}–${p.slides[1]} slides (aim for ${Math.round((p.slides[0] + p.slides[1]) / 2)}),
- ${p.words[0]}–${p.words[1]} words of narration in total (aim for ${Math.round((p.words[0] + p.words[1]) / 2)}).
- So EVERY slide's narration is ${perSlide(r.length)[0]}–${perSlide(r.length)[1]} words (slide 1 may be shorter). Count them: short slides make the video too short.

Rules:
${rules(r)}`;
  const system = 'You are a children\'s-book and explainer-video scriptwriter who writes tight, vivid storyboards for hand-drawn whiteboard animation.';

  let feedback = '';
  let lastValid: Storyboard | null = null;
  let schemaRetries = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    let raw: unknown;
    try {
      raw = await generateJson(prompt + feedback, STORY_SCHEMA, { system, temperature: 0.8, models: STORY_MODELS });
    } catch (err) {
      // Out of time or quota on a later attempt: the closest draft is better than nothing.
      if (lastValid && err instanceof HttpError) return { storyboard: lastValid, warnings: problems(lastValid, r.length) };
      throw err;
    }
    const parsed = Storyboard.safeParse(raw);
    if (!parsed.success) {
      if (schemaRetries++ >= 1) break;
      feedback = '\n\nYour previous answer did not match the schema. Follow it exactly.';
      continue;
    }
    let sb = tidy(parsed.data);
    // Slide count right but narration too short or long: fix just the lines (cheaper and more reliable
    // than rewriting the whole story).
    for (let round = 0; round < 2; round++) {
      const words = sb.slides.reduce((a, s) => a + wordCount(s.narration), 0);
      const p = PACING[r.length];
      if (words >= p.words[0] && words <= p.words[1]) break;
      if (sb.slides.length < p.slides[0] || sb.slides.length > p.slides[1]) break;
      sb = await rebalance(sb, r).catch(() => sb);
    }
    lastValid = sb;
    const issues = problems(sb, r.length);
    if (issues.length === 0) return { storyboard: sb, warnings: [] };
    feedback = `\n\nYour previous draft was close but ${issues.join('; ')}. Fix exactly that, keeping the story.`;
  }
  if (lastValid) return { storyboard: lastValid, warnings: problems(lastValid, r.length) };
  throw new HttpError(502, 'bad_output', "Google AI couldn't write a valid storyboard. Try again.");
}

export const SlideRequest = z.object({
  storyContext: z.object({
    title: z.string().max(160),
    logline: z.string().max(400).optional(),
    language: z.enum(LANGUAGES),
    type: z.enum(STORY_TYPES),
    audience: z.enum(AUDIENCES),
    tone: z.enum(TONES),
    englishText: z.boolean().default(false),
    characters: z.array(z.object({ id: z.string(), name: z.string(), look: z.string() })).max(4),
    previous: z.string().max(400).optional(),
    next: z.string().max(400).optional(),
  }),
  slide: Slide,
  instruction: z.string().trim().max(300).default('Rewrite this slide so it reads better.'),
});

/** One slide rewritten in context. */
export async function rewriteSlide(r: z.infer<typeof SlideRequest>) {
  const c = r.storyContext;
  const prompt = `Story "${c.title}"${c.logline ? ` — ${c.logline}` : ''}. Characters: ${c.characters.map((ch) => `${ch.id} = ${ch.name} (${ch.look})`).join('; ') || 'none'}.
Previous slide narration: ${c.previous ?? '(none)'}
Next slide narration: ${c.next ?? '(none)'}

Rewrite slide ${r.slide.n}: ${JSON.stringify(r.slide)}
Instruction: ${r.instruction}

Rules:
${rules({ type: c.type, audience: c.audience, language: c.language, englishText: c.englishText })}
Keep "n" as ${r.slide.n}.`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const parsed = Slide.safeParse(await generateJson(prompt, SLIDE_SCHEMA, { temperature: 0.9, models: STORY_MODELS }));
    if (parsed.success) return { slide: { ...parsed.data, n: r.slide.n } };
  }
  throw new HttpError(502, 'bad_output', "Google AI couldn't rewrite that slide. Try again.");
}
