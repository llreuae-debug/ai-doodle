import { describe, expect, it } from 'vitest';
import { toWav } from '../audio/musicLibrary';
import { STAGE_SIZE, type AspectRatio } from '../model/types';
import { AI_STYLES, stylePreviewSvg } from './aiStyles';
import { DECOR } from './decor';
import { doodleSvg, LIBRARY } from './doodles';
import { FONT_LIBRARY, isRtl } from './fonts';
import { buildFromTemplate, SAMPLES, TEMPLATES } from './templates';

const RATIOS: AspectRatio[] = ['16:9', '9:16', '1:1', '4:5'];

describe('templates and samples', () => {
  it('has the 9 gallery templates and 3 samples', () => {
    expect(TEMPLATES.map((t) => t.name)).toEqual(['Empty Project', 'Teaching', 'Business', 'Funky', 'Scribble', 'Stickman', 'Minimal Pastel', 'Presenter', 'Paper Plane']);
    expect(SAMPLES).toHaveLength(3);
  });

  it('only uses doodles and fonts that exist', () => {
    const ids = new Set(LIBRARY.map((d) => d.id));
    const fonts = new Set(FONT_LIBRARY.map((f) => f.family));
    for (const spec of [...TEMPLATES, ...SAMPLES])
      for (const slide of spec.slides)
        for (const item of slide.items) {
          if ('d' in item) expect(ids.has(item.d), item.d).toBe(true);
          else expect(fonts.has(item.font), item.font).toBe(true);
        }
  });

  it('builds for every size with elements centred on the stage', () => {
    for (const ratio of RATIOS) {
      const { width, height } = STAGE_SIZE[ratio];
      for (const spec of [...TEMPLATES, ...SAMPLES]) {
        const p = buildFromTemplate(spec, ratio, null);
        expect(p.aspectRatio).toBe(ratio);
        expect(p.scenes).toHaveLength(spec.slides.length);
        expect(p.scenes[0].transition).toBe('none');
        for (const el of p.scenes.flatMap((s) => s.elements)) {
          expect(el.x).toBeGreaterThanOrEqual(0);
          expect(el.x).toBeLessThanOrEqual(width);
          expect(el.y).toBeGreaterThanOrEqual(0);
          expect(el.y).toBeLessThanOrEqual(height);
        }
      }
    }
  });

  it('gives every element a unique id', () => {
    const p = buildFromTemplate(SAMPLES[0], '16:9', null);
    const ids = p.scenes.flatMap((s) => s.elements.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('decorations', () => {
  it('draw in their own colour only in colour mode', () => {
    const squiggle = DECOR.find((d) => d.id === 'd-squiggle-pink')!;
    expect(doodleSvg(squiggle, { color: true, ink: '#1B1B1B' })).toContain('stroke="#C2489B"');
    expect(doodleSvg(squiggle, { color: false, ink: '#1B1B1B' })).toContain('stroke="#1B1B1B"');
    expect(doodleSvg(squiggle, { color: true, ink: '#1B1B1B' })).toContain('stroke-width="9"');
  });

  it('turn the dashed trail into separate dashes', () => {
    expect(DECOR.find((d) => d.id === 'd-trail')!.strokes.length).toBe(16);
  });
});

describe('AI styles and fonts', () => {
  it('previews every style as SVG, with colour fills only for colour styles', () => {
    for (const s of AI_STYLES) {
      const svg = stylePreviewSvg(s);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.includes('fill="#')).toBe(s.color);
    }
  });

  it('lists each font once', () => {
    expect(new Set(FONT_LIBRARY.map((f) => f.family)).size).toBe(FONT_LIBRARY.length);
    expect(FONT_LIBRARY[0].label).toBe('Chinese – Noto');
    expect(FONT_LIBRARY).toHaveLength(31);
    expect(FONT_LIBRARY.filter((f) => f.rtl).map((f) => f.family)).toEqual(['Noto Nastaliq Urdu', 'Noto Naskh Arabic']);
  });
});

describe('toWav', () => {
  it('writes a 16-bit stereo WAV header and samples', async () => {
    const left = new Float32Array([0, 1, -1]);
    const right = new Float32Array([0.5, -0.5, 0]);
    const fake = { numberOfChannels: 2, length: 3, sampleRate: 44100, getChannelData: (c: number) => (c === 0 ? left : right) } as unknown as AudioBuffer;
    const blob = toWav(fake);
    const view = new DataView(await blob.arrayBuffer());
    expect(blob.size).toBe(44 + 3 * 2 * 2);
    expect(String.fromCharCode(...new Uint8Array(await blob.slice(0, 4).arrayBuffer()))).toBe('RIFF');
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getInt16(44 + 4, true)).toBe(0x7fff);
    expect(view.getInt16(44 + 8, true)).toBe(-0x8000);
  });
});

describe('right to left', () => {
  it('detects RTL fonts and RTL scripts', () => {
    expect(isRtl('Noto Nastaliq Urdu', 'hello')).toBe(true);
    expect(isRtl('Caveat', 'سلام')).toBe(true);
    expect(isRtl('Caveat', 'hello')).toBe(false);
  });
});
