#!/usr/bin/env node
/**
 * Builds the pen-sound banks the app plays (src/audio/penEngine.ts) from REAL recordings only:
 *   1. your own recordings in assets/pen-sounds/raw/<type>/ (file names start with
 *      scribble / strokes / taps / lifts / cap), used whenever a type has any;
 *   2. otherwise the CC0 freesound.org recordings listed in assets/pen-sounds/sources.json
 *      (found by tools/find-pen-sounds.py; each page is re-checked for "Creative Commons 0"
 *      before its preview is downloaded).
 *
 * For each file: mono 48 kHz, 120 Hz high-pass, gentle noise reduction (afftdn, noise floor taken
 * from the quietest 0.5 s), silence trimmed, loudness normalised to −18 LUFS (two-pass loudnorm).
 * Then: 60–120 grains (80–250 ms) from steady drawing with RMS and spectral centroid; whole strokes
 * labelled short / medium / long; taps (pen down) and lifts (pen up) from stroke starts and ends;
 * the marker cap sounds. Everything for a type goes into one MP3 sprite + JSON map in
 * public/pen-sounds/ (≤ 1.5 MB), with a review page per type in assets/pen-sounds/_review/ where
 * you can listen to every sample and mark bad ones (saved in assets/pen-sounds/exclude.json).
 *
 *   node tools/prepare-pen-sounds.mjs [type ...]
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PEN = path.join(ROOT, 'assets/pen-sounds');
const RAW = path.join(PEN, 'raw');
const CC0_CACHE = path.join(PEN, 'raw-cc0');
const OUT = path.join(ROOT, 'public/pen-sounds');
const REVIEW = path.join(PEN, '_review');
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const SR = 48000;
const TYPES = ['marker', 'chalk', 'pencil', 'soft', 'ballpoint'];
const LABELS = { marker: 'Marker', chalk: 'Chalk', pencil: 'Pencil', soft: 'Soft marker', ballpoint: 'Ballpoint on paper' };
const MAX_BYTES = 1.5 * 1024 * 1024;
const GAP = 0.05; // silence between sprite segments, s

const only = new Set(process.argv.slice(2));
const sources = existsSync(path.join(PEN, 'sources.json')) ? JSON.parse(readFileSync(path.join(PEN, 'sources.json'), 'utf8')) : {};
const exclude = existsSync(path.join(PEN, 'exclude.json')) ? JSON.parse(readFileSync(path.join(PEN, 'exclude.json'), 'utf8')) : {};
mkdirSync(OUT, { recursive: true });
mkdirSync(REVIEW, { recursive: true });
mkdirSync(CC0_CACHE, { recursive: true });

// ---------- helpers ----------

function ff(args, input) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', ...args], { input, maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr.toString().slice(-400)}`);
  return r;
}

/** Decodes any audio file to mono 48 kHz float samples (no processing). */
function decode(file, filters = '') {
  const out = ff(['-i', file, ...(filters ? ['-af', filters] : []), '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-']).stdout;
  return new Float32Array(out.buffer, out.byteOffset, out.length / 4);
}

const rmsOf = (x, a, b) => {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, b - a));
};
const db = (v) => 20 * Math.log10(Math.max(v, 1e-9));

/** RMS in 10 ms frames. */
function frames(x) {
  const hop = SR / 100;
  const out = new Float32Array(Math.floor(x.length / hop));
  for (let f = 0; f < out.length; f++) out[f] = rmsOf(x, f * hop, (f + 1) * hop);
  return out;
}

/** Noise floor: the quietest 0.5 s (50 frames) of the file, in dBFS. */
function noiseFloorDb(x) {
  const fr = frames(x);
  let best = Infinity;
  for (let f = 0; f + 50 <= fr.length; f += 5) {
    let s = 0;
    for (let k = f; k < f + 50; k++) s += fr[k] * fr[k];
    best = Math.min(best, Math.sqrt(s / 50));
  }
  return db(best === Infinity ? 1e-4 : best);
}

/**
 * Cleans a recording: high-pass 120 Hz, afftdn at the measured noise floor (gentle, 10 dB),
 * trimmed silence, then two-pass loudnorm to −18 LUFS. Returns the cleaned samples.
 */
