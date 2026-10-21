import { STAGE_SIZE, type Project, type SceneElement, type TextElement } from '../model/types';
import { BOARDS, drawBoard } from './boards';
import { createSurface, type Ctx2D, type Surface } from './canvas';
import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic } from './easing';
import { elementBox, layoutText, TEXT_PAD, textFont, type Box } from './geometry';
import { artKey, type LoadedArt, type LoadedHand, type Resources } from './resources';
import { penAt, setupBrush, strokeOnto, type PreparedStrokes } from './strokes';
import { drawPhaseEnd, sceneIndexAt, TRANSITION_MS, type Timeline } from './timeline';

export interface RenderOptions {
  showHand?: boolean;
  /** Overlay each element's strokes, coloured by order, with a dot at each start. */
  debugStrokes?: boolean;
}

/** Render a scene in its finished state (every element drawn). */
export const FINISHED = Number.POSITIVE_INFINITY;

interface Pen {
  x: number;
  y: number;
}

interface Mask {
  source: LoadedArt;
  completed: number;
  surface: Surface;
}

/**
 * Draws any frame of a project: preview, thumbnails and export all go through here.
 * Output depends only on (project, timeline, t). The mask cache only saves work, so seeking
 * backwards is safe, but give the preview, thumbnails and an export their own instances.
 */
export class Renderer {
  private readonly resources: Resources;
  private readonly masks = new Map<string, Mask>();
  private scratch: Surface | null = null;
  private readonly transition: Record<'from' | 'to', Surface | null> = { from: null, to: null };

  constructor(resources: Resources) {
    this.resources = resources;
  }

  /** A full frame at project time t (ms), including scene transitions. */
  render(ctx: Ctx2D, project: Project, timeline: Timeline, t: number, outWidth: number, outHeight: number, opts: RenderOptions = {}): number {
    const index = sceneIndexAt(timeline, t);
    const scene = project.scenes[index];
    const timing = timeline.scenes[index];
    const local = timing ? t - timing.start : 0;
    if (index > 0 && scene && scene.transition !== 'none' && local < TRANSITION_MS) {
      const from = this.transitionSurface('from', outWidth, outHeight);
      const to = this.transitionSurface('to', outWidth, outHeight);
      this.renderScene(from.ctx, project, timeline, index - 1, FINISHED, outWidth, outHeight, { ...opts, showHand: false });
      this.renderScene(to.ctx, project, timeline, index, t, outWidth, outHeight, opts);
      const k = easeOutCubic(local / TRANSITION_MS);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      const W = outWidth;
      const H = outHeight;
      if (scene.transition === 'push') {
        ctx.drawImage(from.canvas, -W * k, 0, W, H);
        ctx.drawImage(to.canvas, W * (1 - k), 0, W, H);
      } else {
        ctx.drawImage(from.canvas, 0, 0, W, H);
        if (scene.transition === 'fade') ctx.globalAlpha = k;
        if (scene.transition === 'wipe') {
          ctx.beginPath();
          ctx.rect(0, 0, W * k, H);
          ctx.clip();
        }
        if (scene.transition === 'iris') {
          ctx.beginPath();
          ctx.arc(W / 2, H / 2, (Math.hypot(W, H) / 2) * k, 0, Math.PI * 2);
          ctx.clip();
        }
        ctx.drawImage(to.canvas, 0, 0, W, H);
      }
      ctx.restore();
      return index;
    }
    this.renderScene(ctx, project, timeline, index, t, outWidth, outHeight, opts);
    return index;
  }

