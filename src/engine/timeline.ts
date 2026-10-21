import type { Project, Scene, SceneElement } from '../model/types';

/** Drawing speed for 'auto' durations, in stage px of stroke per second. */
export const DRAW_SPEED = 1500;
export const MIN_DRAW_MS = 800;
export const MAX_DRAW_MS = 4500;
export const TEXT_MS_PER_CHAR = 75;
export const MIN_TEXT_MS = 600;
export const DEFAULT_ANIM_MS = 800;
/** Voice-synced scenes run this much past the end of the voiceover. */
export const VOICE_TAIL_MS = 300;
export const MIN_SCENE_MS = 500;
/** Length of a scene transition (it overlaps the start of the incoming scene). */
export const TRANSITION_MS = 600;

export interface ElementTiming {
  id: string;
  start: number;
  end: number;
}

export interface SceneTiming {
  id: string;
  start: number;
  end: number;
  /** When the last element finishes drawing. */
  drawEnd: number;
  /** Same order as the scene's elements. */
  elements: ElementTiming[];
}

export interface Timeline {
  scenes: SceneTiming[];
  duration: number;
}

/** Stroke length of an element as drawn on stage, in stage px; 0 when it has no strokes (or isn't loaded yet). */
export type StrokeLengthOf = (el: SceneElement) => number;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Duration at speed 1 when the element's duration is 'auto'. */
export function autoDurationMs(el: SceneElement, strokeLength: number): number {
  if (el.anim.type === 'none') return 0;
  if (el.anim.type !== 'draw') return DEFAULT_ANIM_MS;
  if (el.kind === 'text') return clamp(el.text.replace(/\s/g, '').length * TEXT_MS_PER_CHAR, MIN_TEXT_MS, MAX_DRAW_MS);
  if (strokeLength > 0) return clamp((strokeLength / DRAW_SPEED) * 1000, MIN_DRAW_MS, MAX_DRAW_MS);
  return DEFAULT_ANIM_MS;
}

export function elementDurationMs(el: SceneElement, strokeLength: number, slideSpeed = 1): number {
  const speed = el.anim.speed ?? slideSpeed;
  const base = el.anim.durationMs === 'auto' ? autoDurationMs(el, strokeLength) : el.anim.durationMs;
  return el.anim.type === 'none' ? 0 : base / (speed || 1);
}

/** One scene's timing, starting at `start`. Elements draw one after another, each after its delay. */
export function sceneTiming(scene: Scene, start: number, strokeLengthOf: StrokeLengthOf): SceneTiming {
  let totalRawDraw = 0;
  let totalDelay = 0;
  const rawDurations = scene.elements.map((el) => {
    if (el.hidden) return 0;
    const d = elementDurationMs(el, strokeLengthOf(el), scene.speed);
    totalDelay += el.anim.delayMs;
    totalRawDraw += d;
    return d;
  });

  const rawEnd = totalDelay + totalRawDraw;

  let stretchFactor = 1;
  const stretchToVoice = scene.stretchToVoice !== false;
  if (scene.syncVoice && scene.voice && stretchToVoice && totalRawDraw > 0) {
    const targetDrawMs = scene.voice.durationMs * 0.85;
    if (targetDrawMs > rawEnd && targetDrawMs > totalDelay) {
      stretchFactor = (targetDrawMs - totalDelay) / totalRawDraw;
    }
  }

  let t = start;
  const elements = scene.elements.map((el, i) => {
    if (el.hidden) return { id: el.id, start, end: start };
    const s = t + el.anim.delayMs;
    const e = s + rawDurations[i] * stretchFactor;
    t = e;
    return { id: el.id, start: s, end: e };
  });

  let end = t + scene.holdMs;
  if (scene.syncVoice && scene.voice) end = Math.max(end, start + scene.voice.durationMs + VOICE_TAIL_MS);
  end = Math.max(end, start + MIN_SCENE_MS);
  return { id: scene.id, start, end, drawEnd: t, elements };
}

/** Resolves every element and scene to absolute times in ms. Pure: same project in, same timeline out. */
export function buildTimeline(project: Pick<Project, 'scenes'>, strokeLengthOf: StrokeLengthOf): Timeline {
  const scenes: SceneTiming[] = [];
  let cursor = 0;
  for (const scene of project.scenes) {
    const timing = sceneTiming(scene, cursor, strokeLengthOf);
    scenes.push(timing);
    cursor = timing.end;
  }
  return { scenes, duration: cursor };
}

/** End of a draw animation spent fading in the finished art (fills, anything the brush missed). */
const FILL_FINISH_MS = 250;
/** Never more than this share of a short draw animation. */
const FILL_FINISH_MAX_SHARE = 0.15;

/** Share (0–1) of a stroke-drawn animation spent drawing; the rest is the fill fade-in. */
export function drawPhaseEnd(durationMs: number): number {
  if (durationMs <= 0) return 1;
  return 1 - Math.min(FILL_FINISH_MS, durationMs * FILL_FINISH_MAX_SHARE) / durationMs;
}

export function sceneIndexAt(timeline: Timeline, t: number): number {
  const i = timeline.scenes.findIndex((s) => t < s.end);
  return i === -1 ? timeline.scenes.length - 1 : i;
}
