import { describe, expect, it } from 'vitest';
import { doodleSvg, LIBRARY, validStrokes } from '../library/doodles';
import { newDoodle, newProject, newScene, newText } from '../model/factories';
import { doodleInk } from './boards';
import { artKey, textArtKey } from './resources';
import { drawingIntervals } from './drawIntervals';
import { prepareStrokes } from './strokes';
import { buildTimeline, drawPhaseEnd } from './timeline';

describe('drawingIntervals', () => {
  const strokes = prepareStrokes([
    { points: [[0, 0], [100, 0]], width: 4 },
    { points: [[100, 100], [0, 100]], width: 4 },
  ]);

  it('follows the pen-down legs of drawn art and the whole of written text', () => {
    const p = newProject('t', null);
    const art = { ...newDoodle('p-bulb', 0, 0, 200), anim: { type: 'draw' as const, durationMs: 2000, delayMs: 0 } };
    const text = { ...newText('Hi there', 0, 0, 60), anim: { type: 'draw' as const, durationMs: 1000, delayMs: 0 } };
    p.scenes = [{ ...newScene('none'), elements: [art, text] }];
    const tl = buildTimeline(p, () => 0);
    const ivs = drawingIntervals(p, tl, (el) => (el.kind === 'doodle' ? strokes : undefined));
    const drawMs = drawPhaseEnd(2000) * 2000;
    // Two strokes with a pen-up move between them, then the text.
    expect(ivs).toHaveLength(3);
    expect(ivs[0].start).toBe(0);
    expect(ivs[0].end).toBeCloseTo((100 / strokes.total) * drawMs);
    expect(ivs[1].end).toBeCloseTo(drawMs);
    expect(ivs[2]).toMatchObject({ start: 2000, end: 3000 });
  });

  it('follows the traced pen strokes of text once its trace is ready', () => {
    const p = newProject('t', null);
    const text = { ...newText('Hi', 0, 0, 60), anim: { type: 'draw' as const, durationMs: 1000, delayMs: 0 } };
    p.scenes = [{ ...newScene('none'), elements: [text] }];
    const ivs = drawingIntervals(p, buildTimeline(p, () => 0), () => strokes);
    // Pen lifts between the two strokes, like between letters.
    expect(ivs).toHaveLength(2);
    expect(ivs[1].end).toBeCloseTo(drawPhaseEnd(1000) * 1000);
  });

  it('ignores hidden and non-drawing elements', () => {
    const p = newProject('t', null);
    p.scenes = [
      {
        ...newScene('none'),
        elements: [{ ...newDoodle('p-bulb', 0, 0, 200), hidden: true }, { ...newDoodle('p-bulb', 0, 0, 200), anim: { type: 'fade', durationMs: 'auto', delayMs: 0 } }],
      },
    ];
    expect(drawingIntervals(p, buildTimeline(p, () => 0), () => strokes)).toEqual([]);
  });

  it('is silent on slides with pen sound toggled off', () => {
    const p = newProject('t', null);
    const art = { ...newDoodle('p-bulb', 0, 0, 200), anim: { type: 'draw' as const, durationMs: 2000, delayMs: 0 } };
    p.scenes = [{ ...newScene('none'), drawSound: false, elements: [art] }];
    expect(drawingIntervals(p, buildTimeline(p, () => 0), () => strokes)).toEqual([]);
  });
});

describe('library doodles', () => {
  it('has the Chalkline set: 8 characters and 24 props with unique ids', () => {
    expect(LIBRARY.filter((d) => d.cat === 'characters')).toHaveLength(8);
    expect(LIBRARY.filter((d) => d.cat === 'props' && !d.tags.includes('decor'))).toHaveLength(24);
    expect(new Set(LIBRARY.map((d) => d.id)).size).toBe(LIBRARY.length);
  });

  it('splits every stroke into its own path and keeps fills out of the hand path', () => {
    const bulb = LIBRARY.find((d) => d.id === 'p-bulb')!;
    const svg = doodleSvg(bulb, { color: true, ink: '#1B1B1B' });
    expect(svg.match(/data-nodraw/g)).toHaveLength(bulb.fills.length);
    expect(doodleSvg(bulb, { color: false, ink: '#fff' })).not.toContain('data-nodraw');
  });

  it('accepts only clean absolute path data from the AI', () => {
    expect(validStrokes(['M1,2 L3,4', 'L1,1', 'M0,0 <script>', 42, 'M1 1 C2 2 3 3 4 4'])).toEqual(['M1,2 L3,4', 'M1 1 C2 2 3 3 4 4']);
    expect(validStrokes('nope')).toEqual([]);
  });

  it('gives text its own art key that changes with the words and colour', () => {
    const p = { board: 'white' as const };
    const a = newText('Hello', 0, 0, 80);
    expect(artKey(a, p)).toBe(textArtKey(a, '#1B1B1B'));
    expect(artKey({ ...a, text: 'Hello!' }, p)).not.toBe(artKey(a, p));
    expect(artKey(a, { board: 'black' })).not.toBe(artKey(a, p));
  });

  it('picks ink per board: dark outlines on light boards, board ink on dark ones', () => {
    expect(doodleInk(true, 'white')).toBe('#1B1B1B');
    expect(doodleInk(false, 'black')).toBe('#F4F4F0');
    expect(doodleInk(true, 'green')).toBe('#F1F5EE');
    expect(doodleInk(false, 'kraft')).toBe('#3A2A1A');
  });
});
