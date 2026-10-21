/** Part 6: play an 8-minute video twice; memory, object URLs and audio nodes must not keep growing. */
import fs from 'node:fs';
import path from 'node:path';
import { AUDIT, expect, openEditor, project, test } from './helpers';

test('8-minute playback twice: no growing memory, no leaked object URLs or audio nodes', async ({ page, context }) => {
  test.setTimeout(30 * 60_000);
  await page.addInitScript(() => {
    const w = window as unknown as { __urls: Set<string>; __nodes: number };
    w.__urls = new Set();
    w.__nodes = 0;
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (o: Blob | MediaSource) => {
      const u = create(o);
      w.__urls.add(u);
      return u;
    };
    URL.revokeObjectURL = (u: string) => {
      w.__urls.delete(u);
      revoke(u);
    };
    const proto = BaseAudioContext.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
    for (const k of Object.getOwnPropertyNames(proto).filter((k) => k.startsWith('create'))) {
      const orig = proto[k];
      proto[k] = function (this: unknown, ...a: unknown[]) {
        w.__nodes++;
        return orig.apply(this, a);
      };
    }
  });
  await openEditor(page);
  // An 8-minute video: the example's slides duplicated, each held for 10 s.
  const right = page.locator('aside.right');
  for (let i = 0; i < 40 && (await project(page)).scenes.length < 44; i++) {
    await page.getByRole('button', { name: 'Slide 1 options' }).click();
    await page.getByRole('menuitem', { name: 'Duplicate slide' }).click();
  }
  await page.getByRole('tab', { name: 'Project' }).click();
  const sec = async () => Number(/([\d.]+) sec ·/.exec(await right.innerText())?.[1]);
  for (let i = 0; i < 44 && (await sec()) < 470; i++) {
    await page.getByRole('button', { name: `Slide ${i + 1}`, exact: true }).click();
    await page.getByRole('tab', { name: 'Properties' }).click();
    await right.getByLabel('Pause at end:').fill('10');
    await right.getByLabel('Pause at end:').press('Enter');
    await page.getByRole('tab', { name: 'Project' }).click();
  }
  const length = await sec();
  expect(length).toBeGreaterThan(450);
  const cdp = await context.newCDPSession(page);
  const sample = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    const heap = await page.evaluate(() => (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize);
    const w = await page.evaluate(() => ({ urls: (window as unknown as { __urls: Set<string> }).__urls.size, nodes: (window as unknown as { __nodes: number }).__nodes }));
    return { heapMb: +(heap / 1048576).toFixed(1), ...w };
  };
  const playOnce = async () => {
    await page.getByRole('button', { name: 'Slide 1', exact: true }).click();
    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible({ timeout: (length + 60) * 1000 });
  };
  const s0 = await sample();
  await playOnce();
  const s1 = await sample();
  await playOnce();
  const s2 = await sample();
  const result = { lengthSec: length, before: s0, afterFirst: s1, afterSecond: s2, nodesPerPlay: [s1.nodes - s0.nodes, s2.nodes - s1.nodes] };
  fs.writeFileSync(path.join(AUDIT, 'report', 'data', 'memory.json'), `${JSON.stringify(result, null, 1)}\n`);
  expect(s2.heapMb - s1.heapMb, 'heap grows on the second play (MB)').toBeLessThan(Math.max(10, s1.heapMb * 0.1));
  expect(s2.urls, 'object URLs left open').toBeLessThanOrEqual(s1.urls);
  expect(s2.nodes - s1.nodes, 'audio nodes per play stay the same').toBeLessThanOrEqual((s1.nodes - s0.nodes) * 1.1 + 5);
});
