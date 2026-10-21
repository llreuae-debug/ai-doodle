#!/usr/bin/env node
/**
 * Generates the ▶ preview for every voice in server/api/voices.json, once, into
 * public/assets/voices/previews/<id>.mp3. Existing files are kept; pass --force to redo them.
 *
 *   node scripts/ai/voice-previews.mjs [--force]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { speak } from '../../server/api/gemini.ts';
import { encodeVoice, toPcm } from '../../server/api/audio.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'public/assets/voices/previews');
const LINE = 'Assalam-o-alaikum, let me tell you a story.';
const { voices } = JSON.parse(readFileSync(path.join(ROOT, 'server/api/voices.json'), 'utf8'));
mkdirSync(OUT, { recursive: true });
const force = process.argv.includes('--force');
const todo = voices.filter((v) => force || !existsSync(path.join(OUT, `${v.id}.mp3`)));

let next = 0;
async function worker() {
  while (next < todo.length) {
    const v = todo[next++];
    try {
      const audio = await speak([{ speaker: 'Narrator', text: LINE, style: 'Say warmly, like a storyteller' }], { Narrator: v.id });
      const file = await encodeVoice(toPcm(audio.mimeType, audio.data));
      writeFileSync(path.join(OUT, `${v.id}.${file.ext}`), file.data);
      console.log(`${v.id}: ${file.seconds.toFixed(1)} s`);
    } catch (err) {
      console.log(`${v.id}: failed · ${err.message}`);
    }
  }
}
await Promise.all([worker(), worker(), worker()]);
