/** Part 6: accessibility, responsive layout, performance and security checks. */
import AxeBuilder from '@axe-core/playwright';
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { APP, AUDIT, expect, openEditor, ROOT, shot, STATES, test } from './helpers';

const save = (name: string, data: unknown) => {
  fs.mkdirSync(path.join(AUDIT, 'report', 'data'), { recursive: true });
  fs.writeFileSync(path.join(AUDIT, 'report', 'data', `${name}.json`), `${JSON.stringify(data, null, 1)}\n`);
};

test.describe('accessibility', () => {
  const axeResults: Record<string, { id: string; impact: string | null | undefined; help: string; nodes: number; targets: string[] }[]> = {};
  test.afterAll(() => save('axe', axeResults));

  const screens = Object.entries(STATES).filter(([s]) => s === 'top bar' || s.startsWith('modal') || s === 'right · project' || s === 'left · text' || s === 'right · text selected' || s === 'slide menu');
  for (const [state, { enter, root }] of screens) {
    test(`axe: ${state === 'top bar' ? 'main screen' : state} has no serious or critical issues`, async ({ page }) => {
      await openEditor(page);
      await enter(page);
      await page.locator(root).first().waitFor({ timeout: 10_000 });
      await page.waitForTimeout(600);
      const scan = await new AxeBuilder({ page }).include(state === 'top bar' ? 'body' : root).analyze();
      const bad = scan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      axeResults[state] = scan.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')) }));
      expect(bad.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}× e.g. ${v.nodes[0]?.target.join(' ')})`)).toEqual([]);
    });
  }

  test('every focusable control shows where focus is', async ({ page }) => {
    await openEditor(page);
    const missing: string[] = [];
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        const visible = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow !== 'none' && s.boxShadow !== '');
        const name = el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30) || el.tagName;
        return { name, visible, tag: el.tagName };
      });
      if (info && !info.visible) missing.push(`${info.tag} "${info.name}"`);
    }
    save('focus', { missing });
    expect([...new Set(missing)], 'controls with no visible focus ring').toEqual([]);
  });

  test('keyboard only: play, open and close Export, add a slide', async ({ page }) => {
    await openEditor(page);
    const reach = async (name: string) => {
      for (let i = 0; i < 400; i++) {
        await page.keyboard.press('Tab');
        const label = await page.evaluate(() => (document.activeElement as HTMLElement)?.getAttribute('aria-label') || document.activeElement?.textContent?.trim());
        if (label === name) return true;
      }
      return false;
    };
    expect(await reach('Play'), 'Tab reaches Play').toBe(true);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    await page.keyboard.press('Enter');
    expect(await reach('Add slide'), 'Tab reaches Add slide').toBe(true);
    const n = await page.locator('.slidecard').count();
    await page.keyboard.press('Enter');
    await expect(page.locator('.slidecard')).toHaveCount(n + 1);
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    expect(await reach('Export'), 'Tab reaches Export').toBe(true);
    await page.keyboard.press('Enter');
    await expect(page.locator('[role=dialog][aria-modal=true]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[role=dialog][aria-modal=true]')).toHaveCount(0);
  });
});

test.describe('responsive', () => {
  for (const width of [400, 768, 1024, 1440]) {
    test(`${width} px wide: no sideways scroll, nothing cut off`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await openEditor(page);
      await shot(page, info, `responsive-${width}`);
      const r = await page.evaluate(() => {
        const out: string[] = [];
        const sx = document.documentElement.scrollWidth - window.innerWidth;
        if (sx > 1) out.push(`page scrolls sideways by ${sx}px`);
        // Controls that stick out of the window or are clipped by their panel.
        for (const el of document.querySelectorAll<HTMLElement>('button, [role=button], input, select, a')) {
          const b = el.getBoundingClientRect();
          if (b.width === 0 || b.height === 0 || getComputedStyle(el).visibility === 'hidden') continue;
          if (el.closest('[hidden], .libgrid, .fontpane, .ttrack, .modal-b')) continue;
          const name = el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30) || el.tagName;
          if (b.right > window.innerWidth + 1 || b.left < -1) out.push(`"${name}" is outside the window`);
          else {
            let p = el.parentElement;
            while (p && p !== document.body) {
              const ps = getComputedStyle(p);
              if (/(hidden|clip|auto|scroll)/.test(ps.overflowX)) {
                const pb = p.getBoundingClientRect();
                if (b.right > pb.right + 1 && ps.overflowX !== 'auto' && ps.overflowX !== 'scroll') out.push(`"${name}" is cut off by its panel`);
                break;
              }
              p = p.parentElement;
            }
          }
        }
        return [...new Set(out)];
      });
      save(`responsive-${width}`, r);
      expect(r).toEqual([]);
    });
  }
});

test.describe('performance', () => {
  test('first load under 3 s; scrolling the library has no long tasks over 200 ms', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __long: number[] }).__long = [];
      new PerformanceObserver((l) => l.getEntries().forEach((e) => (window as unknown as { __long: number[] }).__long.push(e.duration))).observe({ type: 'longtask', buffered: true });
    });
    const t0 = Date.now();
    await openEditor(page);
    const loadMs = Date.now() - t0;
    const nav = await page.evaluate(() => {
      const n = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return { domContentLoaded: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) };
    });
    await page.evaluate(() => ((window as unknown as { __long: number[] }).__long.length = 0));
    for (const tab of ['Characters', 'Props']) {
      await page.getByRole('tab', { name: tab }).click();
      const grid = page.locator('.libgrid');
      for (let i = 0; i < 40; i++) {
        await grid.evaluate((g) => g.parentElement?.scrollBy(0, 600));
        await page.mouse.wheel(0, 600);
        await page.waitForTimeout(50);
      }
    }
    const long = await page.evaluate(() => (window as unknown as { __long: number[] }).__long);
    save('performance', { editorReadyMs: loadMs, ...nav, longTasksWhileScrolling: long.map(Math.round) });
    expect(loadMs, 'editor ready').toBeLessThan(3000);
    expect(Math.max(0, ...long), 'longest task while scrolling (ms)').toBeLessThan(200);
  });

  test('Lighthouse on the editor', async () => {
    test.setTimeout(240_000);
    const out = path.join(AUDIT, 'report', 'lighthouse.json');
    const bin = path.join(ROOT, 'node_modules', '.bin', 'lighthouse');
    try {
      execFileSync(bin, [`${APP}/`, '--quiet', '--output=json', `--output-path=${out}`, '--only-categories=performance,accessibility,best-practices', '--preset=desktop', '--chrome-flags=--headless=new'], { timeout: 200_000 });
    } catch (err) {
      if (!fs.existsSync(out)) throw err;
    }
    const lh = JSON.parse(fs.readFileSync(out, 'utf8'));
    const summary = {
      performance: Math.round(lh.categories.performance.score * 100),
      accessibility: Math.round(lh.categories.accessibility.score * 100),
      bestPractices: Math.round(lh.categories['best-practices'].score * 100),
      fcpMs: Math.round(lh.audits['first-contentful-paint'].numericValue),
      lcpMs: Math.round(lh.audits['largest-contentful-paint'].numericValue),
      tbtMs: Math.round(lh.audits['total-blocking-time'].numericValue),
      cls: lh.audits['cumulative-layout-shift'].numericValue,
      jsKb: Math.round((lh.audits['total-byte-weight'].numericValue ?? 0) / 1024),
    };
    save('lighthouse-summary', summary);
    expect(summary.lcpMs, 'largest contentful paint').toBeLessThan(3000);
    expect(summary.performance).toBeGreaterThanOrEqual(70);
  });
});

test.describe('security', () => {
  test('npm audit: no high or critical vulnerabilities', async () => {
    let json = '';
    try {
      json = execSync('npm audit --json', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    } catch (err) {
      json = (err as { stdout?: Buffer }).stdout?.toString() ?? '{}';
    }
    const audit = JSON.parse(json || '{}');
    const v = audit.metadata?.vulnerabilities ?? {};
    const list = Object.entries(audit.vulnerabilities ?? {}).map(([name, x]) => ({ name, severity: (x as { severity: string }).severity, direct: (x as { isDirect: boolean }).isDirect }));
    save('npm-audit', { counts: v, list });
    expect((v.high ?? 0) + (v.critical ?? 0), JSON.stringify(list.filter((x) => /high|critical/.test(x.severity)))).toBe(0);
  });

  test('no secrets in git history', async () => {
    const env = ['.env', '.env.local']
      .map((f) => path.join(ROOT, f))
      .filter((f) => fs.existsSync(f))
      .flatMap((f) => fs.readFileSync(f, 'utf8').split('\n'))
      .map((l) => /^(\w+)=(.+)$/.exec(l.trim()))
      .filter((m): m is RegExpExecArray => !!m && /KEY|SECRET|TOKEN|PASSWORD/.test(m[1]) && m[2].length >= 8)
      .map((m) => ({ name: m[1], value: m[2].replace(/^['"]|['"]$/g, '') }));
    const history = execSync('git log -p --all --no-color', { cwd: ROOT, maxBuffer: 2 * 1024 * 1024 * 1024 }).toString();
    const found = env.filter((e) => history.includes(e.value)).map((e) => `${e.name} value is in git history`);
    if (/AIza[0-9A-Za-z_-]{35}/.test(history)) found.push('a Google API key pattern is in git history');
    const trackedEnv = execSync('git ls-files', { cwd: ROOT }).toString().split('\n').filter((f) => /(^|\/)\.env(\.|$)/.test(f) && !f.endsWith('.example'));
    if (trackedEnv.length) found.push(`env files tracked: ${trackedEnv.join(', ')}`);
    save('git-secrets', { checked: env.map((e) => e.name), found });
    expect(found).toEqual([]);
  });

  test('security headers: CSP and friends on pages and the API', async ({ request }) => {
    const page = await request.get(`${APP}/`);
    const h = page.headers();
    const missing = ['content-security-policy', 'x-content-type-options', 'referrer-policy', 'x-frame-options'].filter((k) => !h[k] && !(k === 'x-frame-options' && /frame-ancestors/.test(h['content-security-policy'] ?? '')));
    const api = (await request.get(`${APP}/api/voices`)).headers();
    if (!api['x-content-type-options']) missing.push('x-content-type-options on the API');
    save('headers', { page: h, api, missing });
    expect(missing).toEqual([]);
  });
});
