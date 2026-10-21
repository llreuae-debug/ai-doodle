import { LIBRARY } from './doodles';

import type { ElementStyle, ElementType } from '../services/ai';

/**
 * Generate with AI styles. The two doodle styles come back as strokes the hand draws line by line;
 * the others are pictures (made on the server with Google's image model, background removed) that
 * appear with the image reveal. Each has a sample thumbnail in public/assets/styles/<id>.png made
 * once by scripts/ai/style-thumbs.mjs; until then a drawn preview stands in.
 */

type PreviewLook = 'plain' | 'sketch' | 'charcoal' | 'soft3d' | 'clay' | 'watercolor' | 'flat' | 'comic' | 'mixed';

export interface AiStyle {
  id: ElementStyle;
  name: string;
  /** Strokes the hand draws, or a picture. */
  vector: boolean;
  color: boolean;
  tier: 'free' | 'pro';
  preview: { def: string; lineWidth: number; look: PreviewLook; ink?: string };
}

export const AI_STYLES: AiStyle[] = [
  { id: 'doodle', name: 'Doodle line art', vector: true, color: false, tier: 'free', preview: { def: 'c-bilal', lineWidth: 3.4, look: 'plain' } },
  { id: 'colour-doodle', name: 'Colour doodle', vector: true, color: true, tier: 'free', preview: { def: 'c-bilal', lineWidth: 3.4, look: 'plain' } },
  { id: '3d', name: '3D Animated', vector: false, color: true, tier: 'pro', preview: { def: 'c-bilal', lineWidth: 1.6, look: 'soft3d', ink: '#5A3E2B' } },
  { id: 'flat', name: 'Flat vector', vector: false, color: true, tier: 'free', preview: { def: 'c-omar', lineWidth: 0, look: 'flat' } },
  { id: 'watercolour', name: 'Watercolour', vector: false, color: true, tier: 'pro', preview: { def: 'c-mariam', lineWidth: 1.4, look: 'watercolor', ink: '#3E4A5A' } },
  { id: 'charcoal', name: 'Charcoal sketch', vector: false, color: false, tier: 'free', preview: { def: 'c-zain', lineWidth: 4.5, look: 'charcoal' } },
  { id: 'photo', name: 'Realistic photo', vector: false, color: true, tier: 'pro', preview: { def: 'c-ayesha', lineWidth: 1.4, look: 'soft3d', ink: '#4A3A30' } },
  { id: 'anime', name: 'Anime', vector: false, color: true, tier: 'free', preview: { def: 'c-sara', lineWidth: 2.4, look: 'plain' } },
];

export const aiStyle = (id: ElementStyle): AiStyle => AI_STYLES.find((s) => s.id === id)!;

export const AI_TYPES: { id: ElementType; label: string; hint: string }[] = [
  { id: 'element', label: 'Element', hint: 'A single object, transparent background' },
  { id: 'character', label: 'Character', hint: 'Full body, transparent background' },
  { id: 'scene', label: 'Scene', hint: 'A full background that fills the board' },
];

export const PROMPT_EXAMPLES = ['Boy with glasses eating a hamburger', 'Grandmother pouring chai', 'Shop with an open sign'];

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Filters and gradients the preview looks share; ids are unique per style so several previews can sit on one page. */
function defsFor(look: PreviewLook, id: string): string {
  switch (look) {
    case 'charcoal':
      return `<filter id="${id}-f" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="2.6"/></filter>`;
    case 'soft3d':
    case 'clay':
      return (
        `<radialGradient id="${id}-g" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.28"/></radialGradient>` +
        `<filter id="${id}-f" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${look === 'clay' ? 0.9 : 0.5}"/></filter>`
      );
    case 'watercolor':
      return `<filter id="${id}-f" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="7"/><feDisplacementMap in="SourceGraphic" scale="6"/><feGaussianBlur stdDeviation="0.8"/></filter>`;
    case 'comic':
      return `<pattern id="${id}-p" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.1" fill="#000" opacity="0.35"/></pattern>`;
    default:
      return '';
  }
}

/** The preview tile for a style: a library drawing in that style's line weight, colour and texture. */
export function stylePreviewSvg(style: AiStyle): string {
  const def = LIBRARY.find((d) => d.id === style.preview.def)!;
  const { lineWidth, look } = style.preview;
  const id = `ai-${style.id}`;
  const ink = style.preview.ink ?? (look === 'charcoal' ? '#3A3A3A' : '#1B1B1B');
  const strokes = def.strokes
    .flatMap((d) => d.split(/(?=M)/))
    .filter((d) => d.trim())
    .map((d) => `<path d="${esc(d)}"/>`)
    .join('');
  const fillPaths = (extra = '') => def.fills.map((f) => `<path d="${esc(f.d)}" fill="${esc(f.c)}" ${extra}/>`).join('');
  const lines = (width: number, extra = '', color = ink) =>
    `<g fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}>${strokes}</g>`;
  const shade = (fill: string) => def.fills.map((f) => `<path d="${esc(f.d)}" fill="${fill}"/>`).join('');

  let body: string;
  switch (look) {
    case 'sketch':
      body = lines(lineWidth) + lines(lineWidth * 0.7, 'opacity="0.45" transform="translate(1.6 1.1)"');
      break;
    case 'charcoal':
      body =
        (style.color ? fillPaths('opacity="0.75"') : '') +
        lines(lineWidth, `filter="url(#${id}-f)" opacity="0.92"`) +
        lines(lineWidth * 0.5, 'opacity="0.35" transform="translate(-1.2 0.8)"');
      break;
    case 'soft3d':
    case 'clay':
      body =
        `<ellipse cx="100" cy="186" rx="44" ry="6" fill="#000" opacity="0.12"/>` +
        `<g filter="url(#${id}-f)">${fillPaths()}${shade(`url(#${id}-g)`)}</g>` +
        lines(lineWidth, 'opacity="0.8"');
      break;
    case 'watercolor':
      body = `<g filter="url(#${id}-f)" opacity="0.8">${fillPaths()}</g>` + lines(lineWidth, 'opacity="0.85"');
      break;
    case 'flat':
      body = fillPaths() + lines(1.2, 'opacity="0.35"');
      break;
    case 'comic':
      body = fillPaths() + shade(`url(#${id}-p)`) + lines(lineWidth);
      break;
    case 'mixed':
      body =
        `<g transform="translate(0 30) scale(0.55)">${lines(5)}</g>` +
        `<g transform="translate(90 30) scale(0.55)">${lines(1.8)}${lines(1.3, 'opacity="0.45" transform="translate(1.6 1.1)"')}</g>`;
      break;
    default:
      body = (style.color ? fillPaths() : '') + lines(lineWidth);
  }
  const defs = defsFor(look, id);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
}
