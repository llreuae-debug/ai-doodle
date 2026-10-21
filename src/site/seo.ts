/**
 * SEO & Structured Data Management
 * Production domain: https://ai-doodle.vercel.app
 */

export const SITE_URL = 'https://ai-doodle.vercel.app';
export const SITE_NAME = 'Ai Doodle';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/brand/og-preview.png`;

export interface MetaOptions {
  title: string;
  description: string;
  canonicalPath?: string;
  type?: 'website' | 'article';
  image?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function updateDocumentMeta(opts: MetaOptions): void {
  // 1. Update Title
  document.title = opts.title.includes(SITE_NAME) ? opts.title : `${opts.title} | ${SITE_NAME}`;

  // 2. Helper to set or create meta tag
  const setMeta = (attrName: 'name' | 'property', attrVal: string, content: string) => {
    let el = document.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrVal}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // 3. Helper to set or create link tag
  const setLink = (rel: string, href: string) => {
    let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  };

  // 4. Standard Meta
  setMeta('name', 'description', opts.description);

  // 5. Canonical
  const path = opts.canonicalPath ?? window.location.pathname;
  const canonicalUrl = `${SITE_URL}${path === '/' ? '' : path}`;
  setLink('canonical', canonicalUrl);

  // 6. Open Graph
  setMeta('property', 'og:site_name', SITE_NAME);
  setMeta('property', 'og:title', opts.title);
  setMeta('property', 'og:description', opts.description);
  setMeta('property', 'og:url', canonicalUrl);
  setMeta('property', 'og:type', opts.type ?? 'website');
  setMeta('property', 'og:image', opts.image ?? DEFAULT_OG_IMAGE);

  // 7. Twitter Cards
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', opts.title);
  setMeta('name', 'twitter:description', opts.description);
  setMeta('name', 'twitter:image', opts.image ?? DEFAULT_OG_IMAGE);

  // 8. Article specific tags
  if (opts.type === 'article') {
    if (opts.publishedTime) setMeta('property', 'article:published_time', opts.publishedTime);
    if (opts.modifiedTime) setMeta('property', 'article:modified_time', opts.modifiedTime);
    if (opts.author) setMeta('property', 'article:author', opts.author);
  }

  // 9. Structured Data (JSON-LD)
  let scriptEl = document.querySelector<HTMLScriptElement>('#structured-data-jsonld');
  if (opts.structuredData) {
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'structured-data-jsonld';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(opts.structuredData);
  } else if (scriptEl) {
    scriptEl.remove();
  }
}
