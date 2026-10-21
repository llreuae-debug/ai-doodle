import type { Plugin } from 'vite';
import { apiMiddleware } from './api/router.ts';

/**
 * Mounts the AI API (server/api) on the Vite dev server. Keys stay on the server: they're read from
 * .env / .env.local by server/api/gemini.ts and never reach the browser bundle.
 */
export function aiPlugin(): Plugin {
  return {
    name: 'ai-doodle-api',
    configureServer(server) {
      server.middlewares.use(apiMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiMiddleware);
    },
  };
}
