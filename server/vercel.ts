import type { IncomingMessage, ServerResponse } from 'node:http';
import { apiMiddleware } from './api/router.ts';

/**
 * Vercel entry: every /api/* request runs the same API as the dev and Express servers.
 * Bundled to api/[...path].mjs by `npm run build:api` (see vercel.json).
 */
export default function handler(req: IncomingMessage, res: ServerResponse): void {
  apiMiddleware(req, res, () => {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'not_found', message: 'No such API route.' }));
  });
}
