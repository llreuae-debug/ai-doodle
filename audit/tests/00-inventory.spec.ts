/**
 * Part 1: builds the inventory from the code and the running page.
 *
 *   audit/inventory.json   machine-readable, used by the control sweep (02) and the report
 *   audit/inventory.md     the list for people, with IDs
 *
 * Controls come from accessibility snapshots of each UI state (STATES in helpers.ts), so every
 * control is listed under the role and name a screen reader (and getByRole) sees. Repeated
 * controls (library tiles, fonts, hands, slide cards) are listed once with a count.
 */
import fs from 'node:fs';
import path from 'node:path';
import { AUDIT, openEditor, ROOT, STATES, test } from './helpers';

type Control = { id: string; kind: string; role: string; name: string; state: string; region: string; count: number; disabled?: boolean };

const INTERACTIVE = new Set(['button', 'link', 'checkbox', 'switch', 'combobox', 'slider', 'spinbutton', 'textbox', 'searchbox', 'tab', 'menuitem', 'radio', 'option']);
/** Repeated controls listed once. */
const GROUPS: [RegExp, string][] = [
  [/^Add .+ \((Colour|Line)\)$/, 'Library tile (adds that doodle)'],
  [/^Slide \d+$/, 'Slide card (selects the slide)'],
  [/^Slide \d+ options$/, 'Slide card kebab menu'],
  [/^\d+\. /, 'Layer row (selects the item)'],
];

