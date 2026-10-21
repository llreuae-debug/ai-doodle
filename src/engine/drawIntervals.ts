import { STAGE_SIZE, type Project, type SceneElement } from '../model/types';
import type { PreparedStrokes } from './strokes';
import { drawPhaseEnd, type Timeline } from './timeline';

export interface Interval {
  start: number;
  end: number;
  /** Stereo pan position (-0.3 .. +0.3) following pen position */
  pan?: number;
  /** Drawing speed multiplier (0.25 .. 3) */
  speed?: number;
}

/** Pen-up gaps shorter than this are bridged so the sound doesn't flutter. */
const MIN_GAP_MS = 25;

/**
 * When a pen is touching the board, in project ms. Uses the same timing and the same strokes as the
 * Renderer, so the drawing sound lines up with the picture frame for frame, pen lifts included.
 */
export function drawingIntervals(
  project: Project,
  timeline: Timeline,
  strokesOf: (el: SceneElement) => PreparedStrokes | undefined,
): Interval[] {
  const raw: Interval[] = [];
  const stageWidth = STAGE_SIZE[project.aspectRatio]?.width ?? 1920;

  project.scenes.forEach((scene, i) => {
    if (scene.drawSound === false) return;
    const sceneTiming = timeline.scenes[i];
    if (!sceneTiming) return;
    scene.elements.forEach((el, k) => {
      const et = sceneTiming.elements[k];
      if (el.hidden || el.anim.type !== 'draw' || !et || et.end <= et.start) return;
      const duration = et.end - et.start;
      const speed = el.anim.speed ?? scene.speed;
      const strokes = strokesOf(el);

      const elNormX = Math.max(-1, Math.min(1, (el.x - stageWidth / 2) / (stageWidth / 2)));
      const elPan = Math.round(Math.max(-0.3, Math.min(0.3, elNormX * 0.3)) * 1000) / 1000;

      if (!strokes || strokes.total <= 0) {
        // Text whose trace isn't ready is swept continuously; stroke-less art just fades in.
        if (el.kind === 'text') {
          raw.push({
            start: et.start,
            end: Math.min(et.end, sceneTiming.end),
            pan: elPan,
            speed,
          });
        }
        return;
      }
      const drawMs = drawPhaseEnd(duration) * duration;
      const elW = 'size' in el ? el.size : 'width' in el ? el.width : 200;

      for (const leg of strokes.legs) {
        if (!leg.draw) continue;
        const start = et.start + (leg.start / strokes.total) * drawMs;
        const end = Math.min(et.start + ((leg.start + leg.cost) / strokes.total) * drawMs, sceneTiming.end);
        if (end > start) {
          const s = strokes.strokes[leg.stroke];
          let legPan = elPan;
          if (s && s.pts && s.pts.length >= 2) {
            const relX = (s.pts[0] - 500) / 500;
            const stageX = el.x + relX * (elW / 2);
            const normX = Math.max(-1, Math.min(1, (stageX - stageWidth / 2) / (stageWidth / 2)));
            legPan = Math.round(Math.max(-0.3, Math.min(0.3, normX * 0.3)) * 1000) / 1000;
          }
          raw.push({ start, end, pan: legPan, speed });
        }
      }
    });
  });

  raw.sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const iv of raw) {
    const last = merged[merged.length - 1];
    if (last && iv.start - last.end < MIN_GAP_MS) {
      last.end = Math.max(last.end, iv.end);
    } else {
      merged.push({ ...iv });
    }
  }
  return merged;
}
