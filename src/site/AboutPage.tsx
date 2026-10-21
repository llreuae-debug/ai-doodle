import { useEffect } from 'react';
import { SiteLayout } from './SiteLayout';
import { Link } from '../Link';
import { AdSlot } from './AdSlot';
import { updateDocumentMeta } from './seo';
import {
  Sparkles,
  Shield,
  Cpu,
  Palette,
  Users,
  ArrowRight,
} from 'lucide-react';

export function AboutPage() {
  useEffect(() => {
    updateDocumentMeta({
      title: 'About Us — The Story & Mission Behind Ai Doodle',
      description: 'Learn about Ai Doodle, our mission to democratize whiteboard animation and visual storytelling, and our browser-native vector rendering technology.',
      canonicalPath: '/about',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: 'About Ai Doodle',
        description: 'Ai Doodle is an open, modern whiteboard animation and vector doodle creation studio running natively in modern web browsers.',
        mainEntity: {
          '@type': 'SoftwareApplication',
          name: 'Ai Doodle',
          applicationCategory: 'MultimediaApplication',
          operatingSystem: 'All modern web browsers',
        },
      },
    });
  }, []);

  return (
    <SiteLayout>
      <div className="site-container">
        {/* Breadcrumb */}
        <nav className="site-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">About</span>
        </nav>

        {/* Hero */}
        <section className="site-hero">
          <div className="site-hero-badge">
            <Sparkles size={14} />
            <span>Our Mission & Architecture</span>
          </div>
          <h1 className="site-hero-title">
            Democratizing Whiteboard Animation for Creators Everywhere
          </h1>
          <p className="site-hero-desc">
            Ai Doodle was born out of frustration with expensive, clunky legacy desktop software. We built a fast, client-side studio where anyone can create captivating hand-drawn explainer videos directly in their browser.
          </p>
        </section>

        {/* Top AdSlot */}
        <AdSlot slotId="about-top" format="horizontal" />

        {/* Story Section */}
        <section style={{ maxWidth: 840, margin: '2rem auto', fontSize: '1.05rem', lineHeight: 1.75, color: '#cbd5e1' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
            Why We Built Ai Doodle
          </h2>
          <p>
            For more than a decade, whiteboard animations have been the gold standard for visual explainers, educational content, and product storytelling. However, creating them traditionally required proprietary desktop programs costing hundreds of dollars per year, sluggish render queues, and complicated keyframing interfaces.
          </p>
          <p>
            We set out to build an alternative: a sleek, ultra-responsive web studio leveraging modern web capabilities like <strong>HTML5 Canvas</strong>, <strong>IndexedDB local persistence</strong>, and <strong>WebCodecs hardware-accelerated video rendering</strong>.
          </p>
          <p>
            With Ai Doodle, there are no mandatory downloads, no cloud render queues, and no watermark traps. You retain complete ownership over every illustration and video you generate.
          </p>
        </section>

        {/* Core Principles Grid */}
        <section style={{ margin: '3.5rem 0' }}>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, textAlign: 'center', color: '#fff', marginBottom: '2rem' }}>
            Core Architectural Principles
          </h2>

          <div className="site-grid site-grid-3">
            <div className="site-card">
              <div className="site-card-icon">
                <Cpu size={24} />
              </div>
              <h3 className="site-card-title">Browser-Native Compute</h3>
              <p className="site-card-text">
                Your drawing strokes, stroke path ordering, and audio synthesis happen directly on your machine. This eliminates server latency and keeps your creative work fast.
              </p>
            </div>

            <div className="site-card">
              <div className="site-card-icon">
                <Shield size={24} />
              </div>
              <h3 className="site-card-title">Privacy-First Design</h3>
              <p className="site-card-text">
                Your illustrations and uploaded assets are saved in your browser's private local storage. We do not sell your personal data or store private drafts on remote servers.
              </p>
            </div>

            <div className="site-card">
              <div className="site-card-icon">
                <Palette size={24} />
              </div>
              <h3 className="site-card-title">Vector Precision</h3>
              <p className="site-card-text">
                Unlike blurry pixel videos, our whiteboard illustrations use pure mathematical Bézier strokes that scale crisply up to 4K resolutions on Retina and Ultra-HD displays.
              </p>
            </div>
          </div>
        </section>

        {/* Who It's For */}
        <section style={{ background: 'var(--site-card-bg)', border: '1px solid var(--site-card-border)', borderRadius: 'var(--site-radius-lg)', padding: '2.5rem', margin: '3rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <Users size={22} color="var(--site-primary-light)" />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              Who Uses Ai Doodle?
            </h2>
          </div>
          <div className="site-grid site-grid-2" style={{ marginTop: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.4rem' }}>Educators & Teachers</h3>
              <p style={{ fontSize: '0.925rem', color: 'var(--site-text-muted)' }}>
                Transform complex math formulas, science concepts, and history lessons into lively visual videos that hold students' attention.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.4rem' }}>Content Creators & YouTubers</h3>
              <p style={{ fontSize: '0.925rem', color: 'var(--site-text-muted)' }}>
                Produce viral shorts, explainers, and commentary videos with synchronized hand-drawn visuals and audio sound effects.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.4rem' }}>Product Managers & Marketers</h3>
              <p style={{ fontSize: '0.925rem', color: 'var(--site-text-muted)' }}>
                Clearly communicate value propositions, architecture diagrams, and workflow integrations to prospects and customers.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.4rem' }}>Storytellers & Hobbyists</h3>
              <p style={{ fontSize: '0.925rem', color: 'var(--site-text-muted)' }}>
                Bring personal comic strips, greeting videos, or creative doodles to life without mastering complicated 3D or 2D rigging software.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="article-cta">
          <h3>Ready to Experience Ai Doodle?</h3>
          <p>
            Open the studio and create your first hand-drawn animation right now.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/" className="btn-site btn-site-primary btn-site-lg">
              Launch Studio Free
              <ArrowRight size={18} />
            </Link>
            <Link href="/contact" className="btn-site btn-site-outline btn-site-lg">
              Get in Touch
            </Link>
          </div>
        </section>

        {/* Bottom AdSlot */}
        <AdSlot slotId="about-bottom" format="horizontal" />
      </div>
    </SiteLayout>
  );
}