function parseSnapshot(yaml: string) {
  const out: { role: string; name: string; disabled: boolean }[] = [];
  for (const line of yaml.split('\n')) {
    const m = /^\s*- (\w+)(?: "((?:[^"\\]|\\.)*)")?(.*)$/.exec(line);
    if (!m || !INTERACTIVE.has(m[1])) continue;
    out.push({ role: m[1], name: (m[2] ?? '').replace(/\\"/g, '"'), disabled: /\[disabled\]/.test(m[3]) });
  }
  return out;
}

const KIND: Record<string, string> = { link: 'L', button: 'B', tab: 'B', menuitem: 'B', checkbox: 'B', switch: 'B', combobox: 'B', slider: 'B', spinbutton: 'B', radio: 'B', textbox: 'B', searchbox: 'B' };

test('inventory: controls in every UI state', async ({ context }) => {
  test.setTimeout(10 * 60_000);
  const controls = new Map<string, Control>();
  const missingStates: string[] = [];
  for (const [state, { root, enter }] of Object.entries(STATES)) {
    // A fresh tab per state: reloading would be blocked by the unsaved-changes prompt.
    const page = await context.newPage();
    const t0 = Date.now();
    await openEditor(page);
    console.log(`state ${state}: open ${Date.now() - t0} ms`);
    try {
      await enter(page);
      await page.locator(root).first().waitFor({ timeout: 8000 });
      await page.waitForTimeout(400);
    } catch (err) {
      missingStates.push(`${state}: ${(err as Error).message.split('\n')[0]}`);
      await page.close();
      continue;
    }
    console.log(`state ${state}: entered ${Date.now() - t0} ms`);
    // Library tiles are many copies of one control: list them once.
    if (root === 'aside.left') await page.waitForTimeout(800);
    const tileNames = new Set(await page.$$eval('.libgrid .tile', (els) => els.map((e) => (e.textContent ?? '').trim())));
    // Clickable options (hand tiles, the generator's type menu); <select> options are not controls of their own.
    const optionNames = new Set(await page.$$eval('[role=option]', (els) => els.map((e) => (e.textContent ?? '').trim())));
    const handNames = new Set(await page.$$eval('.hand-tile', (els) => els.map((e) => (e.textContent ?? '').trim())));
    const roots = page.locator(root);
    const yaml = (await Promise.all((await roots.all()).map((r) => r.ariaSnapshot()))).join('\n');
    for (const c of parseSnapshot(yaml)) {
      if (c.role === 'option' && !optionNames.has(c.name)) continue;
      if (handNames.has(c.name)) {
        c.name = 'Hand picker tile (sets the drawing hand)';
      }
      const group: [RegExp, string] | undefined = tileNames.has(c.name) ? [/./, 'Library tile (adds that doodle to the slide)'] : GROUPS.find(([re]) => re.test(c.name));
      const name = group ? group[1] : c.name || '(no accessible name)';
      // Modals keep their own controls; panels share them across states.
      const region = state.startsWith('modal') ? state : state.split(' · ')[0];
      const key = `${region}|${c.role}|${name}`;
      const had = controls.get(key);
      if (had) {
        if (group || c.name.startsWith('Hand picker tile')) had.count++;
        continue;
      }
      controls.set(key, { id: '', kind: KIND[c.role] ?? 'B', role: c.role, name, state, region, count: 1, disabled: c.disabled || undefined });
    }
    await page.close();
  }

  // ---------- from the code ----------
  const src = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const walk = (dir: string): string[] =>
    fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
  const appFiles = walk('src').filter((f) => /\.(tsx?|css)$/.test(f) && !/\.test\./.test(f));

  // Links: every href in the app code and index.html.
  const links: { url: string; where: string }[] = [];
  for (const f of [...appFiles, 'index.html']) {
    for (const m of src(f).matchAll(/href=\{?["'`]([^"'`]+)["'`]/g)) links.push({ url: m[1], where: f });
    for (const m of src(f).matchAll(/<Link[^>]*to=["']([^"']+)["']/g)) links.push({ url: m[1], where: `${f} (Link)` });
  }
  // External URLs anywhere in the app code (fetches, links, fonts).
  for (const f of appFiles) for (const m of src(f).matchAll(/https?:\/\/[a-zA-Z0-9.-]+[^\s"'`)<>]*/g)) if (!links.some((l) => l.url === m[0])) links.push({ url: m[0], where: `${f} (url in code)` });

  // API calls in the front end and routes in the back end.
  const api: { method: string; url: string; where: string }[] = [];
  for (const f of appFiles) {
    const text = src(f);
    // call(url) is a GET; call(url, body) is a POST.
    for (const m of text.matchAll(/call(?:<[^>]*>)?\(\s*['"`](\/api\/[^'"`]+)['"`]\s*(,\s*[^)\s])?/g)) api.push({ method: m[2] ? 'POST' : 'GET', url: m[1], where: f });
    for (const m of text.matchAll(/fetch\(\s*['"`]([^'"`]+)['"`]/g)) api.push({ method: 'GET', url: m[1], where: f });
  }
  const router = src('server/api/router.ts');
  const routes = [
    ...[...router.matchAll(/^\s*'(\/api\/[^']+)': \{ bucket/gm)].map((m) => ({ method: 'POST', url: m[1] })),
    ...[...router.matchAll(/^\s*'(\/api\/[^']+)': async \(b\)|^\s*'(\/api\/[^']+)': \{$/gm)].map((m) => ({ method: 'POST', url: m[1] ?? m[2] })),
    ...[...router.matchAll(/^\s*'(\/api\/[^']+)': \(\) =>/gm)].map((m) => ({ method: 'GET', url: m[1] })),
    { method: 'POST', url: '/api/access' },
    { method: 'GET', url: '/media/<project>/<file>' },
  ];

  // File inputs.
  const files: { accept: string; where: string }[] = [];
  for (const f of appFiles) for (const m of src(f).matchAll(/type="file"[^>]*accept=\{?["']?([^"'}]+)/g)) files.push({ accept: m[1], where: f });
  for (const f of appFiles) for (const m of src(f).matchAll(/accept=\{([A-Z_]+)\}[^>]*|type="file"\s+accept=\{([A-Z_]+)\}/g)) files.push({ accept: m[1] ?? m[2], where: f });

  // Modals: every component that renders the Modal shell or role="dialog".
  const modals: { name: string; where: string }[] = [];
  for (const f of appFiles) {
    const t = src(f);
    for (const m of t.matchAll(/<Modal\s+[^>]*?title=\{?[`"']?([^`"'}]+)/gs)) modals.push({ name: m[1].trim(), where: f });
    if (/role="dialog"/.test(t) && !/<Modal/.test(t)) modals.push({ name: path.basename(f, '.tsx'), where: f });
  }

  // Keyboard shortcuts handled in the editor.
  const shortcuts = ['Space (play / pause)', 'M (mute pen sound)', 'Ctrl/Cmd+Z (undo)', 'Ctrl/Cmd+Shift+Z (redo)', 'Ctrl/Cmd+Y (redo)', 'Ctrl/Cmd+S (save)', 'Ctrl/Cmd+D (duplicate)', 'Delete / Backspace (remove selected)', 'Arrow keys (nudge 8 px)', 'Shift+Arrow keys (nudge 40 px)', 'Escape (deselect / close modal / close menu)'];

  // Assets: every file under public/, grouped.
  const pub = walk('public').map((f) => f.slice('public'.length).replace(/\\/g, '/'));
  const assetGroups: Record<string, number> = {};
  for (const f of pub) {
    const g = f.split('/').slice(0, f.startsWith('/library/') ? 3 : 2).join('/') || f;
    assetGroups[g] = (assetGroups[g] ?? 0) + 1;
  }

  // ---------- ids ----------
  const counters: Record<string, number> = {};
  const nextId = (k: string) => `${k}-${String((counters[k] = (counters[k] ?? 0) + 1)).padStart(3, '0')}`;
  const ctrlList = [...controls.values()];
  for (const c of ctrlList) c.id = nextId(c.kind);
  const linkList = links.map((l) => ({ id: nextId('L'), ...l }));
  const modalNames = Object.keys(STATES).filter((s) => s.startsWith('modal')).map((s) => ({ id: nextId('M'), name: s.replace('modal · ', ''), state: s }));
  for (const [name, state] of [['Filter popover', 'left · filter popover'], ['Pen sound volume popover', 'pen sound popover'], ['Slide kebab menu', 'slide menu'], ['Hand picker (Project tab)', 'right · project'], ['Story wizard steps 2–4 (look and voice, script, build)', '']]) modalNames.push({ id: nextId('M'), name, state });
  // Windows found in the code that the crawl already opened under another name.
  const SAME: Record<string, string> = { ApiKeyModal: 'API key', 'Soundtrack library': 'Music library', 'Add your image': 'Upload image', 'Your projects': 'Dashboard', 'Make your first video': 'Tutorials', 'Generate with AI': 'Generate props with AI', 'Generate music': 'Music', Story: 'Story wizard', Export: 'Export', CharacterVariationsModal: 'Character variations' };
  for (const m of modals) {
    const known = SAME[m.name] ?? modalNames.find((x) => x.name.toLowerCase().startsWith(m.name.toLowerCase().slice(0, 8)))?.name;
    if (!known || !modalNames.some((x) => x.name === known)) modalNames.push({ id: nextId('M'), name: `${m.name} (${m.where})`, state: '' });
  }
  const apiList = [
    ...routes.map((r) => ({ id: nextId('A'), side: 'server route', ...r, where: 'server/api/router.ts' })),
    ...api.map((a) => ({ id: nextId('A'), side: 'front-end call', ...a })),
  ];
  const fileList = files.filter((f, i) => files.findIndex((g) => g.accept === f.accept && g.where === f.where) === i).map((f) => ({ id: nextId('F'), ...f }));
  const keyList = shortcuts.map((k) => ({ id: nextId('K'), name: k }));
  const assetList = Object.entries(assetGroups).map(([g, n]) => ({ id: nextId('S'), path: g, files: n }));

  const inv = { generated: new Date().toISOString(), controls: ctrlList, links: linkList, modals: modalNames, api: apiList, files: fileList, shortcuts: keyList, assets: assetList, missingStates };
  fs.writeFileSync(path.join(AUDIT, 'inventory.json'), `${JSON.stringify(inv, null, 1)}\n`);

  const md: string[] = [
    '# Inventory',
    '',
    `Generated ${inv.generated} by \`audit/tests/00-inventory.spec.ts\` from the running app (accessibility snapshots of ${Object.keys(STATES).length} UI states) and the source code. Every item has an ID used in the audit report.`,
    '',
    `Totals: ${ctrlList.length} controls, ${linkList.length} links and URLs, ${modalNames.length} modals, ${apiList.length} API routes and calls, ${fileList.length} file inputs, ${keyList.length} shortcuts, ${assetList.length} asset groups (${pub.length} files).`,
    '',
  ];
  if (missingStates.length) md.push('**States the crawl could not open:**', '', ...missingStates.map((s) => `- ${s}`), '');
  md.push('## Controls (B) and in-page links', '', '| ID | Role | Name | Where | Count |', '|---|---|---|---|---|');
  for (const c of ctrlList) md.push(`| ${c.id} | ${c.role} | ${c.name.replace(/\|/g, '\\|')} | ${c.state} | ${c.count}${c.disabled ? ' (disabled at crawl)' : ''} |`);
  md.push('', '## Links and URLs (L)', '', '| ID | URL | Where |', '|---|---|---|', ...linkList.map((l) => `| ${l.id} | ${l.url} | ${l.where} |`));
  md.push('', '## Modals and popovers (M)', '', '| ID | Modal |', '|---|---|', ...modalNames.map((m) => `| ${m.id} | ${m.name} |`));
  md.push('', '## API (A)', '', '| ID | Side | Method | URL | Where |', '|---|---|---|---|---|', ...apiList.map((a) => `| ${a.id} | ${a.side} | ${a.method} | ${a.url} | ${a.where} |`));
  md.push('', '## File inputs (F)', '', '| ID | Accepts | Where |', '|---|---|---|', ...fileList.map((f) => `| ${f.id} | ${f.accept} | ${f.where} |`));
  md.push('', '## Keyboard shortcuts (K)', '', '| ID | Shortcut |', '|---|---|', ...keyList.map((k) => `| ${k.id} | ${k.name} |`));
  md.push('', '## Assets (S)', '', '| ID | Path | Files |', '|---|---|---|', ...assetList.map((a) => `| ${a.id} | ${a.path} | ${a.files} |`));
  fs.writeFileSync(path.join(AUDIT, 'inventory.md'), `${md.join('\n')}\n`);
});
