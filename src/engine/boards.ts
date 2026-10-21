import type { BoardId } from '../model/types';
import type { Ctx2D } from './canvas';

export interface Board {
  name: string;
  bg: string;
  /** Default colour for line art and text. */
  ink: string;
  grid?: string;
}

export const BOARDS: Record<BoardId, Board> = {
  white: { name: 'Whiteboard', bg: '#FFFFFF', ink: '#1B1B1B' },
  black: { name: 'Blackboard', bg: '#22272B', ink: '#F4F4F0' },
  green: { name: 'Greenboard', bg: '#24463A', ink: '#F1F5EE' },
  grid: { name: 'Graph paper', bg: '#FBFDFF', ink: '#1B2A3A', grid: '#D7E6F4' },
  kraft: { name: 'Kraft paper', bg: '#E3CFA9', ink: '#3A2A1A' },
};

const GRID_STEP = 48;

export function drawBoard(ctx: Ctx2D, id: BoardId, width: number, height: number): void {
  const board = BOARDS[id] ?? BOARDS.white;
  ctx.fillStyle = board.bg;
  ctx.fillRect(0, 0, width, height);
  if (!board.grid) return;
  ctx.strokeStyle = board.grid;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x <= width; x += GRID_STEP) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += GRID_STEP) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
}

/** Coloured doodles keep dark outlines on light boards; on dark boards every outline uses the board ink. */
export function doodleInk(color: boolean, id: BoardId): string {
  const board = BOARDS[id] ?? BOARDS.white;
  if (!color) return board.ink;
  return id === 'black' || id === 'green' ? board.ink : '#1B1B1B';
}
