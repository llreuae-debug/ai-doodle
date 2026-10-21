import { createSurface, type Surface } from '../engine/canvas';
import { artKey, type LoadedArt, type LoadedHand, type Resources } from '../engine/resources';
import { prepareStrokes } from '../engine/strokes';
import { BOARDS, doodleInk } from '../engine/boards';
import { layoutText, measureCtx, TEXT_PAD, textFont } from '../engine/geometry';
import { handSvg } from '../hands/handArt';
import { resolveHand } from '../hands/catalog';
import { DOODLE_VIEWBOX, doodleSvg, LIBRARY, type DoodleDef } from '../library/doodles';
import { loadFont } from '../library/fonts';
import { cachedLibraryItem, fetchLibraryItem, manifestItem } from '../library/manifest';
import { newId } from '../model/factories';
import type { Asset, CustomFont, Hand, Point, Project, Stroke, TextElement } from '../model/types';
import { traceImage } from '../pipeline/traceClient';
import { loadPhotoHand } from './photoHand';
import { toSketch } from './sketch';

/** Longest side of an upload's art raster, in asset px. */
const ART_MAX_SIDE = 1600;
/** Library doodles (200×200 units) are rasterised at this many px. */
const DOODLE_RASTER = 1200;
/** Longest side the tracer works at. Bigger is slower and gives noisier strokes. */
const TRACE_MAX_SIDE = 900;
/** Distance between sampled points along SVG paths, in art px. */
const SVG_SAMPLE_STEP = 3;
/** Hands are rasterised above their display size so they stay sharp at 4K. */
const HAND_RASTER_SCALE = 1.5;
/** Upload pixels lighter than this (0–255) fade towards transparent. */
const WHITE_FROM = 235;
const SVG_GEOMETRY = 'path, line, polyline, polygon, circle, ellipse, rect';
const ILLUSTRATED_HAND_SIZE = 1000;
const ILLUSTRATED_TIP = 16;

// ---------- doodles ----------

export async function loadDoodleArt(def: Pick<DoodleDef, 'strokes' | 'fills'>, color: boolean, ink: string): Promise<LoadedArt> {
  const svg = parseSvg(doodleSvg(def, { color, ink }));
  const k = DOODLE_RASTER / DOODLE_VIEWBOX;
  const vb = new DOMRect(0, 0, DOODLE_VIEWBOX, DOODLE_VIEWBOX);
  const strokes = svgStrokes(svg, vb, k);
  const art = await rasterizeSvg(svg, DOODLE_RASTER, DOODLE_RASTER);
  return { width: DOODLE_RASTER, height: DOODLE_RASTER, art, strokes: prepareStrokes(strokes) };
}

/** A built-in, already-fetched library or custom doodle. Library items not fetched yet: see fetchLibraryItem. */
export function findDoodle(project: Pick<Project, 'custom'>, defId: string): DoodleDef | undefined {
  return LIBRARY.find((d) => d.id === defId) ?? cachedLibraryItem(defId) ?? project.custom.find((d) => d.id === defId);
}

/** A doodle's name, including library items whose strokes haven't been fetched yet. */
export const doodleName = (project: Pick<Project, 'custom'>, defId: string): string | undefined => findDoodle(project, defId)?.name ?? manifestItem(defId)?.name;

// ---------- uploads ----------

export async function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('Could not read the file'));
    r.readAsDataURL(blob);
  });
}

async function bitmapFrom(src: Blob | string): Promise<ImageBitmap> {
  const blob = typeof src === 'string' ? await (await fetch(src)).blob() : src;
  return createImageBitmap(blob);
}

/** Preview for the upload dialog: the image turned into an edge sketch, as a PNG data URL. */
export async function sketchPreview(file: Blob): Promise<string> {
  const bitmap = await bitmapFrom(file);
  try {
    const sketch = toSketch(bitmap);
    return readAsDataUrl(await sketch.canvas.convertToBlob({ type: 'image/png' }));
  } finally {
    bitmap.close();
  }
}

/**
 * Turns an uploaded image (or its sketch) into a project asset with traced strokes.
 * The art is stored as a data URL so a saved project needs nothing else.
 */
export async function importImage(src: Blob | string, name: string): Promise<{ asset: Asset; art: LoadedArt }> {
  const source = await bitmapFrom(src);
  try {
    const k = Math.min(1, ART_MAX_SIDE / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * k));
    const height = Math.max(1, Math.round(source.height * k));
    const surface = createSurface(width, height);
    surface.ctx.drawImage(source, 0, 0, width, height);
    knockOutWhite(surface);
    const strokes = await traceSurface(surface);
    const artUrl = await readAsDataUrl(await surface.canvas.convertToBlob({ type: 'image/png' }));
    const asset: Asset = { id: newId(), source: 'upload', name, width, height, artUrl, strokes, createdAt: Date.now() };
    return { asset, art: { width, height, art: surface.canvas.transferToImageBitmap(), strokes: prepareStrokes(strokes) } };
  } finally {
    source.close();
  }
}

