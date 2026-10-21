import { next } from '@vercel/functions';
import { gateHtml, SESSION_COOKIE } from './api/gate.ts';

/**
 * Vercel Routing Middleware: runs before every page, file and API call. Until the visitor has
 * entered ACCESS_PASSWORD (POST /api/access sets a signed session cookie) it shows the password form
 * and refuses the API. The cookie check matches server/api/security.ts: "<id>.<mac>" with
 * mac = HMAC-SHA256(APP_SECRET, "<id>|<sha256(ACCESS_PASSWORD) first 16 hex>"), base64url, 32 chars.
 */
const enc = new TextEncoder();

const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(value)))).slice(0, 32);
}

async function passwordTag(pw: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(pw)));
  return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export default async function proxy(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/api/access') return next();
  const pw = process.env.ACCESS_PASSWORD;
  const secret = process.env.APP_SECRET;
  if (!pw || !secret) return new Response('This site is not configured yet (ACCESS_PASSWORD and APP_SECRET).', { status: 503 });

  const value = (request.headers.get('cookie') ?? '')
    .split(';')
    .map((c) => c.trim().split('='))
    .find(([k]) => k === SESSION_COOKIE)?.[1];
  const [id, mac] = (value ?? '').split('.');
  if (id && mac && (await hmac(secret, `${id}|${await passwordTag(pw)}`)) === mac) return next();

  if (url.pathname.startsWith('/api/')) {
    return Response.json({ error: 'no_session', message: 'Enter the access password first (reload the page).' }, { status: 401 });
  }
  return new Response(gateHtml(), { status: 401, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
