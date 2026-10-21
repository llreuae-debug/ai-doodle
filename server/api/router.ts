import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { ElementRequest, makeElements } from './element.ts';
import { makeMusic, MusicRequest, MUSIC_STYLES, MOOD_DEFAULTS } from './music.ts';
import { envKey, generate, HttpError, MODELS, requestDeadline, TEXT_FALLBACKS, withFallback } from './gemini.ts';
import { accessPassword, checkPassword, ensureSession, hasSession, issueSession, rateLimit, requireSession, serveMedia } from './security.ts';
import { gateHtml } from './gate.ts';
import { rewriteSlide, SlideRequest, StoryRequest, writeStory } from './story.ts';
import { LANG_SUPPORT, textToSpeech, TtsRequest, VOICES } from './tts.ts';

/** Request bodies above this are refused (reference images are the largest). */
const MAX_BODY_BYTES = 6 * 1024 * 1024;

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, 'too_large', 'That request is too large.'));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new HttpError(400, 'bad_json', 'Send a JSON object.'));
      }
    });
    req.on('error', reject);
  });
}

/** zod errors as one plain sentence (field: problem), without echoing what the user typed. */
function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (r.success) return r.data;
  const first = r.error.issues[0];
  throw new HttpError(400, 'invalid', `Check ${first.path.join('.') || 'the request'}: ${first.message}`);
}

const VoiceLine = z.object({ items: z.string().max(1500).default('nothing yet'), title: z.string().max(120).default('Untitled video') });

type Route = { bucket: 'light' | 'story' | 'element' | 'tts' | 'music'; run: (body: unknown) => Promise<unknown> };

const POST: Record<string, Route> = {
  '/api/story': { bucket: 'story', run: (b) => writeStory(parse(StoryRequest, b)) },
  '/api/slide': { bucket: 'story', run: (b) => rewriteSlide(parse(SlideRequest, b)) },
  '/api/element': { bucket: 'element', run: (b) => makeElements(parse(ElementRequest, b)) },
  '/api/tts': { bucket: 'tts', run: (b) => textToSpeech(parse(TtsRequest, b)) },
  '/api/music': { bucket: 'music', run: (b) => makeMusic(parse(MusicRequest, b)) },
  '/api/ai/voiceline': {
    bucket: 'light',
    run: async (b) => {
      const { items, title } = parse(VoiceLine, b);
      const out = await withFallback([MODELS.text, ...TEXT_FALLBACKS], (model) => generate(model, [
        {
          text: `Write a natural, friendly voiceover line (1 to 2 sentences, under 35 words) for one slide of a whiteboard explainer video. The slide shows: ${items}. Video title: "${title}". Reply with the spoken words only, no quotes.`,
        },
      ]));
      return { text: out.map((p) => p.text ?? '').join('').trim().replace(/^"|"$/g, '') };
    },
  },
  '/api/ai/set-key': {
    bucket: 'light',
    run: async (b) => {
      const { key } = parse(z.object({ key: z.string().trim().min(20).max(300) }), b);
      // A hosted server can't rewrite its own settings: the key belongs in the host's environment.
      if (process.env.VERCEL) throw new HttpError(400, 'hosted', 'On Vercel, set GEMINI_API_KEY in the project\'s Environment Variables, then redeploy.');
      // Check the key with Google before saving it (listing models uses no generation quota).
      const check = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': key } }).catch(() => null);
      if (!check) throw new HttpError(502, 'offline', "Couldn't reach Google AI to check the key. Try again.");
      if (!check.ok) throw new HttpError(400, 'bad_key', 'Google AI rejected this key. Check it and try again.');
      const file = path.resolve(process.cwd(), '.env.local');
      let content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      content = /^GEMINI_API_KEY=.*$/m.test(content) ? content.replace(/^GEMINI_API_KEY=.*$/m, `GEMINI_API_KEY=${key}`) : `${content.trimEnd()}\nGEMINI_API_KEY=${key}\n`.trimStart();
      fs.writeFileSync(file, content, 'utf8');
      process.env.GEMINI_API_KEY = key;
      return { success: true, provider: 'gemini' };
    },
  },
};

const GET: Record<string, () => unknown> = {
  '/api/voices': () => ({ ...VOICES, langSupport: LANG_SUPPORT }),
  '/api/music/styles': () => ({ styles: Object.entries(MUSIC_STYLES).map(([id, s]) => ({ id, label: s.label, instruments: s.instruments })), moods: MOOD_DEFAULTS }),
  '/api/ai/status': () => ({ configured: !!(envKey('GEMINI_API_KEY') || envKey('GOOGLE_API_KEY')), provider: 'gemini', models: MODELS }),
};

function send(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

/**
 * Connect-style middleware for the API, generated media and the session cookie. Mounted by the
 * Vite dev server (server/aiPlugin.ts) and the production server (server/index.ts).
 */
export function apiMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void): void {
  const url = req.url?.split('?')[0] ?? '';
  const locked = !!accessPassword() && !hasSession(req);
  if (url === '/api/access' && req.method === 'POST') {
    (async () => {
      rateLimit(req, 'access');
      const { password } = parse(z.object({ password: z.string().max(200) }), await readJson(req));
      if (!checkPassword(password)) throw new HttpError(401, 'bad_password', 'That password is not right.');
      issueSession(req, res);
      return { ok: true };
    })()
      .then((payload) => send(res, 200, payload))
      .catch((err: unknown) => (err instanceof HttpError ? send(res, err.status, { error: err.code, message: err.message }) : send(res, 500, { error: 'internal', message: 'Something went wrong.' })));
    return;
  }
  if (url.startsWith('/media/')) {
    if (locked) return send(res, 401, { error: 'no_session', message: 'Enter the access password first.' });
    if (!serveMedia(req, res)) next();
    return;
  }
  if (!url.startsWith('/api/')) {
    const page = req.method === 'GET' && (url === '/' || url.endsWith('.html') || !url.includes('.'));
    // With an access password, every page shows the password form until it's entered.
    if (locked && page) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(gateHtml());
      return;
    }
    // Otherwise pages get the session cookie; the API then only answers this app's pages.
    if (page) ensureSession(req, res);
    next();
    return;
  }
  const getRoute = req.method === 'GET' ? GET[url] : undefined;
  const postRoute = req.method === 'POST' ? POST[url] : undefined;
  if (!getRoute && !postRoute) {
    send(res, GET[url] || POST[url] ? 405 : 404, { error: 'not_found', message: 'No such API route.' });
    return;
  }
  /** Vercel stops a function at 300 s; finish (or fail clearly) before that. */
  const deadline = Date.now() + (process.env.VERCEL ? 285_000 : 60 * 60_000);
  requestDeadline.run(deadline, async () => {
    requireSession(req);
    if (getRoute) {
      rateLimit(req, 'light');
      return getRoute();
    }
    rateLimit(req, postRoute!.bucket);
    return postRoute!.run(await readJson(req));
  })
    .then((payload) => send(res, 200, payload))
    .catch((err: unknown) => {
      if (err instanceof HttpError) return send(res, err.status, { error: err.code, message: err.message });
      // Log the kind of failure only: never request bodies (user text) or keys.
      console.error(`[api] ${url} failed: ${err instanceof Error ? err.name : 'error'}`);
      send(res, 500, { error: 'internal', message: 'Something went wrong on the server. Try again.' });
    });
}