/** Re-creates the raster for a saved asset; its strokes are already in the record. */
export async function loadAssetArt(asset: Asset): Promise<LoadedArt> {
  const art = await bitmapFrom(asset.artUrl);
  return { width: asset.width, height: asset.height, art, strokes: prepareStrokes(asset.strokes) };
}

async function traceSurface({ canvas }: Surface): Promise<Stroke[]> {
  const tk = Math.min(1, TRACE_MAX_SIDE / Math.max(canvas.width, canvas.height));
  const trace = createSurface(Math.max(1, Math.round(canvas.width * tk)), Math.max(1, Math.round(canvas.height * tk)));
  trace.ctx.drawImage(canvas, 0, 0, trace.canvas.width, trace.canvas.height);
  const { strokes } = await traceImage(trace.ctx.getImageData(0, 0, trace.canvas.width, trace.canvas.height));
  const up = canvas.width / trace.canvas.width;
  return strokes.map((s) => ({ width: s.width * up, points: s.points.map(([x, y]): Point => [x * up, y * up]) }));
}

/** Fades near-white pixels to transparent so an upload's paper blends into the board. */
function knockOutWhite({ canvas, ctx }: Surface): void {
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (l > WHITE_FROM) d[i + 3] = Math.min(d[i + 3], Math.round(((255 - l) / (255 - WHITE_FROM)) * 255));
  }
  ctx.putImageData(image, 0, 0);
}

// ---------- text ----------

/** Text is rasterised at this many art px per stage px before tracing, for clean centrelines. */
const TEXT_RASTER_SCALE = 1.5;
const TEXT_MAX_SIDE = 2400;
/** Keep every stroke, down to single-point dots on i and j and full stops, so the hand writes them too. */
const TEXT_MIN_STROKE = 0;

/**
 * Text as drawable art: rendered exactly as the editor lays it out, then traced into centreline
 * strokes in reading order, so the hand writes it letter by letter. Tracing uses a black copy
 * (light ink on a dark board would read as paper); the art keeps the real colour.
 */
export async function loadTextArt(el: TextElement, ink: string): Promise<LoadedArt> {
  await loadFont(el.font, el.weight, el.text);
  const layout = layoutText(measureCtx(), el);
  const k = Math.min(TEXT_RASTER_SCALE, TEXT_MAX_SIDE / Math.max(layout.width, layout.height));
  const width = Math.max(1, Math.ceil(layout.width * k));
  const height = Math.max(1, Math.ceil(layout.height * k));
  const paint = (color: string) => {
    const s = createSurface(width, height);
    s.ctx.scale(k, k);
    s.ctx.font = textFont(el);
    s.ctx.textBaseline = 'top';
    s.ctx.fillStyle = color;
    s.ctx.direction = layout.rtl ? 'rtl' : 'ltr';
    s.ctx.textAlign = layout.rtl ? 'right' : 'left';
    const x = layout.rtl ? layout.width - TEXT_PAD : TEXT_PAD;
    layout.lines.forEach((line, i) => s.ctx.fillText(line, x, TEXT_PAD + i * layout.lineHeight));
    return s;
  };
  const tracing = paint('#000');
  const { strokes } = await traceImage(tracing.ctx.getImageData(0, 0, width, height), {
    order: 'reading',
    rtl: layout.rtl,
    lineHeight: layout.lineHeight * k,
    lineTop: TEXT_PAD * k,
    minLength: TEXT_MIN_STROKE,
  });
  const art = paint(el.fill ?? ink);
  return { width, height, art: art.canvas.transferToImageBitmap(), strokes: prepareStrokes(strokes) };
}

// ---------- hands ----------

export async function loadHand(hand: Hand): Promise<LoadedHand> {
  if (hand.photo) return loadPhotoHand(hand.id, hand.photo);
  const svg = parseSvg(handSvg(hand.look));
  const px = Math.round(ILLUSTRATED_HAND_SIZE * HAND_RASTER_SCALE);
  return {
    id: hand.id,
    image: await rasterizeSvg(svg, px, px),
    width: ILLUSTRATED_HAND_SIZE,
    height: ILLUSTRATED_HAND_SIZE,
    tipX: ILLUSTRATED_TIP,
    tipY: ILLUSTRATED_TIP,
    scale: 1,
  };
}

// ---------- making sure a project can render ----------

const inFlight = new Map<string, Promise<void>>();

/**
 * Loads whatever the project needs that isn't in `resources` yet: doodle art for each colour
 * mode and board ink in use, uploaded images, and the hands in use. Resolves to true if
 * anything new was loaded. Failures are reported through `onError` and skipped.
 */
const registeredFonts = new Map<string, Promise<void>>();

/** Makes uploaded fonts available to canvas text by registering them with the FontFace API. */
export function registerFonts(fonts: CustomFont[]): Promise<void> {
  return Promise.all(
    fonts.map((f) => {
      let job = registeredFonts.get(f.family);
      if (!job) {
        job = f.blob
          .arrayBuffer()
          .then((buf) => new FontFace(f.family, buf).load())
          .then((face) => void document.fonts.add(face));
        registeredFonts.set(f.family, job);
      }
      return job;
    }),
  ).then(() => undefined);
}

