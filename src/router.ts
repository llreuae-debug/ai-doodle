import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}

/** Client-side navigation with the History API. Vite's dev server already falls back to index.html. */
export function navigate(to: string): void {
  const [, hash] = to.split('#');
  const fullTarget = to;
  const currentFull = window.location.pathname + window.location.search + window.location.hash;

  if (fullTarget !== currentFull) {
    window.history.pushState(null, '', fullTarget);
    for (const listener of listeners) listener();
  }

  if (hash) {
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
  }

  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

export const usePath = (): string => useSyncExternalStore(subscribe, () => window.location.pathname);

