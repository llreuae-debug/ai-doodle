#!/usr/bin/env node
/**
 * Generates the sample thumbnail for each Generate-with-AI style, once, into
 * public/assets/styles/<style>.png (the same subject in every style). Existing files are kept;
 * pass --force to redo them. Picture styles need a Google AI key with image quota (billing); the
 * editor shows a drawn preview for any style without a thumbnail.
 *
 *   node scripts/ai/style-thumbs.mjs [--force]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ELEMENT_STYLES, makeElements } from '../../server/api/element.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'public/assets/styles');
const SIZE = 320;
const SUBJECT = 'A smiling boy holding a paintbrush and a colour palette, upper body';
mkdirSync(OUT, { recursive: true });
const force = process.argv.includes('--force');

const svgOf = ({ strokes, fills }, color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${SIZE}" height="${SIZE}"><rect width="200" height="200" fill="#fff"/>` +
  (color ? fills.map((f) => `<path d="${f.d}" fill="${f.c}"/>`).join('') : '') +
  `<g fill="none" stroke="#1B1B1B" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${strokes.map((d) => `<path d="${d}"/>`).join('')}</g></svg>`;

for (const style of ELEMENT_STYLES) {
  const file = path.join(OUT, `${style}.png`);
  if (existsSync(file) && !force) {
    console.log(`${style}: kept`);
    continue;
  }
  try {
    const { results } = await makeElements({ type: 'character', style, prompt: SUBJECT, variations: 1, aspect: '1:1', projectId: '_style-thumbs' });
    const r = results[0];
    const png =
      r.kind === 'vector'
        ? await sharp(Buffer.from(svgOf(r, style === 'colour-doodle'))).png().toBuffer()
        : await sharp(readFileSync(path.join(ROOT, r.url.replace(/^\//, ''))))
            .flatten({ background: '#ffffff' })
            .resize(SIZE, SIZE, { fit: 'contain', background: '#ffffff' })
            .png()
            .toBuffer();
    writeFileSync(file, png);
    console.log(`${style}: saved`);
  } catch (err) {
    console.log(`${style}: skipped · ${err.message}`);
  }
}
