import { useState, type ReactNode } from 'react';
import { Menu, X, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { Logomark } from '../brand/Logomark';
import { Link } from '../Link';
import { CookieConsent } from './CookieConsent';
import { usePath } from '../router';
import './site.css';

interface SiteLayoutProps {
  children: ReactNode;
}

export function SiteLayout({ children }: SiteLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cookieModalOpen, setCookieModalOpen] = useState(false);
  const currentPath = usePath();

  const navItems = [
    { label: 'Studio', href: '/' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Blog', href: '/blog' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <div className="site-wrapper">
      {/* Sticky Header */}
      <header className="site-header">
        <div className="site-container site-header-inner">
          <Link href="/" className="site-brand" aria-label="Ai Doodle Home">
            <Logomark size={32} />
            <span>Ai Doodle</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="site-nav-desktop" aria-label="Main Navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`site-nav-link ${currentPath === item.href ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Header Action Button */}
          <div className="site-header-actions">
            <Link href="/" className="btn-site btn-site-primary btn-site-sm">
              <Sparkles size={16} aria-hidden="true" />
              <span>Open Studio</span>
            </Link>

            <button
              type="button"
              className="site-mobile-toggle"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="site-mobile-drawer" role="navigation" aria-label="Mobile Navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="site-mobile-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--site-card-border)' }}>
              <Link
                href="/"
                className="btn-site btn-site-primary"
                style={{ width: '100%', boxSizing: 'border-box' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Sparkles size={16} />
                <span>Launch Video Maker</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Body */}
      <main className="site-main">{children}</main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="site-container">
          <div className="site-footer-grid">
            {/* Col 1: Brand Info */}
            <div>
              <Link href="/" className="site-brand">
                <Logomark size={28} />
                <span>Ai Doodle</span>
              </Link>
              <p className="footer-brand-text">
                The modern, browser-native whiteboard animation studio. Transform ideas, text prompts, and drawings into synchronized hand-drawn vector videos with authentic chalk & pen sound effects.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <Link href="/" className="btn-site btn-site-primary btn-site-sm">
                  Start Drawing Free
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Col 2: Product & Studio */}
            <div>
              <h3 className="footer-col-title">Product & Studio</h3>
              <ul className="footer-links">
                <li>
                  <Link href="/" className="footer-link">AI Doodle Studio</Link>
                </li>
                <li>
                  <Link href="/how-it-works" className="footer-link">How It Works Guide</Link>
                </li>
                <li>
                  <Link href="/blog/save-and-download-doodles" className="footer-link">Save & Export 4K MP4</Link>
                </li>
                <li>
                  <Link href="/blog/ai-doodle-best-practices" className="footer-link">Prompt Writing Tips</Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Educational Articles */}
            <div>
              <h3 className="footer-col-title">Educational Guides</h3>
              <ul className="footer-links">
                <li>
                  <Link href="/blog" className="footer-link">Blog & Resource Index</Link>
                </li>
                <li>
                  <Link href="/blog/ai-doodle-art-guide" className="footer-link">What Is AI Doodle Art?</Link>
                </li>
                <li>
                  <Link href="/blog/ai-doodle-prompt-tips" className="footer-link">Prompts Into Doodle Ideas</Link>
                </li>
                <li>
                  <Link href="/blog/ai-vs-traditional-drawing" className="footer-link">AI vs Traditional Drawing</Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Trust & Legal */}
            <div>
              <h3 className="footer-col-title">Trust & Legal</h3>
              <ul className="footer-links">
                <li>
                  <Link href="/about" className="footer-link">About Us</Link>
                </li>
                <li>
                  <Link href="/contact" className="footer-link">Contact Support</Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="footer-link">Privacy Policy</Link>
                </li>
                <li>
                  <Link href="/terms-of-service" className="footer-link">Terms of Service</Link>
                </li>
                <li>
                  <Link href="/cookie-policy" className="footer-link">Cookie Policy</Link>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-link-btn"
                    onClick={() => setCookieModalOpen(true)}
                  >
                    <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    Cookie Preferences
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="site-footer-bottom">
            <div>
              © {new Date().getFullYear()} Ai Doodle. Built with passion for creators, educators, and visual storytellers.
            </div>
            <div>
              100% Client-Side Safe • Device Pixel Scaling • Zero Latency Vector Engine
            </div>
          </div>
        </div>
      </footer>

      {/* Cookie Consent Banner & Modal */}
      <CookieConsent
        forceOpenModal={cookieModalOpen}
        onCloseModal={() => setCookieModalOpen(false)}
      />
    </div>
  );
}
