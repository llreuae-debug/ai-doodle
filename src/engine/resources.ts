import type { Project, SceneElement, TextElement } from '../model/types';
import { BOARDS, doodleInk } from './boards';
import type { PreparedStrokes } from './strokes';

/** Rasterised art plus its ordered strokes, in the art's own pixel space. */
export interface LoadedArt {
  width: number;
  height: number;
  art: CanvasImageSource;
  strokes: PreparedStrokes;
}

export interface LoadedHand {
  id: string;
  image: CanvasImageSource;
  /** Image size and pen tip, in hand units; drawn at `scale` stage px per unit. */
  width: number;
  height: number;
  tipX: number;
  tipY: number;
  scale: number;
  /** When set, drawn `fit` × the stage's shorter side wide instead of at `scale`. */
  fit?: number;
  /** Continue the forearm past the image's bottom and right edges so it always runs off the stage. */
  tails?: HandTail[];
}

/**
 * The image's last row (or column) of arm pixels, swept outward along the arm: `image` is drawn at
 * width × height under `transform` (a, b, c, d, e, f in hand units), which shears it along the arm.
 */
export interface HandTail {
  image: CanvasImageSource;
  width: number;
  height: number;
  transform: [number, number, number, number, number, number];
}

export interface Resources {
  art: Map<string, LoadedArt>;
  hands: Map<string, LoadedHand>;
}

export const emptyResources = (): Resources => ({ art: new Map(), hands: new Map() });

/** Text art depends on everything that changes its shape or colour. */
export const textArtKey = (el: TextElement, ink: string): string => `text:${el.font}|${el.weight}|${el.size}|${el.fill ?? ink}|${el.text}`;

/**
 * Which rasterised art an element needs. Doodles depend on colour mode and the board's ink; text on its
 * font, size, colour and words (it is traced so the hand can write it stroke by stroke).
 */
export function artKey(el: SceneElement, project: Pick<Project, 'board'>): string | null {
  if (el.kind === 'doodle') return `doodle:${el.defId}:${el.color ? 'c' : 'm'}:${doodleInk(el.color, project.board)}`;
  if (el.kind === 'image') return `img:${el.assetId}`;
  return textArtKey(el, (BOARDS[project.board] ?? BOARDS.white).ink);
}
