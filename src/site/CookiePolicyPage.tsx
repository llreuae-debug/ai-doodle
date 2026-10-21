import { useEffect, useState } from 'react';
import { SiteLayout } from './SiteLayout';
import { Link } from '../Link';
import { AdSlot } from './AdSlot';
import { updateDocumentMeta } from './seo';
import { CookieConsent } from './CookieConsent';
import { Sliders } from 'lucide-react';

export function CookiePolicyPage() {
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    updateDocumentMeta({
      title: 'Cookie Policy & Consent Management | Ai Doodle',
      description: 'Learn how Ai Doodle uses cookies, local browser storage, and privacy controls. Manage your analytics and advertising preferences with one click.',
      canonicalPath: '/cookie-policy',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Ai Doodle Cookie Policy',
        url: 'https://ai-doodle.vercel.app/cookie-policy',
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
          <span aria-current="page">Cookie Policy</span>
        </nav>

        <article className="legal-content">
          <h1>Cookie Policy & Consent Management</h1>
          <div className="legal-updated">
            Last Updated & Reviewed: October 21, 2026 • Effective Date: October 21, 2026
          </div>

          <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: 'var(--site-radius-lg)', padding: '1.75rem', marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Sliders size={22} color="var(--site-primary-light)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                Manage Your Privacy Preferences
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '0.925rem', color: 'var(--site-text-muted)' }}>
              You have full autonomy over optional cookies and local data identifiers. Click below to view or modify your active permissions at any time.
            </p>
            <div>
              <button
                type="button"
                className="btn-site btn-site-primary btn-site-lg"
                onClick={() => setOpenModal(true)}
              >
                <Sliders size={18} />
                Open Cookie Preference Center
              </button>
            </div>
          </div>

          <h2>1. What Are Cookies and Local Storage?</h2>
          <p>
            Cookies are small text files placed on your computer or mobile device when you visit websites. In modern web applications like Ai Doodle, we also utilize <strong>HTML5 LocalStorage</strong> and <strong>IndexedDB</strong>, which provide secure, high-capacity browser storage for your vector illustrations, project timeline states, and tool settings.
          </p>

          <h2>2. How We Categorize Our Cookies</h2>
          <p>
            We strictly separate our cookies into three specific categories:
          </p>

          <h3>Category 1: Strictly Necessary Storage (Always Active)</h3>
          <p>
            These identifiers and storage entries are essential for the whiteboard studio to function. Without them, you would not be able to draw, undo/redo strokes, save projects, or export videos.
          </p>
          <ul>
            <li>
              <code>ai_doodle_projects</code> (IndexedDB): Stores your canvas vectors, slide timelines, and element properties locally on your device.
            </li>
            <li>
              <code>ai_doodle_cookie_consent_v1</code> (LocalStorage): Records your chosen privacy and cookie consent preferences so we don't ask you on every page reload.
            </li>
            <li>
              <code>ai_doodle_active_project</code> (LocalStorage): Remembers the current project you were editing so your progress is preserved across refreshes.
            </li>
          </ul>

          <h3>Category 2: Performance & Analytics (Optional)</h3>
          <p>
            These anonymous metrics help us understand browser performance across various devices, detect JavaScript rendering errors, and identify which drawing tools are most popular so we can optimize rendering speeds.
          </p>
          <p>
            <em>Status: Deactivated by default until you grant explicit consent.</em>
          </p>

          <h3>Category 3: Advertising & Sponsorships (Google AdSense) (Optional)</h3>
          <p>
            Ai Doodle is free to use without mandatory subscriptions. We partner with Google AdSense to serve non-intrusive, privacy-compliant advertisements. Google and third-party ad technology partners may use cookies to serve ads based on your visits to this website and other websites across the Internet.
          </p>
          <p>
            <em>Status: Deactivated by default until you grant explicit consent. You can disable personalized advertising at any time.</em>
          </p>

          <h2>3. How to Control Cookies in Your Browser</h2>
          <p>
            In addition to our preference center above, most web browsers allow you to manage or block cookies through their system settings:
          </p>
          <ul>
            <li><strong>Google Chrome:</strong> Settings → Privacy and Security → Third-party cookies</li>
            <li><strong>Apple Safari:</strong> Preferences → Privacy → Block all cookies</li>
            <li><strong>Mozilla Firefox:</strong> Settings → Privacy & Security → Enhanced Tracking Protection</li>
            <li><strong>Microsoft Edge:</strong> Settings → Cookies and site permissions</li>
          </ul>
          <p>
            Please note that blocking essential local storage may prevent the drawing canvas and project saving functions from working.
          </p>

          <h2>4. Updates to This Policy</h2>
          <p>
            We periodically review our cookie practices to ensure compliance with global data protection laws (including GDPR and ePrivacy). Any updates will be posted here with an updated revision date.
          </p>
        </article>

        {/* Modal trigger */}
        <CookieConsent
          forceOpenModal={openModal}
          onCloseModal={() => setOpenModal(false)}
        />

        {/* Bottom AdSlot */}
        <AdSlot slotId="cookies-bottom" format="horizontal" />
      </div>
    </SiteLayout>
  );
}
