import { test, expect } from '@playwright/test';

const ROUTES = [
  '/',
  '/how-it-works',
  '/blog',
  '/blog/ai-doodle-art-guide',
  '/blog/ai-doodle-prompt-tips',
  '/blog/ai-doodle-best-practices',
  '/blog/ai-vs-traditional-drawing',
  '/blog/save-and-download-doodles',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
  '/cookie-policy',
  '/404',
];

const VIEWPORTS = [
  { width: 320, height: 600, name: 'mobile-320' },
  { width: 375, height: 667, name: 'mobile-375' },
  { width: 390, height: 844, name: 'mobile-390' },
  { width: 430, height: 932, name: 'mobile-430' },
  { width: 768, height: 1024, name: 'tablet-768' },
  { width: 1024, height: 768, name: 'tablet-1024' },
  { width: 1280, height: 800, name: 'desktop-1280' },
  { width: 1440, height: 900, name: 'desktop-1440' },
  { width: 1920, height: 1080, name: 'desktop-1920' },
];

test.describe('Phase 2 & 3: Content Routes, SEO, Legal & AdSense Verification', () => {
  for (const route of ROUTES) {
    test(`Route ${route} loads cleanly without console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');

      // Verify title is non-empty
      const title = await page.title();
      expect(title.length).toBeGreaterThan(5);

      // Verify canonical link
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toBeTruthy();

      // Verify meta description
      const desc = await page.locator('meta[name="description"]').getAttribute('content');
      expect(desc).toBeTruthy();
      expect(desc!.length).toBeGreaterThan(15);

      // Verify OpenGraph tags
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      expect(ogTitle).toBeTruthy();

      // Verify AdSlot placeholder or ad container exists on content pages
      if (route !== '/' && route !== '/404') {
        const adSlots = page.locator('.ad-slot-container');
        expect(await adSlots.count()).toBeGreaterThanOrEqual(1);
      }

      // Verify zero console errors
      const realErrors = consoleErrors.filter(
        (e) => !e.includes('favicon.ico') && !e.includes('adsbygoogle')
      );
      expect(realErrors).toEqual([]);
    });
  }

  test('Cookie consent banner works, saves choice, and allows preference changes', async ({ page }) => {
    // Start with cleared localStorage
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Banner should be visible
    const banner = page.locator('.cookie-banner-wrap');
    await expect(banner).toBeVisible();

    // Click "Manage Preferences"
    await page.click('button:has-text("Manage Preferences")');
    const modal = page.locator('.cookie-modal-card');
    await expect(modal).toBeVisible();

    // Accept All from modal
    await page.click('button:has-text("Accept All")');
    await expect(modal).not.toBeVisible();
    await expect(banner).not.toBeVisible();

    // Verify localStorage has valid preferences
    const stored = await page.evaluate(() =>
      localStorage.getItem('ai_doodle_cookie_consent_v1')
    );
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.essential).toBe(true);
    expect(parsed.analytics).toBe(true);
    expect(parsed.advertising).toBe(true);
  });

  test('Contact form handles validation and successful submission', async ({ page }) => {
    await page.goto('/contact');

    // Submit empty form -> should show validation errors
    await page.click('button:has-text("Send Message")');
    await expect(page.locator('.form-error')).toBeVisible();

    // Fill valid info
    await page.fill('#contact-name', 'Quality Assurance Tester');
    await page.fill('#contact-email', 'qa@aidoodle.test');
    await page.selectOption('#contact-subject', 'Technical Support / Bug Report');
    await page.fill('#contact-message', 'Testing contact form automated submission pipeline.');

    // Submit
    await page.click('button:has-text("Send Message")');

    // Verify success banner appears
    await expect(page.locator('text=Message Sent Successfully')).toBeVisible();

    // Verify persisted in localStorage
    const stored = await page.evaluate(() =>
      localStorage.getItem('ai_doodle_contact_submissions')
    );
    expect(stored).toBeTruthy();
    expect(stored).toContain('Quality Assurance Tester');
  });

  test('Public SEO assets (sitemap.xml, robots.txt, ads.txt) are accessible', async ({ request }) => {
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    const sitemapText = await sitemap.text();
    expect(sitemapText).toContain('<loc>https://ai-doodle.vercel.app/</loc>');
    expect(sitemapText).toContain('<loc>https://ai-doodle.vercel.app/blog/ai-doodle-art-guide</loc>');

    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    const robotsText = await robots.text();
    expect(robotsText).toContain('Sitemap: https://ai-doodle.vercel.app/sitemap.xml');

    const ads = await request.get('/ads.txt');
    expect(ads.status()).toBe(200);
    const adsText = await ads.text();
    expect(adsText).toContain('Ai Doodle Google AdSense');
  });
});

test.describe('Responsive Viewports & Zero Horizontal Overflow Audit', () => {
  for (const vp of VIEWPORTS) {
    test(`No horizontal overflow at ${vp.name} (${vp.width}x${vp.height}) on /blog and /how-it-works`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const path of ['/how-it-works', '/blog', '/blog/ai-doodle-art-guide', '/about', '/contact']) {
        await page.goto(path);
        await page.waitForLoadState('domcontentloaded');

        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth - window.innerWidth;
        });

        // Tolerating <= 1px sub-pixel rounding
        expect(overflow, `Overflow on ${path} at ${vp.width}px`).toBeLessThanOrEqual(1);
      }
    });
  }
});
