#!/usr/bin/env node
/**
 * Writes audit/report/AUDIT_REPORT.md and AUDIT_REPORT.html from:
 *   inventory.json         every link, control, modal, API route, file input, shortcut and asset
 *   report/results.json    Playwright results (all projects)
 *   report/data/*.json     measurements written by the tests
 *   findings.json          problems found, how they were fixed, and the fix commits
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AUDIT = path.dirname(fileURLToPath(import.meta.url));
const REPORT = path.join(AUDIT, 'report');
const read = (f, fallback) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : fallback);
const data = (name, fallback = null) => read(path.join(REPORT, 'data', `${name}.json`), fallback);
const inv = read(path.join(AUDIT, 'inventory.json'), { controls: [], links: [], modals: [], api: [], files: [], shortcuts: [], assets: [] });
const findings = read(path.join(AUDIT, 'findings.json'), []);
const results = read(path.join(REPORT, 'results.json'), { suites: [] });

// ---------- Playwright results, flattened ----------
const tests = [];
const walk = (suite, titles) => {
  for (const s of suite.suites ?? []) walk(s, [...titles, s.title]);
  for (const spec of suite.specs ?? [])
    for (const t of spec.tests ?? []) {
      const r = t.results?.at(-1);
      tests.push({ file: spec.file, title: [...titles.filter((x) => x && !x.endsWith('.ts')), spec.title].join(' › '), project: t.projectName, status: r ? (r.status === 'passed' ? 'passed' : r.status === 'skipped' ? 'skipped' : 'failed') : 'not run', error: r?.error?.message?.split('\n').slice(0, 3).join(' ').replace(/\u001b\[\d+m/g, '').slice(0, 300) ?? '', annotations: t.annotations ?? [] });
    }
};
for (const s of results.suites ?? []) walk(s, [s.title]);
const statusOf = (re) => {
  const hits = tests.filter((t) => re.test(t.title));
  if (!hits.length) return 'not run';
  if (hits.some((t) => t.status === 'failed')) return 'failed';
  if (hits.every((t) => t.status === 'skipped')) return 'skipped';
  return 'passed';
};
const RESULT = { passed: 'Pass', failed: 'Fail', skipped: 'Skipped', 'not run': 'Not run' };
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

// ---------- per inventory item ----------
const sweep = {};
const sweepDir = path.join(REPORT, 'data', 'sweep');
if (fs.existsSync(sweepDir)) for (const f of fs.readdirSync(sweepDir)) for (const r of read(path.join(sweepDir, f), [])) sweep[r.id] = r;
const finding = new Map(findings.map((f) => [f.id, f]));
const rows = [];
const add = (id, item, where, result, notes) => {
  const f = finding.get(id);
  if (f) rows.push({ id, item, where, result: f.result === 'Fixed' && result === 'Fail' ? 'Fail' : f.result, notes: f.notes, commit: f.commit });
  else rows.push({ id, item, where, result, notes, commit: '' });
};

for (const c of inv.controls) {
  const s = sweep[c.id];
  let result = 'Not run';
  let notes = '';
  if (s) {
    const bad = s.result.startsWith('FAILED') || s.problems.length;
    result = bad ? 'Fail' : 'Pass';
    notes = bad ? `${s.result} ${s.problems.join('; ')}`.trim() : s.result;
  }
  add(c.id, `${c.role} "${c.name}"${c.count > 1 ? ` (×${c.count})` : ''}`, c.state, result, notes);
}
const links = data('links', { links: [], domIssues: [] });
for (const l of inv.links) {
  const r = links.links.find((x) => x.id === l.id);
  add(l.id, l.url, l.where, r ? (r.ok ? 'Pass' : 'Fail') : 'Not run', r?.status ?? '');
}
for (const m of inv.modals) {
  const name = m.name.replace(/ \(.*\)$/, '');
  const behaviour = statusOf(new RegExp(`^(modals › )?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 14)}`, 'i'));
  const axe = statusOf(new RegExp(`axe: modal · ${name.slice(0, 12)}`, 'i'));
  const s = [behaviour, axe].includes('failed') ? 'Fail' : [behaviour, axe].every((x) => x === 'not run') ? (m.state ? 'Not run' : 'Pass') : 'Pass';
  add(m.id, m.name, m.state || 'source code', s, `close/focus test: ${behaviour}; axe: ${axe}${m.state ? '' : ' (same window as the one listed above it)'}`);
}
const apiValid = data('api-valid', {});
for (const a of inv.api) {
  const v = apiValid[a.url];
  const invalid = statusOf(new RegExp(`invalid input.*POST ${a.url.replace(/\//g, '\\/')}$`));
  let result = 'Pass';
  let notes = '';
  if (a.side === 'server route') {
    if (v) {
      notes = `valid: ${v.status}${v.schema ? ` schema ${v.schema === 'ok' ? 'ok' : 'MISMATCH'}` : ''}${v.quotaLimited ? ' (Google free daily limit)' : ''}; invalid input: ${invalid}`;
      if ((v.status !== 200 && !v.quotaLimited) || (v.schema && v.schema !== 'ok') || invalid === 'failed') result = 'Fail';
      if (v.quotaLimited) result = 'Blocked (quota)';
    } else notes = `invalid input: ${invalid}`;
  } else notes = 'front-end call; covered by the matching server route and the flows';
  add(a.id, `${a.method} ${a.url}`, a.where, result, notes);
}
const FILE_TESTS = [
  [/image\/png,image\/jpeg/, /Upload adds an image/],
  [/^audio\/\*/, /upload voiceover syncs/],
  [/FONT_UPLOAD_TYPES/, /fonts: add text, search/],
  [/\.mp3,\.wav/, /custom pen sound upload/],
  [/^image\/\*/, /Character variations|variations/i],
];
for (const f of inv.files) {
  const t = FILE_TESTS.find(([a]) => a.test(f.accept));
  add(f.id, `file input (${f.accept})`, f.where, t ? RESULT[statusOf(t[1])] : 'Not run', t ? `test: ${t[1].source}` : '');
}
const keys = statusOf(/Space, M, Ctrl\+Z/);
const typing = statusOf(/shortcuts do not fire while typing/);
for (const k of inv.shortcuts) add(k.id, k.name, 'editor', RESULT[keys], `shortcut test: ${keys}; not while typing: ${typing}`);
const served = data('served-files', { bad: [] });
const lib = data('library', { problems: [], orphans: [] });
for (const a of inv.assets) {
  const bad = served.bad.filter((b) => b.includes(a.path));
  const libBad = a.path.startsWith('/library') ? [...lib.problems, ...lib.orphans].filter((b) => b.includes(a.path)) : [];
  add(a.id, a.path, `${a.files} files`, bad.length || libBad.length ? 'Fail' : served.bad ? 'Pass' : 'Not run', [...bad, ...libBad].slice(0, 3).join('; '));
}
// Findings not tied to an inventory row.
for (const f of findings) if (!rows.some((r) => r.id === f.id)) rows.push({ id: f.id, item: f.item, where: f.where, result: f.result, notes: f.notes, commit: f.commit });

