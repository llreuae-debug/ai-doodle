/** Part 3: every control does what it says. Checks the result of each action, not only that it ran. */
import path from 'node:path';
import type { Page } from '@playwright/test';
import { dialog, expect, expectClean, FIXTURES, openEditor, project, sceneIndex, selectFirstLayer, test, toast } from './helpers';

const fixture = (f: string) => path.join(FIXTURES, f);
const left = (p: Page) => p.locator('aside.left');
const right = (p: Page) => p.locator('aside.right');
const elementCount = async (p: Page, i?: number) => (await project(p)).scenes[i ?? (await sceneIndex(p))].elements.length;
const tileCount = async (p: Page) => Number(/Showing (\d+)/.exec(await p.locator('.tile-count').innerText())?.[1]);

test.describe('top bar', () => {
  test('Dashboard, Tutorials, Story, API Key and Export open their windows', async ({ page, problems }) => {
    await openEditor(page);
    for (const [button, title] of [
      ['Dashboard', 'Your projects'],
      ['Tutorials', 'Make your first video'],
      ['Story', 'Story'],
      ['API Key', /API Key|Gemini/i],
      ['Export', 'Export'],
    ] as const) {
      await page.getByRole('button', { name: button, exact: true }).click();
      await expect(dialog(page)).toBeVisible();
      await expect(dialog(page)).toContainText(title);
      await page.keyboard.press('Escape');
      await expect(dialog(page), `${button} window closes with Escape`).toHaveCount(0);
    }
    expectClean(problems);
  });

  test('rename the project', async ({ page, problems }) => {
    await openEditor(page);
    const name = page.getByRole('textbox', { name: 'Project name' });
    await name.fill('Audit rename');
    await name.press('Enter');
    await expect.poll(async () => (await project(page)).name).toBe('Audit rename');
    // An empty name falls back to a default instead of an empty title.
    await name.fill('   ');
    await name.press('Enter');
    await expect.poll(async () => (await project(page)).name).toBe('untitled project');
    expectClean(problems);
  });

  test('Save stores the project, the bell answers, Ctrl+S saves', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(toast(page)).toHaveText('Saved in this browser.');
    await page.getByRole('button', { name: 'Notifications' }).click();
    await expect(toast(page)).toHaveText('No new notifications');
    await page.locator('canvas.stage').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('ControlOrMeta+s');
    await expect(toast(page)).toHaveText('Saved in this browser.');
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(dialog(page).locator('.projrow')).toHaveCount(1);
    expectClean(problems);
  });

  test('the account avatar is a label, not a control', async ({ page }) => {
    await openEditor(page);
    // "You" has no menu: it must not look or act like a button.
    const avatar = page.locator('.avatar');
    await expect(avatar).toBeVisible();
    expect(await avatar.evaluate((el) => el.tagName)).toBe('DIV');
    expect(await avatar.evaluate((el) => getComputedStyle(el).cursor)).not.toBe('pointer');
  });
});

