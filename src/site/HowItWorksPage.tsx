import { useEffect } from 'react';
import { SiteLayout } from './SiteLayout';
import { Link } from '../Link';
import { AdSlot } from './AdSlot';
import { updateDocumentMeta } from './seo';
import {
  Sparkles,
  Pencil,
  Hand,
  Volume2,
  Download,
  Film,
  Layers,
  Zap,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export function HowItWorksPage() {
  useEffect(() => {
    updateDocumentMeta({
      title: 'How It Works — Step-by-Step Whiteboard Video Guide',
      description: 'Learn how to create hand-drawn whiteboard animations in minutes using Ai Doodle. Step-by-step guide to drawing, vector stroke ordering, AI generation, voiceovers, and 4K video export.',
      canonicalPath: '/how-it-works',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'How to Create Whiteboard Animations with Ai Doodle',
        description: 'Create engaging animated whiteboard doodle videos using text prompts, vector illustrations, realistic hand animations, and audio voiceovers.',
        step: [
          {
            '@type': 'HowToStep',
            name: 'Compose or Draw Your Artwork',
            text: 'Draw directly on the responsive canvas, pick from 500+ vector clipart items, or generate scenes with AI.',
          },
          {
            '@type': 'HowToStep',
            name: 'Customize Realistic Drawing Hands & Timing',
            text: 'Select your preferred hand style, pen angle, drawing speed, and realistic sound effects.',
          },
          {
            '@type': 'HowToStep',
            name: 'Synchronize Voiceovers & Music',
            text: 'Generate or upload voice narration with automatic stroke timing adjustment.',
          },
          {
            '@type': 'HowToStep',
            name: 'Render & Download 4K Video',
            text: 'Export your finished video as high-definition MP4 or WebM right in the browser.',
          },
        ],
      },
    });
  }, []);

  const steps = [
    {
      num: '01',
      icon: Pencil,
      title: 'Compose or Draw Your Artwork',
      desc: 'Start with a clean whiteboard canvas. Draw with the responsive brush tool, pick from over 500+ hand-crafted vector clipart items across dozens of categories, or type a text prompt to generate custom characters and scene elements.',
      tips: [
        'Precise stylus and touch pressure support',
        'Upload custom SVGs or PNG silhouettes',
        'Automatic vector stroke path optimization',
      ],
    },
    {
      num: '02',
      icon: Hand,
      title: 'Select Realistic Hands & Dynamics',
      desc: 'Bring your drawings to life with authentic human hands. Choose between chalk, whiteboard markers, fine-liners, or translucent stylus hands with customizable angles and speeds.',
      tips: [
        'Over 12 realistic male and female hand assets',
        'Left-handed and right-handed orientations',
        'Authentic paper, chalk, and marker audio effects',
      ],
    },
    {
      num: '03',
      icon: Volume2,
      title: 'Add Kinetic Text, Narration & Soundtracks',
      desc: 'Type script lines that automatically appear as kinetic handwriting or typewriter animations. Attach neural voiceovers or upload recorded audio, and mix ambient background music with intelligent audio ducking.',
      tips: [
        'Diverse curated typography fonts',
        'Multilingual AI voice narration',
        'Smart audio synchronization that refits scene duration',
      ],
    },
    {
      num: '04',
      icon: Film,
      title: 'Real-Time Preview & 4K Video Export',
      desc: 'Preview your complete whiteboard explainer in real time with synchronized audio and vector animations. When satisfied, export your video as crystal-clear 1080p or 4K MP4 without watermarks.',
      tips: [
        'Browser-native WebCodecs rendering engine',
        'Zero cloud wait queues or compression artifacts',
        'Download instant MP4, WebM, or PNG frame sequences',
      ],
    },
  ];

  return (
    <SiteLayout>
      <div className="site-container">
        {/* Breadcrumb */}
        <nav className="site-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">How It Works</span>
        </nav>

        {/* Hero */}
        <section className="site-hero">
          <div className="site-hero-badge">
            <Sparkles size={14} />
            <span>Workflow & Creation Guide</span>
          </div>
          <h1 className="site-hero-title">
            From Simple Idea to Hand-Drawn Animated Video in Minutes
          </h1>
          <p className="site-hero-desc">
            Ai Doodle simplifies the traditional multi-day whiteboard animation workflow into four intuitive steps. Here is how our browser-native vector engine turns concepts into mesmerizing explainers.
          </p>
          <div className="site-hero-actions">
            <Link href="/" className="btn-site btn-site-primary btn-site-lg">
              Launch Studio Now
              <ArrowRight size={18} />
            </Link>
            <Link href="/blog/ai-doodle-best-practices" className="btn-site btn-site-outline btn-site-lg">
              Read Prompting Tips
            </Link>
          </div>
        </section>

        {/* Top AdSlot */}
        <AdSlot slotId="how-it-works-top" format="horizontal" />

        {/* Steps Grid */}
        <section style={{ margin: '3rem 0' }}>
          <div className="site-grid site-grid-2">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.num} className="site-card" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div className="site-card-icon">
                      <Icon size={24} />
                    </div>
                    <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--site-card-border)', letterSpacing: '-0.02em' }}>
                      {s.num}
                    </span>
                  </div>
                  <h2 className="site-card-title">{s.title}</h2>
                  <p className="site-card-text">{s.desc}</p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0 0', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {s.tips.map((t, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--site-text-muted)' }}>
                        <CheckCircle2 size={15} color="var(--site-primary-light)" style={{ flexShrink: 0 }} />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Value Proposition Grid */}
        <section style={{ margin: '4rem 0', background: 'var(--site-card-bg)', border: '1px solid var(--site-card-border)', borderRadius: 'var(--site-radius-lg)', padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', margin: '0 0 1rem', color: '#fff' }}>
            Why Creators & Educators Choose Ai Doodle
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--site-text-muted)', maxWidth: 640, margin: '0 auto 2.5rem' }}>
            Traditional animation software demands steep learning curves and heavy subscriptions. Ai Doodle runs 100% in your browser with zero bloat.
          </p>

          <div className="site-grid site-grid-3">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Zap size={20} color="var(--site-primary-light)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', margin: 0 }}>Instant Web Execution</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--site-text-muted)' }}>
                No desktop installers, cloud render queues, or server lag. Everything executes smoothly on your graphics card.
              </p>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Layers size={20} color="var(--site-primary-light)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', margin: 0 }}>Multi-Scene Timelines</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--site-text-muted)' }}>
                Organize full storyboards with slide transitions, custom durations, and multi-track audio control.
              </p>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Download size={20} color="var(--site-primary-light)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', margin: 0 }}>True 4K Unwatermarked</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--site-text-muted)' }}>
                Your content is 100% yours. Export in pristine resolution suitable for YouTube, classroom projectors, or clients.
              </p>
            </div>
          </div>
        </section>

        {/* CTA banner */}
        <section className="article-cta">
          <h3>Ready to Make Your First Doodle Animation?</h3>
          <p>
            Jump right in and start sketching. No sign-up required to test the canvas and animate vector strokes.
          </p>
          <Link href="/" className="btn-site btn-site-primary btn-site-lg">
            Open AI Doodle Studio
            <ArrowRight size={18} />
          </Link>
        </section>

        <AdSlot slotId="how-it-works-bottom" format="horizontal" />
      </div>
    </SiteLayout>
  );
}
