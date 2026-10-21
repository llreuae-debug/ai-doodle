/**
 * Part 5: end-to-end flows with the real Google AI key. Exports are checked with ffprobe and
 * ffmpeg (duration, size, streams, loudness in time windows).
 *
 * A used-up free daily Google AI limit is recorded as "blocked by quota", not as an app bug.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { AUDIT, dialog, expect, FIXTURES, openEditor, project, test, toast } from './helpers';

const require = createRequire(import.meta.url);
const FFPROBE: string = require('ffprobe-static').path;
const FFMPEG: string = require('ffmpeg-static');
const OUT = path.join(AUDIT, 'report', 'exports');
fs.mkdirSync(OUT, { recursive: true });
const fixture = (f: string) => path.join(FIXTURES, f);
const notes: Record<string, unknown> = {};
const note = (flow: string, data: unknown) => {
  notes[flow] = data;
  fs.mkdirSync(path.join(AUDIT, 'report', 'data'), { recursive: true });
  fs.writeFileSync(path.join(AUDIT, 'report', 'data', 'flows.json'), `${JSON.stringify(notes, null, 1)}\n`);
};

/** Renders at `res`, downloads the MP4 and returns its path. */
async function exportVideo(page: Page, name: string, res: '720p' | '1080p' = '720p', opts: { penSound?: boolean } = {}) {
  await page.getByRole('button', { name: 'Export' }).click();
  const d = dialog(page);
  if (opts.penSound !== undefined) await d.getByRole('checkbox', { name: 'Include pen drawing sound in this export' }).setChecked(opts.penSound);
  const row = d.locator('.export-row', { has: page.locator('.er-name', { hasText: new RegExp(`^${res}$`) }) });
  await row.getByRole('button', { name: /Render/ }).click();
  const link = row.getByRole('link', { name: 'Download' });
  await expect(link).toBeVisible({ timeout: 20 * 60_000 });
  const [download] = await Promise.all([page.waitForEvent('download'), link.click()]);
  const file = path.join(OUT, `${name}.mp4`);
  await download.saveAs(file);
  await page.keyboard.press('Escape');
  return file;
}

function probe(file: string) {
  const j = JSON.parse(execFileSync(FFPROBE, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).toString());
  const v = j.streams.find((s: { codec_type: string }) => s.codec_type === 'video');
  const a = j.streams.find((s: { codec_type: string }) => s.codec_type === 'audio');
  return { duration: Number(j.format.duration), width: v?.width, height: v?.height, video: v?.codec_name, audio: a?.codec_name ?? null };
}

