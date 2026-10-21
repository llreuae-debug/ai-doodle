import { useEffect } from 'react';
import { SiteLayout } from './SiteLayout';
import { Link } from '../Link';
import { updateDocumentMeta } from './seo';
import { Compass, Sparkles, BookOpen } from 'lucide-react';

export function NotFoundPage() {
  useEffect(() => {
    updateDocumentMeta({
      title: 'Page Not Found (404) | Ai Doodle',
      description: 'The requested page could not be found. Explore our AI doodle animation studio, guides, or return to the homepage.',
      canonicalPath: '/404',
    });
  }, []);

  return (
    <SiteLayout>
      <div className="site-container">
        <section className="site-hero" style={{ padding: '5rem 0 3rem' }}>
          <div className="site-card-icon" style={{ width: 64, height: 64, margin: '0 auto 1.5rem' }}>
            <Compass size={32} />
          </div>
          <span style={{ fontSize: '1rem', color: 'var(--site-primary-light)', fontWeight: 700, letterSpacing: '0.1em' }}>
            ERROR 404
          </span>
          <h1 className="site-hero-title" style={{ marginTop: '0.5rem' }}>
            Looks Like This Canvas Is Blank
          </h1>
          <p className="site-hero-desc">
            The link you followed may be broken, outdated, or the page may have been moved. Don't worry—you can jump straight into the studio or check our guides.
          </p>

          <div className="site-hero-actions">
            <Link href="/" className="btn-site btn-site-primary btn-site-lg">
              <Sparkles size={18} />
              Open AI Doodle Studio
            </Link>
            <Link href="/blog" className="btn-site btn-site-outline btn-site-lg">
              <BookOpen size={18} />
              Browse Educational Blog
            </Link>
          </div>

          <div style={{ marginTop: '3.5rem', display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
            <Link href="/how-it-works" style={{ color: 'var(--site-text-muted)', textDecoration: 'none' }}>
              How It Works Guide →
            </Link>
            <Link href="/about" style={{ color: 'var(--site-text-muted)', textDecoration: 'none' }}>
              About Us →
            </Link>
            <Link href="/contact" style={{ color: 'var(--site-text-muted)', textDecoration: 'none' }}>
              Contact Support →
            </Link>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