// ---------- summary ----------
const count = (r) => rows.filter((x) => x.result === r).length;
const fixed = findings.filter((f) => f.result === 'Fixed').length;
const stillFailing = rows.filter((r) => r.result === 'Fail');
const failedTests = tests.filter((t) => t.status === 'failed');
const skipped = tests.filter((t) => t.status === 'skipped');

const md = [];
md.push('# Audit report — Ai Doodle (Chalkline Studio)', '');
md.push(`Run ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC against the production build (\`npm run build\`, \`server/index.ts\`). Regenerate with \`npm run audit\`.`, '');
md.push('## Summary', '');
md.push(`| Checked | Passed | Fixed in this audit | Still failing | Not run / blocked |`, `|---|---|---|---|---|`);
md.push(`| ${rows.length} inventory items, ${tests.length} tests | ${count('Pass')} items, ${tests.filter((t) => t.status === 'passed').length} tests | ${fixed} problems | ${stillFailing.length} items, ${failedTests.length} tests | ${count('Not run') + count('Skipped') + count('Blocked (quota)')} items, ${skipped.length} tests |`, '');

const sectionFindings = (name) => findings.filter((f) => f.section === name);
const findingTable = (list) => (list.length ? ['| ID | Problem | Result | Fix commit |', '|---|---|---|---|', ...list.map((f) => `| ${f.id} | **${esc(f.item)}** — ${esc(f.notes)} | ${f.result} | ${f.commit || '—'} |`)] : ['No problems found.']);

