import { test as base, expect, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export { expect };
export const APP = 'http://localhost:8790';
export const FAILING = 'http://localhost:8791';
export const GATED = 'http://localhost:8792';
export const MOCK = 'http://localhost:8799';
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '../..');
export const AUDIT = path.resolve(HERE, '..');
export const FIXTURES = path.join(AUDIT, 'fixtures');

export type Problem = { kind: 'console' | 'pageerror' | 'requestfailed' | 'http'; text: string };

/** Problems the browser reports while a test runs: console errors, uncaught errors and rejections, failed requests. */
function watch(page: Page): Problem[] {
  const list: Problem[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') list.push({ kind: 'console', text: m.text().slice(0, 300) });
  });
  page.on('pageerror', (e) => list.push({ kind: 'pageerror', text: e.message.slice(0, 300) }));
  page.on('requestfailed', (r) => {
    const why = r.failure()?.errorText ?? '';
    // Aborted requests are the browser cancelling work we no longer need (lazy images, navigation).
    if (!/ERR_ABORTED|NS_BINDING_ABORTED|cancelled|Load request cancelled/i.test(why)) list.push({ kind: 'requestfailed', text: `${r.method()} ${r.url()} ${why}` });
  });
  page.on('response', (r) => {
    if (r.status() >= 400) list.push({ kind: 'http', text: `${r.status()} ${r.request().method()} ${r.url()}` });
  });
  return list;
}

export const test = base.extend<{ problems: Problem[] }>({
  problems: async ({ page }, use, testInfo) => {
    const list = watch(page);
    await use(list);
    if (list.length) await testInfo.attach('browser-problems.json', { body: JSON.stringify(list, null, 1), contentType: 'application/json' });
  },
});

/** Fails if the browser reported anything not matched by `allow`. */
export function expectClean(problems: Problem[], allow: RegExp[] = []) {
  const left = problems.filter((p) => !allow.some((a) => a.test(p.text)));
  expect(left, `browser problems:\n${left.map((p) => `${p.kind}: ${p.text}`).join('\n')}`).toEqual([]);
}

/** Opens the editor on a fresh browser profile and closes the first-run template gallery. */
export async function openEditor(page: Page, base = APP) {
  await page.goto(`${base}/?audit`);
  await page.locator('.editor').waitFor();
  const gallery = page.getByRole('dialog', { name: 'Project template gallery' });
  await gallery.waitFor({ timeout: 3000 }).catch(() => {});
  if (await gallery.isVisible()) await page.keyboard.press('Escape');
  await expect(page.locator('[role=dialog][aria-modal=true]')).toHaveCount(0);
  // The library list comes from the manifest.
  await expect(page.locator('.libgrid .tile').first()).toBeVisible();
}

export const dialog = (page: Page) => page.locator('[role=dialog][aria-modal=true]').last();

/** The project as JSON (blobs shown as "blob:<size>"), from the ?audit hook. */
export type AuditProject = {
  name: string;
  aspectRatio: string;
  board: string;
  handId: string | null;
  defaultSpeed?: number;
  scenes: { id: string; transition: string; speed: number; holdMs: number; syncVoice: boolean; drawSound?: boolean; handId?: string | null; mood?: string; voice: unknown; elements: { id: string; kind: string; x: number; y: number; size?: number; width?: number; rotation: number; hidden?: boolean; color?: boolean; text?: string; font?: string; weight?: number; fill?: string; anim: { type: string; speed?: number; durationMs: number | 'auto'; delayMs: number } }[] }[];
  music: null | { name: string; volume: number; duck?: boolean; fadeOut?: boolean };
  drawSound: { type: string; volume: number; muted?: boolean; quietDuringVoice?: boolean; capSound?: boolean; customName?: string };
  fonts: { name: string; family: string }[];
  assets: Record<string, unknown>;
};
export const project = (page: Page) => page.evaluate(() => (window as unknown as { __audit: { project: () => unknown } }).__audit.project()) as Promise<AuditProject>;
export const sceneIndex = (page: Page) => page.evaluate(() => (window as unknown as { __audit: { scene: () => number } }).__audit.scene());
export const toast = (page: Page) => page.locator('.toast');

/** Selects the first element on the board through the Layers tab. */
export async function selectFirstLayer(page: Page, kind?: 'text' | 'doodle') {
  await page.getByRole('tab', { name: 'Layers' }).click();
  const rows = page.locator('.layer .lname');
  const n = await rows.count();
  for (let i = 0; i < n; i++) {
    const row = rows.nth(i);
    const isText = (await row.locator('xpath=..').locator('.lthumb').innerText()).includes('Aa');
    if (!kind || (kind === 'text') === isText) {
      await row.click();
      break;
    }
  }
  await expect(page.locator('aside.right .card').first()).toContainText('Entrance');
}

