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

function renderHeader(activePath: string): string {
  return `
  <header class="site-header">
    <div class="site-container site-header-inner">
      <a href="/" class="site-brand" aria-label="Ai Doodle Homepage">
        <svg class="site-brand-icon" viewBox="0 0 40 40" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="20" cy="20" r="16" stroke="rgba(183, 91, 72, 0.45)" fill="rgba(183, 91, 72, 0.15)"></circle>
          <path d="M12 24 C14 14, 20 14, 28 20 C24 28, 16 28, 12 24" stroke="#B75B48" stroke-width="2.6"></path>
          <circle cx="28" cy="20" r="2.5" fill="#E8ECD6"></circle>
        </svg>
        <span class="site-brand-text">Ai Doodle</span>
      </a>
      <nav class="site-nav" aria-label="Main Navigation">
        <a href="/" class="site-nav-link ${activePath === '/' ? 'active' : ''}">Canvas Studio</a>
        <a href="/how-it-works" class="site-nav-link ${activePath === '/how-it-works' ? 'active' : ''}">How It Works</a>
        <a href="/blog" class="site-nav-link ${activePath.startsWith('/blog') ? 'active' : ''}">Guides & Blog</a>
        <a href="/about" class="site-nav-link ${activePath === '/about' ? 'active' : ''}">About</a>
      </nav>
      <div class="site-actions">
        <a href="/" class="btn-3d btn-3d-primary btn-3d-sm">Launch Studio</a>
      </div>
    </div>
  </header>`;
}

