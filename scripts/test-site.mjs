import { chromium } from 'playwright-core';

const BASE = 'http://localhost:5173';

const ROUTES = [
  '/',
  '/how-it-works',
  '/blog',
  '/blog/how-to-use-ai-doodle-generator',
  '/blog/turn-sketches-into-ai-art',
  '/blog/doodle-art-ideas-drawing-prompts',
  '/blog/whiteboard-animation-for-education',
  '/blog/common-ai-drawing-problems-fixes',
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
  { width: 320, height: 600, name: '320px mobile' },
  { width: 375, height: 667, name: '375px mobile' },
  { width: 390, height: 844, name: '390px mobile' },
  { width: 430, height: 932, name: '430px mobile' },
  { width: 768, height: 1024, name: '768px tablet' },
  { width: 1024, height: 768, name: '1024px tablet' },
  { width: 1280, height: 800, name: '1280px desktop' },
  { width: 1440, height: 900, name: '1440px desktop' },
  { width: 1920, height: 1080, name: '1920px desktop' },
];

async function main() {
  console.log(`Starting QA verification against ${BASE}...\n`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Route Navigation & SEO Verification
  console.log('--- 1. Testing All 14 Routes & SEO Metadata ---');
  for (const route of ROUTES) {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(100);

    const title = await page.title();
    assert(title && title.length > 5, `${route} title: "${title}"`);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    assert(canonical && canonical.startsWith('https://ai-doodle.vercel.app'), `${route} canonical: ${canonical}`);

    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    assert(desc && desc.length > 15, `${route} description present (${desc?.length} chars)`);

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    assert(ogTitle && ogTitle.length > 0, `${route} og:title: "${ogTitle}"`);

    assert(errors.length === 0, `${route} zero uncaught runtime errors`);
  }

  // 2. Cookie Consent Verification
  console.log('\n--- 2. Testing Cookie Consent & Preferences ---');
  await page.goto(`${BASE}/`);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });

  const bannerVisible = await page.locator('.cookie-banner-wrap').isVisible();
  assert(bannerVisible, 'Cookie consent banner visible on initial visit');

  await page.click('button:has-text("Manage Preferences")');
  const modalVisible = await page.locator('.cookie-modal-card').isVisible();
  assert(modalVisible, 'Cookie preference modal opened');

  await page.click('button:has-text("Accept All")');
  await page.waitForTimeout(100);
  const bannerGone = !(await page.locator('.cookie-banner-wrap').isVisible());
  assert(bannerGone, 'Cookie banner dismissed after accepting');

  const storedConsent = await page.evaluate(() => localStorage.getItem('ai_doodle_cookie_consent_v1'));
  const parsed = storedConsent ? JSON.parse(storedConsent) : null;
  assert(parsed && parsed.essential && parsed.analytics && parsed.advertising, 'Preferences stored in localStorage');

  // 3. Contact Form Submission
  console.log('\n--- 3. Testing Contact Form Validation & Submission ---');
  await page.goto(`${BASE}/contact`, { waitUntil: 'domcontentloaded' });

  await page.click('button[type="submit"]');
  const errorVisible = await page.locator('.form-error').first().isVisible();
  assert(errorVisible, 'Validation prevents empty submission');

  await page.fill('#contact-name', 'Verification Bot');
  await page.fill('#contact-email', 'bot@test.com');
  await page.selectOption('#contact-subject', 'Technical Support / Bug Report');
  await page.fill('#contact-message', 'This is an automated verification test for the contact form.');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(200);
  const successVisible = await page.locator('text=Message Sent Successfully').isVisible();
  assert(successVisible, 'Contact message sent and confirmed on UI');

  const savedSubmissions = await page.evaluate(() => localStorage.getItem('ai_doodle_contact_submissions'));
  assert(savedSubmissions && savedSubmissions.includes('Verification Bot'), 'Submission saved to persistent storage');

  // 4. Viewport Responsiveness & Overflow Test
  console.log('\n--- 4. Testing Responsive Viewports & Horizontal Overflow ---');
  const testPages = ['/how-it-works', '/blog', '/blog/ai-doodle-art-guide', '/about', '/contact', '/privacy-policy'];

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const p of testPages) {
      await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(overflow <= 1, `${vp.name} on ${p}: 0px horizontal overflow (${overflow}px)`);
    }
  }

  // 5. AdSense AdSlots & Reserved Layout
  console.log('\n--- 5. Testing AdSense Placements & CLS Stability ---');
  await page.goto(`${BASE}/blog/ai-doodle-art-guide`, { waitUntil: 'domcontentloaded' });
  const adSlots = await page.locator('.ad-slot-container').count();
  assert(adSlots >= 2, `Article has ${adSlots} AdSlot placement containers`);

  const hasBadge = await page.locator('.ad-slot-badge').first().innerText();
  assert(hasBadge === 'ADVERTISEMENT', 'AdSlot is clearly labeled "ADVERTISEMENT"');

  await browser.close();

  console.log(`\n========================================`);
  console.log(`QA AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
