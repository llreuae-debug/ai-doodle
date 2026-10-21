/**
 * Part 4: API and error handling.
 *
 * Valid requests go to the real Google AI (8790). Failures use the mock (8791 → 8799), which
 * answers every Google AI call with a 500, never answers (timeout), or reports the daily limit.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { APIRequestContext, Page } from '@playwright/test';
import { z } from 'zod';
import { APP, AUDIT, dialog, expect, FAILING, GATED, MOCK, openEditor, ROOT, test } from './helpers';

const Mood = z.enum(['happy', 'tense', 'calm', 'sad', 'exciting']);
const Slide = z.object({ n: z.number(), narration: z.string().min(1), speaker: z.string(), on_screen_text: z.string(), visuals: z.array(z.object({ type: z.enum(['character', 'element', 'scene']), ref: z.string().nullable(), description: z.string(), position: z.string() })), transition: z.string(), mood: Mood });
const RESPONSES = {
  '/api/story': z.object({ storyboard: z.object({ title: z.string(), logline: z.string(), takeaway: z.string(), characters: z.array(z.object({ id: z.string(), name: z.string(), look: z.string() })), acts: z.array(z.object({ name: z.string(), slides: z.array(z.number()) })), slides: z.array(Slide).min(10) }), warnings: z.array(z.string()) }),
  '/api/slide': z.object({ slide: Slide }),
  '/api/element': z.object({ results: z.array(z.union([z.object({ kind: z.literal('vector'), name: z.string(), strokes: z.array(z.string()).min(1), fills: z.array(z.object({ d: z.string(), c: z.string() })) }), z.object({ kind: z.literal('image'), name: z.string(), url: z.string(), width: z.number(), height: z.number(), transparent: z.boolean() })])).min(1) }).passthrough(),
  '/api/tts': z.object({ audioUrl: z.string().startsWith('/media/'), durationSec: z.number().positive(), words: z.array(z.object({ w: z.string(), start: z.number(), end: z.number() })), timing: z.enum(['estimate', 'precise']), format: z.string() }),
  '/api/music': z.object({ audioUrl: z.string(), durationSec: z.number().positive(), loopable: z.literal(true), seed: z.number(), generated: z.number(), sections: z.array(z.object({ fromSec: z.number(), toSec: z.number(), mood: Mood, url: z.string() })) }),
  '/api/ai/voiceline': z.object({ text: z.string().min(3) }),
  '/api/voices': z.object({ defaults: z.record(z.string(), z.string()), voices: z.array(z.object({ id: z.string(), name: z.string(), gender: z.string(), previewUrl: z.string() }).passthrough()).min(5), langSupport: z.record(z.string(), z.object({ engine: z.string(), note: z.string() })) }),
  '/api/music/styles': z.object({ styles: z.array(z.object({ id: z.string(), label: z.string(), instruments: z.array(z.string()) })).min(3), moods: z.record(z.string(), z.unknown()) }),
  '/api/ai/status': z.object({ configured: z.boolean(), provider: z.string(), source: z.string().nullable() }).passthrough(),
} as const;

const SLIDE = { n: 2, narration: 'The ant carried a crumb home.', speaker: 'narrator', on_screen_text: 'Home', visuals: [{ type: 'element', ref: null, description: 'a crumb', position: 'center' }], transition: 'fade', mood: 'calm' };
const VALID: Record<string, unknown> = {
  '/api/story': { title: 'The Kind Ant', length: 3, type: 'kids', audience: 'kids-4-8', tone: 'warm', language: 'en', englishText: false, include: '' },
  '/api/slide': { storyContext: { title: 'The Kind Ant', language: 'en', type: 'kids', audience: 'kids-4-8', tone: 'warm', englishText: false, characters: [] }, slide: SLIDE, instruction: 'Make it funnier' },
  '/api/element': { type: 'element', style: 'doodle', prompt: 'a red kite', variations: 1, projectId: 'audit' },
  '/api/tts': { text: 'Hello from the audit.', voice: 'Sulafat', language: 'en', style: 'warm', speed: 1, projectId: 'audit' },
  '/api/music': { projectId: 'audit', mode: 'whole', totalSec: 20, sections: [{ fromSec: 0, toSec: 20, mood: 'calm' }], style: 'calm-piano', instruments: [], noPercussion: true, vocalsOff: true, extra: '' },
  '/api/ai/voiceline': { items: 'a drawing of a rocket', title: 'Launch day' },
};
const INVALID: Record<string, unknown[]> = {
  '/api/story': [{}, { ...(VALID['/api/story'] as object), title: 'x'.repeat(500) }, { ...(VALID['/api/story'] as object), length: 'long' }],
  '/api/slide': [{}, { ...(VALID['/api/slide'] as object), instruction: 'x'.repeat(5000) }, { ...(VALID['/api/slide'] as object), slide: 'nope' }],
  '/api/element': [{}, { ...(VALID['/api/element'] as object), prompt: 'x'.repeat(5000) }, { ...(VALID['/api/element'] as object), variations: 'many' }, { ...(VALID['/api/element'] as object), characterSheet: { name: 'a', look: 'b', reference: { mimeType: 'image/gif', data: 'AAAA' } } }],
  '/api/tts': [{}, { ...(VALID['/api/tts'] as object), text: 'x'.repeat(5000) }, { ...(VALID['/api/tts'] as object), voice: 'NotAVoice' }, { ...(VALID['/api/tts'] as object), speed: 'fast' }],
  '/api/music': [{}, { ...(VALID['/api/music'] as object), totalSec: 99999 }, { ...(VALID['/api/music'] as object), sections: 'all' }],
  '/api/ai/voiceline': [{ items: 'x'.repeat(5000) }, { items: 42 }],
  '/api/ai/set-key': [{}, { key: 'short' }, { key: 42 }],
};

/** A request context with this app's session cookie (pages hand it out). */
async function session(playwright: { request: { newContext: (o: object) => Promise<APIRequestContext> } }, base: string) {
  const ctx = await playwright.request.newContext({ baseURL: base });
  await ctx.get('/');
  return ctx;
}

