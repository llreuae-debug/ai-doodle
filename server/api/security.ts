import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { envKey, HttpError } from './gemini.ts';

/** Generated files live here, one folder per project, and are served at /media/<projectId>/<file>. */
export const MEDIA_DIR = path.resolve(process.cwd(), 'media');

let secret: string | null = null;
/** APP_SECRET signs the browser session cookie and media file names. A random one is used if it's missing. */
function appSecret(): string {
  if (!secret) {
    secret = envKey('APP_SECRET') ?? crypto.randomBytes(32).toString('hex');
    if (!envKey('APP_SECRET')) console.warn('[ai] APP_SECRET is not set; using a temporary one (sessions reset on restart).');
  }
  return secret;
}

const sign = (value: string) => crypto.createHmac('sha256', appSecret()).update(value).digest('base64url').slice(0, 32);

// ---------- session ----------

const COOKIE = 'ad_session';

function cookieValue(req: IncomingMessage): string | undefined {
  return req.headers.cookie
    ?.split(';')
    .map((c) => c.trim().split('='))
    .find(([k]) => k === COOKIE)?.[1];
}

/** Issues the session cookie with the page, so only pages served by this app can call the API. */
export function ensureSession(req: IncomingMessage, res: ServerResponse): void {
  const v = cookieValue(req);
  if (v && validSession(v)) return;
  const id = crypto.randomBytes(12).toString('base64url');
  res.setHeader('Set-Cookie', `${COOKIE}=${id}.${sign(id)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`);
}

const validSession = (v: string) => {
  const [id, mac] = v.split('.');
  return !!id && !!mac && crypto.timingSafeEqual(Buffer.from(sign(id).padEnd(32)), Buffer.from(mac.padEnd(32).slice(0, 32)));
};

export function requireSession(req: IncomingMessage): void {
  const v = cookieValue(req);
  if (!v || !validSession(v)) throw new HttpError(401, 'no_session', 'Reload the page and try again.');
}

// ---------- rate limit ----------

/** Requests per IP per minute, per bucket. */
const LIMITS: Record<string, number> = { light: 60, story: 8, element: 20, tts: 90, music: 6 };
const hits = new Map<string, number[]>();

export function rateLimit(req: IncomingMessage, bucket: keyof typeof LIMITS): void {
  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() || req.socket.remoteAddress || 'local';
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (list.length >= LIMITS[bucket]) throw new HttpError(429, 'rate_limited', 'Too many requests. Wait a minute and try again.');
  list.push(now);
  hits.set(key, list);
}

// ---------- media ----------

/** Saves a generated file and returns its URL. File names are unguessable (signed hash). */
export function saveMedia(projectId: string, data: Buffer, ext: string): string {
  const project = projectId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'shared';
  const name = `${sign(`${project}:${crypto.createHash('sha256').update(data).digest('hex')}`)}.${ext}`;
  const dir = path.join(MEDIA_DIR, project);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), data);
  return `/media/${project}/${name}`;
}

const MIME: Record<string, string> = { mp3: 'audio/mpeg', wav: 'audio/wav', png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg' };

/** Serves /media/<project>/<file> from MEDIA_DIR (no directory listing, no path escapes). */
export function serveMedia(req: IncomingMessage, res: ServerResponse): boolean {
  const m = /^\/media\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+\.(mp3|wav|png|webp|jpg))$/.exec(req.url?.split('?')[0] ?? '');
  if (!m) return false;
  const file = path.join(MEDIA_DIR, m[1], m[2]);
  if (!fs.existsSync(file)) {
    res.statusCode = 404;
    res.end();
    return true;
  }
  res.setHeader('Content-Type', MIME[m[3]]);
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
  fs.createReadStream(file).pipe(res);
  return true;
}