/** Checks an uploaded file is a font the browser can use. */
export async function readFont(file: File): Promise<void> {
  await new FontFace(`probe-${newId()}`, await file.arrayBuffer()).load();
}

export async function ensureResources(
  project: Project,
  resources: Resources,
  onError: (message: string) => void,
  opts: { text?: boolean } = {},
): Promise<boolean> {
  await registerFonts(project.fonts ?? []).catch((err: unknown) => onError(`a font didn't load (${err instanceof Error ? err.message : String(err)})`));
  // Text art is re-traced whenever the words change; drop versions no element uses any more.
  const used = new Set(project.scenes.flatMap((s) => s.elements.map((el) => artKey(el, project))));
  for (const key of resources.art.keys()) if (key.startsWith('text:') && !used.has(key)) resources.art.delete(key);

  const jobs: Promise<void>[] = [];
  const queue = (key: string, load: () => Promise<void>) => {
    let job = inFlight.get(key);
    if (!job) {
      job = load()
        .catch((err: unknown) => onError(err instanceof Error ? err.message : String(err)))
        .finally(() => inFlight.delete(key));
      inFlight.set(key, job);
    }
    jobs.push(job);
  };

  for (const scene of project.scenes) {
    for (const el of scene.elements) {
      const key = artKey(el, project);
      if (!key || resources.art.has(key)) continue;
      if (el.kind === 'doodle') {
        const known = findDoodle(project, el.defId);
        const ink = doodleInk(el.color, project.board);
        queue(key, async () => {
          // Library items are fetched the first time a slide uses them.
          const def = known ?? (await fetchLibraryItem(el.defId));
          if (def) resources.art.set(key, await loadDoodleArt(def, el.color, ink));
        });
      } else if (el.kind === 'image') {
        const asset = project.assets[el.assetId];
        if (!asset) continue;
        queue(key, async () => {
          resources.art.set(key, await loadAssetArt(asset));
        });
      } else if (opts.text !== false) {
        const ink = (BOARDS[project.board] ?? BOARDS.white).ink;
        queue(key, async () => {
          resources.art.set(key, await loadTextArt(el, ink));
        });
      }
    }
  }
  // The project's hand and any slide's own: only hands in use are downloaded.
  const handIds = new Set([project.handId, ...project.scenes.map((s) => s.handId)]);
  for (const id of handIds) {
    if (!id || resources.hands.has(id)) continue;
    queue(`hand:${id}`, async () => {
      const hand = await resolveHand(id);
      if (hand) resources.hands.set(id, await loadHand(hand));
    });
  }
  if (jobs.length === 0) return false;
  await Promise.all(jobs);
  return true;
}

// ---------- SVG helpers ----------

function parseSvg(text: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;
  if (!(root instanceof SVGSVGElement)) throw new Error('Not an SVG file');
  return document.importNode(root, true);
}

/**
 * Samples every visible shape, in document order, into a stroke in art px.
 * Shapes inside <defs> or marked data-nodraw are skipped; they still appear in the art.
 */
function svgStrokes(source: SVGSVGElement, vb: DOMRect, k: number): Stroke[] {
  const svg = source.cloneNode(true) as SVGSVGElement;
  svg.setAttribute('width', String(vb.width));
  svg.setAttribute('height', String(vb.height));
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none';
  host.append(svg);
  document.body.append(host);
  try {
    const toRoot = svg.getScreenCTM()?.inverse();
    if (!toRoot) return [];
    const strokes: Stroke[] = [];
    for (const el of svg.querySelectorAll<SVGGeometryElement>(SVG_GEOMETRY)) {
      if (el.closest('defs, [data-nodraw]')) continue;
      const screen = el.getScreenCTM();
      const length = el.getTotalLength();
      if (!screen || !(length > 0)) continue;
      const m = toRoot.multiply(screen);
      const unit = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) * k;
      const n = Math.max(1, Math.ceil((length * unit) / SVG_SAMPLE_STEP));
      const points: Point[] = [];
      for (let i = 0; i <= n; i++) {
        const p = el.getPointAtLength((length * i) / n);
        const q = new DOMPoint(p.x, p.y).matrixTransform(m);
        points.push([(q.x - vb.x) * k, (q.y - vb.y) * k]);
      }
      const style = getComputedStyle(el);
      const strokeWidth = style.stroke === 'none' ? 0 : parseFloat(style.strokeWidth) || 0;
      strokes.push({ points, width: Math.max(1, strokeWidth * unit) });
    }
    return strokes;
  } finally {
    host.remove();
  }
}

async function rasterizeSvg(source: SVGSVGElement, width: number, height: number): Promise<ImageBitmap> {
  const svg = source.cloneNode(true) as SVGSVGElement;
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
  try {
    const img = new Image(width, height);
    img.src = url;
    await img.decode();
    const surface = createSurface(width, height);
    surface.ctx.drawImage(img, 0, 0, width, height);
    return surface.canvas.transferToImageBitmap();
  } finally {
    URL.revokeObjectURL(url);
  }
}
