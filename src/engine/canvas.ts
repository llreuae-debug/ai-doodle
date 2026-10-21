export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface Surface {
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
}

/** OffscreenCanvas works on the main thread, in workers and in headless Chromium (Phase 2 render). */
export function createSurface(width: number, height: number): Surface {
  const canvas = new OffscreenCanvas(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available in this browser');
  return { canvas, ctx };
}
