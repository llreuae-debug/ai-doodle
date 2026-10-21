import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import manifest from '../../public/library/manifest.json';
import { LIBRARY_CATEGORIES, type ManifestItem } from './manifest';

type LibraryFile = { id: string; cat: string; strokes: string[]; fills: { d: string; c: string }[]; source: string };
const byPath = new Map(
  (manifest as ManifestItem[]).map((entry) => [
    entry.file,
    JSON.parse(readFileSync(new URL(`../../public${entry.file}`, import.meta.url), 'utf8')) as LibraryFile,
  ]),
);

/** Absolute M L C Q A Z only, and every subpath starts with M. */
const absolute = (d: string) => {
  if (/[^MLCQAZ0-9.,\s-]/.test(d)) return false;
  const cmds = d.match(/[MLCQAZ]/g) ?? [];
  return cmds[0] === 'M' && cmds.every((c, i) => i === 0 || cmds[i - 1] !== 'Z' || c === 'M');
};

describe('clipart library', () => {
  const items = manifest as ManifestItem[];

  it('covers every category with unique ids', () => {
    expect(new Set(items.map((m) => m.id)).size).toBe(items.length);
    for (const c of LIBRARY_CATEGORIES) expect(items.some((m) => m.cat === c.id), c.id).toBe(true);
  });

  it('has a valid item file for every manifest entry', () => {
    for (const m of items) {
      const item = byPath.get(m.file);
      expect(item, m.file).toBeDefined();
      expect(item!.id).toBe(m.id);
      expect(item!.cat).toBe(m.cat);
      expect(item!.source).toBe('original');
      expect(item!.strokes.length).toBeGreaterThanOrEqual(8);
      expect(item!.strokes.length).toBeLessThanOrEqual(60);
      expect(item!.fills.length).toBeGreaterThanOrEqual(2);
      expect(item!.fills.length).toBeLessThanOrEqual(10);
      for (const d of [...item!.strokes, ...item!.fills.map((f) => f.d)]) expect(absolute(d), `${m.id}: ${d.slice(0, 30)}`).toBe(true);
    }
  });
});