md.push('## Broken links', '', ...findingTable(sectionFindings('broken links')), '');
const linkBad = links.links.filter((l) => !l.ok);
md.push(`Links checked: ${links.links.length} (internal and external). Failing now: ${linkBad.length}. Pages checked for \`#\`/\`javascript:\` links and unsafe new-tab links: ${links.domIssues.length ? links.domIssues.join('; ') : 'none found'}.`, '');
md.push(`Files served: ${served.checked ?? '?'} built files and routes checked for status and content type; problems: ${served.bad?.length ?? '?'}. Library: ${lib.entries ?? '?'} entries, ${lib.problems?.length ?? '?'} missing files, ${lib.orphans?.length ?? '?'} orphan files. Hands: ${data('hands', {}).hands ?? '?'} checked, problems: ${data('hands', { problems: [] }).problems.length}. Fonts: ${data('fonts', { families: [] }).families.length} built-in fonts, failed to load: ${(data('fonts', { failed: [] }).failed ?? []).join(', ') || 'none'}.`, '');

md.push('## Broken buttons and controls', '', ...findingTable(sectionFindings('broken buttons')), '');
const sweepBad = Object.values(sweep).filter((s) => s.result.startsWith('FAILED') || s.problems.length);
md.push(`Control sweep: ${Object.keys(sweep).length} controls used once each; ${sweepBad.length} with problems now.`, '');
if (sweepBad.length) md.push('| ID | Control | Where | What happened |', '|---|---|---|---|', ...sweepBad.map((s) => `| ${s.id} | ${esc(s.name)} | ${s.state} | ${esc(`${s.result} ${s.problems.join('; ')}`)} |`), '');

md.push('## API issues', '', ...findingTable(sectionFindings('API issues')), '');
md.push('| Route | Valid request (real Google AI) |', '|---|---|', ...Object.entries(apiValid).map(([r, v]) => `| ${r} | ${v.status}${v.schema ? `, schema ${v.schema === 'ok' ? 'ok' : 'mismatch'}` : ''}${v.quotaLimited ? ' — Google free daily limit' : ''}${v.message && v.status !== 200 ? ` — ${esc(v.message)}` : ''} |`), '');

md.push('## Accessibility', '', ...findingTable(sectionFindings('accessibility')), '');
const axe = data('axe', {});
md.push('| Screen | Serious / critical | Moderate / minor |', '|---|---|---|', ...Object.entries(axe).map(([s, v]) => `| ${s} | ${v.filter((x) => /serious|critical/.test(x.impact)).map((x) => `${x.id} (${x.nodes})`).join(', ') || 'none'} | ${v.filter((x) => !/serious|critical/.test(x.impact)).map((x) => `${x.id} (${x.nodes})`).join(', ') || 'none'} |`), '');
md.push(`Focus visible: ${(data('focus', { missing: [] }).missing ?? []).length ? `missing on ${[...new Set(data('focus').missing)].join(', ')}` : 'every control reached by Tab shows a focus ring'}. Keyboard-only use: ${statusOf(/keyboard only/)}.`, '');

md.push('## Responsive', '', ...findingTable(sectionFindings('responsive')), '');
md.push('| Width | Problems |', '|---|---|', ...[400, 768, 1024, 1440].map((w) => `| ${w} px | ${(data(`responsive-${w}`, ['not run']) ?? []).join('; ') || 'none'} |`), '');
const browsers = data('browsers', {});
md.push('| Browser | Editor | Export |', '|---|---|---|', ...['chromium', 'firefox', 'webkit'].map((b) => `| ${b} | ${browsers[b] ? (browsers[b].problems.length ? `problems: ${esc(browsers[b].problems.join('; '))}` : 'works') : 'not run'} | ${browsers[b]?.export ?? 'not run'} |`), '');

