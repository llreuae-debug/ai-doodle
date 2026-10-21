import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Ctx2D } from '../engine/canvas';
import { elementBox, type Box } from '../engine/geometry';
import { FINISHED, Renderer } from '../engine/renderer';
import type { Resources } from '../engine/resources';
import type { Timeline } from '../engine/timeline';
import { STAGE_SIZE, type Project, type SceneElement } from '../model/types';

const MAX_DPR = 2;
const HANDLE_PX = 12;
const SNAP_PX = 10;
const DRAG_START_PX = 2;
const SELECTION = '#7F56D9';
const GUIDE = '#E8458B';

interface Props {
  project: Project;
  timeline: Timeline;
  resources: Resources;
  /** Bumped when fonts or art finish loading, so the stage redraws. */
  resVersion: number;
  sceneIndex: number;
  playing: boolean;
  playTime: number;
  selectedId: string | null;
  zoom: number;
  snap: boolean;
  onSelect: (id: string | null) => void;
  /** Record one undo step before a drag changes anything. */
  onCheckpoint: () => void;
  /** Apply a change without recording history (the drag's checkpoint covers it). */
  onChange: (recipe: (draft: Project) => void) => void;
}

type Guide = { x: number } | { y: number };

interface Drag {
  mode: 'move' | 'resize';
  id: string;
  corner: number;
  startX: number;
  startY: number;
  orig: SceneElement;
  box: Box;
  pushed: boolean;
}

const corners = (b: Box): [number, number][] => [
  [b.x, b.y],
  [b.x + b.w, b.y],
  [b.x, b.y + b.h],
  [b.x + b.w, b.y + b.h],
];

