import sharp from 'sharp';
import { z } from 'zod';
import { generateJson, generatePicture, HttpError, STORY_MODELS, type Part } from './gemini.ts';
import { cacheGet, cacheKey, cachePut, saveMedia } from './security.ts';

export const ELEMENT_STYLES = ['doodle', 'colour-doodle', '3d', 'flat', 'watercolour', 'charcoal', 'photo', 'anime'] as const;
export type ElementStyle = (typeof ELEMENT_STYLES)[number];
/** Doodle styles come back as strokes the hand draws; the rest are pictures. */
export const VECTOR_STYLES: ElementStyle[] = ['doodle', 'colour-doodle'];

const PICTURE_STYLES: Record<Exclude<ElementStyle, 'doodle' | 'colour-doodle'>, string> = {
  charcoal: 'authentic realistic charcoal drawing on textured paper: rich dark vine charcoal strokes, expressive smudged shading, organic paper tooth, fine artistic hatching, high resolution hand-drawn craftsmanship, never vector art, never flat illustration',
  watercolour: 'authentic hand-drawn watercolour and ink artwork: fine natural dip-pen ink linework, organic translucent watercolour pigment bleeds on heavy cold-pressed cotton paper, genuine fine-art hand-drawn character, no flat vector shapes',
  flat: 'detailed architectural fine-liner ink drawing: authentic hand-drawn drafting lines, organic cross-hatching, human hand linework variation, fine technical pen on paper, never corporate vector art, never Illustrator flat clipart',
  '3d': 'sculptural hand-crafted clay and chiaroscuro pencil study: rich depth, tactile organic surfaces, realistic studio lighting, expressive hand details',
  photo: 'realistic master life study: natural light, exquisite organic textures, razor-sharp focus and fine hand-crafted detail',
  anime: 'authentic hand-inked manga lineart: organic G-pen ink strokes, fine hatching, expressive line weight, traditional paper drawing',
};

const ImageRef = z.object({ mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']), data: z.string().max(4_000_000) });

export const ElementRequest = z.object({
  type: z.enum(['element', 'character', 'scene']),
  style: z.enum(ELEMENT_STYLES),
  prompt: z.string().trim().min(2).max(500),
  variations: z.union([z.literal(1), z.literal(3), z.literal(4)]).default(1),
  /** Video size, for scenes. */
  aspect: z.enum(['16:9', '9:16', '1:1', '4:5']).default('16:9'),
  projectId: z.string().max(60).default('shared'),
  /** Reuse an earlier result for the exact same request (story builds); Regenerate leaves this off. */
  reuse: z.boolean().default(false),
  /** Keeps a character the same across poses. */
  characterSheet: z
    .object({ name: z.string().max(60), look: z.string().max(400), style: z.enum(ELEMENT_STYLES).optional(), reference: ImageRef.optional() })
    .optional(),
});
export type ElementRequest = z.infer<typeof ElementRequest>;

export type ElementResult =
  | { kind: 'vector'; name: string; strokes: string[]; fills: { d: string; c: string }[] }
  | { kind: 'image'; name: string; url: string; width: number; height: number; transparent: boolean };

// ---------- vector (doodle styles) ----------

const STROKE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    strokes: { type: 'array', items: { type: 'string' } },
    fills: { type: 'array', items: { type: 'object', properties: { d: { type: 'string' }, c: { type: 'string' } }, required: ['d', 'c'] } },
  },
  required: ['name', 'strokes', 'fills'],
};

const ARGS: Record<string, number> = { M: 2, L: 2, C: 6, Q: 4, A: 7, Z: 0 };

