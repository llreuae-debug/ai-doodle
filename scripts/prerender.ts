import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOG_POSTS, type BlogPost } from '../src/site/blogData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE_URL = 'https://ai-doodle.vercel.app';
const SITE_NAME = 'Ai Doodle';
const DEFAULT_OG_IMAGE = `${SITE_URL}/brand/og-preview.png`;

interface PageMeta {
  path: string;
  title: string;
  description: string;
  canonical: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  schemas: Record<string, unknown>[];
  renderHtml: () => string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLogomark(size = 32): string {
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <linearGradient id="logo-neon-grad-${size}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#B75B48" />
        <stop offset="100%" stop-color="#B2C7B6" />
      </linearGradient>
      <filter id="logo-glow-${size}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#B75B48" flood-opacity="0.45" />
      </filter>
    </defs>
    <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#logo-neon-grad-${size})" filter="url(#logo-glow-${size})" />
    <rect x="2" y="2" width="44" height="44" rx="12" fill="none" stroke="rgba(232,236,214,0.4)" stroke-width="1" />
    <path d="M11 31C14 19 20 17 23 25C26 33 32 33 36.5 18" stroke="#E8ECD6" stroke-width="4" fill="none" stroke-linecap="round" />
    <circle cx="36.5" cy="17.5" r="3.2" fill="#E8ECD6" />
  </svg>`;
}

function renderHeader(activePath: string): string {
  const navItems = [
    { label: 'Studio', href: '/' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Blog', href: '/blog' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  return `
  <header class="site-header">
    <div class="site-container site-header-inner">
      <a href="/" class="site-brand" aria-label="Ai Doodle Home">
        ${renderLogomark(32)}
        <span>Ai Doodle</span>
      </a>
      <nav class="site-nav-desktop" aria-label="Main Navigation">
        ${navItems
          .map(
            (item) => `
          <a href="${item.href}" class="site-nav-link ${
            activePath === item.href || (item.href === '/blog' && activePath.startsWith('/blog')) ? 'active' : ''
          }">
            ${escapeHtml(item.label)}
          </a>`,
          )
          .join('')}
      </nav>
      <div class="site-header-actions">
        <a href="/login" class="btn-site btn-site-outline btn-site-sm">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          <span>Sign in</span>
        </a>
        <a href="/" class="btn-site btn-site-primary btn-site-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
          <span>Open Studio</span>
        </a>
        <button type="button" class="site-mobile-toggle" aria-label="Open menu" aria-expanded="false">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  </header>`;
}

function renderFooter(): string {
  const currentYear = new Date().getFullYear();
  return `
  <footer class="site-footer">
    <div class="site-container">
      <div class="site-footer-grid">
        <div>
          <a href="/" class="site-brand">
            ${renderLogomark(28)}
            <span>Ai Doodle</span>
          </a>
          <p class="footer-brand-text">
            The modern, browser-native whiteboard animation studio. Transform ideas, text prompts, and drawings into synchronized hand-drawn vector videos with authentic chalk & pen sound effects.
          </p>
          <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
            <a href="/" class="btn-site btn-site-primary btn-site-sm">
              Start Drawing Free
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
          </div>
        </div>

        <div>
          <h3 class="footer-col-title">Product & Studio</h3>
          <ul class="footer-links">
            <li><a href="/" class="footer-link">AI Doodle Studio</a></li>
            <li><a href="/how-it-works" class="footer-link">How It Works Guide</a></li>
            <li><a href="/blog/save-and-download-doodles" class="footer-link">Save & Export 4K MP4</a></li>
            <li><a href="/blog/ai-doodle-best-practices" class="footer-link">Prompt Writing Tips</a></li>
          </ul>
        </div>

        <div>
          <h3 class="footer-col-title">Educational Guides</h3>
          <ul class="footer-links">
            <li><a href="/blog" class="footer-link">Blog & Resource Index</a></li>
            <li><a href="/blog/ai-doodle-art-guide" class="footer-link">What Is AI Doodle Art?</a></li>
            <li><a href="/blog/ai-doodle-prompt-tips" class="footer-link">Prompts Into Doodle Ideas</a></li>
            <li><a href="/blog/ai-vs-traditional-drawing" class="footer-link">AI vs Traditional Drawing</a></li>
          </ul>
        </div>

        <div>
          <h3 class="footer-col-title">Trust & Legal</h3>
          <ul class="footer-links">
            <li><a href="/about" class="footer-link">About Us</a></li>
            <li><a href="/contact" class="footer-link">Contact Support</a></li>
            <li><a href="/privacy-policy" class="footer-link">Privacy Policy</a></li>
            <li><a href="/terms-of-service" class="footer-link">Terms of Service</a></li>
            <li><a href="/cookie-policy" class="footer-link">Cookie Policy</a></li>
          </ul>
        </div>
      </div>

      <div class="site-footer-bottom">
        <div>
          © ${currentYear} Ai Doodle. Built with passion for creators, educators, and visual storytellers.
        </div>
        <div>
          100% Client-Side Safe • Device Pixel Scaling • Zero Latency Vector Engine
        </div>
      </div>
    </div>
  </footer>`;
}

function renderBlogPostHtml(post: BlogPost): string {
  const tocItems: { text: string; id: string }[] = [];
  post.content.forEach((sectionHtml) => {
    const match = sectionHtml.match(/<h2[^>]*>(.*?)<\/h2>/i);
    if (match) {
      const headingText = match[1].replace(/<[^>]+>/g, '').trim();
      const id = headingText
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      tocItems.push({ text: headingText, id });
    }
  });

  const remaining = BLOG_POSTS.filter((p) => p.slug !== post.slug);
  const nextPost = remaining.find((p) => p.category === post.category) || remaining[0];

  const processedSections = post.content
    .map((sectionHtml) => {
      const headingMatch = sectionHtml.match(/<h2[^>]*>(.*?)<\/h2>/i);
      if (headingMatch) {
        const headingText = headingMatch[1].replace(/<[^>]+>/g, '').trim();
        const id = headingText
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        return sectionHtml.replace(/<h2([^>]*)>/i, `<h2 id="${id}"$1>`);
      }
      return sectionHtml;
    })
    .join('\n');

  const faqsHtml =
    post.faqs && post.faqs.length > 0
      ? `
    <section class="faq-section" id="frequently-asked-questions">
      <h2 class="faq-section-title" style="display: flex; align-items: center; gap: 0.5rem;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--site-terracotta);" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Frequently Asked Questions
      </h2>
      <p class="faq-section-desc">Clear, direct answers to common questions about this topic and Ai Doodle workflows.</p>
      <div class="faq-grid">
        ${post.faqs
          .map(
            (faq) => `
          <div class="faq-card">
            <h3>${escapeHtml(faq.question)}</h3>
            <p>${escapeHtml(faq.answer)}</p>
          </div>`,
          )
          .join('\n')}
      </div>
    </section>`
      : '';

  return `
  <div class="site-wrapper">
    ${renderHeader('/blog')}
    <main class="site-main">
      <div class="site-container">
        <nav class="site-breadcrumbs" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span aria-hidden="true">/</span>
          <a href="/blog">Blog</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">${escapeHtml(post.title)}</span>
        </nav>

        <header class="blog-header">
          <div class="blog-meta">
            <span class="blog-tag" style="background: rgba(183, 91, 72, 0.25); color: var(--site-ivory); border-color: var(--site-terracotta);">${escapeHtml(post.category)}</span>
            ${post.tags.map((t) => `<span class="blog-tag">${escapeHtml(t)}</span>`).join(' ')}
            <span style="display: flex; align-items: center; gap: 0.3rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${escapeHtml(post.readTime)}
            </span>
            <span style="display: flex; align-items: center; gap: 0.3rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>Published: </span>
              <time datetime="${post.publishDate}" itemprop="datePublished">${escapeHtml(post.displayPublishDate)}</time>
            </span>
            <span style="display: flex; align-items: center; gap: 0.3rem;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              <span>Modified: </span>
              <time datetime="${post.updatedDate}" itemprop="dateModified">${escapeHtml(post.displayUpdatedDate)}</time>
            </span>
          </div>

          <h1 class="blog-title">${escapeHtml(post.title)}</h1>
          <p class="blog-summary-lead">${escapeHtml(post.summary)}</p>

          <div class="blog-author-bar">
            <div class="blog-author-avatar">${escapeHtml(post.author.avatar)}</div>
            <div>
              <div class="blog-author-name">${escapeHtml(post.author.name)}</div>
              <div class="blog-author-role">${escapeHtml(post.author.role)}</div>
            </div>
            <button type="button" class="btn-site btn-site-outline btn-site-sm" style="margin-left: auto;" aria-label="Share article link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              <span>Share</span>
            </button>
          </div>
        </header>

        <aside class="geo-direct-answer" aria-label="Quick Summary & Direct Answer">
          <h2 class="geo-direct-answer-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span>Quick Answer & Key Definition</span>
          </h2>
          <p class="geo-direct-answer-body">${escapeHtml(post.directAnswer)}</p>
        </aside>

        ${
          post.keyTakeaways && post.keyTakeaways.length > 0
            ? `
        <section class="key-takeaways-box" aria-label="Key Takeaways">
          <h2 class="key-takeaways-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span>Core Takeaways</span>
          </h2>
          <ul class="key-takeaways-list">
            ${post.keyTakeaways.map((t) => `<li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>${escapeHtml(t)}</span></li>`).join('\n')}
          </ul>
        </section>`
            : ''
        }

        ${
          tocItems.length > 2
            ? `
        <nav class="table-of-contents" aria-label="Table of Contents">
          <h2 class="toc-title" style="display: flex; align-items: center; gap: 0.4rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            <span>In This Guide</span>
          </h2>
          <ul class="toc-list">
            ${tocItems.map((item) => `<li><a href="#${item.id}">${escapeHtml(item.text)}</a></li>`).join('\n')}
            ${post.faqs && post.faqs.length > 0 ? `<li><a href="#frequently-asked-questions">Frequently Asked Questions</a></li>` : ''}
          </ul>
        </nav>`
            : ''
        }

        <article class="blog-content" itemscope itemtype="https://schema.org/BlogPosting">
          <meta itemprop="headline" content="${escapeHtml(post.title)}" />
          <meta itemprop="datePublished" content="${post.publishDate}T00:00:00Z" />
          <meta itemprop="dateModified" content="${post.updatedDate}T00:00:00Z" />

          ${processedSections}
          ${faqsHtml}

          <section class="author-bio-card" aria-label="Author Profile">
            <h2 class="visually-hidden">About the Author</h2>
            <div class="author-bio-avatar">${escapeHtml(post.author.avatar)}</div>
            <div class="author-bio-content">
              <h3 class="author-bio-title" style="font-size: 1.05rem; margin: 0 0 0.25rem; color: var(--site-ivory);">Written by ${escapeHtml(post.author.name)}</h3>
              <div class="author-bio-role">${escapeHtml(post.author.role)}</div>
              <p class="author-bio-text">${escapeHtml(post.author.bio)}</p>
              <div style="display: flex; align-items: center; gap: 0.4rem; margin-top: 0.5rem; color: var(--site-sage); font-size: 0.8rem; font-weight: 600;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                <span>Verified Ai Doodle Engineering & Animation Contributor</span>
              </div>
            </div>
          </section>

          <section class="article-cta" aria-label="Try Studio Call to Action">
            <div style="display: inline-flex; align-items: center; gap: 0.4rem; color: var(--site-sage); font-weight: 600; font-size: 0.85rem; margin-bottom: 0.5rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
              <span>Try It in the Studio</span>
            </div>
            <h2 class="article-cta-title" style="font-size: 1.6rem; font-weight: 800; margin: 0 0 0.85rem; color: var(--site-ivory);">Put These Techniques Into Practice</h2>
            <p>Launch the Ai Doodle Studio now to experiment with drawing tools, vector stroke orders, and realistic hand animations. 100% free in your browser with zero install.</p>
            <a href="/" class="btn-site btn-site-primary btn-site-lg">
              Launch Ai Doodle Canvas
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
          </section>

          ${
            nextPost
              ? `
          <aside style="margin-top: 3rem; padding: 1.75rem; background: var(--site-card-bg); border: 1px solid var(--site-card-border); border-radius: var(--site-radius-lg);" aria-label="Recommended Reading">
            <h2 style="font-size: 0.8rem; color: var(--site-sage); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; margin: 0 0 0.5rem;">Next Recommended Guide</h2>
            <h3 style="font-size: 1.35rem; margin: 0 0 0.75rem;">
              <a href="/blog/${nextPost.slug}" style="color: var(--site-ivory); text-decoration: none;">${escapeHtml(nextPost.title)}</a>
            </h3>
            <p style="font-size: 0.92rem; color: var(--site-text-muted); margin: 0 0 1.25rem;">${escapeHtml(nextPost.summary)}</p>
            <a href="/blog/${nextPost.slug}" class="btn-site btn-site-outline btn-site-sm">
              Read Next Guide
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
          </aside>`
              : ''
          }
        </article>
      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

function renderBlogIndexHtml(): string {
  const clusterNames = ['All', 'Tools', 'Tutorials', 'Workflows', 'Use Cases', 'Troubleshooting'];

  return `
  <div class="site-wrapper">
    ${renderHeader('/blog')}
    <main class="site-main">
      <div class="site-container">
        <nav class="site-breadcrumbs" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Blog</span>
        </nav>

        <section class="site-hero">
          <div class="site-hero-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <span>Articles & Insights</span>
          </div>
          <h1 class="site-hero-title">The Whiteboard Animation & AI Doodle Journal</h1>
          <p class="site-hero-desc">
            Deep dive into vector illustration workflows, prompt engineering, audio synchronization, and visual storytelling strategies for creators, educators, and marketers.
          </p>

          <div style="max-width: 480px; margin: 1.5rem auto 0; position: relative;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--site-text-dim);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search guides, prompt tips, and tutorials..." class="form-input" style="padding-left: 2.6rem;" aria-label="Search articles" readonly />
          </div>

          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; margin-top: 1.5rem; align-items: center;">
            <span style="font-size: 0.8rem; color: var(--site-text-dim); display: inline-flex; align-items: center; gap: 0.3rem; margin-right: 0.25rem;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              Clusters:
            </span>
            ${clusterNames.map((name, i) => `<button type="button" class="btn-site btn-site-sm ${i === 0 ? 'btn-site-primary' : 'btn-site-outline'}">${name}</button>`).join('\n')}
          </div>
        </section>

        <section style="margin: 2.5rem 0;" aria-label="Articles Grid">
          <h2 class="visually-hidden">Articles Catalog</h2>
          <div class="site-grid site-grid-2">
            ${BLOG_POSTS.map(
              (post) => `
              <article class="site-card">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
                  <span class="blog-tag" style="background: rgba(183, 91, 72, 0.2); border-color: var(--site-terracotta); color: var(--site-ivory);">${escapeHtml(post.category)}</span>
                  ${post.tags.slice(0, 2).map((t) => `<span class="blog-tag">${escapeHtml(t)}</span>`).join(' ')}
                  <span style="font-size: 0.8rem; color: var(--site-text-dim); margin-left: auto; display: flex; align-items: center; gap: 0.25rem;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    ${escapeHtml(post.readTime)}
                  </span>
                </div>
                <h3 style="font-size: 1.35rem; font-weight: 700; margin: 0 0 0.75rem; line-height: 1.3;">
                  <a href="/blog/${post.slug}" style="color: var(--site-ivory); text-decoration: none;">${escapeHtml(post.title)}</a>
                </h3>
                <p class="site-card-text">${escapeHtml(post.summary)}</p>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 1.25rem; border-top: 1px solid var(--site-card-border);">
                  <div style="display: flex; align-items: center; gap: 0.6rem;">
                    <div class="blog-author-avatar" style="width: 32px; height: 32px; font-size: 0.75rem;">${escapeHtml(post.author.avatar)}</div>
                    <div style="font-size: 0.8rem;">
                      <span style="color: var(--site-ivory); font-weight: 600; display: block;">${escapeHtml(post.author.name)}</span>
                      <time datetime="${post.publishDate}" itemprop="datePublished" style="color: var(--site-text-dim);">${escapeHtml(post.displayPublishDate)}</time>
                    </div>
                  </div>
                  <a href="/blog/${post.slug}" class="btn-site btn-site-outline btn-site-sm">Read Guide <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
                </div>
              </article>`,
            ).join('\n')}
          </div>
        </section>

        <section class="article-cta" aria-label="Interactive Studio CTA">
          <div style="display: inline-flex; align-items: center; gap: 0.4rem; color: var(--site-sage); font-weight: 600; font-size: 0.85rem; margin-bottom: 0.5rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
            <span>Interactive Whiteboard Studio</span>
          </div>
          <h2 class="article-cta-title" style="font-size: 1.6rem; font-weight: 800; margin: 0 0 0.85rem; color: var(--site-ivory);">Turn Ideas Into Motion Instantly</h2>
          <p>Experience the tools discussed in these articles firsthand. Test vector hand animation and audio synchronization in your browser right now.</p>
          <a href="/" class="btn-site btn-site-primary btn-site-lg">
            Launch Ai Doodle Tool
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </section>
      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

function renderHowItWorksHtml(): string {
  return `
  <div class="site-wrapper">
    ${renderHeader('/how-it-works')}
    <main class="site-main">
      <div class="site-container">
        <nav class="site-breadcrumbs" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">How It Works</span>
        </nav>

        <section class="site-hero">
          <div class="site-hero-badge">Step-by-Step Architecture</div>
          <h1 class="site-hero-title">How Ai Doodle Works: From Thought to 4K Animation</h1>
          <p class="site-hero-desc">
            Explore the technology powering our in-browser vector animation engine: AI storyboards, cubic Bézier stroke ordering, realistic drawing hand kinematics, and local WebCodecs video rendering.
          </p>
        </section>

        <article class="blog-content" style="max-width: 820px; margin: 0 auto;">
          <h2>1. Concept & Story Generation</h2>
          <p>Ai Doodle begins with your narrative prompt. Our language model outlines a multi-scene storyboard, generating synchronized voiceover narration scripts and contextual scene metaphors.</p>

          <h2>2. Vector Linework & Stroke Progression</h2>
          <p>Instead of generating static pixel rasters, Ai Doodle constructs mathematical vector paths. Each stroke is classified by depth, contour hierarchy, and natural hand drawing order.</p>

          <h2>3. Realistic Hand Dynamics & Sound Synthesis</h2>
          <p>A simulated human hand glides across the canvas, realistically tracking each Bézier path. Tactile chalk or pen-scratch sound effects synchronize with the velocity of the stroke.</p>

          <h2>4. In-Browser 4K Video Encoding</h2>
          <p>Rendering runs 100% locally on your computer via the WebCodecs API and Mediabunny engine. No data leaves your machine, ensuring total privacy and instant downloads.</p>

          <div class="article-cta" style="margin-top: 3rem;">
            <h3>Ready to Experience It?</h3>
            <p>Launch the studio and start creating your first whiteboard explainer video right now.</p>
            <a href="/" class="btn-site btn-site-primary btn-site-lg">Open Canvas Studio</a>
          </div>
        </article>
      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

function renderSimplePageHtml(title: string, subtitle: string, bodyContent: string): string {
  return `
  <div class="site-wrapper">
    ${renderHeader('')}
    <main class="site-main">
      <div class="site-container">
        <section class="site-hero">
          <h1 class="site-hero-title">${escapeHtml(title)}</h1>
          <p class="site-hero-desc">${escapeHtml(subtitle)}</p>
        </section>
        <article class="blog-content" style="max-width: 820px; margin: 0 auto; background: var(--site-card-bg); padding: 2.5rem; border-radius: var(--site-radius-lg); border: 1px solid var(--site-card-border);">
          ${bodyContent}
        </article>
      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

function buildPages(): PageMeta[] {
  const pages: PageMeta[] = [];

  // 1. Blog Index
  pages.push({
    path: '/blog',
    title: 'Blog & Educational Guides — Whiteboard Art & AI Animation | Ai Doodle',
    description: 'Explore practical guides, prompt writing techniques, whiteboard animation tutorials, and tips for creating engaging hand-drawn doodle videos with Ai Doodle.',
    canonical: `${SITE_URL}/blog`,
    type: 'website',
    publishedTime: '2026-10-18T00:00:00Z',
    modifiedTime: '2026-10-22T00:00:00Z',
    schemas: [
      {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: 'Ai Doodle Blog & Guides',
        description: 'Educational articles and tutorials on AI doodle art, prompt crafting, and whiteboard animation.',
        url: `${SITE_URL}/blog`,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
        ],
      },
    ],
    renderHtml: renderBlogIndexHtml,
  });

  // 2. How It Works
  pages.push({
    path: '/how-it-works',
    title: 'How Ai Doodle Works — In-Browser Whiteboard Animation Engine | Ai Doodle',
    description: 'Discover the technical architecture behind Ai Doodle: vector stroke ordering, hand kinematics, audio-visual synchronization, and local 4K WebCodecs video export.',
    canonical: `${SITE_URL}/how-it-works`,
    type: 'website',
    publishedTime: '2026-10-18T00:00:00Z',
    modifiedTime: '2026-10-22T00:00:00Z',
    schemas: [
      {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'How to Create Whiteboard Animation Videos with Ai Doodle',
        description: 'Step-by-step process of turning text prompts into synchronized whiteboard animation videos.',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'How It Works', item: `${SITE_URL}/how-it-works` },
        ],
      },
    ],
    renderHtml: renderHowItWorksHtml,
  });

  // 3. Blog Posts (All 10 Cluster Articles)
  for (const post of BLOG_POSTS) {
    const pubIso = `${post.publishDate}T00:00:00Z`;
    const modIso = `${post.updatedDate}T00:00:00Z`;

    const postSchemas: Record<string, unknown>[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.metaDescription,
        datePublished: pubIso,
        dateModified: modIso,
        mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
        author: {
          '@type': 'Person',
          name: post.author.name,
          jobTitle: post.author.role,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Ai Doodle',
          url: SITE_URL,
          logo: {
            '@type': 'ImageObject',
            url: `${SITE_URL}/brand/logomark.svg`,
          },
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
        ],
      },
    ];

    if (post.faqs && post.faqs.length > 0) {
      postSchemas.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      });
    }

    pages.push({
      path: `/blog/${post.slug}`,
      title: post.metaTitle,
      description: post.metaDescription,
      canonical: `${SITE_URL}/blog/${post.slug}`,
      type: 'article',
      publishedTime: pubIso,
      modifiedTime: modIso,
      author: post.author.name,
      schemas: postSchemas,
      renderHtml: () => renderBlogPostHtml(post),
    });
  }

  // 4. About Us
  pages.push({
    path: '/about',
    title: 'About Ai Doodle — Mission, Technology & Team | Ai Doodle',
    description: 'Learn about Ai Doodle, our mission to make whiteboard explainer animation accessible to every educator, marketer, and creator worldwide.',
    canonical: `${SITE_URL}/about`,
    type: 'website',
    publishedTime: '2026-10-18T00:00:00Z',
    modifiedTime: '2026-10-22T00:00:00Z',
    schemas: [
      {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: 'About Ai Doodle',
        url: `${SITE_URL}/about`,
      },
    ],
    renderHtml: () =>
      renderSimplePageHtml(
        'About Ai Doodle',
        'Empowering everyone to communicate complex ideas through hand-drawn motion.',
        `<p>Ai Doodle was founded with a clear mission: remove the friction, prohibitive costs, and technical barriers of professional whiteboard animation.</p>
        <h2>Our Philosophy</h2>
        <p>Visual storytelling should be spontaneous, accessible, and enjoyable. By marrying generative visual modeling with mathematical vector stroke synthesis, we enable anyone to produce broadcast-quality explainer animations in seconds.</p>
        <h2>In-Browser Privacy First</h2>
        <p>Unlike traditional cloud video tools that upload your intellectual property to remote rendering farms, Ai Doodle executes vector computation and video encoding directly in your browser using modern WebCodecs standards.</p>`,
      ),
  });

  // 5. Contact Us
  pages.push({
    path: '/contact',
    title: 'Contact Support & Inquiries | Ai Doodle',
    description: 'Get in touch with the Ai Doodle engineering and creative team. Inquire about partnerships, report technical issues, or request custom features.',
    canonical: `${SITE_URL}/contact`,
    type: 'website',
    publishedTime: '2026-10-18T00:00:00Z',
    modifiedTime: '2026-10-22T00:00:00Z',
    schemas: [
      {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: 'Contact Ai Doodle',
        url: `${SITE_URL}/contact`,
      },
    ],
    renderHtml: () =>
      renderSimplePageHtml(
        'Contact Our Team',
        'We would love to hear from you. Reach out with feedback, inquiries, or support requests.',
        `<p>Have a question about our vector drawing pipeline, education pricing, or commercial licensing? Drop us a note anytime.</p>
        <p>Email: <a href="mailto:support@ai-doodle.vercel.app">support@ai-doodle.vercel.app</a></p>
        <p>We typically respond within 24 business hours.</p>`,
      ),
  });

  // 6. Privacy Policy
  pages.push({
    path: '/privacy-policy',
    title: 'Privacy Policy | Ai Doodle',
    description: 'Read the Ai Doodle privacy policy. Learn how we handle your project data, client-side rendering privacy, and cookies.',
    canonical: `${SITE_URL}/privacy-policy`,
    type: 'website',
    publishedTime: '2026-10-18T00:00:00Z',
    modifiedTime: '2026-10-22T00:00:00Z',
    schemas: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Ai Doodle Privacy Policy' }],
    renderHtml: () =>
      renderSimplePageHtml(
        'Privacy Policy',
        'Your privacy is fundamental to our architecture.',
        `<p>At Ai Doodle, we respect your privacy. All video rendering is processed locally on your client machine using the WebCodecs API.</p>
        <h2>Data We Collect</h2>
        <p>We do not store your private doodle project contents, audio recordings, or exported video files on our servers without your explicit action.</p>`,
      ),
  });

  // 7. Terms of Service
  pages.push({
    path: '/terms-of-service',
    title: 'Terms of Service | Ai Doodle',
    description: 'Read our terms of service, commercial usage rights, and platform policies.',
    canonical: `${SITE_URL}/terms-of-service`,
    type: 'website',
    publishedTime: '2026-10-18T00:00:00Z',
    modifiedTime: '2026-10-22T00:00:00Z',
    schemas: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Ai Doodle Terms of Service' }],
    renderHtml: () =>
      renderSimplePageHtml(
        'Terms of Service',
        'Clear terms for creators and organizations.',
        `<p>You retain full ownership of the artwork, videos, and scripts you create using Ai Doodle. You are free to monetize and distribute your exports commercially.</p>`,
      ),
  });

  // 8. Cookie Policy
  pages.push({
    path: '/cookie-policy',
    title: 'Cookie Policy | Ai Doodle',
    description: 'Information regarding the cookies and local storage tokens used on Ai Doodle.',
    canonical: `${SITE_URL}/cookie-policy`,
    type: 'website',
    publishedTime: '2026-10-18T00:00:00Z',
    modifiedTime: '2026-10-22T00:00:00Z',
    schemas: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Ai Doodle Cookie Policy' }],
    renderHtml: () =>
      renderSimplePageHtml(
        'Cookie Policy',
        'Transparency regarding cookies and local storage.',
        `<p>We use essential local storage to remember your canvas preferences, recent color palettes, and editor layout choices. Advertising cookies are consent-managed in compliance with global standards.</p>`,
      ),
  });

  return pages;
}

export function prerenderAll() {
  const templatePath = path.join(DIST, 'index.html');
  if (!existsSync(templatePath)) {
    console.error(`Error: ${templatePath} not found. Run "vite build" first.`);
    process.exit(1);
  }

  const rawTemplate = readFileSync(templatePath, 'utf8');
  const pages = buildPages();

  console.log(`\nPrerendering ${pages.length} public pages for SEO & AI Crawlers...\n`);

  for (const page of pages) {
    let html = rawTemplate;

    // 1. Replace Title
    html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);

    // 2. Replace Description
    html = html.replace(
      /<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(page.description)}" />`,
    );

    // 3. Replace Canonical
    html = html.replace(
      /<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i,
      `<link rel="canonical" href="${page.canonical}" />`,
    );

    // 4. Update Open Graph & Twitter Cards
    html = html.replace(
      /<meta\s+property=["']og:title["']\s+content=["'][^"']*["']\s*\/?>/i,
      `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    );
    html = html.replace(
      /<meta\s+property=["']og:description["']\s+content=["'][^"']*["']\s*\/?>/i,
      `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    );
    html = html.replace(
      /<meta\s+property=["']og:url["']\s+content=["'][^"']*["']\s*\/?>/i,
      `<meta property="og:url" content="${page.canonical}" />`,
    );
    html = html.replace(
      /<meta\s+property=["']og:type["']\s+content=["'][^"']*["']\s*\/?>/i,
      `<meta property="og:type" content="${page.type ?? 'website'}" />`,
    );
    html = html.replace(
      /<meta\s+name=["']twitter:title["']\s+content=["'][^"']*["']\s*\/?>/i,
      `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`,
    );
    html = html.replace(
      /<meta\s+name=["']twitter:description["']\s+content=["'][^"']*["']\s*\/?>/i,
      `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`,
    );

    // 5. Clean template fallback date tags and inject page-specific Published & Modified Dates
    html = html.replace(/<meta\s+name=["'](publish-date|modified-date|date|revised)["'][^>]*>\s*/gi, '');
    const dateMetaTags = [];
    if (page.publishedTime) {
      dateMetaTags.push(`<meta property="article:published_time" content="${page.publishedTime}" />`);
      dateMetaTags.push(`<meta name="publish-date" content="${page.publishedTime.slice(0, 10)}" />`);
      dateMetaTags.push(`<meta name="pubdate" content="${page.publishedTime.slice(0, 10)}" />`);
      dateMetaTags.push(`<meta name="date" content="${page.publishedTime.slice(0, 10)}" />`);
    }
    if (page.modifiedTime) {
      dateMetaTags.push(`<meta property="article:modified_time" content="${page.modifiedTime}" />`);
      dateMetaTags.push(`<meta property="og:updated_time" content="${page.modifiedTime}" />`);
      dateMetaTags.push(`<meta name="modified-date" content="${page.modifiedTime.slice(0, 10)}" />`);
      dateMetaTags.push(`<meta name="revised" content="${page.modifiedTime.slice(0, 10)}" />`);
      dateMetaTags.push(`<meta name="last-modified" content="${page.modifiedTime.slice(0, 10)}" />`);
    }
    if (page.author) {
      dateMetaTags.push(`<meta property="article:author" content="${escapeHtml(page.author)}" />`);
      dateMetaTags.push(`<meta name="author" content="${escapeHtml(page.author)}" />`);
    }

    if (dateMetaTags.length > 0) {
      html = html.replace('</head>', `    ${dateMetaTags.join('\n    ')}\n  </head>`);
    }

    // 6. Replace Schema.org Structured Data
    const schemasHtml = page.schemas
      .map((s) => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`)
      .join('\n');
    html = html.replace(
      /<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/i,
      schemasHtml,
    );

    // 7. Pre-render HTML inside <div id="root">
    const bodyContent = page.renderHtml();
    html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${bodyContent}</div>`);

    // 8. Write to dist/<path>/index.html
    const targetDir = path.join(DIST, page.path.replace(/^\//, ''));
    mkdirSync(targetDir, { recursive: true });
    const targetFile = path.join(targetDir, 'index.html');
    writeFileSync(targetFile, html, 'utf8');

    console.log(`  ✓ ${page.path} -> ${path.relative(ROOT, targetFile)}`);
  }

  console.log(`\nSuccessfully prerendered ${pages.length} pages.`);
}

prerenderAll();
