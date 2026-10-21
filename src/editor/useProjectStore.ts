import { useCallback, useEffect, useRef, useState } from 'react';
import type { Project } from '../model/types';

const HISTORY_LIMIT = 60;

interface State {
  project: Project;
  past: Project[];
  future: Project[];
}

/**
 * Copies the parts a recipe may mutate: top-level fields, the pen sound settings, scenes and
 * elements. (A recipe that edited a shared object would also change the undo history, and React
 * runs updaters twice in development, so a toggle would flip back.)
 */
function draftOf(p: Project): Project {
  return {
    ...p,
    drawSound: { ...p.drawSound },
    scenes: p.scenes.map((s) => ({ ...s, elements: s.elements.map((e) => ({ ...e, anim: { ...e.anim } })) })),
  };
}

/**
 * The project with undo/redo. Recipes get a draft and mutate it:
 * scenes, elements, top-level fields and `drawSound` freely; `assets`, `custom` and `music` only by assigning new objects.
 * During a drag, call `checkpoint()` once and then `update(..., false)` per move so the drag is one undo step.
 */
export function useProjectStore(initial: () => Project) {
  const [state, setState] = useState<State>(() => ({ project: initial(), past: [], future: [] }));
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const update = useCallback((recipe: (draft: Project) => void, record = true) => {
    setState((s) => {
      const next = draftOf(s.project);
      recipe(next);
      next.updatedAt = Date.now();
      return record
        ? { project: next, past: [...s.past, s.project].slice(-HISTORY_LIMIT), future: [] }
        : { ...s, project: next };
    });
  }, []);

  const checkpoint = useCallback(() => {
    setState((s) => ({ ...s, past: [...s.past, s.project].slice(-HISTORY_LIMIT), future: [] }));
  }, []);

  const undo = useCallback(() => {
    setState((s) => (s.past.length ? { project: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.project, ...s.future] } : s));
  }, []);

  const redo = useCallback(() => {
    setState((s) => (s.future.length ? { project: s.future[0], past: [...s.past, s.project], future: s.future.slice(1) } : s));
  }, []);

  /** Swap in another project (open, new) and clear history. */
  const replace = useCallback((project: Project) => setState({ project, past: [], future: [] }), []);

  return {
    project: state.project,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    current: () => stateRef.current.project,
    update,
    checkpoint,
    undo,
    redo,
    replace,
  };
}
