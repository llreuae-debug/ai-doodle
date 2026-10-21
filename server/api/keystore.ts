import crypto from 'node:crypto';
import { API_ROOT, HttpError } from './gemini.ts';
import { appSecret } from './security.ts';
import { setSavedKey } from './savedKey.ts';
import { readStored, storeFile } from './storage.ts';

/**
 * Lets the key dialog change the Google AI key on a hosted server (Vercel can't edit its own
 * environment). The key is encrypted with AES-256-GCM under a key derived from APP_SECRET and
 * stored with the app's other server files; only the server can decrypt it, and it never goes
 * to the browser. A saved key takes priority over GEMINI_API_KEY; every server instance reloads
 * it at most once a minute, so a change applies everywhere without a redeploy.
 */
const PATHNAME = '_secrets/google-ai-key.enc';
const REFRESH_MS = 60_000;
let loadedAt = 0;

const cipherKey = () => crypto.createHash('sha256').update(`ai-doodle/google-ai-key/${appSecret()}`).digest();

function encrypt(text: string): Buffer {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', cipherKey(), iv);
  const body = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]);
}

function decrypt(data: Buffer): string | null {
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', cipherKey(), data.subarray(0, 12));
    d.setAuthTag(data.subarray(12, 28));
    return Buffer.concat([d.update(data.subarray(28)), d.final()]).toString('utf8');
  } catch {
    // Written under a different APP_SECRET: ignore it.
    return null;
  }
}

/** Loads the saved key (if any) into memory; cheap after the first call each minute. */
export async function refreshSavedKey(force = false): Promise<void> {
  if (!force && Date.now() - loadedAt < REFRESH_MS) return;
  loadedAt = Date.now();
  const data = await readStored(PATHNAME).catch(() => null);
  setSavedKey(data ? decrypt(data) : null);
}

/** Checks the key with Google (listing models uses no generation quota), then saves it encrypted. */
export async function saveKey(key: string): Promise<void> {
  const check = await fetch(`${API_ROOT}/v1beta/models?pageSize=1`, { headers: { 'x-goog-api-key': key } }).catch(() => null);
  if (!check) throw new HttpError(502, 'offline', "Couldn't reach Google AI to check the key. Try again.");
  if (!check.ok) throw new HttpError(400, 'bad_key', 'Google AI rejected this key. Check it and try again.');
  await storeFile(PATHNAME, encrypt(key));
  setSavedKey(key);
  loadedAt = Date.now();
}
