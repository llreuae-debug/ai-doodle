import { describe, expect, it } from 'vitest';
import { newDoodle, newProject, newScene, newText } from '../model/factories';
import type { Scene, SceneElement } from '../model/types';
import { DEFAULT_ANIM_MS, DRAW_SPEED, MAX_DRAW_MS, MIN_DRAW_MS, MIN_TEXT_MS, TEXT_MS_PER_CHAR, VOICE_TAIL_MS, buildTimeline, drawPhaseEnd, sceneIndexAt } from './timeline';

const doodle = (anim: Partial<SceneElement['anim']> = {}): SceneElement => {
  const el = newDoodle('p-bulb', 0, 0, 200);
  return { ...el, anim: { ...el.anim, ...anim } };
};

const projectWith = (scene: Partial<Scene>, ...elements: SceneElement[]) => {
  const p = newProject('test', null);
  p.scenes = [{ ...newScene('none'), holdMs: 1000, ...scene, elements }];
  return p;
};

describe('buildTimeline', () => {
  it('draws elements one after another at the drawing speed, then holds', () => {
    const tl = buildTimeline(projectWith({}, doodle(), doodle()), () => DRAW_SPEED * 2);
    const [a, b] = tl.scenes[0].elements;
    expect(a).toMatchObject({ start: 0, end: 2000 });
    expect(b).toMatchObject({ start: 2000, end: 4000 });
    expect(tl.scenes[0].drawEnd).toBe(4000);
    expect(tl.duration).toBe(5000);
  });

  it('clamps auto draw durations', () => {
    expect(buildTimeline(projectWith({}, doodle()), () => 1).scenes[0].elements[0].end).toBe(MIN_DRAW_MS);
    expect(buildTimeline(projectWith({}, doodle()), () => 1e9).scenes[0].elements[0].end).toBe(MAX_DRAW_MS);
  });

  it('times handwriting by character count', () => {
    const tl = buildTimeline(projectWith({}, newText('Hello world', 0, 0, 80)), () => 0);
    expect(tl.scenes[0].elements[0].end).toBe(Math.max(MIN_TEXT_MS, 10 * TEXT_MS_PER_CHAR));
  });

  it('uses the default for non-draw animations and 0 for "already there"', () => {
    const tl = buildTimeline(projectWith({}, doodle({ type: 'fade' }), doodle({ type: 'none' })), () => 5000);
    expect(tl.scenes[0].elements[0].end).toBe(DEFAULT_ANIM_MS);
    expect(tl.scenes[0].elements[1]).toMatchObject({ start: DEFAULT_ANIM_MS, end: DEFAULT_ANIM_MS });
  });

  it('applies delays, fixed durations and the slide speed', () => {
    const tl = buildTimeline(projectWith({ speed: 2 }, doodle({ durationMs: 1000, delayMs: 300 })), () => 0);
    expect(tl.scenes[0].elements[0]).toMatchObject({ start: 300, end: 800 });
  });

  it('allows item speed to override slide speed', () => {
    const tl = buildTimeline(projectWith({ speed: 1 }, doodle({ durationMs: 1000, speed: 2 })), () => 0);
    expect(tl.scenes[0].elements[0]).toMatchObject({ start: 0, end: 500 });
  });

  it('skips hidden elements', () => {
    const hidden = { ...doodle({ durationMs: 1000 }), hidden: true };
    const tl = buildTimeline(projectWith({}, hidden, doodle({ durationMs: 500 })), () => 0);
    expect(tl.scenes[0].elements[1]).toMatchObject({ start: 0, end: 500 });
  });

  it('stretches a voice-synced slide to the voiceover', () => {
    const voice = { kind: 'file' as const, name: 'hi.mp3', blob: new Blob(), durationMs: 6000 };
    // With stretchToVoice: true (default), drawing slows to fill up to 85% of 6000 = 5100 ms
    const synced = buildTimeline(projectWith({ voice, syncVoice: true, stretchToVoice: true }, doodle({ durationMs: 1000 })), () => 0);
    expect(synced.scenes[0].drawEnd).toBe(5100);
    expect(synced.scenes[0].elements[0].end).toBe(5100);
    expect(synced.duration).toBe(6000 + VOICE_TAIL_MS);

    // With stretchToVoice: false, drawing stays at 1000 ms, only end holds
    const noStretch = buildTimeline(projectWith({ voice, syncVoice: true, stretchToVoice: false }, doodle({ durationMs: 1000 })), () => 0);
    expect(noStretch.scenes[0].drawEnd).toBe(1000);
    expect(noStretch.scenes[0].elements[0].end).toBe(1000);
    expect(noStretch.duration).toBe(6000 + VOICE_TAIL_MS);

    const unsynced = buildTimeline(projectWith({ voice, syncVoice: false }, doodle({ durationMs: 1000 })), () => 0);
    expect(unsynced.duration).toBe(2000);
  });

  it('places slides back to back and finds the slide at a time', () => {
    const p = projectWith({}, doodle({ durationMs: 1000 }));
    p.scenes.push({ ...newScene('fade'), holdMs: 3000 });
    const tl = buildTimeline(p, () => 0);
    expect(tl.scenes[1]).toMatchObject({ start: 2000, end: 5000 });
    expect(sceneIndexAt(tl, 1999)).toBe(0);
    expect(sceneIndexAt(tl, 2000)).toBe(1);
    expect(sceneIndexAt(tl, 99999)).toBe(1);
  });
});

describe('drawPhaseEnd', () => {
  it('reserves 250 ms (at most 15%) for the fill fade-in', () => {
    expect(drawPhaseEnd(2000)).toBeCloseTo(1 - 250 / 2000);
    expect(drawPhaseEnd(1000)).toBeCloseTo(0.85);
    expect(drawPhaseEnd(0)).toBe(1);
  });
});
