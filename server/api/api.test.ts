import { describe, expect, it } from 'vitest';
import { estimateWords, toPcm, wav } from './audio.ts';
import { validPath } from './element.ts';
import { makeLoop, musicPrompt, MusicRequest } from './music.ts';
import { PACING, StoryRequest } from './story.ts';

describe('stroke validation', () => {
  it('accepts absolute M L C Q A Z paths inside the viewBox', () => {
    expect(validPath('M10,10 L190,190')).toBe(true);
    expect(validPath('M20 20 C40 10 60 10 80 20 Q100 40 120 20 A10 10 0 0 1 140 20 Z M30,30 L40,40')).toBe(true);
  });
  it('rejects relative commands, missing M, bad arity, subpaths without M and points outside', () => {
    expect(validPath('m10,10 l5,5')).toBe(false);
    expect(validPath('L10,10')).toBe(false);
    expect(validPath('M10,10 C1,2,3')).toBe(false);
    expect(validPath('M10,10 L20,20 Z L30,30')).toBe(false);
    expect(validPath('M10,10 L400,20')).toBe(false);
  });
});

describe('word timing estimate', () => {
  it('covers the duration in order, with longer gaps after full stops than inside a sentence', () => {
    const w = estimateWords('Once upon a time, there was an ant. She was tiny.', 6);
    expect(w).toHaveLength(11);
    expect(w[0].start).toBe(0);
    expect(w[w.length - 1].end).toBeCloseTo(6, 2);
    for (let i = 1; i < w.length; i++) expect(w[i].start).toBeGreaterThanOrEqual(w[i - 1].end - 1e-9);
    const gapAfter = (i: number) => w[i + 1].start - w[i].end;
    expect(gapAfter(7)).toBeGreaterThan(gapAfter(1)); // "ant." vs "upon"
  });
  it('round-trips WAV headers', () => {
    const p = { samples: Buffer.alloc(48_000), rate: 24_000, channels: 1 };
    const back = toPcm('audio/wav', wav(p));
    expect(back.rate).toBe(24_000);
    expect(back.samples.length).toBe(48_000);
  });
});

describe('music loops', () => {
  it('cuts a whole number of bars and keeps the seam continuous', () => {
    const rate = 48_000;
    const bpm = 90;
    const secs = 30;
    const clip = new Float32Array(rate * secs * 2);
    // A 2 Hz-modulated tone: smooth, so any jump at the seam would show.
    for (let f = 0; f < rate * secs; f++) {
      const v = 0.3 * Math.sin((2 * Math.PI * 220 * f) / rate) * (0.6 + 0.4 * Math.sin((2 * Math.PI * 2 * f) / rate));
      clip[f * 2] = v;
      clip[f * 2 + 1] = v;
    }
    const loop = makeLoop(clip, bpm);
    const frames = loop.length / 2;
    const bar = (4 * 60) / bpm;
    const bars = frames / rate / bar;
    expect(Math.abs(bars - Math.round(bars)) * bar).toBeLessThan(0.05);
    const jump = Math.abs(loop[0] - loop[(frames - 1) * 2]);
    const typical = Math.abs(loop[200] - loop[198]);
    expect(jump).toBeLessThan(Math.max(0.05, typical * 4));
  });
  it('always asks for instrumental music and follows the mood defaults', () => {
    const r = MusicRequest.parse({ mode: 'whole', totalSec: 60, sections: [{ fromSec: 0, toSec: 60, mood: 'sad' }], style: 'calm-piano' });
    const spec = musicPrompt(r, 'sad');
    expect(spec.prompt).toContain('instrumental only, no vocals, no lyrics');
    expect(spec.prompt).toContain('minor key');
    expect(spec.bpm).toBe(60);
    expect(spec.noPercussion).toBe(true);
  });
});

describe('story requests', () => {
  it('validates input and knows the pacing for each length', () => {
    expect(StoryRequest.safeParse({ title: 'x' }).success).toBe(false);
    const ok = StoryRequest.parse({ title: 'The Ant Who Saved Ramadan', length: 5, type: 'kids', audience: 'kids-4-8', tone: 'warm', language: 'ur' });
    expect(ok.englishText).toBe(false);
    expect(PACING[8].slides).toEqual([56, 65]);
    expect(StoryRequest.safeParse({ ...ok, include: 'x'.repeat(301) }).success).toBe(false);
  });
});