const saveData = (name: string, data: unknown) => {
  fs.mkdirSync(path.join(AUDIT, 'report', 'data'), { recursive: true });
  fs.writeFileSync(path.join(AUDIT, 'report', 'data', `${name}.json`), `${JSON.stringify(data, null, 1)}\n`);
};

test.describe('valid requests (real Google AI)', () => {
  test.describe.configure({ mode: 'serial' });
  const results: Record<string, unknown> = {};
  test.afterAll(() => saveData('api-valid', results));

  for (const route of ['/api/voices', '/api/music/styles', '/api/ai/status'] as const) {
    test(`GET ${route} → 200 and the expected shape`, async ({ playwright }) => {
      const api = await session(playwright, APP);
      const res = await api.get(route);
      expect(res.status()).toBe(200);
      const parsed = RESPONSES[route].safeParse(await res.json());
      results[route] = { status: res.status(), schema: parsed.success ? 'ok' : parsed.error.issues.slice(0, 3) };
      expect(parsed.success, JSON.stringify(parsed.error?.issues?.slice(0, 3))).toBe(true);
    });
  }

  for (const route of Object.keys(VALID)) {
    test(`POST ${route} → 200 and the expected shape`, async ({ playwright }) => {
      test.setTimeout(10 * 60_000);
      const api = await session(playwright, APP);
      const res = await api.post(route, { data: VALID[route], timeout: 9 * 60_000 });
      const body = await res.json();
      const quota = res.status() === 429 && /daily|limit/i.test(body.message ?? '');
      results[route] = { status: res.status(), message: body.message, quotaLimited: quota };
      // A used-up free daily limit is Google's answer, not an app failure: record it and stop here.
      test.skip(quota, `Google AI free daily limit reached: ${body.message}`);
      expect(res.status(), body.message).toBe(200);
      const parsed = (RESPONSES as Record<string, z.ZodTypeAny>)[route].safeParse(body);
      (results[route] as Record<string, unknown>).schema = parsed.success ? 'ok' : parsed.error.issues.slice(0, 3);
      expect(parsed.success, JSON.stringify(parsed.error?.issues?.slice(0, 3))).toBe(true);
      if (route === '/api/tts' || route === '/api/music') {
        const media = await api.get(body.audioUrl);
        expect(media.status()).toBe(200);
        expect(media.headers()['content-type']).toMatch(/^audio\//);
      }
    });
  }
});

test.describe('invalid input → 400 with a clear message', () => {
  for (const [route, bodies] of Object.entries(INVALID)) {
    test(`POST ${route}`, async ({ playwright }) => {
      const api = await session(playwright, FAILING);
      for (const body of bodies) {
        const res = await api.post(route, { data: body });
        const json = await res.json();
        expect(res.status(), `${route} ${JSON.stringify(body).slice(0, 80)}`).toBe(400);
        expect(json.message).toMatch(/^Check |Send a JSON/);
        // The message must not echo what was typed.
        expect(json.message.length).toBeLessThan(200);
      }
      const notJson = await api.post(route, { headers: { 'Content-Type': 'application/json' }, data: '{not json' });
      expect(notJson.status()).toBe(400);
    });
  }

  test('wrong method and unknown route', async ({ playwright }) => {
    const api = await session(playwright, FAILING);
    expect((await api.get('/api/story')).status()).toBe(405);
    expect((await api.post('/api/voices', { data: {} })).status()).toBe(405);
    expect((await api.get('/api/nothing-here')).status()).toBe(404);
  });

  test('a request body over the size limit is refused (413)', async ({ playwright }) => {
    const api = await session(playwright, FAILING);
    const res = await api.post('/api/element', { headers: { 'Content-Type': 'application/json' }, data: JSON.stringify({ prompt: 'x'.repeat(7 * 1024 * 1024) }) }).catch((e: Error) => e);
    // The server stops reading at 6 MB: either a 413 answer or a closed connection.
    if (res instanceof Error) expect(res.message).toMatch(/socket|ECONNRESET|closed|EPIPE/i);
    else expect(res.status()).toBe(413);
  });
});

/** Fills the browser's own rate-limit bucket by calling the API from the page (same IP and cookie). */
async function useUpBucket(page: Page, route: string, times: number) {
  return page.evaluate(
    async ({ route, times }) => {
      let last = 0;
      for (let i = 0; i < times; i++) last = (await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status;
      return last;
    },
    { route, times },
  );
}

const setMode = async (request: APIRequestContext, mode: string) => request.post(`${MOCK}/__mode`, { data: { mode } });

test.describe('rate limits and upstream failures (mock Google AI)', () => {
  test.describe.configure({ mode: 'serial' });

  test('rate limit → 429, and the generator says to wait', async ({ page, request }) => {
    await setMode(request, 'error500');
    await openEditor(page, FAILING);
    const last = await useUpBucket(page, '/api/element', 25);
    expect(last).toBe(429);
    await page.getByRole('tab', { name: 'Props' }).click();
    await page.getByRole('button', { name: 'Generate Props with AI' }).click();
    const credits = await dialog(page).locator('.credits').innerText();
    await dialog(page).getByRole('textbox', { name: 'Describe what to make' }).fill('a red kite');
    await dialog(page).getByRole('button', { name: 'Generate' }).click();
    await expect(dialog(page)).toContainText(/wait a minute and try again/i, { timeout: 20_000 });
    await expect(dialog(page).locator('.credits')).toHaveText(credits);
  });

  for (const [mode, expectText] of [
    ['error500', /Google AI returned an error|try again/i],
    ['timeout', /couldn't reach|took too long|try again/i],
    ['quota', /daily limit|resets|billing/i],
  ] as const) {
    test(`Google AI ${mode}: plain-words error, no credits used, app keeps working`, async ({ page, request }) => {
      test.setTimeout(4 * 60_000);
      await setMode(request, mode);
      await openEditor(page, FAILING);
      await page.getByRole('tab', { name: 'Props' }).click();
      await page.getByRole('button', { name: 'Generate Props with AI' }).click();
      const credits = await dialog(page).locator('.credits').innerText();
      await dialog(page).getByRole('textbox', { name: 'Describe what to make' }).fill('a green kite');
      await dialog(page).getByRole('button', { name: 'Generate' }).click();
      await expect(dialog(page)).toContainText(expectText, { timeout: 3 * 60_000 });
      await expect(dialog(page).locator('.credits'), 'no credits charged for a failure').toHaveText(credits);
      // Words a person can read: no stack traces, codes or JSON.
      expect(await dialog(page).innerText()).not.toMatch(/\{"|stack|TypeError|at [A-Za-z]+ \(|undefined/);
      await page.keyboard.press('Escape');
      await page.locator('.libgrid .tile').first().click();
      await expect(page.locator('.toast')).toContainText('Added');
    });
  }

  test('voiceover and music errors are shown in plain words', async ({ page, request }) => {
    test.setTimeout(4 * 60_000);
    await setMode(request, 'error500');
    await openEditor(page, FAILING);
    await page.getByRole('button', { name: 'Generate voiceover' }).click();
    await dialog(page).getByRole('textbox', { name: 'What should the voice say?' }).fill('Hello there.');
    await dialog(page).getByRole('button', { name: 'Make voice' }).click();
    await expect(dialog(page)).toContainText(/Google AI|try again/i, { timeout: 3 * 60_000 });
    await page.keyboard.press('Escape');
    await page.locator('aside.right').getByRole('button', { name: /^Generate music/ }).click();
    const credits = await dialog(page).locator('.credits').innerText();
    await dialog(page).getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(dialog(page)).toContainText(/Google AI|music|try again/i, { timeout: 3 * 60_000 });
    await expect(dialog(page).locator('.credits')).toHaveText(credits);
  });
});

test.describe('secrets, CORS, sessions', () => {
  test('no key or secret in any response, page, script or network log', async ({ page, playwright }) => {
    const env = ['.env', '.env.local']
      .map((f) => path.join(ROOT, f))
      .filter((f) => fs.existsSync(f))
      .flatMap((f) => fs.readFileSync(f, 'utf8').split('\n'))
      .map((l) => /^(\w+)=(.+)$/.exec(l.trim()))
      .filter((m): m is RegExpExecArray => !!m && /KEY|SECRET|TOKEN|PASSWORD/.test(m[1]) && m[2].replace(/['"]/g, '').length >= 8)
      .map((m) => ({ name: m[1], value: m[2].replace(/^['"]|['"]$/g, '') }));
    const patterns = [/AIza[0-9A-Za-z_-]{30,}/, /AQ\.[A-Za-z0-9_-]{30,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /"private_key"/];
    const found: string[] = [];
    const scan = (where: string, text: string) => {
      for (const e of env) if (text.includes(e.value)) found.push(`${e.name} appears in ${where}`);
      for (const p of patterns) if (p.test(text)) found.push(`a key-like value (${p.source.slice(0, 12)}…) appears in ${where}`);
    };
    // Everything the server sends to a browser.
    const dist = path.join(ROOT, 'dist');
    const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((x) => (x.isDirectory() ? walk(path.join(d, x.name)) : [path.join(d, x.name)]));
    for (const f of walk(dist).filter((f) => /\.(js|html|css|json|svg)$/.test(f))) scan(path.relative(ROOT, f), fs.readFileSync(f, 'utf8'));
    const api = await session(playwright, APP);
    for (const r of ['/api/voices', '/api/music/styles', '/api/ai/status', '/']) scan(`GET ${r}`, await (await api.get(r)).text());
    // The network log of a real session.
    const log: string[] = [];
    page.on('response', async (r) => {
      log.push(`${r.url()} ${JSON.stringify(r.headers())}`);
      if (/\/api\//.test(r.url())) log.push(await r.text().catch(() => ''));
    });
    page.on('request', (r) => log.push(`${r.url()} ${JSON.stringify(r.headers())} ${r.postData() ?? ''}`));
    await openEditor(page);
    await page.getByRole('button', { name: 'Generate voiceover' }).click();
    await expect(dialog(page).getByRole('button', { name: /^Preview / }).first()).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'API Key' }).click();
    await page.waitForTimeout(1000);
    scan('the browser network log', log.join('\n'));
    scan('the page HTML', await page.content());
    scan('localStorage', await page.evaluate(() => JSON.stringify({ ...localStorage })));
    saveData('secrets', { checked: { envValues: env.map((e) => e.name), patterns: patterns.length }, found });
    expect(found, found.join('\n')).toEqual([]);
  });

  test('CORS: other sites get no access', async ({ playwright }) => {
    const api = await session(playwright, APP);
    const evil = 'https://evil.example';
    const pre = await api.fetch('/api/voices', { method: 'OPTIONS', headers: { Origin: evil, 'Access-Control-Request-Method': 'POST' } });
    expect(pre.headers()['access-control-allow-origin'] ?? '').not.toMatch(/\*|evil/);
    const get = await api.get('/api/voices', { headers: { Origin: evil } });
    expect(get.headers()['access-control-allow-origin'] ?? '').not.toMatch(/\*|evil/);
    // Without this site's cookie (a cross-site request carries none: SameSite=Strict) the API refuses.
    const bare = await playwright.request.newContext({ baseURL: APP });
    const res = await bare.post('/api/element', { data: VALID['/api/element'], headers: { Origin: evil } });
    expect(res.status()).toBe(401);
    const cookie = (await (await playwright.request.newContext({ baseURL: APP })).get('/')).headers()['set-cookie'] ?? '';
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
  });

  test('the key dialog cannot be used by just anyone to replace the server key', async ({ playwright }) => {
    // Pages hand out sessions; the key endpoint must need more than that unless the site is password-protected or local.
    const api = await session(playwright, APP);
    const res = await api.post('/api/ai/set-key', { data: { key: 'AIzaSy' + 'x'.repeat(33) }, headers: { 'X-Forwarded-For': '203.0.113.9' } });
    expect([403, 400]).toContain(res.status());
  });

  test('access password gate locks pages, files and the API', async ({ playwright, page }) => {
    const bare = await playwright.request.newContext({ baseURL: GATED });
    const home = await bare.get('/');
    expect(home.status()).toBe(401);
    expect(await home.text()).toMatch(/password/i);
    expect((await bare.get('/api/voices')).status()).toBe(401);
    expect((await bare.get('/media/x/abc.mp3')).status()).toBe(401);
    expect((await bare.post('/api/access', { data: { password: 'wrong' } })).status()).toBe(401);
    expect((await bare.post('/api/access', { data: { password: 'audit-pass' } })).status()).toBe(200);
    expect((await bare.get('/api/voices')).status()).toBe(200);
    await page.goto(GATED);
    await page.getByRole('textbox').or(page.locator('input[type=password]')).first().fill('audit-pass');
    await page.keyboard.press('Enter');
    await expect(page.locator('.editor')).toBeVisible({ timeout: 20_000 });
    // Guessing is rate limited.
    const guesser = await playwright.request.newContext({ baseURL: GATED });
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await guesser.post('/api/access', { data: { password: `guess${i}` } })).status();
    expect(last).toBe(429);
  });
});