/** Mean loudness (dB) of the audio between t0 and t1 seconds. */
function loudness(file: string, t0: number, t1: number) {
  const out = execFileSync(FFMPEG, ['-hide_banner', '-ss', String(t0), '-t', String(t1 - t0), '-i', file, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  return Number(/mean_volume: (-?[\d.]+) dB/.exec(out)?.[1] ?? -91);
}
const lengthSec = async (page: Page) => Number(/([\d.]+) sec ·/.exec(await page.locator('aside.right').innerText())?.[1]);

/** Stops a flow that hit Google's free daily limit, with a note. */
async function quotaGate(page: Page, flow: string) {
  const text = await page.locator('body').innerText();
  if (/daily limit|free daily|resets in about|no quota/i.test(text)) {
    note(flow, { blocked: 'Google AI free daily limit', text: /[^.]*(daily limit|resets in about|no quota)[^.]*\./i.exec(text)?.[0] });
    test.skip(true, 'Google AI free daily limit reached');
  }
}

test.describe.configure({ mode: 'serial' });

test('E1 new project → character + prop + text → play → 1080p MP4', async ({ page }) => {
  test.setTimeout(20 * 60_000);
  await openEditor(page);
  await page.getByRole('button', { name: 'Dashboard' }).click();
  await dialog(page).getByRole('button', { name: 'New project' }).click();
  await dialog(page).getByRole('button', { name: 'Empty Project' }).click();
  await dialog(page).getByRole('button', { name: 'Next' }).click();
  await page.getByRole('tab', { name: 'Characters' }).click();
  await page.locator('.libgrid .tile').first().click();
  await page.getByRole('tab', { name: 'Props' }).click();
  await page.locator('.libgrid .tile').nth(3).click();
  await page.getByRole('tab', { name: 'Text' }).click();
  await page.locator('aside.left').getByRole('button', { name: '+ Heading' }).click();
  expect((await project(page)).scenes[0].elements).toHaveLength(3);
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible({ timeout: 60_000 });
  await page.getByRole('tab', { name: 'Project' }).click();
  const expected = await lengthSec(page);
  const file = await exportVideo(page, 'E1-1080p', '1080p');
  const p = probe(file);
  note('E1', { file: path.relative(AUDIT, file), expectedSec: expected, ...p });
  expect(p.width).toBe(1920);
  expect(p.height).toBe(1080);
  expect(p.video).toBe('h264');
  expect(p.audio).toBe('aac');
  expect(Math.abs(p.duration - expected)).toBeLessThan(0.5);
});

test('E9 undo/redo across 20 mixed actions returns to the same state', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  await openEditor(page);
  const start = JSON.stringify(await project(page));
  const right = page.locator('aside.right');
  const actions: (() => Promise<unknown>)[] = [
    () => page.getByRole('tab', { name: 'Props' }).click().then(() => page.locator('.libgrid .tile').first().click()),
    () => page.getByRole('tab', { name: 'Text' }).click().then(() => page.locator('aside.left').getByRole('button', { name: '+ Body' }).click()),
    () => right.getByRole('button', { name: 'Duplicate' }).click(),
    () => right.getByLabel('Animation').selectOption('pop'),
    () => right.getByLabel('Rotate').fill('30'),
    () => page.getByRole('button', { name: 'Add slide' }).click(),
    () => right.getByLabel('Transition type:').selectOption('iris'),
    () => right.getByLabel('Drawing speed:').selectOption('1.5'),
    () => page.getByRole('button', { name: 'Slide 1', exact: true }).click().then(() => right.getByLabel('Pause at end:').fill('2')).then(() => right.getByLabel('Pause at end:').press('Enter')),
    () => page.getByRole('tab', { name: 'Project' }).click().then(() => right.getByRole('button', { name: 'Blackboard' }).click()),
    () => right.getByRole('button', { name: '1:1', exact: true }).click(),
    () => right.getByRole('button', { name: 'Chalk', exact: true }).click(),
    () => page.keyboard.press('m'),
    () => page.getByRole('button', { name: 'Slide 2 options' }).click().then(() => page.getByRole('menuitem', { name: 'Duplicate slide' }).click()),
    () => page.getByRole('button', { name: 'Slide 3 options' }).click().then(() => page.getByRole('menuitem', { name: 'Move left' }).click()),
    () => page.getByRole('tab', { name: 'Layers' }).click().then(() => page.locator('.layer').first().getByRole('button', { name: 'Hide' }).click()),
    () => page.locator('.layer').first().getByRole('button', { name: 'Delete' }).click(),
    () => page.getByRole('textbox', { name: 'Project name' }).fill('E9 project').then(() => page.getByRole('textbox', { name: 'Project name' }).press('Enter')),
    () => page.getByRole('tab', { name: 'Properties' }).click().then(() => right.getByLabel('Pen sound on this slide').uncheck()),
    () => page.getByRole('button', { name: 'Slide 2 options' }).click().then(() => page.getByRole('menuitem', { name: 'Delete slide' }).click()),
  ];
  const done: string[] = [];
  for (const [i, a] of actions.entries()) {
    const before = JSON.stringify(await project(page));
    await a();
    await page.waitForTimeout(150);
    if (JSON.stringify(await project(page)) !== before) done.push(`action ${i + 1}`);
  }
  const end = JSON.stringify(await project(page));
  const strip = (s: string) => JSON.parse(s, (k, v) => (k === 'updatedAt' ? undefined : v));
  await page.locator('canvas.stage').focus();
  await page.keyboard.press('Escape');
  for (let i = 0; i < 40 && (await page.getByRole('button', { name: 'Undo' }).isEnabled()); i++) await page.getByRole('button', { name: 'Undo' }).click();
  expect(strip(JSON.stringify(await project(page))), 'all undone = the start').toEqual(strip(start));
  for (let i = 0; i < 40 && (await page.getByRole('button', { name: 'Redo' }).isEnabled()); i++) await page.getByRole('button', { name: 'Redo' }).click();
  expect(strip(JSON.stringify(await project(page))), 'all redone = the end').toEqual(strip(end));
  note('E9', { actions: actions.length, changedState: done.length });
});

test('E8 save → reload → dashboard → open → restored; delete', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  await openEditor(page);
  await page.getByRole('textbox', { name: 'Project name' }).fill('E8 saved project');
  await page.getByRole('textbox', { name: 'Project name' }).press('Enter');
  await page.locator('input[type=file][accept^="image/"]').setInputFiles(fixture('logo.png'));
  await dialog(page).getByRole('button', { name: 'Add to board' }).click();
  await page.locator('input[type=file][accept="audio/*"]').first().setInputFiles(fixture('voice.mp3'));
  await expect(toast(page)).toContainText('Voiceover added');
  await page.locator('input[type=file][accept="audio/*"]').nth(1).setInputFiles(fixture('music.mp3'));
  await page.locator('input[type=file][accept=".ttf,.otf,.woff,.woff2"]').setInputFiles(fixture('font.ttf'));
  await page.getByRole('tab', { name: 'Project' }).click();
  await page.locator('aside.right').getByRole('button', { name: 'Kraft paper' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(toast(page)).toHaveText('Saved in this browser.');
  const saved = await project(page);
  await page.reload();
  await page.locator('.editor').waitFor();
  await expect.poll(async () => (await project(page)).name).toBe('E8 saved project');
  const reopened = await project(page);
  const strip = (p: unknown) => JSON.parse(JSON.stringify(p), (k, v) => (k === 'updatedAt' || k === 'artUrl' ? undefined : v));
  expect(strip(reopened)).toEqual(strip(saved));
  await page.getByRole('button', { name: 'Dashboard' }).click();
  await dialog(page).locator('.projrow', { hasText: 'E8 saved project' }).getByRole('button', { name: 'Open' }).click();
  expect(strip(await project(page))).toEqual(strip(saved));
  await page.getByRole('button', { name: 'Dashboard' }).click();
  const row = dialog(page).locator('.projrow', { hasText: 'E8 saved project' });
  await row.getByRole('button', { name: 'Delete' }).click();
  await row.getByRole('button', { name: 'Delete for good?' }).click();
  await expect(row).toHaveCount(0);
  note('E8', { restored: 'name, image, voice, music, font, board, slides', notSaved: 'nothing missing in this run' });
});

test('E7 pen sound: plays only while drawing; mute and volume; every type', async ({ page }) => {
  test.setTimeout(30 * 60_000);
  await openEditor(page);
  await page.getByRole('button', { name: 'Dashboard' }).click();
  await dialog(page).getByRole('button', { name: 'New project' }).click();
  await dialog(page).getByRole('button', { name: 'Empty Project' }).click();
  await dialog(page).getByRole('button', { name: 'Next' }).click();
  await page.getByRole('tab', { name: 'Props' }).click();
  await page.locator('.libgrid .tile').first().click();
  await page.getByRole('tab', { name: 'Properties' }).click();
  await page.locator('aside.right').getByLabel('Pause at end:').fill('3');
  await page.locator('aside.right').getByLabel('Pause at end:').press('Enter');
  const pr = await project(page);
  const total = (await page.locator('aside.right .row', { hasText: 'Slide duration' }).innerText()).match(/([\d.]+) sec/)![1];
  const drawEnd = Number(total) - 3;
  await page.getByRole('tab', { name: 'Project' }).click();
  const results: Record<string, unknown> = {};
  for (const type of ['Marker', 'Chalk', 'Pencil', 'Soft marker', 'Ballpoint']) {
    await page.locator('aside.right').getByRole('button', { name: type, exact: true }).click();
    const file = await exportVideo(page, `E7-${type.replace(' ', '-')}`, '720p', { penSound: true });
    const drawing = loudness(file, 0.3, Math.max(0.6, drawEnd - 0.2));
    const pause = loudness(file, drawEnd + 0.6, Number(total) - 0.2);
    results[type] = { drawingDb: drawing, pauseDb: pause };
    expect(drawing, `${type}: audible while drawing`).toBeGreaterThan(-45);
    expect(pause, `${type}: silent in the pause`).toBeLessThan(-70);
  }
  await page.locator('aside.right').getByRole('button', { name: 'Marker', exact: true }).click();
  await page.locator('aside.right').getByLabel(/^Volume \(/).fill('100');
  const loud = loudness(await exportVideo(page, 'E7-vol100', '720p', { penSound: true }), 0.3, drawEnd - 0.2);
  await page.locator('aside.right').getByLabel(/^Volume \(/).fill('20');
  const quiet = loudness(await exportVideo(page, 'E7-vol20', '720p', { penSound: true }), 0.3, drawEnd - 0.2);
  await page.locator('aside.right').getByRole('button', { name: 'Mute pen sound' }).click();
  const muted = loudness(await exportVideo(page, 'E7-muted', '720p', { penSound: true }), 0.3, drawEnd - 0.2);
  results.volume = { vol100Db: loud, vol20Db: quiet, mutedDb: muted };
  note('E7', { slideSec: Number(total), drawEnd, elements: pr.scenes[0].elements.length, results });
  expect(loud - quiet, 'volume 100% is clearly louder than 20%').toBeGreaterThan(8);
  expect(muted, 'muted export is silent').toBeLessThan(-70);
});

test('E5 voiceover: generate (Google AI) and upload; sync; export has narration', async ({ page }) => {
  test.setTimeout(15 * 60_000);
  await openEditor(page);
  await page.getByRole('button', { name: 'Generate voiceover' }).click();
  await dialog(page).getByRole('textbox', { name: 'What should the voice say?' }).fill('Welcome to the audit. This line was made by Google AI.');
  await dialog(page).getByRole('button', { name: 'Make voice' }).click();
  await expect(dialog(page).getByRole('button', { name: 'Use this voiceover' }).or(dialog(page).locator('.note', { hasText: /limit|error|try again/i }))).toBeVisible({ timeout: 5 * 60_000 });
  await quotaGate(page, 'E5');
  await dialog(page).getByRole('button', { name: 'Use this voiceover' }).click();
  const v = (await project(page)).scenes[0];
  expect(v.voice).toBeTruthy();
  expect(v.syncVoice).toBe(true);
  // Slide 2 gets an uploaded recording.
  await page.getByRole('button', { name: 'Slide 2', exact: true }).click();
  await page.locator('input[type=file][accept="audio/*"]').first().setInputFiles(fixture('voice.mp3'));
  await expect(toast(page)).toContainText('Voiceover added');
  await page.getByRole('tab', { name: 'Project' }).click();
  const expected = await lengthSec(page);
  const file = await exportVideo(page, 'E5-voice', '720p', { penSound: false });
  const p = probe(file);
  const voiceDb = loudness(file, 0.2, 3);
  note('E5', { ...p, expectedSec: expected, voiceDb });
  expect(p.audio).toBe('aac');
  expect(Math.abs(p.duration - expected)).toBeLessThan(0.5);
  expect(voiceDb, 'narration is audible in the export').toBeGreaterThan(-40);
});

test('E6 music: whole and by-section; length change → Refit; ducking', async ({ page }) => {
  test.setTimeout(30 * 60_000);
  await openEditor(page);
  await page.locator('aside.right').getByRole('button', { name: /^Generate music/ }).click();
  await dialog(page).getByRole('button', { name: 'Generate', exact: true }).click();
  const use = dialog(page).getByRole('button', { name: /^Use/ }).first();
  await expect(use.or(dialog(page).locator('.err'))).toBeVisible({ timeout: 10 * 60_000 });
  await quotaGate(page, 'E6');
  await use.click();
  await expect.poll(async () => (await project(page)).music?.name).toBeTruthy();
  // By section.
  await page.locator('aside.right').getByRole('button', { name: /^Generate music/ }).click();
  await dialog(page).getByRole('button', { name: /By section|by section|mood per section/i }).first().click();
  await dialog(page).getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(use.or(dialog(page).locator('.err'))).toBeVisible({ timeout: 10 * 60_000 });
  await use.click();
  // Make the video longer: the refit banner appears and refits without new generation.
  await page.getByRole('button', { name: 'Slide 1 options' }).click();
  await page.getByRole('menuitem', { name: 'Duplicate slide' }).click();
  await page.getByRole('button', { name: 'Slide 2 options' }).click();
  await page.getByRole('menuitem', { name: 'Duplicate slide' }).click();
  await expect(page.locator('.refit-banner')).toBeVisible();
  await page.locator('.refit-banner').getByRole('button', { name: 'Refit' }).click();
  await expect(toast(page)).toContainText(/refitted/i, { timeout: 5 * 60_000 });
  await expect(page.locator('.refit-banner')).toHaveCount(0);
  // Ducking: the same voice slide with ducking on and off.
  await page.getByRole('button', { name: 'Slide 1', exact: true }).click();
  await page.locator('input[type=file][accept="audio/*"]').first().setInputFiles(fixture('voice.mp3'));
  await page.getByRole('tab', { name: 'Project' }).click();
  const ducked = await exportVideo(page, 'E6-duck-on', '720p', { penSound: false });
  await page.locator('aside.right').getByLabel('Duck under voice').uncheck();
  const loud = await exportVideo(page, 'E6-duck-off', '720p', { penSound: false });
  const on = loudness(ducked, 0.5, 3.5);
  const off = loudness(loud, 0.5, 3.5);
  note('E6', { duckOnDb: on, duckOffDb: off, probe: probe(ducked) });
  expect(off - on, 'music is quieter under the voice when ducking is on').toBeGreaterThan(1.5);
});

test('E4 Generate with AI: element, character, scene; 4 variations; add to board', async ({ page }) => {
  test.setTimeout(30 * 60_000);
  await openEditor(page);
  const results: Record<string, unknown> = {};
  for (const [type, prompt] of [
    ['Element', 'a red kite with a long tail'],
    ['Character', 'a cheerful baker holding bread'],
    ['Scene', 'a quiet park with a bench'],
  ] as const) {
    await page.getByRole('tab', { name: 'Props' }).click();
    await page.getByRole('button', { name: 'Generate Props with AI' }).click();
    const d = dialog(page);
    await d.locator('.gen-kind').click();
    await d.getByRole('option', { name: new RegExp(`^${type}`) }).click();
    await expect(d.locator('.gen-kind')).toContainText(type);
    await d.getByRole('checkbox', { name: /variations/ }).check();
    await d.getByRole('textbox', { name: 'Describe what to make' }).fill(prompt);
    const credits = Number(/(\d+)/.exec(await d.locator('.credits').innerText())?.[1]);
    await d.getByRole('button', { name: 'Generate' }).click();
    const add = d.getByRole('button', { name: 'Add to board' }).first();
    await expect(add.or(d.locator('.err'))).toBeVisible({ timeout: 8 * 60_000 });
    await quotaGate(page, `E4 ${type}`);
    await expect(d.getByRole('button', { name: 'Add to board' })).toHaveCount(4, { timeout: 60_000 }).catch(() => {});
    const tiles = await d.getByRole('button', { name: 'Add to board' }).count();
    const before = (await project(page)).scenes[0].elements.length;
    await add.click();
    await expect.poll(async () => (await project(page)).scenes[0].elements.length).toBe(before + 1);
    results[type] = { variations: tiles, creditsBefore: credits };
    expect(tiles, `${type}: 4 variations`).toBe(4);
  }
  note('E4', results);
});

test('E3 Urdu story: right-to-left text and an Urdu voice', async ({ page }) => {
  test.setTimeout(15 * 60_000);
  await openEditor(page);
  await page.getByRole('button', { name: 'Story', exact: true }).click();
  const d = dialog(page);
  await d.getByRole('textbox', { name: 'Title' }).fill('ایماندار لکڑہارا');
  await d.getByRole('radio', { name: 'Urdu' }).check();
  await d.getByRole('button', { name: 'Next' }).click();
  await d.getByRole('button', { name: 'Next' }).click();
  await expect(d.locator('.wiz-head h3').or(d.locator('[role=alert]'))).toBeVisible({ timeout: 6 * 60_000 });
  await quotaGate(page, 'E3');
  const script = await d.locator('.wiz-body').innerText();
  const urduChars = (script.match(/[؀-ۿ]/g) ?? []).length;
  const rtl = await d.locator('textarea, [contenteditable], .narr, td, p').evaluateAll((els) => els.filter((e) => /[؀-ۿ]/.test(e.textContent || (e as HTMLTextAreaElement).value || '')).map((e) => getComputedStyle(e).direction));
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Generate voiceover' }).click();
  await dialog(page).getByLabel('Language').selectOption('ur');
  await dialog(page).getByRole('textbox', { name: 'What should the voice say?' }).fill('سب کو سلام۔ یہ ایک چھوٹی سی کہانی ہے۔');
  const make = dialog(page).getByRole('button', { name: 'Make voice' });
  const supported = await make.isEnabled();
  let voice = 'not supported (message shown)';
  if (supported) {
    await make.click();
    await expect(dialog(page).getByRole('button', { name: 'Use this voiceover' }).or(dialog(page).locator('.note', { hasText: /limit|error|try again/i }))).toBeVisible({ timeout: 5 * 60_000 });
    await quotaGate(page, 'E3 voice');
    voice = (await dialog(page).getByRole('button', { name: 'Use this voiceover' }).isEnabled()) ? 'made' : 'failed';
  } else await expect(dialog(page).locator('.err')).toContainText(/Urdu|not supported/i);
  note('E3', { urduChars, rtlDirections: rtl, voice });
  expect(urduChars, 'the script is in Urdu').toBeGreaterThan(100);
  expect(rtl.length, 'Urdu lines are shown').toBeGreaterThan(0);
  expect(rtl.every((x) => x === 'rtl'), `Urdu text runs right to left (${rtl.join(',')})`).toBe(true);
  expect(voice).not.toBe('failed');
});

test('E2 3-minute English story: 4 steps → build → play → export', async ({ page }) => {
  test.setTimeout(90 * 60_000);
  await openEditor(page);
  await page.getByRole('button', { name: 'Story', exact: true }).click();
  const d = dialog(page);
  await d.getByRole('textbox', { name: 'Title' }).fill('The Kind Little Ant');
  await d.getByRole('button', { name: /^3 min/ }).click();
  await d.getByRole('radio', { name: 'Kids story' }).check();
  await d.getByRole('button', { name: 'Next' }).click();
  await d.getByRole('button', { name: 'Next' }).click();
  await expect(d.locator('.wiz-head h3').or(d.locator('[role=alert]'))).toBeVisible({ timeout: 6 * 60_000 });
  await quotaGate(page, 'E2 script');
  await d.getByRole('button', { name: 'Generate video' }).click();
  // The build can take a long time on a free key (it waits and retries when Google is busy).
  await expect(d).toHaveCount(0, { timeout: 85 * 60_000 });
  const pr = await project(page);
  const attention = pr.scenes.filter((s) => (s as { attention?: string }).attention).length;
  await page.getByRole('tab', { name: 'Project' }).click();
  const sec = await lengthSec(page);
  note('E2', { slides: pr.scenes.length, attention, lengthSec: sec, toast: await toast(page).innerText().catch(() => '') });
  expect(pr.scenes.length).toBeGreaterThanOrEqual(20);
  expect(sec).toBeGreaterThan(150);
  expect(sec).toBeLessThan(240);
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  const file = await exportVideo(page, 'E2-story', '720p');
  const p = probe(file);
  note('E2', { slides: pr.scenes.length, attention, lengthSec: sec, ...p });
  expect(p.audio).toBe('aac');
  expect(Math.abs(p.duration - sec)).toBeLessThan(1);
});
