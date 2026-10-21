/**
 * Built-in fonts: all Google Fonts under the SIL Open Font License (every family name checked on
 * fonts.googleapis.com, 2026-10-21). 'pro' only shows a star until plans exist. Fonts load lazily:
 * a font's stylesheet is added the first time it's shown or used. Uploaded fonts live on the
 * project (Project.fonts) and are registered with the FontFace API.
 */
export interface FontDef {
  family: string;
  label: string;
  tier: 'free' | 'pro';
  /** Written right to left (Urdu, Arabic). */
  rtl?: boolean;
  /** Weights to request; the browser synthesises bold for fonts that only have 400. */
  weights?: string;
  /** Line height as a multiple of the size, for scripts with tall marks (default 1.12). */
  lineHeight?: number;
}

const font = (family: string, opts: Partial<Omit<FontDef, 'family'>> = {}): FontDef => ({ family, label: family, tier: 'free', ...opts });

export const FONT_LIBRARY: FontDef[] = [
  font('Noto Sans SC', { label: 'Chinese – Noto', weights: '400;700' }),
  font('Noto Nastaliq Urdu', { label: 'Urdu – Nastaliq', rtl: true, weights: '400;700', lineHeight: 2 }),
  font('Noto Naskh Arabic', { label: 'Arabic – Naskh', rtl: true, weights: '400;700', lineHeight: 1.6 }),
  font('Noto Sans Devanagari', { label: 'Hindi – Noto', weights: '400;700', lineHeight: 1.5 }),
  font('Dancing Script', { weights: '400;700' }),
  font('Bubblegum Sans', { tier: 'pro' }),
  font('Permanent Marker'),
  font('Cabin Sketch', { weights: '400;700' }),
  font('Indie Flower', { tier: 'pro' }),
  font('Shadows Into Light'),
  font('Schoolbell', { tier: 'pro', label: 'School Bell' }),
  font('Sacramento'),
  font('Patrick Hand'),
  font('Caveat', { weights: '400;700' }),
  font('Kalam', { weights: '400;700' }),
  font('Gochi Hand'),
  font('Amatic SC', { weights: '400;700' }),
  font('Architects Daughter'),
  font('Gloria Hallelujah'),
  font('Rock Salt'),
  font('Reenie Beanie'),
  font('Handlee'),
  font('Coming Soon'),
  font('Covered By Your Grace'),
  font('Just Another Hand'),
  font('Kaushan Script'),
  font('Pacifico'),
  font('Satisfy'),
  font('Short Stack'),
  font('Sue Ellen Francisco'),
  font('Figtree', { weights: '400;500;600;700' }),
];

export const DEFAULT_FONT = 'Caveat';
export const FONT_UPLOAD_TYPES = '.ttf,.otf,.woff,.woff2';
export const MAX_FONT_BYTES = 5 * 1024 * 1024;

const byFamily = new Map(FONT_LIBRARY.map((f) => [f.family, f]));
export const fontDef = (family: string): FontDef | undefined => byFamily.get(family);

/** Urdu, Arabic, Persian, Hebrew and related scripts. */
const RTL_CHARS = /[֐-ࣿיִ-﷿ﹰ-﻿]/;

/** Right to left when the font is an RTL font or the words are in an RTL script. */
export const isRtl = (font: string, text: string): boolean => !!fontDef(font)?.rtl || RTL_CHARS.test(text);

const linked = new Set<string>();

/** Adds a built-in font's Google Fonts stylesheet once. Font files then download on first use. */
export function ensureFontCss(family: string): void {
  const def = fontDef(family);
  if (!def || linked.has(family) || typeof document === 'undefined') return;
  linked.add(family);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}${def.weights ? `:wght@${def.weights}` : ''}&display=swap`;
  document.head.append(link);
}

/**
 * Makes a font ready for canvas drawing: links it if it's built in, then waits for it. Pass the words
 * to be drawn: Google Fonts splits scripts into separately loaded subsets (Urdu glyphs aren't in the
 * Latin file), and only the subsets those characters need are fetched.
 */
export async function loadFont(family: string, weight: number | string = 400, text?: string): Promise<void> {
  ensureFontCss(family);
  if (typeof document === 'undefined') return;
  await document.fonts.load(`${weight} 40px "${family}"`, text || undefined).catch(() => []);
}
