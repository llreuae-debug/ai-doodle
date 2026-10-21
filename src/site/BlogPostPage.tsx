import { useEffect } from 'react';
import { SiteLayout } from './SiteLayout';
import { Link } from '../Link';
import { AdSlot } from './AdSlot';
import { BLOG_POSTS } from './blogData';
import { updateDocumentMeta } from './seo';
import { NotFoundPage } from './NotFoundPage';
import { Clock, Calendar, ArrowRight, Sparkles, Share2 } from 'lucide-react';

interface BlogPostPageProps {
  slug: string;
}

export function BlogPostPage({ slug }: BlogPostPageProps) {
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  useEffect(() => {
    if (post) {
      updateDocumentMeta({
        title: post.metaTitle,
        description: post.metaDescription,
        canonicalPath: `/blog/${post.slug}`,
        type: 'article',
        publishedTime: post.publishDate,
        modifiedTime: post.updatedDate,
        author: post.author.name,
        structuredData: {
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
        },
      });
    }
  }, [post]);

  if (!post) {
    return <NotFoundPage />;
  }

  // Find related articles
  const otherPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug);
  const nextPost = otherPosts[0];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.summary,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <SiteLayout>
      <div className="site-container">
        {/* Breadcrumb */}
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
              {post.publishDate}
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

        {/* Main Article Body */}
        <article className="blog-content">
          {post.content.map((sectionHtml, idx) => (
            <div
              key={idx}
              dangerouslySetInnerHTML={{ __html: sectionHtml }}
            />
          ))}

          {/* In-Article AdSlot */}
          <AdSlot slotId={`blog-${post.slug}-mid`} format="in-article" />

          {/* Interactive Core Tool CTA */}
          <div className="article-cta">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--site-primary-light)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              <Sparkles size={16} />
              <span>Try It in the Studio</span>
            </div>
            <h3>Put These Techniques Into Practice</h3>
            <p>
              Launch the Ai Doodle Studio now to experiment with drawing tools, vector stroke orders, and realistic hand animations. Free in your browser with zero install.
            </p>
            <Link href="/" className="btn-site btn-site-primary btn-site-lg">
              Launch Ai Doodle Canvas
              <ArrowRight size={18} />
            </Link>
          </div>

          {/* Next Article Card */}
          {nextPost && (
            <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'var(--site-card-bg)', border: '1px solid var(--site-card-border)', borderRadius: 'var(--site-radius-lg)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--site-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Next Recommended Guide
              </span>
              <h3 style={{ fontSize: '1.25rem', margin: '0.5rem 0 0.75rem' }}>
                <Link href={`/blog/${nextPost.slug}`} style={{ color: '#fff', textDecoration: 'none' }}>
                  {nextPost.title}
                </Link>
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--site-text-muted)', margin: '0 0 1rem' }}>
                {nextPost.summary}
              </p>
              <Link href={`/blog/${nextPost.slug}`} className="btn-site btn-site-outline btn-site-sm">
                Read Next Article
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
