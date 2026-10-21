/** Part 2: links and assets. */
import fs from 'node:fs';
import path from 'node:path';
import { APP, AUDIT, expect, openEditor, readJson, ROOT, test } from './helpers';

const CONTENT_TYPES: Record<string, RegExp> = {
  '.json': /^application\/json/,
  '.svg': /^image\/svg\+xml/,
  '.png': /^image\/png/,
  '.webp': /^image\/webp/,
  '.jpg': /^image\/jpeg/,
  '.mp3': /^audio\/mpeg/,
  '.wav': /^audio\/(wav|x-wav|wave)/,
  '.js': /^(text|application)\/javascript/,
  '.css': /^text\/css/,
  '.html': /^text\/html/,
  '.woff2': /^font\/woff2/,
  '.ttf': /^font\/ttf/,
  '.txt': /^text\/plain/,
};

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));

const writeResult = (name: string, data: unknown) => {
  fs.mkdirSync(path.join(AUDIT, 'report', 'data'), { recursive: true });
  fs.writeFileSync(path.join(AUDIT, 'report', 'data', `${name}.json`), `${JSON.stringify(data, null, 1)}\n`);
};

test('every built file and page route is served with the right content type', async ({ request }) => {
  const dist = path.join(ROOT, 'dist');
  const files = walk(dist).map((f) => `/${path.relative(dist, f).split(path.sep).join('/')}`);
  const bad: string[] = [];
  const check = async (url: string) => {
    const res = await request.get(`${APP}${encodeURI(url)}`, { maxRedirects: 0 });
    const ext = path.extname(url).toLowerCase();
    const type = res.headers()['content-type'] ?? '';
    if (res.status() !== 200) bad.push(`${res.status()} ${url}`);
    else if (CONTENT_TYPES[ext] && !CONTENT_TYPES[ext].test(type)) bad.push(`wrong type ${type} for ${url}`);
  };
  for (let i = 0; i < files.length; i += 40) await Promise.all(files.slice(i, i + 40).map(check));
  for (const route of ['/', '/login', '/forgot-password', '/editor']) {
    const res = await request.get(`${APP}${route}`);
    if (res.status() !== 200 || !/text\/html/.test(res.headers()['content-type'] ?? '')) bad.push(`${res.status()} page ${route}`);
  }
  const missing = await request.get(`${APP}/api/no-such-route`);
  if (missing.status() !== 404 && missing.status() !== 401) bad.push(`unknown API route returned ${missing.status()}`);
  writeResult('served-files', { checked: files.length + 5, bad });
  expect(bad, bad.join('\n')).toEqual([]);
});

test('library: every manifest entry has its files, and no orphan files on disk', async ({ request }) => {
  const manifest = readJson<{ id: string; file: string; thumb: string; thumbLine?: string; thumbColor: string }[]>(path.join(ROOT, 'public/library/manifest.json'));
  const bad: string[] = [];
  const used = new Set<string>();
  const ids = new Set<string>();
  for (const m of manifest) {
    if (ids.has(m.id)) bad.push(`duplicate id ${m.id}`);
    ids.add(m.id);
    for (const u of [m.file, m.thumb, m.thumbLine, m.thumbColor].filter(Boolean) as string[]) {
      used.add(u);
      if (!fs.existsSync(path.join(ROOT, 'public', u))) bad.push(`${m.id}: missing ${u}`);
    }
  }
  // Served from the production server too (a sample of 60 across categories, all three files).
  const sample = manifest.filter((_, i) => i % Math.ceil(manifest.length / 60) === 0);
  for (const m of sample) {
    for (const u of [m.file, m.thumb, m.thumbColor]) {
      const res = await request.get(`${APP}${u}`);
      if (res.status() !== 200) bad.push(`${res.status()} ${u}`);
    }
    const doc = await (await request.get(`${APP}${m.file}`)).json();
    if (doc.id !== m.id || !Array.isArray(doc.strokes) || doc.strokes.length === 0) bad.push(`${m.id}: item JSON is empty or has the wrong id`);
  }
  const lib = path.join(ROOT, 'public/library');
  const orphans = walk(lib)
    .map((f) => `/library/${path.relative(lib, f).split(path.sep).join('/')}`)
    .filter((u) => u !== '/library/manifest.json' && !u.endsWith('.md') && !used.has(u));
  writeResult('library', { entries: manifest.length, problems: bad, orphans });
  expect(bad, bad.join('\n')).toEqual([]);
  expect(orphans, `orphan library files:\n${orphans.join('\n')}`).toEqual([]);
});

