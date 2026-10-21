import type { Project, SceneElement, TextElement } from '../model/types';
import { fontDef, isRtl } from '../library/fonts';
import type { Ctx2D } from './canvas';

export const TEXT_LINE_HEIGHT = 1.12;
/** Padding around text inside its box, stage px. */
export const TEXT_PAD = 4;

export interface TextLayout {
  /** Written right to left: lines are right-aligned and revealed from the right. */
  rtl: boolean;
  lines: string[];
  widths: number[];
  lineHeight: number;
  width: number;
  height: number;
}

export const textFont = (el: Pick<TextElement, 'weight' | 'size' | 'font'>): string => `${el.weight} ${el.size}px "${el.font}", cursive`;

export function layoutText(ctx: Ctx2D, el: TextElement): TextLayout {
  const rtl = isRtl(el.font, el.text);
  ctx.font = textFont(el);
  ctx.direction = rtl ? 'rtl' : 'ltr';
  const lines = String(el.text || ' ').split('\n');
  const widths = lines.map((l) => ctx.measureText(l || ' ').width);
  ctx.direction = 'ltr';
  const lineHeight = el.size * (fontDef(el.font)?.lineHeight ?? TEXT_LINE_HEIGHT);
  return {
    rtl,
    lines,
    widths,
    lineHeight,
    width: Math.ceil(Math.max(...widths)) + TEXT_PAD * 2,
    height: Math.ceil(lines.length * lineHeight) + TEXT_PAD * 2,
  };
}

let measure: OffscreenCanvasRenderingContext2D | null = null;
/** A shared context for measuring text outside a render (hit tests, layout). */
export function measureCtx(): OffscreenCanvasRenderingContext2D {
  measure ??= new OffscreenCanvas(1, 1).getContext('2d')!;
  return measure;
}

export interface Box {
  /** Top-left. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The element's unrotated box in stage px. Elements store their centre. */
export function elementBox(el: SceneElement, project: Pick<Project, 'assets'>, ctx: Ctx2D = measureCtx()): Box {
  let w: number;
  let h: number;
  if (el.kind === 'doodle') {
    w = h = el.size;
  } else if (el.kind === 'image') {
    const asset = project.assets[el.assetId];
    w = el.width;
    h = asset ? (el.width * asset.height) / asset.width : el.width;
  } else {
    const t = layoutText(ctx, el);
    w = t.width;
    h = t.height;
  }
  return { x: el.x - w / 2, y: el.y - h / 2, w, h };
}
