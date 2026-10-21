import { useEffect } from 'react';
import { SiteLayout } from './SiteLayout';
import { Link } from '../Link';
import { AdSlot } from './AdSlot';
import { updateDocumentMeta } from './seo';

export function TermsOfServicePage() {
  useEffect(() => {
    updateDocumentMeta({
      title: 'Terms of Service — Usage Guidelines & Licensing | Ai Doodle',
      description: 'Review the Terms of Service governing your use of Ai Doodle, intellectual property ownership of your artwork, AI outputs, and user conduct.',
      canonicalPath: '/terms-of-service',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Ai Doodle Terms of Service',
        url: 'https://ai-doodle.vercel.app/terms-of-service',
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
          <span aria-current="page">Terms of Service</span>
        </nav>

        <article className="legal-content">
          <h1>Terms of Service</h1>
          <div className="legal-updated">
            Last Updated & Reviewed: October 21, 2026 • Effective Date: October 21, 2026
          </div>

          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using the Ai Doodle website (located at <a href="https://ai-doodle.vercel.app">https://ai-doodle.vercel.app</a>) and our whiteboard animation creation tools, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please discontinue using the service.
          </p>

          <h2>2. Intellectual Property & Ownership of Artwork</h2>
          <p>
            <strong>Your Content:</strong> You retain full ownership and copyright of all original drawings, text scripts, uploaded audio tracks, and custom storyboard sequences you assemble within Ai Doodle. We claim no intellectual property rights over artwork you create.
          </p>
          <p>
            <strong>Exported Videos:</strong> Video files (MP4/WebM) and image sequences rendered using Ai Doodle are your property. You are free to use, monetize, publish, or broadcast them for personal, educational, or commercial projects without royalty fees or licensing attribution to us.
          </p>
          <p>
            <strong>Platform IP:</strong> The Ai Doodle brand, custom vector engine algorithms, hand illustration presets, UI components, and software code are the intellectual property of Ai Doodle and its contributors, protected by applicable copyright laws.
          </p>

          <h2>3. Generative AI Outputs and Disclaimers</h2>
          <p>
            When utilizing AI-assisted features (such as automated storyboard generation via the Gemini API), you acknowledge that:
          </p>
          <ul>
            <li>Generative outputs are probabilistic and provided on an "as-is" basis.</li>
            <li>You are responsible for reviewing AI-suggested text, facts, and scripts for accuracy, legality, and appropriateness prior to publishing.</li>
            <li>Ai Doodle does not guarantee that AI-generated suggestions will be free from similarity to pre-existing works.</li>
          </ul>

          <h2>4. Acceptable Use and Prohibited Conduct</h2>
          <p>
            You agree not to use Ai Doodle to create, upload, export, or transmit any content that:
          </p>
          <ul>
            <li>Violates any applicable local, national, or international law or regulation.</li>
            <li>Infringes upon copyrights, trademarks, privacy rights, or intellectual property of any third party.</li>
            <li>Depicts illegal violence, child exploitation, non-consensual imagery, harassment, or hate speech.</li>
            <li>Attempts to reverse-engineer, decompile, or inject malicious payloads into the website or its users.</li>
          </ul>

          <h2>5. Disclaimers of Warranties</h2>
          <p>
            Ai Doodle is provided "as is" and "as available" without warranties of any kind, whether express or implied, including but not limited to fitness for a particular purpose, non-infringement, or uninterrupted uptime. While we work diligently to optimize browser rendering and prevent data loss, you are advised to maintain backup copies of critical project files.
          </p>

          <h2>6. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, in no event shall Ai Doodle, its contributors, or hosting partners be liable for any indirect, incidental, special, consequential, or punitive damages, or loss of profits or data, arising from your use of or inability to use the platform.
          </p>

          <h2>7. Modifications to the Terms</h2>
          <p>
            We reserve the right to revise or replace these Terms of Service at any time. Material changes will be highlighted with an updated "Last Updated" date at the top of this document. Continued use of the platform after updates constitutes acceptance of the new terms.
          </p>

          <h2>8. Governing Law and Contact</h2>
          <p>
            These Terms shall be interpreted and governed in accordance with applicable legal principles without regard to conflict of law rules. If you have any questions regarding these terms, please contact us via our{' '}
            <Link href="/contact">Contact Page</Link>.
          </p>
        </article>

        {/* Bottom AdSlot */}
        <AdSlot slotId="terms-bottom" format="horizontal" />
      </div>
    </SiteLayout>
  );
}
