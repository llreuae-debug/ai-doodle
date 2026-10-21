#!/usr/bin/env node
/**
 * Checks which story languages Gemini TTS speaks well, and writes server/api/lang-support.json.
 * For each language: Gemini TTS reads a sample sentence, then Gemini transcribes the audio back;
 * a close match (character similarity ≥ 0.8) means the language is supported. Also confirms the
 * delivery-style note isn't read aloud.
 *
 *   node scripts/ai/check-languages.mjs
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, MODELS, speak } from '../../server/api/gemini.ts';
import { toPcm, wav } from '../../server/api/audio.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SAMPLES = {
  en: 'Once upon a time, a little ant decided to help her whole village.',
  ur: 'ایک دفعہ کا ذکر ہے، ایک ننھی چیونٹی نے پورے گاؤں کی مدد کرنے کا فیصلہ کیا۔',
  hi: 'एक बार की बात है, एक छोटी चींटी ने पूरे गाँव की मदद करने का फ़ैसला किया।',
  ar: 'في يوم من الأيام، قررت نملة صغيرة أن تساعد قريتها كلها.',
};
const NAMES = { en: 'English', ur: 'Urdu', hi: 'Hindi', ar: 'Arabic' };
const STYLE = 'Say warmly and slowly, like a storyteller to children';

const norm = (s) => s.normalize('NFC').replace(/[\p{P}\s]+/gu, '').toLowerCase();
function similarity(a, b) {
  a = norm(a);
  b = norm(b);
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[a.length][b.length] / Math.max(a.length, b.length, 1);
}

const table = {};
for (const [lang, text] of Object.entries(SAMPLES)) {
  try {
    const audio = await speak([{ speaker: 'Narrator', text, style: STYLE }], { Narrator: 'Sulafat' });
    const pcm = toPcm(audio.mimeType, audio.data);
    const seconds = pcm.samples.length / 2 / pcm.rate;
    const out = await generate(MODELS.text, [
      { inlineData: { mimeType: 'audio/wav', data: wav(pcm).toString('base64') } },
      { text: `Transcribe this ${NAMES[lang]} speech exactly, in its native script. Reply with the transcript only.` },
    ], { temperature: 0 });
    const heard = out.map((p) => p.text ?? '').join('').trim();
    const score = similarity(text, heard);
    const styleSpoken = /warmly|storyteller/i.test(heard);
    const ok = score >= 0.8 && !styleSpoken;
    table[lang] = { engine: ok ? 'gemini' : 'unsupported', note: `Gemini TTS round trip ${score.toFixed(2)} similar, ${seconds.toFixed(1)} s${styleSpoken ? ', style note was read aloud' : ''} (checked ${new Date().toISOString().slice(0, 10)})` };
    console.log(`${lang}: ${table[lang].engine} · similarity ${score.toFixed(2)} · ${seconds.toFixed(1)} s · heard: ${heard.slice(0, 90)}`);
  } catch (err) {
    table[lang] = { engine: 'unsupported', note: `Gemini TTS failed: ${err.message}` };
    console.log(`${lang}: failed · ${err.message}`);
  }
}
writeFileSync(path.join(ROOT, 'server/api/lang-support.json'), `${JSON.stringify(table, null, 2)}\n`);
