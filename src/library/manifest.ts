import { validStrokes, type DoodleDef, type DoodleFill } from './doodles';

/**
 * The clipart library built by scripts/library/build-library.mjs. The panel lists items from
 * public/library/manifest.json (names, tags and SVG thumbnails); an item's strokes are only
 * fetched when it's added to a slide or a saved project uses it.
 */
export type LibraryCategory =
  | 'characters'
  | 'faces'
  | 'business'
  | 'realestate'
  | 'education'
  | 'faith'
  | 'tech'
  | 'health'
  | 'food'
  | 'nature'
  | 'transport'
  | 'scenes'
  | 'shapes';

/** The panel sub-tab each category is listed under. */
export const LIBRARY_CATEGORIES: { id: LibraryCategory; label: string; tab: 'characters' | 'props' | 'shapes' }[] = [
  { id: 'characters', label: 'People', tab: 'characters' },
  { id: 'faces', label: 'Faces', tab: 'characters' },
  { id: 'business', label: 'Business', tab: 'props' },
  { id: 'realestate', label: 'Real estate', tab: 'props' },
  { id: 'education', label: 'Education', tab: 'props' },
  { id: 'faith', label: 'Faith', tab: 'props' },
  { id: 'tech', label: 'Tech', tab: 'props' },
  { id: 'health', label: 'Health', tab: 'props' },
  { id: 'food', label: 'Food', tab: 'props' },
  { id: 'nature', label: 'Nature', tab: 'props' },
  { id: 'transport', label: 'Transport', tab: 'props' },
  { id: 'scenes', label: 'Scenes', tab: 'props' },
  { id: 'shapes', label: 'Shapes & callouts', tab: 'shapes' },
];

export interface ManifestItem {
  id: string;
  cat: LibraryCategory;
  name: string;
  role?: string;
  character?: string;
  pose?: string;
  tags: string[];
  premium?: boolean;
  file: string;
  thumb: string;
  thumbLine?: string;
  thumbColor: string;
  strokeCount?: number;
}

export const LIBRARY_MANIFEST_URL = '/library/manifest.json';

let manifest: Promise<ManifestItem[]> | null = null;
let byId = new Map<string, ManifestItem>();
const items = new Map<string, DoodleDef>();
const pending = new Map<string, Promise<DoodleDef | undefined>>();

/** Loads the manifest once. Resolves to [] if it can't be read, so the built-in library still works. */
export function loadLibraryManifest(): Promise<ManifestItem[]> {
  manifest ??= fetch(LIBRARY_MANIFEST_URL)
    .then((res) => (res.ok ? (res.json() as Promise<ManifestItem[]>) : ([] as ManifestItem[])))
    .catch(() => [] as ManifestItem[])
    .then((list) => {
      byId = new Map(list.map((m) => [m.id, m]));
      return list;
    });
  return manifest;
}

export const manifestItem = (id: string): ManifestItem | undefined => byId.get(id);

/** An item already fetched, for synchronous lookups. */
export const cachedLibraryItem = (id: string): DoodleDef | undefined => items.get(id);

/** Fetches an item's strokes and fills (once). Undefined if it isn't in the manifest. */
export function fetchLibraryItem(id: string): Promise<DoodleDef | undefined> {
  const done = items.get(id);
  if (done) return Promise.resolve(done);
  let job = pending.get(id);
  if (!job) {
    job = loadLibraryManifest().then(async () => {
      const entry = byId.get(id);
      if (!entry) return undefined;
      const res = await fetch(entry.file);
      if (!res.ok) throw new Error(`${entry.name} returned ${res.status}`);
      const raw = (await res.json()) as { strokes?: unknown; fills?: { d: string; c: string }[] };
      const def: DoodleDef = {
        id,
        cat: entry.cat,
        name: entry.name,
        tags: entry.tags,
        strokes: validStrokes(raw.strokes),
        fills: (raw.fills ?? []).filter((f): f is DoodleFill => typeof f?.d === 'string' && typeof f?.c === 'string'),
      };
      items.set(id, def);
      return def;
    });
    job.finally(() => pending.delete(id)).catch(() => {});
    pending.set(id, job);
  }
  return job;
}