function clean(file) {
  const raw = decode(file);
  const fr = [...frames(raw)].map(db).sort((p, q) => p - q);
  const median = fr[Math.floor(fr.length / 2)] ?? -40;
  let nf = noiseFloorDb(raw);
  // A recording with no real silence (continuous scribble): its "floor" is the drawing itself,
  // so noise reduction and trimming must not use it.
  if (nf > median - 15) nf = median - 30;
  nf = Math.max(-80, Math.min(-25, Math.round(nf)));
  const trim = `silenceremove=start_periods=1:start_threshold=${nf + 6}dB:start_silence=0.05`;
  // Only the start and the end are trimmed: pauses inside separate the strokes.
  const base = `highpass=f=120,afftdn=nr=10:nf=${nf},${trim},areverse,${trim},areverse`;
  const measure = ff(['-i', file, '-af', `${base},loudnorm=I=-18:TP=-2:LRA=11:print_format=json`, '-f', 'null', '-']).stderr.toString();
  const m = JSON.parse(measure.slice(measure.lastIndexOf('{'), measure.lastIndexOf('}') + 1));
  if (!Number.isFinite(Number(m.input_i))) throw new Error(`${path.basename(file)}: nothing left after trimming`);
  const second = `${base},loudnorm=I=-18:TP=-2:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  return { samples: decode(file, second), noiseFloor: nf };
}

/** Active (drawing) regions: frames above the floor + 10 dB, small gaps bridged. */
function activeRegions(x) {
  const fr = frames(x);
  const sorted = [...fr].sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.1)] || 1e-5;
  const on = (v) => db(v) > db(floor) + 10;
  const regions = [];
  let start = -1;
  let quiet = 0;
  for (let f = 0; f < fr.length; f++) {
    if (on(fr[f])) {
      if (start < 0) start = f;
      quiet = 0;
    } else if (start >= 0 && ++quiet > 6) {
      regions.push([start / 100, (f - quiet + 1) / 100]);
      start = -1;
      quiet = 0;
    }
  }
  if (start >= 0) regions.push([start / 100, fr.length / 100]);
  return regions.filter(([a, b]) => b - a >= 0.05);
}

/** In-place radix-2 FFT magnitude spectrum of a Hann-windowed block → spectral centroid (Hz). */
function centroid(x, a, len) {
  let n = 1;
  while (n < len) n <<= 1;
  n = Math.min(n, 8192);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < Math.min(len, n); i++) re[i] = x[a + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (Math.min(len, n) - 1)));
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) [re[i], re[j], im[i], im[j]] = [re[j], re[i], im[j], im[i]];
  }
  for (let size = 2; size <= n; size <<= 1) {
    const ang = (-2 * Math.PI) / size;
    for (let s = 0; s < n; s += size) {
      for (let k = 0; k < size / 2; k++) {
        const wr = Math.cos(ang * k);
        const wi = Math.sin(ang * k);
        const ur = re[s + k];
        const ui = im[s + k];
        const vr = re[s + k + size / 2] * wr - im[s + k + size / 2] * wi;
        const vi = re[s + k + size / 2] * wi + im[s + k + size / 2] * wr;
        re[s + k] = ur + vr;
        im[s + k] = ui + vi;
        re[s + k + size / 2] = ur - vr;
        im[s + k + size / 2] = ui - vi;
      }
    }
  }
  let num = 0;
  let den = 0;
  for (let k = 1; k < n / 2; k++) {
    const mag = Math.hypot(re[k], im[k]);
    num += mag * ((k * SR) / n);
    den += mag;
  }
  return den ? num / den : 0;
}

/** Seeded random so a rebuild picks the same grains. */
let seed = 12345;
const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);

// ---------- per role ----------

/** Grains from steady drawing: inside active regions, away from their edges, no big transients. */
function grainsFrom(x, file, want) {
  const out = [];
  for (const [a, b] of activeRegions(x)) {
    let t = a + 0.06;
    while (t + 0.08 < b - 0.06 && out.length < want * 3) {
      const dur = 0.08 + rand() * 0.17;
      if (t + dur > b - 0.06) break;
      const i0 = Math.floor(t * SR);
      const i1 = Math.floor((t + dur) * SR);
      // Steady: the loudest 10 ms frame isn't far above the grain's average.
      const r = rmsOf(x, i0, i1);
      let peak = 0;
      for (let i = i0; i + 480 <= i1; i += 480) peak = Math.max(peak, rmsOf(x, i, i + 480));
      if (r > 0.004 && peak / r < 2.2) out.push({ file, start: t, dur, rms: r, centroid: centroid(x, i0, i1 - i0) });
      t += dur + 0.02 + rand() * 0.08;
    }
  }
  return out;
}

/** Whole strokes, labelled by duration, plus the tap at each start and the lift at each end. */
function strokesFrom(x, file) {
  const strokes = [];
  const taps = [];
  const lifts = [];
  for (const [a, b] of activeRegions(x)) {
    const dur = b - a;
    if (dur < 0.06 || dur > 2.5) continue;
    strokes.push({ file, start: Math.max(0, a - 0.01), dur: dur + 0.03, label: dur < 0.3 ? 'short' : dur < 0.75 ? 'medium' : 'long' });
    // A tap is the attack at pen-down; a lift is the release at pen-up.
    const onset = rmsOf(x, Math.floor(a * SR), Math.floor((a + 0.02) * SR)) / Math.max(1e-6, rmsOf(x, Math.floor((a - 0.03) * SR), Math.floor(a * SR)));
    taps.push({ file, start: Math.max(0, a - 0.005), dur: 0.05, sharp: onset });
    lifts.push({ file, start: Math.max(0, b - 0.06), dur: 0.085, sharp: 1 });
  }
  const best = (list) => list.sort((p, q) => q.sharp - p.sharp).slice(0, 12).map(({ sharp: _s, ...rest }) => rest);
  return { strokes: strokes.slice(0, 30), taps: best(taps), lifts: best(lifts.map((l) => ({ ...l, sharp: rand() }))) };
}

/** Cap off / on: the two loudest short events in a cap recording (first = off). */
function capFrom(x, file) {
  const ev = activeRegions(x)
    .filter(([a, b]) => b - a < 0.6)
    .map(([a, b]) => ({ a, b, r: rmsOf(x, Math.floor(a * SR), Math.floor(b * SR)) }))
    .sort((p, q) => q.r - p.r)
    .slice(0, 2)
    .sort((p, q) => p.a - q.a);
  const seg = (e) => e && { file, start: Math.max(0, e.a - 0.01), dur: Math.min(0.6, e.b - e.a + 0.05) };
  return { off: seg(ev[0]), on: seg(ev[1]) };
}

// ---------- sources ----------

/** CC0 check on the sound's own freesound page, right before downloading. */
async function verifyCc0(url) {
  const html = await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Ai Doodle)' } })).text();
  return /href="https?:\/\/creativecommons\.org\/publicdomain\/zero\/1\.0\/?"[^>]*>\s*Creative Commons 0\s*</.test(html);
}

async function sourceFiles(type) {
  const own = path.join(RAW, type);
  if (existsSync(own)) {
    const files = readdirSync(own).filter((f) => /\.(wav|m4a|mp3|aac|ogg|flac|caf|aiff?)$/i.test(f));
    if (files.length) return files.map((f) => ({ file: path.join(own, f), role: /^(scribble|strokes|taps|lifts|cap)/i.exec(f)?.[1].toLowerCase() ?? 'scribble', credit: { title: f, author: 'own recording', url: '', license: 'Own recording' } }));
  }
  const list = sources[type] ?? [];
  const out = [];
  for (const s of list) {
    if (!(await verifyCc0(s.url))) {
      console.log(`  ${type}: skipped ${s.url} (page no longer says Creative Commons 0)`);
      continue;
    }
    const file = path.join(CC0_CACHE, `${s.id}.mp3`);
    if (!existsSync(file)) writeFileSync(file, Buffer.from(await (await fetch(s.preview)).arrayBuffer()));
    out.push({ file, role: s.role, credit: { title: s.title, author: s.author, url: s.url, license: 'Creative Commons 0' } });
  }
  return out;
}

// ---------- build ----------

function encodeMp3(samples) {
  return ff(['-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', 'pipe:0', '-codec:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3', 'pipe:1'], Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength)).stdout;
}

function reviewPage(type, map) {
  const rows = (name, list) =>
    list
      .map(
        (s, i) =>
          `<tr><td>${name} ${i + 1}</td><td>${s.dur.toFixed(3)} s</td><td>${s.rms !== undefined ? s.rms.toFixed(4) : ''}</td><td>${s.centroid ? Math.round(s.centroid) + ' Hz' : s.label ?? ''}</td>` +
          `<td><button onclick="play(${s.start},${s.dur})">▶</button></td><td><label><input type="checkbox" data-key="${name}:${s.key}"> remove</label></td></tr>`,
      )
      .join('');
  return `<!doctype html><meta charset="utf-8"><title>${LABELS[type]} pen sound review</title>
<style>body{font:14px system-ui;margin:24px;color:#101828}table{border-collapse:collapse}td,th{padding:4px 10px;border-bottom:1px solid #eaecf0;text-align:left}button{cursor:pointer}</style>
<h1>${LABELS[type]}: ${map.grains.length} grains, ${map.strokes.length} strokes, ${map.taps.length} taps, ${map.lifts.length} lifts${map.cap ? ', cap' : ''}</h1>
<p>Play each sample; tick the bad ones, then <button onclick="copyOut()">copy the removal list</button> and paste it into <code>assets/pen-sounds/exclude.json</code> under "${type}", and run the tool again.</p>
<audio id="a" src="../../../public/pen-sounds/${type}.mp3" preload="auto"></audio>
<table><tr><th>Sample</th><th>Length</th><th>RMS</th><th>Brightness / kind</th><th></th><th></th></tr>
${rows('grain', map.grains)}${rows('stroke', map.strokes)}${rows('tap', map.taps)}${rows('lift', map.lifts)}${map.cap ? rows('cap', Object.values(map.cap).filter(Boolean)) : ''}</table>
<script>
const a=document.getElementById('a');let stopAt=0;
a.addEventListener('timeupdate',()=>{if(a.currentTime>=stopAt)a.pause()});
function play(s,d){a.currentTime=s;stopAt=s+d;a.play()}
function copyOut(){const keys=[...document.querySelectorAll('input:checked')].map(i=>i.dataset.key);navigator.clipboard.writeText(JSON.stringify(keys));alert(keys.length+' removals copied')}
</script>`;
}

const credits = [];
for (const type of TYPES) {
  if (only.size && !only.has(type)) continue;
  let files = await sourceFiles(type);
  if (files.length === 0) {
    console.log(`${type}: no recordings (add your own to assets/pen-sounds/raw/${type}/ or CC0 sources to sources.json)`);
    continue;
  }
  const cleaned = new Map();
  for (const f of files) {
    try {
      cleaned.set(f.file, clean(f.file).samples);
      credits.push({ type, ...f.credit, role: f.role });
    } catch (err) {
      console.log(`  ${type}: skipped ${path.basename(f.file)} (${err.message})`);
    }
  }
  files.splice(0, files.length, ...files.filter((f) => cleaned.has(f.file)));
  const ex = new Set(exclude[type] ?? []);
  const keyOf = (s) => `${path.basename(s.file)}@${s.start.toFixed(3)}`;
  const keep = (name) => (s) => !ex.has(`${name}:${keyOf(s)}`);

  // Grains from scribbles (any recording when there's no scribble file).
  const scribbles = files.filter((f) => f.role === 'scribble');
  const grainSrc = scribbles.length ? scribbles : files.filter((f) => f.role !== 'cap');
  let grains = grainSrc.flatMap((f) => grainsFrom(cleaned.get(f.file), f.file, 120)).filter(keep('grain'));
  // Spread over the range of loudness, at most 120.
  grains.sort((p, q) => p.rms - q.rms);
  if (grains.length > 120) grains = grains.filter((_, i) => i % Math.ceil(grains.length / 120) === 0).slice(0, 120);

  const strokeSrc = files.filter((f) => f.role === 'strokes').length ? files.filter((f) => f.role === 'strokes') : grainSrc;
  const st = { strokes: [], taps: [], lifts: [] };
  for (const f of strokeSrc) {
    const r = strokesFrom(cleaned.get(f.file), f.file);
    st.strokes.push(...r.strokes);
    st.taps.push(...r.taps);
    st.lifts.push(...r.lifts);
  }
  for (const f of files.filter((g) => g.role === 'taps')) st.taps.push(...activeRegions(cleaned.get(f.file)).map(([a]) => ({ file: f.file, start: Math.max(0, a - 0.005), dur: 0.06 })));
  for (const f of files.filter((g) => g.role === 'lifts')) st.lifts.push(...activeRegions(cleaned.get(f.file)).map(([a, b]) => ({ file: f.file, start: a, dur: Math.min(0.15, b - a + 0.03) })));
  const strokes = st.strokes.filter(keep('stroke')).slice(0, 30);
  const taps = st.taps.filter(keep('tap')).slice(0, 12);
  const lifts = st.lifts.filter(keep('lift')).slice(0, 12);
  const capFile = files.find((f) => f.role === 'cap');
  const cap = type === 'marker' && capFile ? capFrom(cleaned.get(capFile.file), capFile.file) : undefined;

  // The sprite: every segment after a short silence; the map records where each one starts.
  const parts = [];
  let at = GAP;
  /** Taps, lifts and the cap are short transients: peak-normalised to −6 dBFS so they stand out. */
  const place = (s, peakNormalise = false) => {
    const x = cleaned.get(s.file);
    const i0 = Math.floor(s.start * SR);
    let seg = x.subarray(i0, Math.min(x.length, i0 + Math.floor(s.dur * SR)));
    if (peakNormalise) {
      let peak = 0;
      for (const v of seg) peak = Math.max(peak, Math.abs(v));
      if (peak > 1e-4) seg = seg.map((v) => (v * 0.5) / peak);
    }
    const placed = { ...s, key: keyOf(s), start: +at.toFixed(5), dur: +(seg.length / SR).toFixed(5) };
    parts.push(seg, new Float32Array(Math.floor(GAP * SR)));
    at += seg.length / SR + GAP;
    return placed;
  };
  const map = {
    type,
    grains: grains.map((g) => ({ ...place(g), rms: +g.rms.toFixed(5), centroid: Math.round(g.centroid) })),
    strokes: strokes.map((s) => place(s)),
    taps: taps.map((t) => place(t, true)),
    lifts: lifts.map((l) => place(l, true)),
    ...(cap?.off ? { cap: { off: place(cap.off, true), ...(cap.on ? { on: place(cap.on, true) } : {}) } } : {}),
  };
  const total = parts.reduce((n, p) => n + p.length, Math.floor(GAP * SR));
  const sprite = new Float32Array(total);
  let o = Math.floor(GAP * SR);
  for (const p of parts) {
    sprite.set(p, o);
    o += p.length;
  }
  const mp3 = encodeMp3(sprite);
  writeFileSync(path.join(OUT, `${type}.mp3`), mp3);
  const strip = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'file'));
  const publicMap = { type, grains: map.grains.map(strip), strokes: map.strokes.map(strip), taps: map.taps.map(strip), lifts: map.lifts.map(strip), ...(map.cap ? { cap: Object.fromEntries(Object.entries(map.cap).map(([k, v]) => [k, strip(v)])) } : {}) };
  writeFileSync(path.join(OUT, `${type}.json`), JSON.stringify(publicMap));
  writeFileSync(path.join(REVIEW, `${type}.html`), reviewPage(type, map));
  const size = mp3.length + statSync(path.join(OUT, `${type}.json`)).size;
  console.log(`${type}: ${map.grains.length} grains, ${map.strokes.length} strokes, ${map.taps.length} taps, ${map.lifts.length} lifts${map.cap ? ', cap' : ''} · ${(sprite.length / SR).toFixed(1)} s · ${(size / 1024).toFixed(0)} KB${size > MAX_BYTES ? ' (OVER 1.5 MB)' : ''}`);
}

// LICENSES.md: every recording used.
if (credits.length) {
  const prev = existsSync(path.join(PEN, 'LICENSES.md')) ? readFileSync(path.join(PEN, 'LICENSES.md'), 'utf8') : '';
  const keepOther = prev.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| ---') && !l.startsWith('| Type') && !credits.some((c) => l.startsWith(`| ${LABELS[c.type]} |`)));
  const lines = [
    '# Pen sound recordings',
    '',
    'Every recording used to build public/pen-sounds/*. Only your own recordings or files whose freesound.org page states',
    '"Creative Commons 0" (public domain, checked again on each build) are allowed; no CC-BY-NC, Sampling+ or other sources.',
    '',
    '| Type | Role | Title | Author | Source | Licence |',
    '| --- | --- | --- | --- | --- | --- |',
    ...keepOther,
    ...credits.map((c) => `| ${LABELS[c.type]} | ${c.role} | ${c.title.replace(/\|/g, '/')} | ${c.author} | ${c.url || 'assets/pen-sounds/raw'} | ${c.license} |`),
    '',
    `Built ${new Date().toISOString().slice(0, 10)} by tools/prepare-pen-sounds.mjs.`,
    '',
  ];
  writeFileSync(path.join(PEN, 'LICENSES.md'), lines.join('\n'));
}
