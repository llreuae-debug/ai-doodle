import { useEffect } from 'react';
import { SiteLayout } from './SiteLayout';
import { Link } from '../Link';
import { AdSlot } from './AdSlot';
import { updateDocumentMeta } from './seo';
import { ShieldCheck } from 'lucide-react';

export function PrivacyPolicyPage() {
  useEffect(() => {
    updateDocumentMeta({
      title: 'Privacy Policy — Data Collection, Storage & AI Usage | Ai Doodle',
      description: 'Read the Ai Doodle privacy policy. Transparent disclosures regarding local browser storage, uploaded media, AI API usage, cookie controls, and your privacy rights.',
      canonicalPath: '/privacy-policy',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Ai Doodle Privacy Policy',
        url: 'https://ai-doodle.vercel.app/privacy-policy',
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
          <span aria-current="page">Privacy Policy</span>
        </nav>

        <article className="legal-content">
          <h1>Privacy Policy</h1>
          <div className="legal-updated">
            Last Updated & Reviewed: October 21, 2026 • Effective Date: October 21, 2026
          </div>

          <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: 'var(--site-radius-md)', padding: '1.25rem', marginBottom: '2rem' }}>
            <h3 style={{ color: '#fff', margin: '0 0 0.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="var(--site-primary-light)" />
              Summary of Our Privacy Commitment
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--site-text-muted)' }}>
              Ai Doodle is built on a <strong>client-first privacy architecture</strong>. Your drawings, storyboard scenes, and uploaded audio remain in your browser's private storage (IndexedDB/localStorage). We do not silently collect or harvest your creative work.
            </p>
          </div>

          <h2>1. Information We Collect and Process</h2>
          <p>
            Depending on how you interact with our website and studio, we may process the following types of information:
          </p>
          <ul>
            <li>
              <strong>Canvas Drawings & Project Assets (Local Storage):</strong> When you draw lines, customize scene text, or upload images/audio, these data assets are stored locally within your browser using HTML5 LocalStorage and IndexedDB. They are not uploaded to a central Ai Doodle database.
            </li>
            <li>
              <strong>AI Prompt Generations:</strong> If you use the Story Wizard or Character Generator, the text prompt you submit is transmitted securely via HTTPS to the configured generative AI model (such as Google Gemini API). If you provide your own Gemini API key, it is stored strictly in your browser's local memory and is never logged to our servers.
            </li>
            <li>
              <strong>Contact & Support Inquiries:</strong> When you send a message through our Contact Us form, we collect the name, email address, topic, and message content you provide so we can respond to your request.
            </li>
            <li>
              <strong>Technical Device & Log Data:</strong> Like most web applications, our web hosting provider (Vercel) automatically records routine HTTP request logs, including IP addresses, browser user agent strings, and request timestamps to maintain network security and DDoS mitigation.
            </li>
          </ul>

          <h2>2. Cookies and Storage Technologies</h2>
          <p>
            We classify our storage mechanisms into three distinct tiers:
          </p>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Purpose</th>
                <th>Storage Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Strictly Essential</strong></td>
                <td>Stores canvas projects, UI theme state, undo/redo stacks, and your cookie consent preference.</td>
                <td>Persistent in your browser until manually cleared.</td>
              </tr>
              <tr>
                <td><strong>Performance & Analytics</strong></td>
                <td>Measures aggregated error rates and rendering performance to optimize canvas frame rates. (Optional)</td>
                <td>Configured only upon explicit user consent.</td>
              </tr>
              <tr>
                <td><strong>Advertising (Google AdSense)</strong></td>
                <td>Serves relevant, non-intrusive advertisements to support the free operation of the tool. (Optional)</td>
                <td>Configured only upon explicit user consent.</td>
              </tr>
            </tbody>
          </table>
          <p>
            You can change or revoke your cookie choices at any time via our{' '}
            <Link href="/cookie-policy">Cookie Policy</Link> page.
          </p>

          <h2>3. Third-Party Services and Data Sharing</h2>
          <p>
            We do not sell, rent, or trade your personal information. We may interface with the following third-party infrastructure providers:
          </p>
          <ul>
            <li>
              <strong>Vercel (Hosting & CDN):</strong> Delivers website assets globally with edge caching.
            </li>
            <li>
              <strong>Google Gemini API (Generative Intelligence):</strong> Processes text prompts when users invoke automated storyboard scripts. Subject to Google's Enterprise Privacy Policies.
            </li>
            <li>
              <strong>Google AdSense:</strong> When advertising consent is granted, Google and third-party advertising vendors may use cookies to serve ads based on your prior visits to this or other websites.
            </li>
          </ul>

          <h2>4. Data Retention and Deletion</h2>
          <p>
            Because your whiteboard projects live in your local browser storage, you have total control over their deletion. You can remove all stored drafts at any time by clearing your browser cache or selecting the "Clear All Projects" action in the studio dashboard.
          </p>

          <h2>5. Your Privacy Rights (GDPR, CCPA & Global Laws)</h2>
          <p>
            Depending on your jurisdiction, you may hold rights to:
          </p>
          <ul>
            <li>Access, correct, or delete any personal information we hold about you.</li>
            <li>Object to or restrict certain types of data processing.</li>
            <li>Withdraw consent at any time without affecting the lawfulness of processing before withdrawal.</li>
            <li>Lodge a complaint with a data protection supervisory authority.</li>
          </ul>

          <h2>6. Security Measures</h2>
          <p>
            We employ modern industry-standard security protocols, including full HTTPS encryption in transit, strict Content Security Policies, sanitized user inputs to prevent Cross-Site Scripting (XSS), and zero storage of external API keys on server-side disks.
          </p>

          <h2>7. Contact and Inquiries</h2>
          <p>
            For privacy-related questions, data access requests, or policy clarifications, please submit your inquiry through our{' '}
            <Link href="/contact">Contact Page</Link>.
          </p>
        </article>

        {/* Bottom AdSlot */}
        <AdSlot slotId="privacy-bottom" format="horizontal" />
      </div>
    </SiteLayout>
  );
}