test.describe('left panel', () => {
  test('tabs and sub-tabs switch the panel', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('tab', { name: 'Text' }).click();
    await expect(left(page).getByRole('button', { name: '+ Heading' })).toBeVisible();
    await page.getByRole('tab', { name: 'Layers' }).click();
    await expect(left(page).locator('.layer').first()).toBeVisible();
    await page.getByRole('tab', { name: 'Doodles' }).click();
    for (const tab of ['Custom', 'Characters', 'Props', 'Shapes']) {
      await page.getByRole('tab', { name: tab }).click();
      await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
    }
    expectClean(problems);
  });

  test('search, filter chips, colour toggle and the tile count agree', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('tab', { name: 'Props' }).click();
    await expect.poll(() => tileCount(page)).toBeGreaterThan(100);
    const all = await tileCount(page);
    const total = Number(/of (\d+)/.exec(await page.locator('.tile-count').innerText())?.[1]);
    expect(all, 'showing can never be more than the total').toBeLessThanOrEqual(total);
    await page.getByRole('searchbox', { name: 'Search doodles' }).fill('rocket');
    await expect.poll(() => tileCount(page)).toBeLessThan(all);
    expect(await page.locator('.libgrid .tile').count()).toBe(await tileCount(page));
    await page.getByRole('searchbox', { name: 'Search doodles' }).fill('');
    await left(page).getByRole('button', { name: /^Filter/ }).click();
    await page.getByRole('button', { name: 'Food', exact: true }).click();
    await expect(left(page).getByRole('button', { name: 'Filter (1)' })).toBeVisible();
    const food = await tileCount(page);
    expect(food).toBeGreaterThan(0);
    expect(food).toBeLessThan(all);
    await page.getByRole('button', { name: 'Line only' }).click();
    await expect.poll(() => tileCount(page)).toBe(food / 2);
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(left(page).getByRole('button', { name: 'Filter', exact: true })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Colour versions' }).check();
    await expect.poll(() => tileCount(page)).toBe(all / 2);
    expectClean(problems);
  });

  test('characters tab never shows more than it has', async ({ page }) => {
    await openEditor(page);
    await page.getByRole('tab', { name: 'Characters' }).click();
    await expect.poll(() => tileCount(page)).toBeGreaterThan(50);
    const text = await page.locator('.tile-count').innerText();
    const [shown, total] = [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));
    expect(shown, text).toBeLessThanOrEqual(total);
  });

  test('a tile adds that doodle to the slide (built-in, library and scene)', async ({ page, problems }) => {
    await openEditor(page);
    const before = await elementCount(page);
    await page.getByRole('tab', { name: 'Props' }).click();
    await page.locator('.libgrid .tile').first().click();
    await expect(toast(page)).toContainText('Added');
    await page.getByRole('searchbox', { name: 'Search doodles' }).fill('Rainy day umbrella');
    await page.locator('.libgrid .tile').first().click();
    await expect(toast(page)).toContainText('Rainy day umbrella');
    await expect.poll(() => elementCount(page)).toBe(before + 2);
    expectClean(problems);
  });

  test('Generate with AI and AI buttons open the generator; both Variations buttons open variations', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('tab', { name: 'Props' }).click();
    await page.getByRole('button', { name: 'Generate Props with AI' }).click();
    await expect(dialog(page)).toContainText('Generate with AI');
    await page.keyboard.press('Escape');
    await left(page).getByRole('button', { name: 'AI', exact: true }).click();
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveCount(0);
    for (const btn of await left(page).getByRole('button', { name: 'Variations' }).all()) {
      await btn.click({ timeout: 5000 });
      await expect(dialog(page)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog(page), 'variations window closes with Escape').toHaveCount(0);
    }
    expectClean(problems);
  });

  test('Upload adds an image (and refuses files that are not images)', async ({ page, problems }) => {
    await openEditor(page);
    const before = await elementCount(page);
    const input = page.locator('input[type=file][accept^="image/"]');
    await input.setInputFiles(fixture('notes.txt'));
    await expect(toast(page)).toContainText('Use a PNG, JPEG, WebP or SVG image.');
    await input.setInputFiles(fixture('logo.png'));
    await expect(dialog(page)).toContainText('Add your image');
    await dialog(page).getByRole('button', { name: 'Add to board' }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect.poll(() => elementCount(page)).toBe(before + 1);
    await expect(page.getByRole('tab', { name: 'Custom' })).toHaveAttribute('aria-selected', 'true');
    await expect(left(page).locator('.libgrid .tile')).toHaveCount(1);
    expectClean(problems);
  });

  test('fonts: add text, search, apply to selected text, upload and delete a font', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('tab', { name: 'Text' }).click();
    const before = await elementCount(page);
    await left(page).getByRole('button', { name: '+ Heading' }).click();
    await left(page).getByRole('button', { name: '+ Subheading' }).click();
    await left(page).getByRole('button', { name: '+ Body' }).click();
    await expect.poll(() => elementCount(page)).toBe(before + 3);
    await page.getByRole('searchbox', { name: 'Search fonts' }).fill('pacif');
    await expect(left(page).locator('.font-row')).toHaveCount(1);
    // The last added text is selected: picking a font changes it.
    await left(page).getByRole('button', { name: 'Pacifico' }).click();
    await expect.poll(async () => (await project(page)).scenes[0].elements.at(-1)?.font).toBe('Pacifico');
    await page.getByRole('searchbox', { name: 'Search fonts' }).fill('');
    const fontInput = page.locator('input[type=file][accept=".ttf,.otf,.woff,.woff2"]');
    await fontInput.setInputFiles(fixture('bad-font.ttf'));
    await expect(toast(page)).toContainText("isn't a font");
    await fontInput.setInputFiles(fixture('font.ttf'));
    await expect(toast(page)).toContainText('Font added: font');
    await expect(left(page).locator('.font-own')).toHaveCount(1);
    await left(page).getByRole('button', { name: 'Delete font' }).click();
    await expect(left(page).locator('.font-own')).toHaveCount(0);
    expectClean(problems);
  });

  test('layers: reorder, hide and delete', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('tab', { name: 'Layers' }).click();
    const ids = async () => (await project(page)).scenes[0].elements.map((e) => e.id);
    const start = await ids();
    expect(start.length).toBeGreaterThan(1);
    // The list shows the last drawn on top; "Draw earlier" on the top row swaps the last two.
    await left(page).locator('.layer').first().getByRole('button', { name: 'Draw earlier' }).click();
    await expect.poll(ids).toEqual([...start.slice(0, -2), start.at(-1), start.at(-2)]);
    await left(page).locator('.layer').first().getByRole('button', { name: 'Draw later' }).isDisabled();
    await left(page).locator('.layer').first().getByRole('button', { name: 'Hide' }).click();
    await expect.poll(async () => (await project(page)).scenes[0].elements.at(-1)?.hidden).toBe(true);
    await left(page).locator('.layer').first().getByRole('button', { name: 'Show' }).click();
    await expect.poll(async () => (await project(page)).scenes[0].elements.at(-1)?.hidden).toBe(false);
    await left(page).locator('.layer').first().getByRole('button', { name: 'Delete' }).click();
    await expect.poll(async () => (await ids()).length).toBe(start.length - 1);
    expectClean(problems);
  });
});

