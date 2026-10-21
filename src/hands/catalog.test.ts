import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_HAND_ID, HAND_GROUPS, HANDS, handById, loadHandCatalog } from './catalog';
import { darken, handSvg } from './handArt';
import manifest from '../../public/hands/hands.json';
import src from '../../scripts/hands/hands.src.json';

describe('hand catalog', () => {
  it('has the 25 hands with unique ids and names, in every group', () => {
    expect(HANDS).toHaveLength(25);
    expect(new Set(HANDS.map((h) => h.id)).size).toBe(25);
    expect(new Set(HANDS.map((h) => h.name)).size).toBe(25);
    expect(handById(DEFAULT_HAND_ID)?.name).toBe('Male Hand 9');
    for (const g of HAND_GROUPS) expect(HANDS.some((h) => h.group === g)).toBe(true);
    expect(handById('santa-2')?.id).toBe('santa-glove');
  });

  it('lists every hand of the generator source', () => {
    expect(src.map((e) => e.id).sort()).toEqual(HANDS.map((h) => h.id).sort());
    for (const e of src) expect(handById(e.id)?.group).toBe(e.group);
  });

  it('puts every illustrated pen tip at the same spot', () => {
    for (const h of HANDS) expect(handSvg(h.look)).toContain('transform="translate(16 16) rotate(-42)"');
  });

  afterEach(() => vi.unstubAllGlobals());

  it('attaches the photos listed in hands.json', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(manifest)));
    const hands = await loadHandCatalog();
    expect(hands.filter((h) => h.photo).map((h) => h.id).sort()).toEqual(manifest.map((e) => e.id).sort());
    expect(handById('male-1')?.photo).toMatchObject({ file: '/hands/male-1.webp', png: '/hands/male-1.png', tipX: 200, tipY: 200 });
    expect(handById('male-6')?.photo).toBeUndefined();
  });

  it('draws the chosen tool and extras', () => {
    expect(handSvg(handById('male-chalk')!.look)).toContain('#f6f5ef');
    expect(handSvg(handById('male-4')!.look)).toContain('#22252b');
    expect(handSvg(handById('santa-1')!.look)).toContain('#c8202a');
  });

  it('darkens colours', () => {
    expect(darken('#ffffff', 0.5)).toBe('#808080');
    expect(darken('#000000', 0.5)).toBe('#000000');
  });
});
