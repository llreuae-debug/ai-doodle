import { useEffect, useState } from 'react';
import { SiteLayout } from './SiteLayout';
import { Link } from '../Link';
import { AdSlot } from './AdSlot';
import { BLOG_POSTS, type BlogPost } from './blogData';
import { updateDocumentMeta } from './seo';
import { BookOpen, Clock, Search, ArrowRight, Sparkles, Filter } from 'lucide-react';

export function BlogIndexPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    updateDocumentMeta({
      title: 'Blog & Educational Guides — Whiteboard Art & AI Animation',
      description: 'Explore practical guides, prompt writing techniques, whiteboard animation tutorials, and tips for creating engaging hand-drawn doodle videos with Ai Doodle.',
      canonicalPath: '/blog',
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'Ai Doodle Blog & Guides',
          description: 'Educational articles and tutorials on AI doodle art, prompt crafting, and whiteboard animation.',
          url: 'https://ai-doodle.vercel.app/blog',
          blogPost: BLOG_POSTS.map((p) => ({
            '@type': 'BlogPosting',
            headline: p.title,
            description: p.summary,
            datePublished: p.publishDate,
            dateModified: p.updatedDate,
            url: `https://ai-doodle.vercel.app/blog/${p.slug}`,
            author: {
              '@type': 'Person',
              name: p.author.name,
            },
          })),
        },
        {
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
          ],
        },
      ],
    });
  }, []);

  const categories = ['All', 'Tools', 'Tutorials', 'Workflows', 'Use Cases', 'Troubleshooting'];

  const filteredPosts = BLOG_POSTS.filter((post: BlogPost) => {
    const matchesSearch =
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.summary.toLowerCase().includes(search.toLowerCase()) ||
      post.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'All' || post.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <SiteLayout>
      <div className="site-container">
        {/* Breadcrumb */}
        <nav className="site-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Blog</span>
        </nav>

        {/* Hero */}
        <section className="site-hero">
          <div className="site-hero-badge">
            <BookOpen size={14} />
            <span>Articles & Insights</span>
          </div>
          <h1 className="site-hero-title">
            The Whiteboard Animation & AI Doodle Journal
          </h1>
          <p className="site-hero-desc">
            Deep dive into vector illustration workflows, prompt engineering, audio synchronization, and visual storytelling strategies for creators, educators, and marketers.
          </p>

          {/* Search Bar */}
          <div style={{ maxWidth: 480, margin: '1.5rem auto 0', position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--site-text-dim)',
              }}
            />
            <input
              type="text"
              placeholder="Search guides, prompt tips, and tutorials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.6rem' }}
              aria-label="Search articles"
            />
          </div>

          {/* Topic Cluster Filter Pills */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              justifyContent: 'center',
              marginTop: '1.5rem',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '0.8rem',
                color: 'var(--site-text-dim)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                marginRight: '0.25rem',
              }}
            >
              <Filter size={13} />
              Clusters:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`btn-site btn-site-sm ${selectedCategory === cat ? 'btn-site-primary' : 'btn-site-outline'}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Top AdSlot */}
        <AdSlot slotId="blog-index-top" format="horizontal" />

        {/* Article Cards Grid */}
        <section style={{ margin: '2.5rem 0' }}>
          {filteredPosts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 1rem',
                background: 'var(--site-card-bg)',
                borderRadius: 'var(--site-radius-lg)',
                border: '1px solid var(--site-card-border)',
              }}
            >
              <p
                style={{
                  color: 'var(--site-text-muted)',
                  fontSize: '1.1rem',
                  margin: '0 0 1rem',
                }}
              >
                No articles found matching "{search}".
              </p>
              <button
                type="button"
                className="btn-site btn-site-outline btn-site-sm"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All');
                }}
              >
                Clear Search Filters
              </button>
            </div>
          ) : (
            <div className="site-grid site-grid-2">
              {filteredPosts.map((post) => (
                <article key={post.slug} className="site-card">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '1rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      className="blog-tag"
                      style={{
                        background: 'rgba(183, 91, 72, 0.2)',
                        borderColor: 'var(--site-terracotta)',
                        color: 'var(--site-ivory)',
                      }}
                    >
                      {post.category}
                    </span>
                    {post.tags.slice(0, 2).map((t) => (
                      <span key={t} className="blog-tag">
                        {t}
                      </span>
                    ))}
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--site-text-dim)',
                        marginLeft: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <Clock size={13} />
                      {post.readTime}
                    </span>
                  </div>

                  <h2
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 700,
                      margin: '0 0 0.75rem',
                      lineHeight: 1.3,
                    }}
                  >
                    <Link
                      href={`/blog/${post.slug}`}
                      style={{ color: 'var(--site-ivory)', textDecoration: 'none' }}
                    >
                      {post.title}
                    </Link>
                  </h2>

                  <p className="site-card-text">{post.summary}</p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 'auto',
                      paddingTop: '1.25rem',
                      borderTop: '1px solid var(--site-card-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div
                        className="blog-author-avatar"
                        style={{ width: 32, height: 32, fontSize: '0.75rem' }}
                      >
                        {post.author.avatar}
                      </div>
                      <div style={{ fontSize: '0.8rem' }}>
                        <span
                          style={{
                            color: 'var(--site-ivory)',
                            fontWeight: 600,
                            display: 'block',
                          }}
                        >
                          {post.author.name}
                        </span>
                        <span style={{ color: 'var(--site-text-dim)' }}>
                          {post.publishDate}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/blog/${post.slug}`}
                      className="btn-site btn-site-outline btn-site-sm"
                    >
                      Read Guide
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Studio Promo Section */}
        <section className="article-cta">
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
            <span>Interactive Whiteboard Studio</span>
          </div>
          <h3>Turn Ideas Into Motion Instantly</h3>
          <p>
            Experience the tools discussed in these articles firsthand. Test vector hand animation and audio synchronization in your browser right now.
          </p>
          <Link href="/" className="btn-site btn-site-primary btn-site-lg">
            Launch Ai Doodle Tool
            <ArrowRight size={18} />
          </Link>
        </section>

        {/* Bottom AdSlot */}
        <AdSlot slotId="blog-index-bottom" format="horizontal" />
      </div>
    </SiteLayout>
  );
}