/** Absolute M L C Q A Z with the right number of numbers, every subpath starting with M, inside the viewBox. */
export function validPath(d: string): boolean {
  if (d.length > 6000 || /[^MLCQAZ0-9.,\s+eE-]/.test(d)) return false;
  const tokens = d.match(/[MLCQAZ]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
  if (!tokens || tokens[0] !== 'M') return false;
  let cmd = '';
  let nums: number[] = [];
  let prev = '';
  const flush = () => {
    if (!cmd) return true;
    const n = ARGS[cmd];
    if (n === 0) return nums.length === 0;
    if (nums.length === 0 || nums.length % n !== 0) return false;
    for (let i = 0; i < nums.length; i += n) {
      const pts = cmd === 'A' ? [nums[i + 5], nums[i + 6]] : nums.slice(i, i + n);
      if (pts.some((v) => !Number.isFinite(v) || v < -5 || v > 205)) return false;
    }
    return true;
  };
  for (const t of tokens) {
    if (/[A-Z]/.test(t)) {
      if (!flush()) return false;
      if (prev === 'Z' && t !== 'M') return false;
      prev = cmd = t;
      nums = [];
    } else nums.push(Number(t));
  }
  return flush();
}

const KIND_RULES: Record<ElementRequest['type'], string> = {
  element: 'a single object, centred, filling most of the box',
  character: 'one full-body character standing, centred, head to feet inside the box',
  scene: 'a full background scene (room, street or landscape) spread across the whole box, with the foreground centre left fairly open',
};

async function vectorOnce(r: ElementRequest, attempt: number): Promise<ElementResult | null> {
  const color = r.style === 'colour-doodle';
  const sheet = r.characterSheet;
  const subject = sheet ? `${sheet.name}: ${sheet.look}. Same character as before (match the reference drawing if given), now: ${r.prompt}` : r.prompt;
  const text = `Draw "${subject}" as ${KIND_RULES[r.type]}, in an authentic realistic hand-drawn sketch style with organic contours and natural human stroke variation.
Rules: 200×200 viewBox, keep every point between 12 and 188. No text or letters. STRICTLY FORBIDDEN: Adobe Illustrator-style geometric shapes, flat corporate clipart, or sterile vector icons.
${r.type === 'scene' ? '30 to 70' : '12 to 50'} strokes, each a separate path string that starts with an absolute "M" and uses only absolute commands M L C Q A Z with numbers separated by spaces or commas. Order the strokes the way an artist draws: organic outer contours first, then rich interior details and hatching.
${color ? 'Add 3 to 10 fills: soft hand-drawn wash shapes behind the strokes, each {d, c} with a #RRGGBB colour, covering the main areas.' : 'Return an empty fills array.'}
"name" is a short title of at most 4 words.${attempt > 0 ? '\nYour last drawing had invalid path data. Double-check every path.' : ''}`;
  const parts: Part[] = sheet?.reference ? [{ inlineData: sheet.reference }, { text: `Reference drawing of ${sheet.name}.\n${text}` }] : [{ text }];
  // Drawing good path data needs the stronger Flash models (the lite ones draw crude shapes).
  const raw = await generateJson<{ name?: string; strokes?: unknown[]; fills?: unknown[] }>(parts, STROKE_SCHEMA, { temperature: 0.9, models: STORY_MODELS, thinking: 'low' });
  const strokes = (raw.strokes ?? []).map((s) => String(s).trim()).filter(validPath).slice(0, 80);
  const fills = (raw.fills ?? [])
    .filter((f): f is { d: string; c: string } => !!f && typeof f === 'object' && typeof (f as { d: unknown }).d === 'string' && /^#[0-9a-fA-F]{6}$/.test(String((f as { c: unknown }).c)))
    .filter((f) => validPath(f.d))
    .slice(0, 12);
  const total = raw.strokes?.length ?? 0;
  // Regenerate when too much of the drawing was unusable.
  if (strokes.length < 6 || strokes.length < total * 0.7) return null;
  return { kind: 'vector', name: String(raw.name || r.prompt).slice(0, 40), strokes, fills: color ? fills : [] };
}

async function vector(r: ElementRequest): Promise<ElementResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await vectorOnce(r, attempt);
    if (res) return res;
  }
  throw new HttpError(502, 'bad_drawing', 'The drawing came back unusable twice. Try a simpler description.');
}

// ---------- pictures ----------

/**
 * Makes the plain white background transparent: flood fill from the border through near-white,
 * low-colour pixels, with a soft one-pixel edge.
 */
