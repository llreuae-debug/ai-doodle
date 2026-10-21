/** Part 6: the same smoke test in Chromium, Firefox and WebKit, including whether export works. */
import fs from 'node:fs';
import path from 'node:path';
import { AUDIT, dialog, expect, expectClean, openEditor, project, test } from './helpers';

test('editor works: add, play, select, export', async ({ page, problems, browserName }) => {
  test.setTimeout(6 * 60_000);
  await openEditor(page);
  await page.getByRole('tab', { name: 'Props' }).click();
  await page.locator('.libgrid .tile').first().click();
  expect((await project(page)).scenes[0].elements.length).toBeGreaterThan(2);
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Slide 2', exact: true }).click();
  // Export: keep it short (one slide).
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Slide 2 options' }).click();
    await page.getByRole('menuitem', { name: 'Delete slide' }).click();
  }
  await page.getByRole('button', { name: 'Export' }).click();
  const row = dialog(page).locator('.export-row').first();
  await row.getByRole('button', { name: /Render/ }).click();
  const done = row.getByRole('link', { name: 'Download' });
  const failed = row.locator('.err');
  await expect(done.or(failed)).toBeVisible({ timeout: 5 * 60_000 });
  const exportResult = (await done.isVisible()) ? 'renders an MP4' : `cannot export: ${await failed.innerText()}`;
  const file = path.join(AUDIT, 'report', 'data', 'browsers.json');
  const all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  all[browserName] = { export: exportResult, problems: problems.map((p) => `${p.kind}: ${p.text}`) };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(all, null, 1)}\n`);
  // Export limits per browser are recorded; the editor itself must work everywhere.
  expectClean(problems.filter((p) => !/VideoEncoder|WebCodecs|AudioEncoder/i.test(p.text)));
});