test.describe('board', () => {
  const box = async (p: Page) => (await p.locator('canvas.stage').boundingBox())!;
  /** Where an element sits on screen. */
  const onScreen = async (p: Page, el: { x: number; y: number }) => {
    const b = await box(p);
    const pr = await project(p);
    const w = pr.aspectRatio === '16:9' ? 1920 : pr.aspectRatio === '9:16' ? 1080 : 1080;
    const k = b.width / w;
    return { x: b.x + el.x * k, y: b.y + el.y * k, k };
  };

  test('select, drag (with snap guides) and resize on the canvas; undo and redo', async ({ page, problems }) => {
    await openEditor(page);
    const el = (await project(page)).scenes[0].elements[0];
    const at = await onScreen(page, el);
    await page.mouse.click(at.x, at.y);
    await expect(right(page).locator('.card').first()).toContainText('Entrance');
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + 60, at.y + 40, { steps: 6 });
    await page.mouse.up();
    const moved = (await project(page)).scenes[0].elements[0];
    expect(Math.hypot(moved.x - el.x, moved.y - el.y)).toBeGreaterThan(30);
    await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect.poll(async () => (await project(page)).scenes[0].elements[0].x).toBeCloseTo(el.x, 0);
    await page.getByRole('button', { name: 'Redo' }).click();
    await expect.poll(async () => (await project(page)).scenes[0].elements[0].x).toBeCloseTo(moved.x, 0);
    expectClean(problems);
  });

  test('resize from a corner', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('tab', { name: 'Props' }).click();
    await page.locator('.libgrid .tile').first().click();
    const pr = await project(page);
    const el = pr.scenes[0].elements.at(-1)!;
    const b = await box(page);
    const k = b.width / 1920;
    const half = ((el.size ?? 300) / 2) * k;
    // Bottom-right corner handle.
    const cx = b.x + el.x * k + half;
    const cy = b.y + el.y * k + half;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 50, cy + 50, { steps: 6 });
    await page.mouse.up();
    const after = (await project(page)).scenes[0].elements.at(-1)!;
    expect(after.size!, 'dragging the corner makes the doodle bigger').toBeGreaterThan(el.size! * 1.1);
    expectClean(problems);
  });

  test('previous / next slide, play and pause, zoom, snap switch', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('button', { name: 'Next slide' }).click();
    await expect.poll(() => sceneIndex(page)).toBe(1);
    await page.getByRole('button', { name: 'Previous slide' }).click();
    await expect.poll(() => sceneIndex(page)).toBe(0);
    await page.getByRole('button', { name: 'Previous slide' }).click();
    await expect.poll(() => sceneIndex(page)).toBe(0);
    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect.poll(async () => page.locator('.prog i').evaluate((i) => parseFloat((i as HTMLElement).style.width)), { timeout: 15_000 }).toBeGreaterThan(1);
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await expect(page.locator('.zoomval')).toHaveText('110%');
    await page.getByRole('button', { name: 'Zoom out' }).click();
    await page.getByRole('button', { name: 'Zoom out' }).click();
    await expect(page.locator('.zoomval')).toHaveText('90%');
    await page.getByRole('checkbox', { name: 'Snap align' }).uncheck();
    await expect(page.getByRole('checkbox', { name: 'Snap align' })).not.toBeChecked();
    expectClean(problems);
  });

  test('full screen', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('button', { name: 'Full screen' }).click();
    // Either the board goes full screen, or the app explains that it can't here.
    await expect
      .poll(async () => (await page.evaluate(() => !!document.fullscreenElement)) || (await toast(page).isVisible().catch(() => false)))
      .toBe(true);
    expectClean(problems);
  });

  test('pen sound mute button and volume popover', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('button', { name: 'Mute pen sound (M)' }).click();
    await expect.poll(async () => (await project(page)).drawSound.muted).toBe(true);
    await expect(page.getByRole('button', { name: 'Unmute pen sound (M)' })).toHaveAttribute('aria-pressed', 'true');
    await page.locator('.sound-control-wrap').hover();
    const slider = page.getByRole('slider', { name: 'Pen sound volume' });
    await slider.fill('60');
    await expect.poll(async () => (await project(page)).drawSound.volume).toBeCloseTo(0.6);
    // Raising the volume unmutes.
    await expect.poll(async () => (await project(page)).drawSound.muted).toBe(false);
    await expect(page.locator('.sound-vol-val')).toHaveText('60%');
    expectClean(problems);
  });
});