export function StageView(props: Props) {
  const { project, timeline, resources, resVersion, sceneIndex, playing, playTime, selectedId, zoom, snap, onSelect, onCheckpoint, onChange } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderer = useMemo(() => new Renderer(resources), [resources]);
  const [fit, setFit] = useState(0.4);
  const [guides, setGuides] = useState<Guide[]>([]);
  const drag = useRef<Drag | null>(null);
  const stage = STAGE_SIZE[project.aspectRatio];
  const scene = project.scenes[sceneIndex];

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const aw = Math.max(200, wrap.clientWidth - 16);
      const ah = Math.max(160, wrap.clientHeight - 16);
      setFit(Math.min(aw / stage.width, ah / stage.height));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [stage.width, stage.height]);

  const cssW = Math.round(stage.width * fit * zoom);
  const cssH = Math.round(stage.height * fit * zoom);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (playing) {
      renderer.render(ctx, project, timeline, playTime, w, h, { showHand: true });
      return;
    }
    renderer.renderScene(ctx, project, timeline, sceneIndex, FINISHED, w, h, { showHand: false });
    drawOverlay(ctx, w / stage.width, project, scene?.elements.find((e) => e.id === selectedId), guides, stage);
  }, [renderer, project, timeline, playing, playTime, sceneIndex, selectedId, guides, cssW, cssH, stage, scene, resVersion]);

  const toStage = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    const s = stage.width / r.width;
    return { x: (e.clientX - r.left) * s, y: (e.clientY - r.top) * s, s };
  };

  const hitTest = (x: number, y: number): SceneElement | null => {
    const els = scene?.elements ?? [];
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i];
      if (el.hidden) continue;
      const b = elementBox(el, project);
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return el;
    }
    return null;
  };

  const cornerAt = (el: SceneElement | undefined, x: number, y: number, s: number): number => {
    if (!el || el.hidden) return -1;
    const tol = HANDLE_PX * s;
    return corners(elementBox(el, project)).findIndex(([cx, cy]) => Math.abs(x - cx) < tol && Math.abs(y - cy) < tol);
  };

  const selected = scene?.elements.find((e) => e.id === selectedId);

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (playing) return;
    const pt = toStage(e);
    const corner = cornerAt(selected, pt.x, pt.y, pt.s);
    if (selected && corner >= 0) {
      drag.current = { mode: 'resize', id: selected.id, corner, startX: pt.x, startY: pt.y, orig: selected, box: elementBox(selected, project), pushed: false };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    const hit = hitTest(pt.x, pt.y);
    onSelect(hit?.id ?? null);
    if (hit) {
      drag.current = { mode: 'move', id: hit.id, corner: -1, startX: pt.x, startY: pt.y, orig: hit, box: elementBox(hit, project), pushed: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const pt = toStage(e);
    const d = drag.current;
    if (!d) {
      if (playing) return;
      const c = cornerAt(selected, pt.x, pt.y, pt.s);
      e.currentTarget.style.cursor = c === 0 || c === 3 ? 'nwse-resize' : c === 1 || c === 2 ? 'nesw-resize' : hitTest(pt.x, pt.y) ? 'move' : 'default';
      return;
    }
    const dx = pt.x - d.startX;
    const dy = pt.y - d.startY;
    if (!d.pushed) {
      if (Math.hypot(dx, dy) <= DRAG_START_PX * pt.s) return;
      onCheckpoint();
      d.pushed = true;
    }
    if (d.mode === 'move') {
      let x = d.orig.x + dx;
      let y = d.orig.y + dy;
      const found: Guide[] = [];
      if (snap) {
        const b = { x: d.box.x + dx, y: d.box.y + dy, w: d.box.w, h: d.box.h };
        const others = (scene?.elements ?? []).filter((o) => o.id !== d.id && !o.hidden).map((o) => elementBox(o, project));
        const xs = [0, stage.width / 2, stage.width, ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])];
        const ys = [0, stage.height / 2, stage.height, ...others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])];
        const sx = nearest(xs, [b.x, b.x + b.w / 2, b.x + b.w], SNAP_PX * pt.s);
        const sy = nearest(ys, [b.y, b.y + b.h / 2, b.y + b.h], SNAP_PX * pt.s);
        if (sx) {
          x += sx.d;
          found.push({ x: sx.at });
        }
        if (sy) {
          y += sy.d;
          found.push({ y: sy.at });
        }
      }
      setGuides(found);
      onChange((draft) => {
        const el = draft.scenes[sceneIndex]?.elements.find((o) => o.id === d.id);
        if (el) {
          el.x = x;
          el.y = y;
        }
      });
      return;
    }
    // Resize from a corner; the opposite corner stays put.
    const b = d.box;
    const ax = d.corner === 0 || d.corner === 2 ? b.x + b.w : b.x;
    const ay = d.corner < 2 ? b.y + b.h : b.y;
    const f = Math.max(0.1, Math.abs(pt.x - ax) / b.w);
    onChange((draft) => {
      const el = draft.scenes[sceneIndex]?.elements.find((o) => o.id === d.id);
      if (!el) return;
      if (el.kind === 'text' && d.orig.kind === 'text') el.size = Math.max(12, Math.round(d.orig.size * f));
      else if (el.kind === 'doodle' && d.orig.kind === 'doodle') el.size = Math.max(30, d.orig.size * f);
      else if (el.kind === 'image' && d.orig.kind === 'image') el.width = Math.max(30, d.orig.width * f);
      const nb = elementBox(el, draft);
      const left = d.corner === 0 || d.corner === 2 ? ax - nb.w : ax;
      const top = d.corner < 2 ? ay - nb.h : ay;
      el.x = left + nb.w / 2;
      el.y = top + nb.h / 2;
    });
  };

  const endDrag = () => {
    drag.current = null;
    setGuides([]);
  };

  return (
    <div className="stagewrap" ref={wrapRef}>
      <div className="stagebox">
        <canvas
          ref={canvasRef}
          className="stage"
          style={{ width: cssW, height: cssH }}
          tabIndex={0}
          aria-label="Board canvas. Drag items to move, drag corners to resize."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
      </div>
    </div>
  );
}

function nearest(targets: number[], edges: number[], tol: number): { d: number; at: number } | null {
  let best: { d: number; at: number } | null = null;
  for (const t of targets) {
    for (const v of edges) {
      const d = t - v;
      if (Math.abs(d) < tol && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, at: t };
    }
  }
  return best;
}

function drawOverlay(
  ctx: Ctx2D,
  k: number,
  project: Project,
  el: SceneElement | undefined,
  guides: Guide[],
  stage: { width: number; height: number },
): void {
  ctx.save();
  ctx.setTransform(k, 0, 0, k, 0, 0);
  const px = 1 / k;
  if (el && !el.hidden) {
    const b = elementBox(el, project);
    ctx.strokeStyle = SELECTION;
    ctx.lineWidth = 2 * px;
    ctx.setLineDash([6 * px, 4 * px]);
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.setLineDash([]);
    for (const [hx, hy] of corners(b)) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.rect(hx - 6 * px, hy - 6 * px, 12 * px, 12 * px);
      ctx.fill();
      ctx.stroke();
    }
  }
  if (guides.length) {
    ctx.strokeStyle = GUIDE;
    ctx.lineWidth = 1.5 * px;
    ctx.setLineDash([8 * px, 6 * px]);
    ctx.beginPath();
    for (const g of guides) {
      if ('x' in g) {
        ctx.moveTo(g.x, 0);
        ctx.lineTo(g.x, stage.height);
      } else {
        ctx.moveTo(0, g.y);
        ctx.lineTo(stage.width, g.y);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}
