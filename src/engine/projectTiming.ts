import type { Project, SceneElement } from '../model/types';
import { elementBox } from './geometry';
import { artKey, type Resources } from './resources';
import type { PreparedStrokes } from './strokes';
import { buildTimeline, type Timeline } from './timeline';

export function elementStrokes(el: SceneElement, project: Project, resources: Resources): PreparedStrokes | undefined {
  const key = artKey(el, project);
  return key ? resources.art.get(key)?.strokes : undefined;
}

/** Stroke length as drawn on stage, in stage px, so bigger drawings take longer. 0 for text or art not loaded yet. */
export function stageStrokeLength(el: SceneElement, project: Project, resources: Resources): number {
  const key = artKey(el, project);
  const art = key ? resources.art.get(key) : undefined;
  return art ? (art.strokes.total * elementBox(el, project).w) / art.width : 0;
}

export function projectTimeline(project: Project, resources: Resources): Timeline {
  return buildTimeline(project, (el) => stageStrokeLength(el, project, resources));
}