test('hands: every entry loads and its pen tip is inside the image', async ({ page }) => {
  const hands = readJson<{ id: string; file: string; png?: string; thumb?: string; tipX: number; tipY: number }[]>(path.join(ROOT, 'public/hands/hands.json'));
  await page.goto(`${APP}/`);
  const result = await page.evaluate(async (list) => {
    const out: string[] = [];
    for (const h of list) {
      for (const url of [h.file, h.png, h.thumb].filter(Boolean) as string[]) {
        const img = new Image();
        img.src = url;
        try {
          await img.decode();
        } catch {
          out.push(`${h.id}: ${url} does not load`);
          continue;
        }
        if (url === h.file && (h.tipX < 0 || h.tipY < 0 || h.tipX > img.naturalWidth || h.tipY > img.naturalHeight)) out.push(`${h.id}: tip ${h.tipX},${h.tipY} outside ${img.naturalWidth}×${img.naturalHeight}`);
      }
    }
    return out;
  }, hands);
  writeResult('hands', { hands: hands.length, problems: result });
  expect(result).toEqual([]);
});

test('fonts: every built-in font loads', async ({ page }) => {
  test.setTimeout(300_000);
  const source = fs.readFileSync(path.join(ROOT, 'src/library/fonts.ts'), 'utf8');
  const fonts = [...source.matchAll(/^\s*font\('([^']+)'(?:, \{[^}]*?label: '([^']+)')?/gm)].map((m) => ({ family: m[1], label: m[2] ?? m[1] }));
  expect(fonts.length).toBeGreaterThan(10);
  await openEditor(page);
  await page.getByRole('tab', { name: 'Text' }).click();
  const failed: string[] = [];
  for (const f of fonts) {
    // A row loads its font's stylesheet when it scrolls into view.
    await page.locator('.fontpane .font-row', { hasText: f.label }).first().scrollIntoViewIfNeeded();
    const ok = await page
      .waitForFunction(
        async (family) => {
          await document.fonts.load(`20px "${family}"`).catch(() => []);
          return [...document.fonts].some((ff) => ff.family.replace(/"/g, '') === family && ff.status === 'loaded');
        },
        f.family,
        { timeout: 15_000, polling: 500 },
      )
      .then(() => true)
      .catch(() => false);
    if (!ok) failed.push(f.family);
  }
  writeResult('fonts', { families: fonts.map((f) => f.family), failed });
  expect(failed, `fonts that did not load: ${failed.join(', ')}`).toEqual([]);
});

test('links: no dead internal links, external links are https and open safely', async ({ page, request }) => {
  test.setTimeout(240_000);
  const inv = readJson<{ links: { id: string; url: string; where: string }[] }>(path.join(AUDIT, 'inventory.json'));
  const report: { id: string; url: string; where: string; status: string; ok: boolean }[] = [];
  for (const l of inv.links) {
    const url = l.url;
    if (/^(#|javascript:)/i.test(url)) {
      report.push({ ...l, status: 'href is # or javascript:', ok: false });
      continue;
    }
    if (url.startsWith('/')) {
      const res = await request.get(`${APP}${url}`);
      report.push({ ...l, status: String(res.status()), ok: res.ok() });
      continue;
    }
    if (!/^https?:/.test(url) || /[${}]/.test(url)) {
      report.push({ ...l, status: 'not a fixed URL (built at run time)', ok: true });
      continue;
    }
    const insecure = url.startsWith('http://') && !/localhost|127\.0\.0\.1|www\.w3\.org\/2000\/svg|w3\.org\/1999\/xlink/.test(url);
    // Preconnect origins and API bases aren't pages; a 404 at their root is expected.
    const isOrigin = /^https:\/\/[^/]+\/?$/.test(url) || /fonts\.(googleapis|gstatic)\.com\/?$/.test(url);
    let status = 'skipped';
    let ok = !insecure;
    if (/w3\.org\/(2000|1999)/.test(url)) status = 'XML namespace, not fetched';
    else {
      try {
        let res = await request.head(url, { timeout: 15_000, maxRedirects: 5 });
        if (res.status() >= 400) res = await request.get(url, { timeout: 15_000, maxRedirects: 5 });
        status = `${res.status()}`;
        ok = ok && (res.ok() || (isOrigin && res.status() === 404) || /generativelanguage/.test(url));
      } catch (err) {
        status = `error: ${(err as Error).message.split('\n')[0]}`;
        ok = false;
      }
    }
    report.push({ ...l, status: insecure ? `${status} (http:// link)` : status, ok });
  }
  // Every link on the pages people see: new-tab links need rel="noopener noreferrer", no # or javascript: hrefs.
  const domIssues: string[] = [];
  for (const route of ['/login', '/forgot-password']) {
    await page.goto(`${APP}${route}`);
    domIssues.push(
      ...(await page.$$eval('a', (as) =>
        as.flatMap((a) => {
          const href = a.getAttribute('href') ?? '';
          const out: string[] = [];
          if (!href || href === '#' || /^javascript:/i.test(href)) out.push(`${location.pathname}: "${a.textContent?.trim()}" has href="${href}"`);
          if (a.target === '_blank' && !/noopener/.test(a.rel)) out.push(`${location.pathname}: "${a.textContent?.trim()}" opens a new tab without rel="noopener noreferrer"`);
          return out;
        }),
      )),
    );
  }
  await openEditor(page);
  domIssues.push(
    ...(await page.$$eval('a', (as) => as.filter((a) => a.target === '_blank' && !/noopener/.test(a.rel)).map((a) => `editor: ${a.href} without rel=noopener`))),
  );
  writeResult('links', { links: report, domIssues });
  const bad = report.filter((r) => !r.ok).map((r) => `${r.id} ${r.url} (${r.where}): ${r.status}`);
  expect([...bad, ...domIssues], [...bad, ...domIssues].join('\n')).toEqual([]);
});

test('no names, URLs or assets from other products', async () => {
  const words = /instadoodle|doodly|videoscribe|eleven ?labs|elevenlabs|\beleven\b/i;
  const shipped = ['src', 'server', 'public', 'index.html', 'api', 'proxy.js', 'README.md', 'vercel.json', 'package.json'];
  const hits: { file: string; line: number; text: string; shipped: boolean }[] = [];
  const scan = (rel: string, isShipped: boolean) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return;
    const list = fs.statSync(abs).isDirectory() ? walk(abs) : [abs];
    for (const f of list) {
      const r = path.relative(ROOT, f);
      if (/\.(png|webp|jpg|mp3|wav|woff2?|ttf|zip)$/i.test(f)) {
        if (words.test(path.basename(f))) hits.push({ file: r, line: 0, text: '(file name)', shipped: isShipped });
        continue;
      }
      fs.readFileSync(f, 'utf8')
        .split('\n')
        .forEach((text, i) => {
          if (words.test(text)) hits.push({ file: r, line: i + 1, text: text.trim().slice(0, 160), shipped: isShipped });
        });
    }
  };
  for (const s of shipped) scan(s, true);
  for (const s of ['scripts', 'tools', 'replica', 'MUSIC_NOTES.md', 'assets/pen-sounds', 'assets/library/LICENSES.md']) scan(s, false);
  writeResult('leftovers', hits);
  const inShipped = hits.filter((h) => h.shipped);
  expect(inShipped, inShipped.map((h) => `${h.file}:${h.line} ${h.text}`).join('\n')).toEqual([]);
});
