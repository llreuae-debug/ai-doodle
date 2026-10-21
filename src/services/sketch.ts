import { createSurface, type Surface } from '../engine/canvas';

const SKETCH_MAX_SIDE = 900;
/** Edge strength (Sobel magnitude) below which a pixel stays blank. */
const EDGE_THRESHOLD = 90;
const EDGE_GAIN = 1.6;
/** Very dark areas are kept as soft ink even without edges. */
const DARK_LUMINANCE = 55;
const DARK_ALPHA = 140;
const INK = 22;

/**
 * Chalkline's "Turned into a sketch": a Sobel edge drawing in dark ink on transparent paper.
 * Returns a surface at most 900 px on its longest side.
 */
export function toSketch(source: CanvasImageSource & { width: number; height: number }): Surface {
  const s = Math.min(1, SKETCH_MAX_SIDE / Math.max(source.width, source.height));
  const w = Math.max(3, Math.round(source.width * s));
  const h = Math.max(3, Math.round(source.height * s));
  const surface = createSurface(w, h);
  const { ctx } = surface;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2];
  const out = ctx.createImageData(w, h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = -g[i - w - 1] - 2 * g[i - 1] - g[i + w - 1] + g[i - w + 1] + 2 * g[i + 1] + g[i + w + 1];
      const gy = -g[i - w - 1] - 2 * g[i - w] - g[i - w + 1] + g[i + w - 1] + 2 * g[i + w] + g[i + w + 1];
      const m = Math.hypot(gx, gy);
      const edge = m > EDGE_THRESHOLD ? Math.min(255, (m - EDGE_THRESHOLD) * EDGE_GAIN) : 0;
      const dark = g[i] < DARK_LUMINANCE ? DARK_ALPHA : 0;
      out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = INK;
      out.data[i * 4 + 3] = Math.max(edge, dark);
    }
  }
  ctx.clearRect(0, 0, w, h);
  ctx.putImageData(out, 0, 0);
  return surface;
}
