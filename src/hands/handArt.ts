import type { HandLook } from '../model/types';

/**
 * Builds a hand-with-pen SVG from a HandLook. Every hand shares one geometry: drawn upright with the
 * pen tip at the local origin and the arm running down +y, then tilted so the tip lands at (16, 16)
 * of a 1000×1000 image and the arm leaves at the bottom right. So every hand has the same tip.
 */

export const HAND_VIEWBOX = '0 0 1000 1000';
/** Crop for picker thumbnails: the hand and a bit of forearm. */
export const HAND_THUMB_VIEWBOX = '-60 -40 640 560';

const PLACE = 'translate(16 16) rotate(-42)';
/** The arm's edges in local space: wrist at y=236, widening to the image edge. */
const ARM_TOP = 236;
const ARM_END = 1300;
const armLeft = (y: number) => -48 - ((y - ARM_TOP) * 26) / (ARM_END - ARM_TOP);
const armRight = (y: number) => 110 + ((y - ARM_TOP) * 20) / (ARM_END - ARM_TOP);

const PALM = 'M-22,72 C-62,92 -76,160 -58,228 C-44,282 30,300 82,284 C122,270 122,200 104,150 C88,108 42,70 -22,72 Z';
const PALM_SHADE = 'M-58,228 C-44,282 30,300 82,284 C100,278 110,262 114,240 C80,262 10,262 -50,200 Z';
const THUMB = 'M-16,62 C-30,58 -42,70 -40,86 L-32,140 C-24,150 -8,146 -4,134 L-6,78 C-6,68 -10,63 -16,62 Z';
const INDEX = 'M4,50 C4,38 24,38 25,50 L30,150 C24,160 4,160 -2,150 Z';
const CREASES = 'M8,62 C13,58 19,58 22,62 M-36,96 C-30,92 -24,92 -20,96 M30,180 C40,196 52,206 70,210';

