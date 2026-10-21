/**
 * Security headers for every page, file and API answer. The Node servers set them in code;
 * vercel.json repeats them for Vercel's static files (api.test.ts checks that the two match).
 */

/** Generated media lives in Vercel Blob when deployed. */
const BLOB = 'https://*.public.blob.vercel-storage.com';

export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // React style attributes and the Google Fonts stylesheets.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: blob: https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${BLOB}`,
  `media-src 'self' data: blob: ${BLOB}`,
  `connect-src 'self' data: blob: ${BLOB} https://fonts.googleapis.com https://fonts.gstatic.com`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/** The password page is self-contained (inline style and script, no user content). */
export const GATE_CSP = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";