/** Named UI states. The inventory crawl and the control sweep both enter them the same way. */
export const STATES: Record<string, { root: string; enter: (page: Page) => Promise<void> }> = {
  'top bar': { root: 'header.top', enter: async () => {} },
  'left · doodles · characters': { root: 'aside.left', enter: async (p) => void (await p.getByRole('tab', { name: 'Characters' }).click()) },
  'left · doodles · custom': { root: 'aside.left', enter: async (p) => void (await p.getByRole('tab', { name: 'Custom' }).click()) },
  'left · doodles · props': { root: 'aside.left', enter: async (p) => void (await p.getByRole('tab', { name: 'Props' }).click()) },
  'left · doodles · shapes': { root: 'aside.left', enter: async (p) => void (await p.getByRole('tab', { name: 'Shapes' }).click()) },
  'left · filter popover': {
    root: 'aside.left .filterpop',
    enter: async (p) => {
      await p.getByRole('tab', { name: 'Props' }).click();
      await p.locator('aside.left').getByRole('button', { name: /^Filter/ }).click();
    },
  },
  'left · text': { root: 'aside.left', enter: async (p) => void (await p.getByRole('tab', { name: 'Text' }).click()) },
  'left · layers': { root: 'aside.left', enter: async (p) => void (await p.getByRole('tab', { name: 'Layers' }).click()) },
  'board controls': { root: 'section.center', enter: async () => {} },
  'pen sound popover': { root: '.sound-popover', enter: async (p) => void (await p.locator('.sound-control-wrap').hover()) },
  'right · slide': { root: 'aside.right', enter: async (p) => void (await p.getByRole('tab', { name: 'Properties' }).click()) },
  'right · doodle selected': { root: 'aside.right', enter: async (p) => selectFirstLayer(p, 'doodle') },
  'right · text selected': { root: 'aside.right', enter: async (p) => selectFirstLayer(p, 'text') },
  'right · project': { root: 'aside.right', enter: async (p) => void (await p.getByRole('tab', { name: 'Project' }).click()) },
  timeline: { root: 'footer.timeline', enter: async () => {} },
  'slide menu': { root: '.menu', enter: async (p) => void (await p.getByRole('button', { name: 'Slide 1 options' }).click()) },
  'modal · Dashboard': { root: '[role=dialog]', enter: async (p) => void (await p.getByRole('button', { name: 'Dashboard' }).click()) },
  'modal · New project gallery': {
    root: '[role=dialog]',
    enter: async (p) => {
      await p.getByRole('button', { name: 'Dashboard' }).click();
      await p.getByRole('button', { name: 'New project' }).click();
    },
  },
  'modal · Tutorials': { root: '[role=dialog]', enter: async (p) => void (await p.getByRole('button', { name: 'Tutorials' }).click()) },
  'modal · API key': { root: '[role=dialog]', enter: async (p) => void (await p.getByRole('button', { name: 'API Key' }).click()) },
  'modal · Export': { root: '[role=dialog]', enter: async (p) => void (await p.getByRole('button', { name: 'Export' }).click()) },
  'modal · Story wizard': { root: '[role=dialog]', enter: async (p) => void (await p.getByRole('button', { name: 'Story', exact: true }).click()) },
  'modal · Generate props with AI': {
    root: '[role=dialog]',
    enter: async (p) => {
      await p.getByRole('tab', { name: 'Props' }).click();
      await p.getByRole('button', { name: 'Generate Props with AI' }).click();
    },
  },
  'modal · Generate characters with AI': {
    root: '[role=dialog]',
    enter: async (p) => {
      await p.getByRole('tab', { name: 'Characters' }).click();
      await p.getByRole('button', { name: 'Generate Characters with AI' }).click();
    },
  },
  'modal · Character variations': { root: '[role=dialog]', enter: async (p) => void (await p.locator('#btn-character-variations').click()) },
  'modal · Voiceover': { root: '[role=dialog]', enter: async (p) => void (await p.getByRole('button', { name: 'Generate voiceover' }).click()) },
  'modal · Music': { root: '[role=dialog]', enter: async (p) => void (await p.locator('aside.right').getByRole('button', { name: /^Generate music/ }).click()) },
  'modal · Music library': {
    root: '[role=dialog]',
    enter: async (p) => {
      await p.getByRole('tab', { name: 'Project' }).click();
      await p.getByRole('button', { name: /Select from Library/ }).click();
    },
  },
  'modal · Upload image': {
    root: '[role=dialog]',
    enter: async (p) => {
      await p.locator('input[type=file][accept^="image/"]').setInputFiles(path.join(FIXTURES, 'logo.png'));
    },
  },
};

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

/** Saves a screenshot into the report folder (and attaches it to the test). */
export async function shot(page: Page, testInfo: TestInfo, name: string) {
  const file = path.join(AUDIT, 'report', 'screens', `${name}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file });
  await testInfo.attach(name, { path: file, contentType: 'image/png' });
  return file;
}
