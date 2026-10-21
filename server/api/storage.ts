import fs from 'node:fs';
import path from 'node:path';
import { head, put } from '@vercel/blob';

/**
 * Where generated files live. On Vercel (BLOB_READ_WRITE_TOKEN set) they go to Vercel Blob and
 * their public URLs are returned; elsewhere they're written under media/ and served at /media/...
 * Paths are always "<folder>/<name>": media/<projectId>/<file>, or _cache/<kind>/<key> for caches.
 */
export const MEDIA_DIR = process.env.VERCEL ? '/tmp/media' : path.resolve(process.cwd(), 'media');

const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

const MIME: Record<string, string> = { mp3: 'audio/mpeg', wav: 'audio/wav', png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', json: 'application/json', pcm: 'application/octet-stream' };
const mimeOf = (p: string) => MIME[p.split('.').pop() ?? ''] ?? 'application/octet-stream';

/** Stores a file and returns the URL the browser can fetch it from. */
export async function storeFile(pathname: string, data: Buffer): Promise<string> {
  if (useBlob()) {
    const r = await put(pathname, data, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: mimeOf(pathname) });
    return r.url;
  }
  const file = path.join(MEDIA_DIR, pathname);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  return `/media/${pathname}`;
}

/** Reads a stored file back, or null if there isn't one. */
export async function readStored(pathname: string): Promise<Buffer | null> {
  if (useBlob()) {
    try {
      const meta = await head(pathname);
      const res = await fetch(meta.url);
      return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
    } catch {
      return null;
    }
  }
  try {
    return fs.readFileSync(path.join(MEDIA_DIR, pathname));
  } catch {
    return null;
  }
}
