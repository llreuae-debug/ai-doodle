/**
 * Part 3, sweep: every control in the inventory is used once in its UI state (click, toggle, pick,
 * type or slide, depending on its role). After each action the page must still work and the browser
 * must report no errors, rejected promises or failed requests.
 *
 * Controls that start paid or slow AI work, or a render, are not clicked here: they are exercised by
 * the behaviour tests (03), the API tests (04) and the end-to-end flows (05). They are listed in
 * report/data/sweep.json with the test that covers them.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { AUDIT, expect, openEditor, readJson, STATES, test, type Problem } from './helpers';

type Control = { id: string; role: string; name: string; state: string; region: string; count: number; disabled?: boolean };
const inv = readJson<{ controls: Control[] }>(path.join(AUDIT, 'inventory.json'));

/** Not clicked in the sweep, and where each is covered instead. */
const COVERED_ELSEWHERE: [RegExp, RegExp, string][] = [
  [/^modal · (Generate|Character|Story)/, /^Generate$|^Next$/, '05-flows (E2, E4) and 04-api'],
  [/^modal · Music$/, /^Generate$/, '05-flows (E6)'],
  [/^modal · Voiceover/, /^(Make voice|Write it with AI|Use this voiceover)$/, '05-flows (E5)'],
  [/^modal · Export/, /^(Render|Play|Download)$/, '05-flows (E1)'],
  [/^modal · API key/, /^Save & Connect$/, '03-behaviour (API key dialog)'],
  [/^right · project/, /^Test$/, '03-behaviour (pen sound test)'],
  [/./, /^Full screen$/, '03-behaviour (full screen)'],
];

const results: { id: string; name: string; state: string; result: string; problems: string[] }[] = [];

async function act(page: Page, root: string, c: Control) {
  const scope = page.locator(root).first();
  const group = /^(Library tile|Slide card|Layer row)/.test(c.name);
  let target = group
    ? scope.locator(c.name.startsWith('Library') ? '.libgrid .tile' : c.name.startsWith('Slide card (') ? '.slidecard' : c.name.startsWith('Slide card kebab') ? '.kebab' : '.layer .lname').first()
    : scope.getByRole(c.role as Parameters<Page['getByRole']>[0], { name: c.name === '(no accessible name)' ? undefined : c.name, exact: true }).first();
  if (!(await target.count())) target = scope.getByText(c.name, { exact: true }).first();
  // Styled switches hide the real checkbox: a person clicks its label.
  if ((c.role === 'checkbox' || c.role === 'switch') && !(await target.isVisible().catch(() => false))) {
    const label = target.locator('xpath=ancestor::label[1]');
    if (await label.count()) {
      await expect(label, `${c.id} ${c.name} is on the page`).toBeVisible({ timeout: 5000 });
      await label.click();
      return 'clicked its label';
    }
  }
  await expect(target, `${c.id} ${c.name} is on the page`).toBeVisible({ timeout: 5000 });
  if (await target.isDisabled().catch(() => false)) return 'disabled (not clickable in this state)';
  switch (c.role) {
    case 'combobox': {
      const values = await target.locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
      await target.selectOption(values[Math.min(1, values.length - 1)]);
      return `picked option 2 of ${values.length}`;
    }
    case 'slider':
      await target.focus();
      await page.keyboard.press('ArrowRight');
      return 'moved';
    case 'spinbutton':
      await target.fill('2');
      await target.press('Enter');
      return 'typed 2';
    case 'textbox':
    case 'searchbox':
      if ((await target.getAttribute('type')) === 'color') {
        await target.fill('#ff0000');
        return 'set colour';
      }
      await target.fill('audit');
      return 'typed';
    default: {
      const chooser = page.waitForEvent('filechooser', { timeout: 1500 }).catch(() => null);
      await target.click();
      if (await chooser) return 'opened the file picker';
      return 'clicked';
    }
  }
}

for (const [state, { root, enter }] of Object.entries(STATES)) {
  const controls = inv.controls.filter((c) => c.state === state);
  if (!controls.length) continue;
  test(`sweep: ${state} (${controls.length} controls)`, async ({ browser }) => {
    test.setTimeout(15 * 60_000);
    // One page per state, like a person clicking through it; it is reopened when an action leaves the state.
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    let page: Page | null = null;
    const problems: Problem[] = [];
    const fresh = async () => {
      await page?.close();
      page = await context.newPage();
      page.on('console', (m) => m.type() === 'error' && problems.push({ kind: 'console', text: m.text().slice(0, 200) }));
      page.on('pageerror', (e) => problems.push({ kind: 'pageerror', text: e.message.slice(0, 200) }));
      page.on('requestfailed', (r) => !/ERR_ABORTED|cancelled/i.test(r.failure()?.errorText ?? '') && problems.push({ kind: 'requestfailed', text: r.url() }));
      page.on('response', (r) => r.status() >= 400 && problems.push({ kind: 'http', text: `${r.status()} ${r.url()}` }));
      await openEditor(page);
      await enter(page);
      await page.locator(root).first().waitFor({ timeout: 10_000 });
    };
    for (const c of controls) {
      const skip = COVERED_ELSEWHERE.find(([s, n]) => s.test(state) && n.test(c.name));
      if (skip) {
        results.push({ id: c.id, name: c.name, state, result: `covered by ${skip[2]}`, problems: [] });
        continue;
      }
      let result: string;
      const from = problems.length;
      try {
        if (!page || !(await (page as Page).locator(root).first().isVisible().catch(() => false)) || (await (page as Page).locator('[role=dialog][aria-modal=true]').count()) > (state.startsWith('modal') ? 1 : 0)) await fresh();
        result = await act(page!, root, c);
        await page!.waitForTimeout(400);
        await expect(page!.locator('header.top')).toBeVisible();
      } catch (err) {
        result = `FAILED: ${(err as Error).message.split('\n')[0].slice(0, 200)}`;
        page = null;
      }
      results.push({ id: c.id, name: c.name, state, result, problems: problems.slice(from).map((p) => `${p.kind}: ${p.text}`) });
    }
    await context.close();
    const mine = results.filter((r) => r.state === state);
    const dir = path.join(AUDIT, 'report', 'data', 'sweep');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${state.replace(/[^a-z0-9]+/gi, '-')}.json`), `${JSON.stringify(mine, null, 1)}\n`);
    const bad = mine.filter((r) => r.result.startsWith('FAILED') || r.problems.length);
    expect(bad, bad.map((b) => `${b.id} ${b.name}: ${b.result} ${b.problems.join('; ')}`).join('\n')).toEqual([]);
  });
}