export async function removeWhite(input: Buffer): Promise<{ png: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const bg = new Uint8Array(w * h);
  const isBg = (p: number) => {
    const i = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return Math.min(r, g, b) > 232 && Math.max(r, g, b) - Math.min(r, g, b) < 18;
  };
  const stack: number[] = [];
  const seed = (p: number) => {
    if (!bg[p] && isBg(p)) {
      bg[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < w; x++) (seed(x), seed((h - 1) * w + x));
  for (let y = 0; y < h; y++) (seed(y * w), seed(y * w + w - 1));
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % w;
    if (x > 0) seed(p - 1);
    if (x < w - 1) seed(p + 1);
    if (p >= w) seed(p - w);
    if (p < (h - 1) * w) seed(p + w);
  }
  for (let p = 0; p < w * h; p++) {
    if (bg[p]) data[p * 4 + 3] = 0;
    else {
      const x = p % w;
      const edge = (x > 0 && bg[p - 1]) || (x < w - 1 && bg[p + 1]) || (p >= w && bg[p - w]) || (p < (h - 1) * w && bg[p + w]);
      if (edge) data[p * 4 + 3] = 150;
    }
  }
  const png = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).trim().png().toBuffer({ resolveWithObject: true });
  return { png: png.data, width: png.info.width, height: png.info.height };
}

const ASPECT: Record<ElementRequest['aspect'], string> = { '16:9': '16:9', '9:16': '9:16', '1:1': '1:1', '4:5': '4:5' };

async function picture(r: ElementRequest): Promise<ElementResult> {
  const style = PICTURE_STYLES[r.style as keyof typeof PICTURE_STYLES];
  const sheet = r.characterSheet;
  const scene = r.type === 'scene';
  const subject = sheet ? `${sheet.name}, ${sheet.look}. Keep this exact character from the reference image (same face, hair, clothes and colours), now: ${r.prompt}` : r.prompt;
  const framing = scene
    ? 'A complete background scene filling the whole frame, rendered with authentic realistic hand-drawn strokes, natural paper tooth, and organic fine-art textures. No text, letters or watermark. Strictly forbidden: flat vector art, Adobe Illustrator graphics, or generic clipart.'
    : `${r.type === 'character' ? 'One full-body character, head to feet' : 'A single object'}, centred with a clear margin, rendered with realistic hand-drawn strokes on textured paper, isolated on a plain pure white background (#FFFFFF), no ground shadow, no frame, no text, letters or watermark. Strictly forbidden: flat vector art, Adobe Illustrator graphics, or generic clipart.`;
  const pic = await generatePicture(`${subject}. Style: ${style}. ${framing}`, sheet?.reference ? [sheet.reference] : [], scene ? ASPECT[r.aspect] : '1:1');
  if (scene) {
    const png = await sharp(pic.data).png().toBuffer({ resolveWithObject: true });
    return { kind: 'image', name: r.prompt.split(/\s+/).slice(0, 4).join(' '), url: await saveMedia(r.projectId, png.data, 'png'), width: png.info.width, height: png.info.height, transparent: false };
  }
  const cut = await removeWhite(pic.data);
  return { kind: 'image', name: r.prompt.split(/\s+/).slice(0, 4).join(' '), url: await saveMedia(r.projectId, cut.png, 'png'), width: cut.width, height: cut.height, transparent: true };
}

/** Runs the variations in parallel; returns every one that worked, or the first error if none did. */
export async function makeElements(r: ElementRequest): Promise<{ results: ElementResult[]; failed: number }> {
  const key = cacheKey({ type: r.type, style: r.style, prompt: r.prompt, variations: r.variations, aspect: r.aspect, sheet: r.characterSheet ?? null });
  if (r.reuse) {
    const hit = await cacheGet('element', key);
    if (hit) return { results: JSON.parse(hit.toString('utf8')) as ElementResult[], failed: 0 };
  }
  const fresh = await makeFresh(r);
  if (fresh.failed === 0) await cachePut('element', key, Buffer.from(JSON.stringify(fresh.results)));
  return fresh;
}

async function makeFresh(r: ElementRequest): Promise<{ results: ElementResult[]; failed: number }> {
  const one = VECTOR_STYLES.includes(r.style) ? () => vector(r) : () => picture(r);
  const settled = await Promise.allSettled(Array.from({ length: r.variations }, one));
  const results = settled.flatMap((s) => (s.status === 'fulfilled' ? [s.value] : []));
  if (results.length === 0) throw (settled[0] as PromiseRejectedResult).reason;
  return { results, failed: settled.length - results.length };
}