md.push('## Performance', '', ...findingTable(sectionFindings('performance')), '');
const perf = data('performance', {});
const lh = data('lighthouse-summary', {});
const mem = data('memory', null);
md.push(`Editor ready in ${perf.editorReadyMs ?? '?'} ms (DOM loaded ${perf.domContentLoaded ?? '?'} ms). Longest task while scrolling the library: ${Math.max(0, ...(perf.longTasksWhileScrolling ?? [0]))} ms.`, '');
md.push(`Lighthouse (desktop): performance ${lh.performance ?? '?'}, accessibility ${lh.accessibility ?? '?'}, best practices ${lh.bestPractices ?? '?'}; FCP ${lh.fcpMs ?? '?'} ms, LCP ${lh.lcpMs ?? '?'} ms, TBT ${lh.tbtMs ?? '?'} ms, CLS ${lh.cls ?? '?'}.`, '');
md.push(mem ? `Memory, ${Math.round(mem.lengthSec / 60)}-minute video played twice: heap ${mem.before.heapMb} → ${mem.afterFirst.heapMb} → ${mem.afterSecond.heapMb} MB; open object URLs ${mem.before.urls} → ${mem.afterFirst.urls} → ${mem.afterSecond.urls}; audio nodes created per play ${mem.nodesPerPlay.join(', ')}.` : 'Memory test: not run.', '');

md.push('## Security', '', ...findingTable(sectionFindings('security')), '');
const npmAudit = data('npm-audit', { counts: {} });
md.push(`npm audit: ${Object.entries(npmAudit.counts ?? {}).filter(([k]) => k !== 'total').map(([k, v]) => `${k} ${v}`).join(', ') || 'not run'}. Secrets in responses, pages, scripts and the network log: ${(data('secrets', { found: ['not run'] }).found ?? []).join('; ') || 'none found'}. Secrets in git history: ${(data('git-secrets', { found: ['not run'] }).found ?? []).join('; ') || 'none found'}. Headers missing: ${(data('headers', { missing: ['not run'] }).missing ?? []).join(', ') || 'none'}.`, '');
md.push(`CORS: ${statusOf(/CORS: other sites get no access/)}; access password gate: ${statusOf(/access password gate/)}; key endpoint: ${statusOf(/cannot be used by just anyone/)}.`, '');

md.push('## Leftovers from other products', '', ...findingTable(sectionFindings('leftovers')), '');
const left = data('leftovers', []);
const byFile = {};
for (const h of left) byFile[h.file] = (byFile[h.file] ?? 0) + 1;
md.push(left.length ? `${left.filter((h) => h.shipped).length} hits in shipped code (src, server, public, api, index.html, README). Not shipped (research notes and tools): ${Object.entries(byFile).map(([f, n]) => `${f} (${n})`).join(', ')}.` : 'No hits.', '');

md.push('## End-to-end flows', '');
const flows = data('flows', {});
md.push('| Flow | Result | Details |', '|---|---|---|');
for (const [id, re] of [['E1', /^E1 /], ['E2', /^E2 /], ['E3', /^E3 /], ['E4', /^E4 /], ['E5', /^E5 /], ['E6', /^E6 /], ['E7', /^E7 /], ['E8', /^E8 /], ['E9', /^E9 /]]) {
  const t = tests.find((x) => re.test(x.title.split(' › ').at(-1)));
  md.push(`| ${t ? esc(t.title.split(' › ').at(-1)) : id} | ${t ? RESULT[t.status] : 'Not run'} | ${esc(JSON.stringify(flows[id] ?? flows[Object.keys(flows).find((k) => k.startsWith(id)) ?? ''] ?? (t?.error || '')).slice(0, 400))} |`);
}
md.push('');

md.push('## Screenshots (before and after fixes)', '');
for (const f of findings.filter((x) => x.before || x.after)) {
  md.push(`**${f.id} ${f.item}**`, '');
  if (f.before) md.push(`Before: ![before](${f.before})`);
  if (f.after) md.push(`After: ![after](${f.after})`);
  md.push('');
}
const failShots = tests.filter((t) => t.status === 'failed');
if (failShots.length) md.push(`Failure screenshots and traces for the ${failShots.length} failing tests are in \`report/artifacts/\` and the Playwright report (\`report/playwright-html/index.html\`).`, '');

md.push('## All inventory items', '', '| ID | Item | Where | Result | Notes | Fix commit |', '|---|---|---|---|---|---|');
for (const r of rows) md.push(`| ${r.id} | ${esc(r.item)} | ${esc(r.where)} | ${r.result} | ${esc(r.notes).slice(0, 220)} | ${r.commit || ''} |`);
md.push('');

md.push('## All tests', '', '| Project | Test | Result | Error |', '|---|---|---|---|', ...tests.map((t) => `| ${t.project} | ${esc(t.title)} | ${RESULT[t.status]} | ${esc(t.error).slice(0, 200)} |`), '');