  /** One scene at project time t (or FINISHED), with no transition. */
  renderScene(
    ctx: Ctx2D,
    project: Project,
    timeline: Timeline,
    index: number,
    t: number,
    outWidth: number,
    outHeight: number,
    opts: RenderOptions = {},
  ): void {
    const stage = STAGE_SIZE[project.aspectRatio];
    ctx.save();
    ctx.setTransform(outWidth / stage.width, 0, 0, outHeight / stage.height, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    drawBoard(ctx, project.board, stage.width, stage.height);

    const scene = project.scenes[index];
    const timing = timeline.scenes[index];
    let pen: Pen | null = null;
    if (scene && timing) {
      scene.elements.forEach((el, k) => {
        const et = timing.elements[k];
        if (el.hidden || !et) return;
        const duration = et.end - et.start;
        const p = t === FINISHED ? 1 : duration <= 0 ? (t >= et.start ? 1 : 0) : clamp01((t - et.start) / duration);
        if (p <= 0 && el.anim.type !== 'none') return;
        const drawn = this.drawElement(ctx, project, el, el.anim.type === 'none' ? 1 : p, duration, opts);
        if (drawn) pen = drawn;
      });
    }

    const handId = sceneHandId(project, index);
    const hand = handId ? this.resources.hands.get(handId) : undefined;
    const at = pen as Pen | null;
    if (at && hand && opts.showHand !== false) drawHand(ctx, hand, at, Math.min(stage.width, stage.height));
    ctx.restore();
  }

  /** Returns the pen position in stage px while the element is being drawn. */
  private drawElement(ctx: Ctx2D, project: Project, el: SceneElement, p: number, duration: number, opts: RenderOptions): Pen | null {
    const box = elementBox(el, project, ctx);
    const { type } = el.anim;
    const draw = type === 'draw';
    const toStage = new DOMMatrix().translate(el.x, el.y).rotate(el.rotation).translate(-el.x, -el.y);

    ctx.save();
    ctx.transform(toStage.a, toStage.b, toStage.c, toStage.d, toStage.e, toStage.f);
    if (p < 1 && !draw) {
      const e = easeOutCubic(p);
      if (type === 'fade') ctx.globalAlpha = e;
      if (type === 'pop') {
        const s = 0.55 + 0.45 * easeOutBack(p);
        ctx.globalAlpha = Math.min(1, p * 2);
        ctx.translate(el.x, el.y);
        ctx.scale(s, s);
        ctx.translate(-el.x, -el.y);
      }
      if (type === 'slide') ctx.translate(-(1 - e) * (box.x + box.w + 60), 0);
      if (type === 'wipe') {
        ctx.beginPath();
        ctx.rect(box.x - 4, box.y - 4, (box.w + 8) * e, box.h + 8);
        ctx.clip();
      }
    }

    const key = artKey(el, project);
    const art = key ? this.resources.art.get(key) : undefined;
    let pen: Pen | null = null;
    if (el.kind === 'text') {
      // While being written, text is drawn from its traced strokes so the hand follows each letter.
      // Before and after, it stays crisp vector text. Until the trace is ready, fall back to a sweep.
      if (draw && p < 1 && art && art.strokes.total > 0) pen = this.drawArt(ctx, el.id, art, box, p, duration, true, toStage, opts);
      else pen = this.drawText(ctx, project, el, box, draw ? p : 1, toStage);
    } else if (art) {
      pen = this.drawArt(ctx, el.id, art, box, p, duration, draw, toStage, opts);
    }
    ctx.restore();
    return pen;
  }

  /** Draws traced art into its box: revealed along its strokes while drawing, whole otherwise. */
  private drawArt(
    ctx: Ctx2D,
    key: string,
    art: LoadedArt,
    box: Box,
    p: number,
    duration: number,
    draw: boolean,
    toStage: DOMMatrix,
    opts: RenderOptions,
  ): Pen | null {
    const sx = box.w / art.width;
    const sy = box.h / art.height;
    ctx.translate(box.x, box.y);
    ctx.scale(sx, sy);
    let pen: Pen | null = null;
    if (draw && p < 1 && art.strokes.total > 0) {
      const local = this.drawReveal(ctx, key, art, p, duration);
      if (local) {
        const q = toStage.translate(box.x, box.y).scale(sx, sy).transformPoint(new DOMPoint(local.x, local.y));
        pen = { x: q.x, y: q.y };
      }
    } else {
      // Stroke-less art (e.g. a blank upload) fades in instead of drawing.
      if (draw && p < 1) ctx.globalAlpha *= easeInOutCubic(p);
      ctx.drawImage(art.art, 0, 0, art.width, art.height);
    }
    if (opts.debugStrokes) drawStrokeDebug(ctx, art.strokes, sx);
    return pen;
  }

  /** Handwriting: reveals each line left to right, with the pen at the leading edge. */
  private drawText(ctx: Ctx2D, project: Project, el: TextElement, box: Box, p: number, toStage: DOMMatrix): Pen | null {
    const layout = layoutText(ctx, el);
    ctx.font = textFont(el);
    ctx.fillStyle = el.fill ?? (BOARDS[project.board] ?? BOARDS.white).ink;
    ctx.textBaseline = 'top';
    // Right-to-left scripts are right-aligned in the box and written from the right.
    const { rtl } = layout;
    ctx.direction = rtl ? 'rtl' : 'ltr';
    ctx.textAlign = rtl ? 'right' : 'left';
    const anchorX = rtl ? box.x + box.w - TEXT_PAD : box.x + TEXT_PAD;
    if (p >= 1) {
      layout.lines.forEach((line, i) => ctx.fillText(line, anchorX, box.y + i * layout.lineHeight + TEXT_PAD));
      return null;
    }
    let pen: Pen | null = null;
    let budget = layout.widths.reduce((s, w) => s + w, 0) * p;
    layout.lines.forEach((line, i) => {
      const w = layout.widths[i];
      const show = Math.max(0, Math.min(budget, w));
      budget -= w;
      if (show <= 0) return;
      const top = box.y + i * layout.lineHeight;
      const edge = rtl ? anchorX - show : anchorX + show;
      ctx.save();
      ctx.beginPath();
      if (rtl) ctx.rect(edge, top - 2, box.x + box.w - edge, layout.lineHeight + 6);
      else ctx.rect(box.x, top - 2, show + TEXT_PAD, layout.lineHeight + 6);
      ctx.clip();
      ctx.fillText(line, anchorX, top + TEXT_PAD);
      ctx.restore();
      if (show < w && !pen) {
        const q = toStage.transformPoint(new DOMPoint(edge, top + layout.lineHeight * 0.8));
        pen = { x: q.x, y: q.y };
      }
    });
    return pen;
  }

  /** Reveals the art under a brush that follows the strokes. `ctx` is in art space. */
  private drawReveal(ctx: Ctx2D, key: string, art: LoadedArt, p: number, duration: number): Pen | null {
    const { width: w, height: h } = art;
    const fillStart = drawPhaseEnd(duration);
    const drawP = Math.min(1, p / fillStart);
    const pen = penAt(art.strokes, drawP);

    const mask = this.maskFor(key, art, pen.completed);
    const work = this.scratchFor(w, h);
    work.ctx.globalCompositeOperation = 'source-over';
    work.ctx.clearRect(0, 0, w, h);
    work.ctx.drawImage(mask.canvas, 0, 0);
    if (pen.drawing) {
      setupBrush(work.ctx);
      strokeOnto(work.ctx, art.strokes.strokes[pen.stroke], pen.along);
    }
    work.ctx.globalCompositeOperation = 'source-in';
    work.ctx.drawImage(art.art, 0, 0, w, h);
    work.ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(work.canvas, 0, 0, w, h, 0, 0, w, h);

    if (p > fillStart) {
      ctx.globalAlpha *= (p - fillStart) / (1 - fillStart);
      ctx.drawImage(art.art, 0, 0, w, h);
    }
    return drawP < 1 ? pen : null;
  }

  /** Mask holding the first `completed` strokes, built incrementally while playing forwards. */
  private maskFor(key: string, art: LoadedArt, completed: number): Surface {
    let mask = this.masks.get(key);
    if (!mask || mask.source !== art || completed < mask.completed) {
      const surface = mask && mask.source === art ? mask.surface : createSurface(art.width, art.height);
      surface.ctx.clearRect(0, 0, surface.canvas.width, surface.canvas.height);
      mask = { source: art, completed: 0, surface };
      this.masks.set(key, mask);
    }
    if (completed > mask.completed) {
      setupBrush(mask.surface.ctx);
      for (let i = mask.completed; i < completed; i++) strokeOnto(mask.surface.ctx, art.strokes.strokes[i]);
      mask.completed = completed;
    }
    return mask.surface;
  }

  private scratchFor(w: number, h: number): Surface {
    const s = this.scratch;
    if (!s || s.canvas.width < w || s.canvas.height < h) {
      this.scratch = createSurface(Math.max(w, s?.canvas.width ?? 0), Math.max(h, s?.canvas.height ?? 0));
    }
    return this.scratch!;
  }

  private transitionSurface(which: 'from' | 'to', w: number, h: number): Surface {
    let s = this.transition[which];
    if (!s || s.canvas.width !== Math.ceil(w) || s.canvas.height !== Math.ceil(h)) {
      s = createSurface(w, h);
      this.transition[which] = s;
    }
    return s;
  }
}

function drawStrokeDebug(ctx: Ctx2D, strokes: PreparedStrokes, scale: number): void {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2 / scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  strokes.strokes.forEach((s, i) => {
    const color = `hsl(${(i * 47) % 360} 85% 45%)`;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(s.pts[0], s.pts[1]);
    for (let k = 2; k < s.pts.length; k += 2) ctx.lineTo(s.pts[k], s.pts[k + 1]);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s.pts[0], s.pts[1], 4 / scale, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

/** The hand drawing on a scene: its own, or the project's. */
export function sceneHandId(project: Pick<Project, 'handId' | 'scenes'>, index: number): string | null {
  const own = project.scenes[index]?.handId;
  return own !== undefined ? own : project.handId;
}

/** Places the hand so its pen tip is exactly on the stroke point. */
export function drawHand(ctx: Ctx2D, hand: LoadedHand, at: Pen, stageShortSide: number): void {
  const s = hand.fit ? (stageShortSide * hand.fit) / hand.width : hand.scale;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.translate(at.x - hand.tipX * s, at.y - hand.tipY * s);
  ctx.scale(s, s);
  for (const tail of hand.tails ?? []) {
    ctx.save();
    ctx.transform(...tail.transform);
    ctx.drawImage(tail.image, 0, 0, tail.width, tail.height);
    ctx.restore();
  }
  ctx.drawImage(hand.image, 0, 0, hand.width, hand.height);
  ctx.restore();
}