export function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('')}`;
}

const band = (from: number, to: number, grow: number) =>
  `M${armLeft(from) - grow},${from} L${armRight(from) + grow},${from} L${armRight(to) + grow},${to} L${armLeft(to) - grow},${to} Z`;

function sleeve({ sleeve }: HandLook, width: number): string {
  if (!sleeve) return '';
  const { color, from, cuff, fur } = sleeve;
  let out = `<path d="${band(from, ARM_END, 6)}" fill="${color}" stroke="${darken(color, 0.45)}" stroke-width="${width}"/>`;
  if (cuff) out += `<path d="${band(from, from + 36, 8)}" fill="${cuff}" stroke="${darken(cuff, 0.4)}" stroke-width="${width}"/>`;
  if (fur) {
    const left = armLeft(from) - 18;
    const right = armRight(from + 50) + 18;
    out += `<rect x="${left}" y="${from - 16}" width="${right - left}" height="62" rx="26" fill="#fbfbf8" stroke="#d6d6cf" stroke-width="${width}"/>`;
    for (let x = left + 14; x < right - 6; x += 24) {
      out += `<circle cx="${x}" cy="${from - 14}" r="12" fill="#fbfbf8"/><circle cx="${x + 10}" cy="${from + 44}" r="12" fill="#fbfbf8"/>`;
    }
  }
  return out;
}

function accessories(look: HandLook, width: number): string {
  let out = '';
  if (look.tattoo) {
    const ink = 'fill="none" stroke="#2d2d3a" stroke-width="3" opacity="0.75"';
    out +=
      `<path d="M10,420 L18,402 L26,420 L8,409 L28,409 Z" ${ink}/>` +
      `<path d="M60,470 A26,26 0 1 0 60,522 A18,18 0 1 1 60,470 Z" ${ink}/>` +
      `<path d="M-20,560 C10,540 40,580 70,560 M-14,580 C16,560 46,600 76,580" ${ink}/>` +
      `<path d="M30,330 l6,12 l13,2 l-10,9 l3,13 l-12,-7 l-12,7 l3,-13 l-10,-9 l13,-2 Z" ${ink}/>`;
  }
  if (look.bracelet) {
    out += `<path d="M${armLeft(292) - 2},288 Q30,306 ${armRight(292) + 2},288" fill="none" stroke="#c9a23a" stroke-width="5"/><circle cx="34" cy="301" r="5" fill="#c9a23a"/>`;
  }
  if (look.watch) {
    out +=
      `<path d="${band(280, 318, 3)}" fill="#22252b" stroke="#111" stroke-width="${width}"/>` +
      `<rect x="6" y="272" width="54" height="54" rx="14" fill="#2f333a" stroke="#111" stroke-width="${width}"/>` +
      `<rect x="14" y="280" width="38" height="38" rx="9" fill="#11151b"/>`;
  }
  return out;
}

function tool({ tool, toolColor }: HandLook, width: number): string {
  const s = `stroke="#2b2b2b" stroke-width="${width}"`;
  switch (tool) {
    case 'pen': {
      const body = toolColor ?? '#f2f3f5';
      return (
        `<path d="M0,0 L-5,18 L5,18 Z" fill="#1d1d1f" ${s}/>` +
        `<rect x="-9" y="18" width="18" height="236" rx="8" fill="${body}" ${s}/>` +
        `<rect x="-10" y="18" width="20" height="28" rx="4" fill="#1d1d1f" ${s}/>` +
        `<path d="M9,190 L15,192 L15,236 L9,236" fill="none" ${s}/>`
      );
    }
    case 'chalk':
      return (
        `<path d="M-9,5 Q0,-3 9,5 L10,98 Q0,104 -10,98 Z" fill="#f6f5ef" stroke="#b8b7ae" stroke-width="${width}"/>` +
        `<path d="M-4,30 l2,1 M3,52 l2,1 M-3,74 l2,1" stroke="#cfcec6" stroke-width="2"/>`
      );
    case 'quill':
      return (
        `<path d="M0,60 C-34,130 -36,270 0,390 C28,270 32,130 0,60 Z" fill="#1b1b22" ${s}/>` +
        `<path d="M0,70 L0,390 M0,120 L-20,150 M0,170 L-24,200 M0,220 L-24,250 M0,140 L18,170 M0,190 L22,220 M0,240 L22,270" stroke="#565662" stroke-width="2" fill="none"/>` +
        `<path d="M0,0 L-6,30 L6,30 Z" fill="#2a2a2a" ${s}/><path d="M0,30 L0,62" ${s}/>`
      );
    case 'marker': {
      const body = toolColor ?? '#2b2f36';
      return (
        `<path d="M0,0 L-7,22 L7,22 Z" fill="#1d1d1f" ${s}/>` +
        `<rect x="-11" y="22" width="22" height="18" rx="3" fill="#9aa3ad" ${s}/>` +
        `<rect x="-14" y="40" width="28" height="200" rx="7" fill="${body}" ${s}/>` +
        `<rect x="-14" y="200" width="28" height="12" fill="${darken(body, 0.3)}" ${s}/>`
      );
    }
  }
}

function nails({ nails }: HandLook, width: number): string {
  if (!nails) return '';
  const s = `fill="${nails.color}" stroke="${darken(nails.color, 0.4)}" stroke-width="${Math.max(1.5, width - 1.5)}"`;
  return nails.long
    ? `<path d="M6,48 Q13,10 23,48 Z" ${s}/><path d="M-37,74 Q-38,40 -22,68 Z" ${s}/>`
    : `<ellipse cx="14.5" cy="47" rx="7" ry="6" ${s}/><ellipse cx="-28" cy="70" rx="6" ry="7" ${s}/>`;
}

export function handSvg(look: HandLook, viewBox = HAND_VIEWBOX): string {
  const cartoon = look.style === 'cartoon';
  const width = cartoon ? 6 : 3;
  const line = darken(look.skin, 0.55);
  const skin = `fill="${look.skin}" stroke="${line}" stroke-width="${width}"`;
  // A slimmer hand and arm; the pen stays where it is.
  const build = look.build === 'female' ? ' transform="translate(18 0) scale(0.88 0.97) translate(-18 0)"' : '';
  const showArm = !look.sleeve || look.sleeve.from > ARM_TOP;

  const back =
    (showArm ? `<path d="${band(ARM_TOP, ARM_END, 0)}" ${skin}/>` : '') +
    accessories(look, width) +
    sleeve(look, width) +
    `<path d="${PALM}" ${skin}/>` +
    (cartoon ? '' : `<path d="${PALM_SHADE}" fill="${line}" opacity="0.14"/>`);
  const front =
    `<path d="${THUMB}" ${skin}/>` +
    `<path d="${INDEX}" ${skin}/>` +
    `<ellipse cx="34" cy="128" rx="17" ry="24" ${skin}/>` +
    nails(look, width) +
    (cartoon ? '' : `<path d="${CREASES}" fill="none" stroke="${line}" stroke-width="${width}"/>`);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">` +
    `<g transform="${PLACE}" stroke-linejoin="round" stroke-linecap="round">` +
    `<g${build}>${back}</g>${tool(look, width)}<g${build}>${front}</g>` +
    `</g></svg>`
  );
}