test.describe('right panel', () => {
  test('slide card fields change the slide', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('button', { name: 'Next slide' }).click();
    const card = right(page);
    const duration = async () => Number(/([\d.]+) sec/.exec(await card.locator('.row', { hasText: 'Slide duration' }).innerText())?.[1]);
    await card.getByLabel('Transition type:').selectOption('wipe');
    await expect.poll(async () => (await project(page)).scenes[1].transition).toBe('wipe');
    const d1 = await duration();
    await card.getByLabel('Drawing speed:').selectOption('2');
    await expect.poll(duration).toBeLessThan(d1);
    const d2 = await duration();
    await card.getByLabel('Pause at end:').fill('3');
    await card.getByLabel('Pause at end:').press('Enter');
    await expect.poll(async () => (await project(page)).scenes[1].holdMs).toBe(3000);
    await expect.poll(duration).toBeGreaterThan(d2);
    await expect(card.getByLabel('Sync slide with voice')).toBeDisabled();
    await card.getByLabel('Pen sound on this slide').uncheck();
    await expect.poll(async () => (await project(page)).scenes[1].drawSound).toBe(false);
    await card.getByLabel('Drawing hand:').selectOption('__none__');
    await expect.poll(async () => (await project(page)).scenes[1].handId).toBe(null);
    await card.getByLabel('Mood for this slide:').selectOption({ index: 2 });
    await expect.poll(async () => (await project(page)).scenes[1].mood).toBeTruthy();
    await card.getByRole('button', { name: 'Collapse' }).click();
    await expect(card.getByLabel('Transition type:')).toHaveCount(0);
    await card.getByRole('button', { name: 'Expand' }).click();
    await expect(card.getByLabel('Transition type:')).toBeVisible();
    expectClean(problems);
  });

  test('transition on slide 1 is accepted (and explained)', async ({ page }) => {
    await openEditor(page);
    const sel = right(page).getByLabel('Transition type:');
    await sel.selectOption('fade');
    await expect.poll(async () => (await project(page)).scenes[0].transition).toBe('fade');
    await expect(sel).toHaveAttribute('title', /first slide/);
  });

  test('upload voiceover syncs the slide to its length; upload music adds a soundtrack', async ({ page, problems }) => {
    await openEditor(page);
    await page.locator('input[type=file][accept="audio/*"]').first().setInputFiles(fixture('voice.mp3'));
    await expect(toast(page)).toContainText('Voiceover added');
    await expect(right(page).getByLabel('Sync slide with voice')).toBeChecked();
    const pr = await project(page);
    expect(pr.scenes[0].syncVoice).toBe(true);
    const slideSec = Number(/([\d.]+) sec/.exec(await right(page).locator('.row', { hasText: 'Slide duration' }).innerText())?.[1]);
    expect(slideSec, 'slide lasts at least as long as the voice').toBeGreaterThanOrEqual(4);
    await right(page).getByRole('button', { name: 'Play voiceover' }).click();
    await right(page).getByRole('button', { name: 'Remove voiceover' }).click();
    await expect.poll(async () => (await project(page)).scenes[0].voice).toBe(null);
    await page.locator('input[type=file][accept="audio/*"]').nth(1).setInputFiles(fixture('music.mp3'));
    await expect(toast(page)).toHaveText('Music added');
    await expect.poll(async () => (await project(page)).music?.name).toBe('music.mp3');
    await right(page).getByRole('button', { name: 'Play music preview' }).click();
    await expect(right(page).getByRole('button', { name: 'Stop music preview' })).toBeVisible();
    await right(page).getByRole('button', { name: 'Stop music preview' }).click();
    await right(page).getByRole('button', { name: 'Remove music' }).click();
    await expect.poll(async () => (await project(page)).music).toBe(null);
    expectClean(problems);
  });

  test('element card: doodle properties, duplicate, draw last, delete', async ({ page, problems }) => {
    await openEditor(page);
    await selectFirstLayer(page, 'doodle');
    const c = right(page);
    const el = () => project(page).then((p) => p.scenes[0].elements.find((e) => e.kind === 'doodle')!);
    await c.getByLabel('Animation').selectOption('fade');
    await expect.poll(async () => (await el()).anim.type).toBe('fade');
    await c.getByLabel('Speed', { exact: false }).first().selectOption('2');
    await expect.poll(async () => (await el()).anim.speed).toBe(2);
    await c.getByLabel(/Duration \(sec\)/).fill('4');
    await c.getByLabel(/Duration \(sec\)/).press('Enter');
    await expect.poll(async () => (await el()).anim.durationMs).toBe(4000);
    await expect(c.getByText('Effective duration:')).toBeVisible();
    await c.getByLabel('Wait before (sec)').fill('1.5');
    await c.getByLabel('Wait before (sec)').press('Enter');
    await expect.poll(async () => (await el()).anim.delayMs).toBe(1500);
    await c.getByLabel('Draw as').selectOption('line');
    await expect.poll(async () => (await el()).color).toBe(false);
    await c.getByLabel('Rotate').fill('45');
    await expect.poll(async () => (await el()).rotation).toBe(45);
    const n = await elementCount(page);
    await c.getByRole('button', { name: 'Duplicate' }).click();
    await expect.poll(() => elementCount(page)).toBe(n + 1);
    await selectFirstLayer(page, 'doodle');
    const id = (await el()).id;
    await c.getByRole('button', { name: 'Draw last' }).click();
    await expect.poll(async () => (await project(page)).scenes[0].elements.at(-1)?.id).toBe(id);
    await c.getByRole('button', { name: 'Delete' }).click();
    await expect.poll(() => elementCount(page)).toBe(n);
    await expect(c.getByText('Entrance')).toHaveCount(0);
    expectClean(problems);
  });

  test('element card: text properties', async ({ page, problems }) => {
    await openEditor(page);
    await selectFirstLayer(page, 'text');
    const c = right(page);
    const el = () => project(page).then((p) => p.scenes[0].elements.find((e) => e.kind === 'text')!);
    await c.getByRole('textbox', { name: 'Text' }).fill('Audit text');
    await expect.poll(async () => (await el()).text).toBe('Audit text');
    await c.getByLabel('Font').selectOption('Kalam');
    await expect.poll(async () => (await el()).font).toBe('Kalam');
    await c.getByLabel('Size').fill('120');
    await c.getByLabel('Size').press('Enter');
    await expect.poll(async () => (await el()).size).toBe(120);
    const bold = c.getByLabel('Bold');
    const wasBold = await bold.isChecked();
    await bold.setChecked(!wasBold);
    await expect.poll(async () => (await el()).weight).toBe(wasBold ? 400 : 700);
    await c.getByLabel('Colour').fill('#cc0000');
    await expect.poll(async () => (await el()).fill).toBe('#cc0000');
    await c.getByRole('button', { name: 'Deselect' }).click();
    await expect(c.getByText('Entrance')).toHaveCount(0);
    expectClean(problems);
  });

  test('project tab: sizes, boards, hand, default speed, pen sound', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('tab', { name: 'Project' }).click();
    const c = right(page);
    for (const r of ['9:16', '1:1', '4:5', '16:9']) {
      await c.getByRole('button', { name: r, exact: true }).click();
      await expect.poll(async () => (await project(page)).aspectRatio).toBe(r);
      const b = (await page.locator('canvas.stage').boundingBox())!;
      const [w, h] = r.split(':').map(Number);
      expect(b.width / b.height).toBeCloseTo(w / h, 1);
    }
    for (const board of ['Blackboard', 'Greenboard', 'Graph paper', 'Kraft paper', 'Whiteboard']) {
      await c.getByRole('button', { name: board, exact: true }).click();
      await expect(c.getByRole('button', { name: board, exact: true })).toHaveAttribute('aria-pressed', 'true');
    }
    await c.getByRole('button', { name: 'Blackboard' }).click();
    await c.getByRole('button', { name: 'Use chalk hand?' }).click();
    await expect.poll(async () => (await project(page)).handId).toMatch(/chalk/);
    await c.getByRole('button', { name: 'Use chalk sound?' }).click();
    await expect.poll(async () => (await project(page)).drawSound.type).toBe('chalk');
    // Hand grid: pick "No Hand", then a real hand.
    await c.getByRole('option', { name: 'No Hand' }).click();
    await expect.poll(async () => (await project(page)).handId).toBe(null);
    await c.getByRole('option').nth(1).click();
    await expect.poll(async () => (await project(page)).handId).not.toBe(null);
    await c.getByLabel(/Speed for new slides/).selectOption('2');
    await c.getByRole('button', { name: 'Apply to all slides' }).click();
    await c.getByRole('button', { name: 'Confirm' }).click();
    await expect.poll(async () => (await project(page)).scenes.every((s) => s.speed === 2)).toBe(true);
    await page.getByRole('button', { name: 'Add slide' }).click();
    await expect.poll(async () => (await project(page)).scenes.at(-1)?.speed).toBe(2);
    for (const t of ['Marker', 'Chalk', 'Pencil', 'Soft marker', 'Ballpoint', 'None']) {
      await c.getByRole('button', { name: t, exact: true }).click();
      await expect(c.getByRole('button', { name: t, exact: true })).toHaveAttribute('aria-pressed', 'true');
    }
    await c.getByRole('button', { name: 'Marker', exact: true }).click();
    await c.getByLabel(/^Volume \(/).fill('70');
    await expect.poll(async () => (await project(page)).drawSound.volume).toBeCloseTo(0.7);
    await c.getByRole('button', { name: 'Mute pen sound' }).click();
    await expect.poll(async () => (await project(page)).drawSound.muted).toBe(true);
    await c.getByRole('button', { name: 'Unmute pen sound' }).click();
    await c.getByLabel(/Quieter during voiceover/).uncheck();
    await expect.poll(async () => (await project(page)).drawSound.quietDuringVoice).toBe(false);
    await c.getByLabel(/Cap-off sound/).check();
    await expect.poll(async () => (await project(page)).drawSound.capSound).toBe(true);
    await c.getByRole('button', { name: 'Test' }).click();
    await expect(c.getByRole('button', { name: 'Stop' })).toBeVisible();
    await expect(c.getByRole('button', { name: 'Test' })).toBeVisible({ timeout: 5000 });
    expectClean(problems);
  });

  test('project tab: custom pen sound upload with limits', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('tab', { name: 'Project' }).click();
    const c = right(page);
    await c.getByRole('button', { name: 'Custom', exact: true }).click();
    const input = c.locator('input[type=file]');
    await input.setInputFiles(fixture('pen-too-long.wav'));
    await expect(c.locator('.err')).toContainText(/≤ 10 seconds|≤ 2 MB/);
    await input.setInputFiles(fixture('pen.wav'));
    await expect.poll(async () => (await project(page)).drawSound.customName).toBe('pen.wav');
    expectClean(problems);
  });

  test('project tab: soundtrack volume, duck, fade and library', async ({ page, problems }) => {
    await openEditor(page);
    await page.locator('input[type=file][accept="audio/*"]').nth(1).setInputFiles(fixture('music.mp3'));
    await page.getByRole('tab', { name: 'Project' }).click();
    const c = right(page);
    await c.locator('input[type=range]').first().fill('50');
    await expect.poll(async () => (await project(page)).music?.volume).toBeCloseTo(0.5);
    await c.getByLabel('Duck under voice').uncheck();
    await expect.poll(async () => (await project(page)).music?.duck).toBe(false);
    await c.getByLabel('Fade out at end').uncheck();
    await expect.poll(async () => (await project(page)).music?.fadeOut).toBe(false);
    await c.getByRole('button', { name: 'Remove soundtrack' }).click();
    await expect.poll(async () => (await project(page)).music).toBe(null);
    await c.getByRole('button', { name: /Select from Library/ }).click();
    await dialog(page).getByRole('button', { name: 'Use track' }).first().click();
    await expect.poll(async () => (await project(page)).music?.name, { timeout: 20_000 }).toBeTruthy();
    expectClean(problems);
  });
});

