import { describe, expect, it } from 'vitest';
import type { Point } from '../model/types';
import { rasterToStrokes, type RasterImage } from './rasterToStrokes';

function image(width: number, height: number, ink: (x: number, y: number) => boolean): RasterImage {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!ink(x, y)) continue;
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 20;
    }
  }
  return { width, height, data };
}

const length = (points: Point[]) =>
  points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]), 0);

describe('rasterToStrokes', () => {
  it('traces a thick bar as one centreline with its thickness', () => {
    const { strokes, lineWidth } = rasterToStrokes(image(200, 100, (x, y) => x >= 20 && x < 180 && y >= 45 && y < 56));
    expect(strokes.length).toBeGreaterThanOrEqual(1);
    expect(strokes.length).toBeLessThanOrEqual(3);
    const longest = strokes.reduce((a, b) => (length(a.points) > length(b.points) ? a : b));
    expect(length(longest.points)).toBeGreaterThan(120);
    for (const [, y] of longest.points) expect(Math.abs(y - 50.5)).toBeLessThan(3);
    expect(lineWidth).toBeGreaterThan(8);
    expect(lineWidth).toBeLessThan(15);
  });

  it('traces a ring as a closed loop', () => {
    const ring = (x: number, y: number) => {
      const d = Math.hypot(x - 60, y - 60);
      return d >= 34 && d <= 40;
    };
    const { strokes } = rasterToStrokes(image(120, 120, ring));
    const total = strokes.reduce((sum, s) => sum + length(s.points), 0);
    expect(total).toBeGreaterThan(2 * Math.PI * 37 * 0.85);
    expect(total).toBeLessThan(2 * Math.PI * 37 * 1.25);
  });

  it('starts near the top-left and drops specks', () => {
    const { strokes } = rasterToStrokes(
      image(200, 200, (x, y) => (x >= 150 && x < 190 && y >= 150 && y < 156) || (x >= 10 && x < 60 && y >= 10 && y < 16) || (x === 100 && y === 100)),
    );
    expect(strokes).toHaveLength(2);
    expect(strokes[0].points[0][1]).toBeLessThan(20);
  });

  it('returns nothing for a blank image', () => {
    expect(rasterToStrokes(image(50, 50, () => false)).strokes).toEqual([]);
  });

  it('treats transparent pixels as paper', () => {
    const img = image(60, 60, () => false);
    // Fully transparent black: dark pixels, but no paint.
    for (let i = 0; i < img.data.length; i++) img.data[i] = 0;
    expect(rasterToStrokes(img).strokes).toEqual([]);
  });
});

describe('reading order (text)', () => {
  // Two "lines" of three short vertical bars each; the bars are traced top to bottom.
  const bars = (x: number, y: number) => x % 40 >= 10 && x % 40 < 16 && x < 120 && ((y >= 10 && y < 40) || (y >= 60 && y < 90));

  it('writes line by line, left to right', () => {
    const { strokes } = rasterToStrokes(image(130, 100, bars), { order: 'reading', lineHeight: 50, lineTop: 0 });
    expect(strokes).toHaveLength(6);
    const starts = strokes.map((s) => s.points[0]);
    const xs = starts.map(([x]) => Math.round(x / 40));
    expect(xs).toEqual([0, 1, 2, 0, 1, 2]);
    expect(starts.slice(0, 3).every(([, y]) => y < 50)).toBe(true);
    expect(starts.slice(3).every(([, y]) => y >= 50)).toBe(true);
  });

  it('writes right to left when asked', () => {
    const { strokes } = rasterToStrokes(image(130, 100, bars), { order: 'reading', rtl: true, lineHeight: 50, lineTop: 0 });
    expect(strokes.map((s) => Math.round(s.points[0][0] / 40))).toEqual([2, 1, 0, 2, 1, 0]);
  });

  it('starts each stroke at its upper end', () => {
    const { strokes } = rasterToStrokes(image(130, 100, bars), { order: 'reading', lineHeight: 50, lineTop: 0 });
    for (const s of strokes) expect(s.points[0][1]).toBeLessThan(s.points[s.points.length - 1][1]);
  });

  it('keeps short strokes like dots when asked', () => {
    const dot = (x: number, y: number) => (x >= 20 && x < 26 && y >= 20 && y < 26) || (x >= 40 && x < 46 && y >= 10 && y < 50);
    const loose = rasterToStrokes(image(60, 60, dot), { order: 'reading', lineHeight: 60, minLength: 0 });
    const strict = rasterToStrokes(image(60, 60, dot), { order: 'reading', lineHeight: 60 });
    expect(loose.strokes.length).toBeGreaterThan(strict.strokes.length);
  });
});
