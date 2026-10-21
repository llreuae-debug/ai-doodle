import type { Project, SceneElement } from '../model/types';
import { doodleName } from '../services/loaders';

export function elementName(el: SceneElement, project: Project): string {
  if (el.kind === 'text') return el.text.split('\n')[0] || 'Text';
  if (el.kind === 'image') return project.assets[el.assetId]?.name ?? 'Image';
  return doodleName(project, el.defId) ?? 'Doodle';
}

/** m:ss.s, or ss.s under a minute (Chalkline's format). */
export function formatTime(ms: number): string {
  const t = Math.max(0, ms) / 1000;
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return (m ? `${String(m).padStart(2, '0')}:` : '') + s.toFixed(1).padStart(4, '0');
}
