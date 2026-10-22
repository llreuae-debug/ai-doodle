import { next } from '@vercel/functions';

/**
 * Public pass-through routing middleware.
 * No access password is required; the site and all pages/tools are completely public.
 */
export default async function proxy(_request: Request): Promise<Response> {
  return next();
}
