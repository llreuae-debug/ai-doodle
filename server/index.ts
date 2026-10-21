import express from 'express';
import path from 'node:path';
import { SECURITY_HEADERS } from './api/headers.ts';
import { apiMiddleware } from './api/router.ts';

/**
 * Production server: the built app (dist/), the AI API and generated media.
 *   npm run build && npm start      (PORT defaults to 8787)
 * Keys come from .env (GEMINI_API_KEY, APP_SECRET); see .env.example.
 */
const app = express();
const dist = path.resolve(process.cwd(), 'dist');
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.set(SECURITY_HEADERS);
  next();
});
app.use(apiMiddleware);
app.use(express.static(dist, { index: false, maxAge: '1h' }));
// Page routes (no file extension) get the app; a missing file is a real 404, not the app's HTML.
app.get(/^[^.]*$/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
app.use((_req, res) => res.status(404).type('text/plain').send('Not found'));
const port = Number(process.env.PORT) || 8787;
app.listen(port, () => console.log(`Ai Doodle on http://localhost:${port}`));
