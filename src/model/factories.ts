import { currentHandId } from '../hands/catalog';
import type { DoodleElement, ImageElement, Project, Scene, SceneElement, TextElement } from './types';

/** A deep copy of an element with a new id (duplicate, copy slide). */
export function cloneElement(el: SceneElement, dx = 0, dy = 0): SceneElement {
  return { ...el, anim: { ...el.anim }, id: newId(), x: el.x + dx, y: el.y + dy };
}

export function cloneScene(scene: Scene): Scene {
  return { ...scene, id: newId(), elements: scene.elements.map((e) => cloneElement(e)) };
}

export const newId = (): string => crypto.randomUUID();

export function newScene(transition: Scene['transition'] = 'fade', speed = 1): Scene {
  return {
    id: newId(),
    transition,
    speed,
    holdMs: 1000,
    syncVoice: false,
    stretchToVoice: true,
    drawSound: true,
    voice: null,
    elements: [],
  };
}

export function newProject(name: string, handId: string | null): Project {
  const now = Date.now();
  const defaultSpeed = 1;
  return {
    schemaVersion: 1,
    id: newId(),
    name,
    aspectRatio: '16:9',
    board: 'white',
    handId,
    defaultSpeed,
    drawSound: {
      enabled: true,
      volume: 0.35,
      type: 'marker',
      muted: false,
      quietDuringVoice: true,
    },
    music: null,
    assets: {},
    custom: [],
    fonts: [],
    scenes: [newScene('none', defaultSpeed)],
    createdAt: now,
    updatedAt: now,
  };
}

const anim = () => ({ type: 'draw' as const, durationMs: 'auto' as const, delayMs: 0 });

export function newDoodle(defId: string, x: number, y: number, size: number, color = false): DoodleElement {
  return { id: newId(), kind: 'doodle', defId, color, size, x, y, rotation: 0, anim: anim(), hidden: false };
}

export function newImage(assetId: string, x: number, y: number, width: number): ImageElement {
  return { id: newId(), kind: 'image', assetId, width, x, y, rotation: 0, anim: anim(), hidden: false };
}

export function newText(text: string, x: number, y: number, size: number, font = 'Caveat', weight: TextElement['weight'] = 700): TextElement {
  return { id: newId(), kind: 'text', text, font, size, weight, fill: null, x, y, rotation: 0, anim: anim(), hidden: false };
}


/** Fills in fields added after a project was saved, so older saves still open. */
export function normalizeProject(p: Project): Project {
  const hand = (id: string | null) => (id ? currentHandId(id) : id);
  const defaultSpeed = p.defaultSpeed ?? 1;
  const drawSoundDefaults = {
    enabled: true,
    volume: 0.35,
    type: 'marker' as const,
    muted: false,
    quietDuringVoice: true,
  };
  return {
    ...newProject(p.name, p.handId),
    ...p,
    defaultSpeed,
    drawSound: {
      ...drawSoundDefaults,
      ...(p.drawSound ?? {}),
      volume: typeof p.drawSound?.volume === 'number' ? p.drawSound.volume : 0.35,
      type: p.drawSound?.type ?? 'marker',
      muted: p.drawSound?.muted ?? false,
      quietDuringVoice: p.drawSound?.quietDuringVoice ?? true,
    },
    handId: hand(p.handId),
    // Browser-speech voiceovers (removed) can't be exported, so older saves drop them.
    scenes: (p.scenes ?? []).map((s) => ({
      ...s,
      speed: s.speed ?? defaultSpeed,
      stretchToVoice: s.stretchToVoice ?? true,
      drawSound: s.drawSound ?? true,
      ...(s.handId ? { handId: hand(s.handId) } : {}),
      voice: s.voice?.kind === 'file' ? s.voice : null,
      elements: (s.elements ?? []).map((e) => ({
        ...e,
        anim: {
          ...e.anim,
        },
      })),
    })),
    fonts: p.fonts ?? [],
    custom: p.custom ?? [],
    assets: p.assets ?? {},
  };
}
