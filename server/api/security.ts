import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { envKey, HttpError } from './gemini.ts';

import { MEDIA_DIR, readStored, storeFile } from './storage.ts';

export { MEDIA_DIR };

let secret: string | null = null;
/** APP_SECRET signs the browser session cookie and media file names. A random one is used if it's missing. */
export function appSecret(): string {
  if (!secret) {
    secret = envKey('APP_SECRET') ?? crypto.randomBytes(32).toString('hex');
    if (!envKey('APP_SECRET')) console.warn('[ai] APP_SECRET is not set; using a temporary one (sessions reset on restart).');
  }
  return secret;
}

const sign = (value: string) => crypto.createHmac('sha256', appSecret()).update(value).digest('base64url').slice(0, 32);

// ---------- session and access password ----------

import { SESSION_COOKIE as COOKIE } from './gate.ts';

/** ACCESS_PASSWORD is disabled to keep the site public without any password barrier. */
export const accessPassword = (): string | undefined => undefined;

/**
 * The cookie is "<id>.<mac>", mac = HMAC(APP_SECRET, id|tag), where tag depends on the access
 * password: changing the password signs everyone out. proxy.ts computes the same mac on Vercel.
 */
const accessTag = () => {
  const pw = accessPassword();
  return pw ? crypto.createHash('sha256').update(pw).digest('hex').slice(0, 16) : '';
};
const sessionMac = (id: string) => sign(`${id}|${accessTag()}`);

function cookieValue(req: IncomingMessage): string | undefined {
  return req.headers.cookie
    ?.split(';')
    .map((c) => c.trim().split('='))
    .find(([k]) => k === COOKIE)?.[1];
}

export function hasSession(req: IncomingMessage): boolean {
  const [id, mac] = (cookieValue(req) ?? '').split('.');
  if (!id || !mac) return false;
  return crypto.timingSafeEqual(Buffer.from(sessionMac(id).padEnd(32)), Buffer.from(mac.padEnd(32).slice(0, 32)));
}

/** Sets a fresh session cookie. */
export function issueSession(req: IncomingMessage, res: ServerResponse): void {
  const id = crypto.randomBytes(12).toString('base64url');
  const https = req.headers['x-forwarded-proto'] === 'https' || !!process.env.VERCEL;
  res.setHeader('Set-Cookie', `${COOKIE}=${id}.${sessionMac(id)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000${https ? '; Secure' : ''}`);
}

/** Without an access password, the page itself hands out the session, so only this app's pages can call the API. */
export function ensureSession(req: IncomingMessage, res: ServerResponse): void {
  if (!accessPassword() && !hasSession(req)) issueSession(req, res);
}

export function requireSession(req: IncomingMessage): void {
  if (!hasSession(req)) throw new HttpError(401, 'no_session', accessPassword() ? 'Enter the access password first (reload the page).' : 'Reload the page and try again.');
}

/** Compares in constant time (both sides hashed to the same length first). */
export function checkPassword(given: string): boolean {
  const pw = accessPassword();
  if (!pw) return true;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(pw).digest();
  return crypto.timingSafeEqual(a, b);
}

// ---------- rate limit ----------

/** Requests per IP per minute, per bucket. */
const LIMITS: Record<string, number> = { light: 60, story: 8, element: 20, tts: 90, music: 6, access: 10 };
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

/**
 * A small disk cache for generated results (raw speech, drawings) keyed by everything that affects
 * them, so rebuilding a story after small edits only pays for what changed.
 */
export const cacheKey = (v: unknown) => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 32);
/** Cache entries are named by a hash of their inputs, signed so they can't be guessed. */
const cachePath = (kind: string, key: string) => `_cache/${kind}/${sign(`${kind}:${key}`)}`;
export const cacheGet = (kind: string, key: string): Promise<Buffer | null> => readStored(cachePath(kind, key));
export async function cachePut(kind: string, key: string, data: Buffer): Promise<void> {
  await storeFile(cachePath(kind, key), data);
}

/** Saves a generated file and returns its URL. File names are unguessable (signed hash). */
export function saveMedia(projectId: string, data: Buffer, ext: string): Promise<string> {
  const project = projectId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'shared';
  const name = `${sign(`${project}:${crypto.createHash('sha256').update(data).digest('hex')}`)}.${ext}`;
  return storeFile(`${project}/${name}`, data);
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