test.describe('timeline', () => {
  test('select, kebab menu actions and add slide', async ({ page, problems }) => {
    await openEditor(page);
    const ids = async () => (await project(page)).scenes.map((s) => s.id);
    const start = await ids();
    await page.getByRole('button', { name: 'Slide 2', exact: true }).click();
    await expect.poll(() => sceneIndex(page)).toBe(1);
    await expect(page.getByRole('button', { name: 'Slide 2', exact: true })).toHaveAttribute('aria-current', 'true');
    const menu = async (n: number, item: string) => {
      await page.getByRole('button', { name: `Slide ${n} options` }).click();
      await page.getByRole('menuitem', { name: item }).click();
    };
    await menu(2, 'Duplicate slide');
    await expect.poll(async () => (await ids()).length).toBe(start.length + 1);
    await menu(1, 'Move right');
    await expect.poll(async () => (await ids())[1]).toBe(start[0]);
    await menu(2, 'Move left');
    await expect.poll(async () => (await ids())[0]).toBe(start[0]);
    await menu(2, 'Delete slide');
    await expect.poll(async () => (await ids()).length).toBe(start.length);
    await page.getByRole('button', { name: 'Slide 1 options' }).click();
    await expect(page.getByRole('menuitem', { name: 'Move left' })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await page.getByRole('button', { name: 'Add slide' }).click();
    await expect.poll(async () => (await ids()).length).toBe(start.length + 1);
    expectClean(problems);
  });

  test('the kebab menu works from the keyboard', async ({ page }) => {
    await openEditor(page);
    await page.getByRole('button', { name: 'Slide 1 options' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
  });
});

test.describe('keyboard shortcuts', () => {
  test('Space, M, Ctrl+Z/Y, Ctrl+D, Delete, arrows, Escape', async ({ page, problems }) => {
    await openEditor(page);
    await selectFirstLayer(page, 'doodle');
    await page.locator('canvas.stage').focus();
    const doodle = () => project(page).then((p) => p.scenes[0].elements.find((e) => e.kind === 'doodle')!);
    const x0 = (await doodle()).x;
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await doodle()).x).toBe(x0 + 8);
    await page.keyboard.press('Shift+ArrowRight');
    await expect.poll(async () => (await doodle()).x).toBe(x0 + 48);
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(async () => (await doodle()).x).toBe(x0 + 8);
    await page.keyboard.press('ControlOrMeta+y');
    await expect.poll(async () => (await doodle()).x).toBe(x0 + 48);
    await page.keyboard.press('ControlOrMeta+Shift+z');
    const n = await elementCount(page);
    await page.keyboard.press('ControlOrMeta+d');
    await expect.poll(() => elementCount(page)).toBe(n + 1);
    await page.keyboard.press('Delete');
    await expect.poll(() => elementCount(page)).toBe(n);
    await selectFirstLayer(page, 'doodle');
    await page.locator('canvas.stage').focus();
    await page.keyboard.press('Escape');
    await expect(right(page).getByText('Entrance')).toHaveCount(0);
    const muted = (await project(page)).drawSound.muted ?? false;
    await page.keyboard.press('m');
    await expect.poll(async () => (await project(page)).drawSound.muted ?? false).toBe(!muted);
    await page.keyboard.press(' ');
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    await page.keyboard.press(' ');
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    expectClean(problems);
  });

  test('shortcuts do not fire while typing', async ({ page }) => {
    await openEditor(page);
    const before = await project(page);
    const name = page.getByRole('textbox', { name: 'Project name' });
    await name.click();
    await page.keyboard.type(' m ');
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    expect((await project(page)).drawSound.muted ?? false).toBe(before.drawSound.muted ?? false);
    await page.getByRole('searchbox', { name: 'Search doodles' }).click();
    await page.keyboard.press('Delete');
    await page.keyboard.press('ControlOrMeta+d');
    expect(await elementCount(page)).toBe(before.scenes[0].elements.length);
  });
});

test.describe('modals', () => {
  /** Opens a modal, closes it with each method, and checks focus goes back to the opener. */
  async function closeEveryWay(page: Page, open: () => Promise<void>, opener: () => ReturnType<Page['getByRole']>) {
    const out: string[] = [];
    for (const how of ['Escape', 'Close button', 'click outside'] as const) {
      await open();
      await expect(dialog(page)).toBeVisible();
      if (how === 'Escape') await page.keyboard.press('Escape');
      if (how === 'Close button') await dialog(page).getByRole('button', { name: /^Close/ }).first().click();
      if (how === 'click outside') await page.mouse.click(5, 450);
      try {
        await expect(dialog(page)).toHaveCount(0, { timeout: 3000 });
      } catch {
        out.push(`does not close with ${how}`);
        await page.keyboard.press('Escape');
        await dialog(page).getByRole('button', { name: /^Close/ }).first().click({ timeout: 2000 }).catch(() => {});
        continue;
      }
      const focused = await opener().evaluate((el) => el === document.activeElement).catch(() => false);
      if (!focused) out.push(`focus does not return to the opener after ${how}`);
    }
    return out;
  }

  const MODALS: [string, (p: Page) => Promise<void>, (p: Page) => ReturnType<Page['getByRole']>][] = [
    ['Dashboard', async (p) => p.getByRole('button', { name: 'Dashboard' }).click(), (p) => p.getByRole('button', { name: 'Dashboard' })],
    ['Tutorials', async (p) => p.getByRole('button', { name: 'Tutorials' }).click(), (p) => p.getByRole('button', { name: 'Tutorials' })],
    ['API key', async (p) => p.getByRole('button', { name: 'API Key' }).click(), (p) => p.getByRole('button', { name: 'API Key' })],
    ['Export', async (p) => p.getByRole('button', { name: 'Export' }).click(), (p) => p.getByRole('button', { name: 'Export' })],
    ['Story wizard', async (p) => p.getByRole('button', { name: 'Story', exact: true }).click(), (p) => p.getByRole('button', { name: 'Story', exact: true })],
    [
      'Generate with AI',
      async (p) => {
        await p.getByRole('tab', { name: 'Props' }).click();
        await p.getByRole('button', { name: 'Generate Props with AI' }).click();
      },
      (p) => p.getByRole('button', { name: 'Generate Props with AI' }),
    ],
    ['Character generator', async (p) => p.getByRole('button', { name: 'Generate Characters with AI' }).click(), (p) => p.getByRole('button', { name: 'Generate Characters with AI' })],
    ['Voiceover', async (p) => p.getByRole('button', { name: 'Generate voiceover' }).click(), (p) => p.getByRole('button', { name: 'Generate voiceover' })],
    ['Music', async (p) => p.locator('aside.right').getByRole('button', { name: /^Generate music/ }).click(), (p) => p.locator('aside.right').getByRole('button', { name: /^Generate music/ })],
    [
      'Music library',
      async (p) => {
        await p.getByRole('tab', { name: 'Project' }).click();
        await p.getByRole('button', { name: /Select from Library/ }).click();
      },
      (p) => p.getByRole('button', { name: /Select from Library/ }),
    ],
  ];
  for (const [name, open, opener] of MODALS) {
    test(`${name}: Escape, X and click outside close it; focus returns`, async ({ page, problems }) => {
      await openEditor(page);
      const issues = await closeEveryWay(page, () => open(page), () => opener(page));
      expect(issues, `${name}: ${issues.join('; ')}`).toEqual([]);
      expectClean(problems);
    });
  }

  test('fields validate: API key, story title, generate prompt, voiceover text', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('button', { name: 'API Key' }).click();
    await expect(dialog(page).getByRole('button', { name: 'Save & Connect' })).toBeDisabled();
    await dialog(page).getByRole('textbox', { name: 'API Key' }).fill('short');
    await dialog(page).getByRole('button', { name: 'Save & Connect' }).click();
    await expect(dialog(page)).toContainText(/key|rejected|Check/i);
    await dialog(page).getByRole('button', { name: 'Show key' }).click();
    await expect(dialog(page).getByRole('textbox', { name: 'API Key' })).toHaveAttribute('type', 'text');
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Story', exact: true }).click();
    await expect(dialog(page).getByRole('button', { name: 'Next' })).toBeDisabled();
    await dialog(page).getByRole('textbox', { name: 'Title' }).fill('A');
    await expect(dialog(page).getByRole('button', { name: 'Next' })).toBeDisabled();
    await dialog(page).getByRole('textbox', { name: 'Title' }).fill('The kind ant');
    await expect(dialog(page).getByRole('button', { name: 'Next' })).toBeEnabled();
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: 'Props' }).click();
    await page.getByRole('button', { name: 'Generate Props with AI' }).click();
    await expect(dialog(page).getByRole('button', { name: 'Generate' })).toBeDisabled();
    await dialog(page).getByRole('textbox', { name: 'Describe what to make' }).fill('a red kite');
    await expect(dialog(page).getByRole('button', { name: 'Generate' })).toBeEnabled();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Generate voiceover' }).click();
    await dialog(page).getByRole('textbox', { name: 'What should the voice say?' }).fill('');
    await expect(dialog(page).getByRole('button', { name: 'Make voice' })).toBeDisabled();
    await page.keyboard.press('Escape');
    expectClean(problems, [/401 POST .*\/api\/ai\/set-key|400 POST .*\/api\/ai\/set-key/]);
  });

  test('Dashboard: open the example, new project, delete with confirmation', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('button', { name: 'Dashboard' }).click();
    const row = dialog(page).locator('.projrow');
    await expect(row).toHaveCount(1);
    await row.getByRole('button', { name: 'Open' }).click();
    await expect(dialog(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(row.getByRole('button', { name: 'Delete for good?' })).toBeVisible();
    await row.getByRole('button', { name: 'Delete for good?' }).click();
    await expect(row).toHaveCount(0);
    await dialog(page).getByRole('button', { name: 'New project' }).click();
    await expect(dialog(page)).toContainText('Project template gallery');
    await dialog(page).getByRole('button', { name: 'Empty Project' }).click();
    await dialog(page).getByRole('button', { name: 'Next' }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect.poll(async () => (await project(page)).scenes[0].elements.length).toBe(0);
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await dialog(page).getByRole('button', { name: 'Open the example' }).click();
    await expect.poll(async () => (await project(page)).scenes.length).toBeGreaterThan(1);
    expectClean(problems);
  });

  test('template gallery: sizes, templates and sample projects', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await dialog(page).getByRole('button', { name: 'New project' }).click();
    await dialog(page).getByLabel('Project Size:').selectOption({ index: 1 });
    await dialog(page).getByRole('tab', { name: 'Sample Projects' }).click();
    await dialog(page).getByRole('tab', { name: 'Templates' }).click();
    await dialog(page).getByRole('button', { name: 'Business', exact: true }).click();
    await dialog(page).getByRole('button', { name: 'Next' }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect.poll(async () => (await project(page)).aspectRatio).not.toBe('16:9');
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await dialog(page).getByRole('button', { name: 'New project' }).click();
    await dialog(page).getByRole('button', { name: 'Back' }).click();
    await expect(dialog(page)).toContainText('Your projects');
    expectClean(problems);
  });

  test('voice previews play', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('button', { name: 'Generate voiceover' }).click();
    const previews = dialog(page).getByRole('button', { name: /^Preview / });
    const n = await previews.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) await previews.nth(i).click();
    await page.waitForTimeout(800);
    expectClean(problems);
  });

  test('music library: play previews and use a track', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('tab', { name: 'Project' }).click();
    await page.getByRole('button', { name: /Select from Library/ }).click();
    for (const b of await dialog(page).getByRole('button', { name: /^Play / }).all()) await b.click();
    await dialog(page).getByRole('button', { name: 'Use track' }).nth(2).click();
    await expect(toast(page)).toContainText('Soundtrack:');
    expectClean(problems);
  });

  test('export window: pen sound checkbox', async ({ page, problems }) => {
    await openEditor(page);
    await page.getByRole('button', { name: 'Export' }).click();
    const box = dialog(page).getByRole('checkbox', { name: 'Include pen drawing sound in this export' });
    const was = await box.isChecked();
    await box.setChecked(!was);
    await expect(box).toBeChecked({ checked: !was });
    expectClean(problems);
  });
});

test.describe('small screen (400 × 860)', () => {
  test.use({ viewport: { width: 400, height: 860 } });
  test('the main controls are reachable and work', async ({ page, problems }) => {
    await openEditor(page);
    const issues: string[] = [];
    for (const name of ['Story', 'Save', 'Export', 'Play', 'Add slide']) {
      const b = page.getByRole('button', { name, exact: true }).first();
      const box = await b.boundingBox();
      if (!box || box.x < 0 || box.x + box.width > 400 + 1 || box.width < 10) issues.push(`${name} is off screen or cut off`);
    }
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (scroll > 1) issues.push(`page scrolls sideways by ${scroll}px`);
    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    expect(issues, issues.join('\n')).toEqual([]);
    expectClean(problems);
  });
});
