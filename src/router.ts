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
  if (to === window.location.pathname) return;
  window.history.pushState(null, '', to);
  for (const listener of listeners) listener();
}

export const usePath = (): string => useSyncExternalStore(subscribe, () => window.location.pathname);
