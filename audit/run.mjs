#!/usr/bin/env node
/**
 * npm run audit            build, run every audit test (all browsers, the slow AI flows), write the report
 * npm run audit -- --quick skip the slow flows (Part 5 and the 8-minute memory test)
 *
 * Results: audit/report/AUDIT_REPORT.md and .html, raw data in audit/report/data/.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AUDIT = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(AUDIT);
const quick = process.argv.includes('--quick');
const run = (cmd, args, cwd = ROOT) => spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: false }).status ?? 1;

// Fresh results each run (screenshots of fixed bugs in report/screens are kept).
for (const d of ['data', 'artifacts', 'exports', 'playwright-html']) fs.rmSync(path.join(AUDIT, 'report', d), { recursive: true, force: true });
if (run('npm', ['run', 'build']) !== 0) process.exit(1);
const projects = ['inventory', 'chromium', 'chromium-browsers', 'firefox', 'webkit', ...(quick ? [] : ['flows'])];
const status = run('npx', ['playwright', 'test', '-c', 'playwright.config.ts', ...projects.flatMap((p) => ['--project', p])], AUDIT);
run('node', ['report.mjs'], AUDIT);
console.log(`\nReport: ${path.join(AUDIT, 'report', 'AUDIT_REPORT.md')} (and .html)`);
process.exit(status);
