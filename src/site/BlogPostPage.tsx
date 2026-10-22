import { useEffect } from 'react';
import { SiteLayout } from './SiteLayout';
import { Link } from '../Link';
import { AdSlot } from './AdSlot';
import { BLOG_POSTS } from './blogData';
import { updateDocumentMeta } from './seo';
import { NotFoundPage } from './NotFoundPage';
import {
  Clock,
  Calendar,
  ArrowRight,
  Sparkles,
  Share2,
  Zap,
  CheckCircle,
  HelpCircle,
  List,
  UserCheck,
} from 'lucide-react';

interface BlogPostPageProps {
  slug: string;
}

export function BlogPostPage({ slug }: BlogPostPageProps) {
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  useEffect(() => {
    if (post) {
      // 1. BlogPosting Schema
      const blogPostingSchema = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.metaDescription,
        datePublished: post.publishDate,
        dateModified: post.updatedDate,
        mainEntityOfPage: `https://ai-doodle.vercel.app/blog/${post.slug}`,
        author: {
          '@type': 'Person',
          name: post.author.name,
          jobTitle: post.author.role,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Ai Doodle',
          url: 'https://ai-doodle.vercel.app',
          logo: {
            '@type': 'ImageObject',
            url: 'https://ai-doodle.vercel.app/brand/logomark.svg',
          },
        },
      };

      // 2. BreadcrumbList Schema
      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://ai-doodle.vercel.app/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Blog',
            item: 'https://ai-doodle.vercel.app/blog',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: post.title,
            item: `https://ai-doodle.vercel.app/blog/${post.slug}`,
          },
        ],
      };

      // 3. FAQPage Schema (if article has FAQs)
      const faqSchema =
        post.faqs && post.faqs.length > 0
          ? {
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
            }
          : null;

      const structuredData = faqSchema
        ? [blogPostingSchema, breadcrumbSchema, faqSchema]
        : [blogPostingSchema, breadcrumbSchema];

      updateDocumentMeta({
        title: post.metaTitle,
        description: post.metaDescription,
        canonicalPath: `/blog/${post.slug}`,
        type: 'article',
        publishedTime: post.publishDate,
        modifiedTime: post.updatedDate,
        author: post.author.name,
        structuredData,
      });
    }
  }, [post]);

  if (!post) {
    return <NotFoundPage />;
  }

  // Find related articles in the same category or adjacent
  const otherPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug);
  const nextPost = otherPosts.find((p) => p.category === post.category) || otherPosts[0];

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: post.title,
          text: post.summary,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // Extract table of contents from H2 headings in content
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

  return (
    <SiteLayout>
      <div className="site-container">
        {/* Breadcrumb Navigation */}
        <nav className="site-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/blog">Blog</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{post.title}</span>
        </nav>

        {/* Article Header */}
        <header className="blog-header">
          <div className="blog-meta">
            <span
              className="blog-tag"
              style={{
                background: 'rgba(183, 91, 72, 0.25)',
                color: 'var(--site-ivory)',
                borderColor: 'var(--site-terracotta)',
              }}
            >
              {post.category}
            </span>
            {post.tags.map((tag) => (
              <span key={tag} className="blog-tag">
                {tag}
              </span>
            ))}
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={14} />
              {post.readTime}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={14} />
              Published {post.publishDate}
            </span>
          </div>

          <h1 className="blog-title">{post.title}</h1>
          <p className="blog-summary-lead">{post.summary}</p>

          <div className="blog-author-bar">
            <div className="blog-author-avatar">{post.author.avatar}</div>
            <div>
              <div className="blog-author-name">{post.author.name}</div>
              <div className="blog-author-role">{post.author.role}</div>
            </div>
            <button
              type="button"
              className="btn-site btn-site-outline btn-site-sm"
              style={{ marginLeft: 'auto' }}
              onClick={handleShare}
              aria-label="Share article link"
            >
              <Share2 size={14} />
              <span>Share</span>
            </button>
          </div>
        </header>

        {/* Top AdSlot */}
        <AdSlot slotId={`blog-${post.slug}-top`} format="horizontal" />

        {/* GEO Direct Answer Callout */}
        {post.directAnswer && (
          <aside className="geo-direct-answer" aria-label="Quick Summary & Direct Answer">
            <div className="geo-direct-answer-header">
              <Zap size={16} />
              <span>Quick Answer & Key Definition</span>
            </div>
            <p className="geo-direct-answer-body">{post.directAnswer}</p>
          </aside>
        )}

        {/* Key Takeaways Box */}
        {post.keyTakeaways && post.keyTakeaways.length > 0 && (
          <section className="key-takeaways-box" aria-label="Key Takeaways">
            <div className="key-takeaways-title">
              <CheckCircle size={18} />
              <span>Core Takeaways</span>
            </div>
            <ul className="key-takeaways-list">
              {post.keyTakeaways.map((takeaway, idx) => (
                <li key={idx}>
                  <CheckCircle size={15} />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Table of Contents */}
        {tocItems.length > 2 && (
          <nav className="table-of-contents" aria-label="Table of Contents">
            <div className="toc-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <List size={14} />
              <span>In This Guide</span>
            </div>
            <ul className="toc-list">
              {tocItems.map((item, idx) => (
                <li key={idx}>
                  <a href={`#${item.id}`}>{item.text}</a>
                </li>
              ))}
              {post.faqs && post.faqs.length > 0 && (
                <li>
                  <a href="#frequently-asked-questions">Frequently Asked Questions</a>
                </li>
              )}
            </ul>
          </nav>
        )}

        {/* Main Article Body */}
        <article className="blog-content">
          {post.content.map((sectionHtml, idx) => {
            // Automatically inject IDs onto H2 headings so TOC anchors work
            const headingMatch = sectionHtml.match(/<h2[^>]*>(.*?)<\/h2>/i);
            let processedHtml = sectionHtml;
            if (headingMatch) {
              const headingText = headingMatch[1].replace(/<[^>]+>/g, '').trim();
              const id = headingText
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
              processedHtml = sectionHtml.replace(
                /<h2([^>]*)>/i,
                `<h2 id="${id}"$1>`,
              );
            }

            return (
              <div
                key={idx}
                dangerouslySetInnerHTML={{ __html: processedHtml }}
              />
            );
          })}

          {/* In-Article AdSlot */}
          <AdSlot slotId={`blog-${post.slug}-mid`} format="in-article" />

          {/* AEO Frequently Asked Questions Section */}
          {post.faqs && post.faqs.length > 0 && (
            <section className="faq-section" id="frequently-asked-questions">
              <h2 className="faq-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HelpCircle size={22} style={{ color: 'var(--site-terracotta)' }} />
                Frequently Asked Questions
              </h2>
              <p className="faq-section-desc">
                Clear, direct answers to common questions about this topic and Ai Doodle workflows.
              </p>
              <div className="faq-grid">
                {post.faqs.map((faq, idx) => (
                  <div key={idx} className="faq-card">
                    <h3>{faq.question}</h3>
                    <p>{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* E-E-A-T Author Bio Card */}
          <section className="author-bio-card" aria-label="Author Profile">
            <div className="author-bio-avatar">{post.author.avatar}</div>
            <div className="author-bio-content">
              <h4>Written by {post.author.name}</h4>
              <div className="author-bio-role">{post.author.role}</div>
              <p className="author-bio-text">{post.author.bio}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', color: 'var(--site-sage)', fontSize: '0.8rem', fontWeight: 600 }}>
                <UserCheck size={14} />
                <span>Verified Ai Doodle Engineering & Animation Contributor</span>
              </div>
            </div>
          </section>

          {/* Interactive Core Tool CTA */}
          <div className="article-cta">
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'var(--site-sage)',
                fontWeight: 600,
                fontSize: '0.85rem',
                marginBottom: '0.5rem',
              }}
            >
              <Sparkles size={16} />
              <span>Try It in the Studio</span>
            </div>
            <h3>Put These Techniques Into Practice</h3>
            <p>
              Launch the Ai Doodle Studio now to experiment with drawing tools, vector stroke orders, and realistic hand animations. 100% free in your browser with zero install.
            </p>
            <Link href="/" className="btn-site btn-site-primary btn-site-lg">
              Launch Ai Doodle Canvas
              <ArrowRight size={18} />
            </Link>
          </div>

          {/* Next Article Recommendation */}
          {nextPost && (
            <div
              style={{
                marginTop: '3rem',
                padding: '1.75rem',
                background: 'var(--site-card-bg)',
                border: '1px solid var(--site-card-border)',
                borderRadius: 'var(--site-radius-lg)',
              }}
            >
              <span
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--site-sage)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 700,
                }}
              >
                Next Recommended Guide
              </span>
              <h3 style={{ fontSize: '1.35rem', margin: '0.5rem 0 0.75rem' }}>
                <Link
                  href={`/blog/${nextPost.slug}`}
                  style={{ color: 'var(--site-ivory)', textDecoration: 'none' }}
                >
                  {nextPost.title}
                </Link>
              </h3>
              <p
                style={{
                  fontSize: '0.92rem',
                  color: 'var(--site-text-muted)',
                  margin: '0 0 1.25rem',
                }}
              >
                {nextPost.summary}
              </p>
              <Link
                href={`/blog/${nextPost.slug}`}
                className="btn-site btn-site-outline btn-site-sm"
              >
                Read Next Guide
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </article>

        {/* Bottom AdSlot */}
        <AdSlot slotId={`blog-${post.slug}-bottom`} format="horizontal" />
      </div>
    </SiteLayout>
  );
}