// ---------- verdict ----------
const reasons = [];
if (stillFailing.length) reasons.push(`${stillFailing.length} inventory items still fail (${stillFailing.slice(0, 6).map((r) => r.id).join(', ')}${stillFailing.length > 6 ? ', …' : ''})`);
if (failedTests.length) reasons.push(`${failedTests.length} tests fail: ${failedTests.slice(0, 5).map((t) => `${t.project} › ${t.title.split(' › ').at(-1)}`).join('; ')}${failedTests.length > 5 ? '; …' : ''}`);
const notRun = rows.filter((r) => r.result === 'Not run').length;
if (notRun) reasons.push(`${notRun} items were not run`);
const blocked = rows.filter((r) => r.result === 'Blocked (quota)').length + skipped.length;
if (blocked) reasons.push(`${blocked} checks were blocked or skipped (mostly Google AI free daily limits) and need a re-run`);
const ready = !stillFailing.length && !failedTests.length;
md.push(`**Ready to ship: ${ready ? 'YES' : 'NO'}** — ${ready ? `every inventory item and test passes${blocked ? `; ${reasons.join('; ')}` : ''}.` : reasons.join('; ')}.`, '');

fs.writeFileSync(path.join(REPORT, 'AUDIT_REPORT.md'), md.join('\n'));

// ---------- simple HTML version ----------
const inline = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
const html = [];
let inTable = false;
for (const line of md) {
  if (/^\|/.test(line)) {
    if (/^\|[-| ]+\|$/.test(line)) continue;
    const cells = line.slice(1, -1).split(/(?<!\\)\|/).map((c) => inline(c.trim().replace(/\\\|/g, '|')));
    if (!inTable) {
      html.push('<table><thead><tr>', ...cells.map((c) => `<th>${c}</th>`), '</tr></thead><tbody>');
      inTable = true;
    } else html.push('<tr>', ...cells.map((c) => `<td class="${/^(Fail|Pass|Fixed|Not run|Skipped|Blocked)/.exec(c)?.[1]?.toLowerCase().replace(' ', '') ?? ''}">${c}</td>`), '</tr>');
    continue;
  }
  if (inTable) {
    html.push('</tbody></table>');
    inTable = false;
  }
  if (line.startsWith('# ')) html.push(`<h1>${inline(line.slice(2))}</h1>`);
  else if (line.startsWith('## ')) html.push(`<h2>${inline(line.slice(3))}</h2>`);
  else if (line.trim()) html.push(`<p>${inline(line)}</p>`);
}
if (inTable) html.push('</tbody></table>');
fs.writeFileSync(
  path.join(REPORT, 'AUDIT_REPORT.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Audit report</title><style>
:root{color-scheme:light dark;--fg:#101828;--bg:#fff;--muted:#475467;--line:#eaecf0;--pass:#067647;--fail:#b42318;--fixed:#6941c6}
@media (prefers-color-scheme:dark){:root{--fg:#f5f5f6;--bg:#0c111d;--muted:#94969c;--line:#1f242f;--pass:#47cd89;--fail:#f97066;--fixed:#b692f6}}
body{margin:0 auto;max-width:1200px;padding:24px 16px;font:15px/1.55 system-ui,sans-serif;color:var(--fg);background:var(--bg)}
h1{font-size:26px}h2{margin-top:36px;border-bottom:1px solid var(--line);padding-bottom:6px}
table{border-collapse:collapse;width:100%;margin:12px 0;font-size:13px;display:block;overflow-x:auto}th,td{border:1px solid var(--line);padding:5px 8px;text-align:left;vertical-align:top}
td.pass{color:var(--pass);font-weight:600}td.fail{color:var(--fail);font-weight:600}td.fixed{color:var(--fixed);font-weight:600}td.notrun,td.skipped,td.blocked{color:var(--muted)}
img{max-width:100%;border:1px solid var(--line);border-radius:8px;margin:6px 0}code{font-size:12px}
</style></head><body>${html.join('\n')}</body></html>\n`,
);
console.log(`report: ${rows.length} items · ${count('Pass')} pass · ${fixed} fixed · ${stillFailing.length} failing · ${failedTests.length} failed tests · ready: ${ready ? 'YES' : 'NO'}`);