function renderFooter(): string {
  return `
  <footer class="site-footer">
    <div class="site-container site-footer-inner">
      <div class="site-footer-col">
        <div class="site-brand" style="margin-bottom: 0.75rem;">
          <span class="site-brand-text" style="font-size: 1.15rem;">Ai Doodle</span>
        </div>
        <p class="site-footer-text">
          Browser-native AI whiteboard animation and vector doodle explainer studio. 100% free with hardware-accelerated 4K export.
        </p>
      </div>
      <div class="site-footer-col">
        <h4 class="site-footer-heading">Features</h4>
        <ul class="site-footer-links">
          <li><a href="/">Blank Drawing Canvas</a></li>
          <li><a href="/how-it-works">How It Works</a></li>
          <li><a href="/blog">Educational Guides</a></li>
          <li><a href="/blog/how-to-use-ai-doodle-generator">AI Doodle Generator</a></li>
        </ul>
      </div>
      <div class="site-footer-col">
        <h4 class="site-footer-heading">Topic Clusters</h4>
        <ul class="site-footer-links">
          <li><a href="/blog/turn-sketches-into-ai-art">Sketch to Vector AI</a></li>
          <li><a href="/blog/doodle-art-ideas-drawing-prompts">100+ Doodle Prompts</a></li>
          <li><a href="/blog/whiteboard-animation-for-education">Classroom Animation</a></li>
          <li><a href="/blog/save-and-download-doodles">Exporting 4K Videos</a></li>
        </ul>
      </div>
      <div class="site-footer-col">
        <h4 class="site-footer-heading">Trust & Legal</h4>
        <ul class="site-footer-links">
          <li><a href="/about">About Us</a></li>
          <li><a href="/contact">Contact Support</a></li>
          <li><a href="/privacy-policy">Privacy Policy</a></li>
          <li><a href="/terms-of-service">Terms of Service</a></li>
          <li><a href="/cookie-policy">Cookie Policy</a></li>
        </ul>
      </div>
    </div>
    <div class="site-container site-footer-bottom">
      <p>© ${new Date().getFullYear()} Ai Doodle Studio. All rights reserved.</p>
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
      <h2 class="faq-section-title">Frequently Asked Questions</h2>
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
            <span>${escapeHtml(post.readTime)}</span>
            <span>Published ${escapeHtml(post.publishDate)}</span>
          </div>

          <h1 class="blog-title">${escapeHtml(post.title)}</h1>
          <p class="blog-summary-lead">${escapeHtml(post.summary)}</p>

          <div class="blog-author-bar">
            <div class="blog-author-avatar">${escapeHtml(post.author.avatar)}</div>
            <div>
              <div class="blog-author-name">${escapeHtml(post.author.name)}</div>
              <div class="blog-author-role">${escapeHtml(post.author.role)}</div>
            </div>
          </div>
        </header>

        <aside class="geo-direct-answer" aria-label="Quick Summary & Direct Answer">
          <div class="geo-direct-answer-header">
            <span>Quick Answer & Key Definition</span>
          </div>
          <p class="geo-direct-answer-body">${escapeHtml(post.directAnswer)}</p>
        </aside>

        ${
          post.keyTakeaways && post.keyTakeaways.length > 0
            ? `
        <section class="key-takeaways-box" aria-label="Key Takeaways">
          <div class="key-takeaways-title">Core Takeaways</div>
          <ul class="key-takeaways-list">
            ${post.keyTakeaways.map((t) => `<li><span>${escapeHtml(t)}</span></li>`).join('\n')}
          </ul>
        </section>`
            : ''
        }

        ${
          tocItems.length > 2
            ? `
        <nav class="table-of-contents" aria-label="Table of Contents">
          <div class="toc-title">In This Guide</div>
          <ul class="toc-list">
            ${tocItems.map((item) => `<li><a href="#${item.id}">${escapeHtml(item.text)}</a></li>`).join('\n')}
            ${post.faqs && post.faqs.length > 0 ? `<li><a href="#frequently-asked-questions">Frequently Asked Questions</a></li>` : ''}
          </ul>
        </nav>`
            : ''
        }

        <article class="blog-content">
          ${processedSections}
          ${faqsHtml}

          <section class="author-bio-card" aria-label="Author Profile">
            <div class="author-bio-avatar">${escapeHtml(post.author.avatar)}</div>
            <div class="author-bio-content">
              <h4>Written by ${escapeHtml(post.author.name)}</h4>
              <div class="author-bio-role">${escapeHtml(post.author.role)}</div>
              <p class="author-bio-text">${escapeHtml(post.author.bio)}</p>
            </div>
          </section>

          <div class="article-cta">
            <div style="color: var(--site-sage); font-weight: 600; font-size: 0.85rem; margin-bottom: 0.5rem;">Interactive Whiteboard Studio</div>
            <h3>Put These Techniques Into Practice</h3>
            <p>Launch the Ai Doodle Studio now to experiment with drawing tools, vector stroke orders, and realistic hand animations. 100% free in your browser with zero install.</p>
            <a href="/" class="btn-site btn-site-primary btn-site-lg">Launch Ai Doodle Canvas</a>
          </div>
        </article>
      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

function renderBlogIndexHtml(): string {
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
          <div class="site-hero-badge">Articles & Insights</div>
          <h1 class="site-hero-title">The Whiteboard Animation & AI Doodle Journal</h1>
          <p class="site-hero-desc">
            Deep dive into vector illustration workflows, prompt engineering, audio synchronization, and visual storytelling strategies for creators, educators, and marketers.
          </p>
        </section>

        <section style="margin: 2.5rem 0;">
          <div class="site-grid site-grid-2">
            ${BLOG_POSTS.map(
              (post) => `
              <article class="site-card">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
                  <span class="blog-tag" style="background: rgba(183, 91, 72, 0.2); border-color: var(--site-terracotta); color: var(--site-ivory);">${escapeHtml(post.category)}</span>
                  ${post.tags.slice(0, 2).map((t) => `<span class="blog-tag">${escapeHtml(t)}</span>`).join(' ')}
                  <span style="font-size: 0.8rem; color: var(--site-text-dim); margin-left: auto;">${escapeHtml(post.readTime)}</span>
                </div>
                <h2 style="font-size: 1.35rem; font-weight: 700; margin: 0 0 0.75rem; line-height: 1.3;">
                  <a href="/blog/${post.slug}" style="color: var(--site-ivory); text-decoration: none;">${escapeHtml(post.title)}</a>
                </h2>
                <p class="site-card-text">${escapeHtml(post.summary)}</p>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 1.25rem; border-top: 1px solid var(--site-card-border);">
                  <div style="display: flex; align-items: center; gap: 0.6rem;">
                    <div class="blog-author-avatar" style="width: 32px; height: 32px; font-size: 0.75rem;">${escapeHtml(post.author.avatar)}</div>
                    <div style="font-size: 0.8rem;">
                      <span style="color: var(--site-ivory); font-weight: 600; display: block;">${escapeHtml(post.author.name)}</span>
                      <span style="color: var(--site-text-dim);">${escapeHtml(post.publishDate)}</span>
                    </div>
                  </div>
                  <a href="/blog/${post.slug}" class="btn-site btn-site-outline btn-site-sm">Read Guide</a>
                </div>
              </article>`,
            ).join('\n')}
          </div>
        </section>

        <section class="article-cta">
          <div style="color: var(--site-sage); font-weight: 600; font-size: 0.85rem; margin-bottom: 0.5rem;">Interactive Whiteboard Studio</div>
          <h3>Turn Ideas Into Motion Instantly</h3>
          <p>Experience the tools discussed in these articles firsthand. Test vector hand animation and audio synchronization in your browser right now.</p>
          <a href="/" class="btn-site btn-site-primary btn-site-lg">Launch Ai Doodle Tool</a>
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
    const postSchemas: Record<string, unknown>[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.metaDescription,
        datePublished: post.publishDate,
        dateModified: post.updatedDate,
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
      publishedTime: post.publishDate,
      modifiedTime: post.updatedDate,
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

    // 5. Replace Schema.org Structured Data
    const schemasHtml = page.schemas
      .map((s) => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`)
      .join('\n');
    html = html.replace(
      /<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/i,
      schemasHtml,
    );

    // 6. Pre-render HTML inside <div id="root">
    const bodyContent = page.renderHtml();
    html = html.replace('<div id="root"></div>', `<div id="root">${bodyContent}</div>`);

    // 7. Write to dist/<path>/index.html
    const targetDir = path.join(DIST, page.path.replace(/^\//, ''));
    mkdirSync(targetDir, { recursive: true });
    const targetFile = path.join(targetDir, 'index.html');
    writeFileSync(targetFile, html, 'utf8');

    console.log(`  ✓ ${page.path} -> ${path.relative(ROOT, targetFile)}`);
  }

  console.log(`\nSuccessfully prerendered ${pages.length} pages.`);
}

prerenderAll();
