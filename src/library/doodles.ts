/**
 * Library artwork from Chalkline Studio: original line drawings in a 200×200 viewBox.
 * Every stroke subpath starts with an absolute M, so it can be drawn on stroke by stroke.
 * Fills sit behind the strokes and show only in colour mode.
 */

import type { LibraryCategory } from './manifest';

/** Library panel sub-tabs; also the category of built-in and custom doodles. */
export type DoodleCategory = 'characters' | 'props' | 'shapes' | 'custom';

export interface DoodleFill {
  d: string;
  c: string;
}

export interface DoodleDef {
  id: string;
  cat: DoodleCategory | LibraryCategory;
  name: string;
  tags: string[];
  strokes: string[];
  fills: DoodleFill[];
  /** Stroke colour in colour mode (decorations like coloured squiggles). Default: the board-dependent ink. */
  ink?: string;
  /** Stroke width in viewBox units. Default DOODLE_LINE_WIDTH. */
  lineWidth?: number;
}

export const DOODLE_VIEWBOX = 200;

import { DECOR } from './decor';

const C = (cx: number, cy: number, r: number) => `M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`;
const SKIN = ['#F6D3B7', '#E2B48C', '#B97F55', '#8A5636'];

interface PersonOptions {
  hijab?: boolean;
  hairC?: string;
  long?: boolean;
  skin?: number;
  hair?: 'spiky' | 'short' | 'long' | 'bald';
  hat?: boolean;
  glasses?: boolean;
  beard?: boolean;
  coat?: boolean;
  shirt?: string;
  tie?: boolean;
  stetho?: boolean;
  skirt?: boolean;
  skirtC?: string;
  arms?: 'down' | 'point' | 'book' | 'chin' | 'wave';
  cane?: boolean;
  pack?: boolean;
}

function person(o: PersonOptions): { strokes: string[]; fills: DoodleFill[] } {
  const S: string[] = [];
  const F: DoodleFill[] = [];
  const head = C(100, 45, 22);
  if (o.hijab) {
    const h = 'M74,54 Q70,16 100,15 Q130,16 126,54 Q126,78 100,80 Q74,78 74,54 Z';
    S.push(h);
    F.push({ d: h, c: o.hairC || '#4F7A6E' });
  }
  if (o.long) S.push(...'M78,44 Q74,86 66,96 M122,44 Q126,86 134,96'.split(/(?=M)/));
  S.push(head);
  F.push({ d: head, c: SKIN[o.skin || 0] });
  if (o.hair === 'spiky') {
    const h = 'M77,40 Q80,16 100,18 Q120,16 123,40 Q112,30 100,32 Q88,30 77,40 Z';
    S.push(h, 'M86,24 L80,14', 'M100,18 L101,8', 'M113,23 L121,13');
    F.push({ d: h, c: o.hairC || '#3B2A20' });
  }
  if (o.hair === 'short') {
    const h = 'M78,42 Q78,20 100,21 Q122,20 122,42 Q110,32 92,34 Q84,36 78,42 Z';
    S.push(h);
    F.push({ d: h, c: o.hairC || '#2F241C' });
  }
  if (o.hair === 'long') {
    const h = 'M78,44 Q78,18 100,19 Q124,18 122,46 Q112,30 96,30 Q86,34 78,44 Z';
    S.push(h);
    F.push({ d: h, c: o.hairC || '#5A3A26' });
  }
  if (o.hair === 'bald') S.push('M80,36 Q84,30 88,32', 'M112,32 Q116,30 120,36');
  if (o.hat) {
    const h = 'M74,38 Q76,14 100,14 Q124,14 126,38 Z';
    S.push(h, 'M70,38 L130,38', 'M100,14 L100,26');
    F.push({ d: h, c: '#F2B544' });
  }
  S.push(C(92, 44, 2.2), C(108, 44, 2.2));
  if (o.glasses) S.push(C(92, 44, 7), C(108, 44, 7), 'M99,44 L101,44');
  if (o.beard) {
    const b = 'M80,52 Q84,82 100,84 Q116,82 120,52 Q112,62 100,62 Q88,62 80,52 Z';
    S.push(b);
    F.push({ d: b, c: '#E9E4DC' });
  } else S.push('M92,55 Q100,61 108,55');
  S.push('M96,67 L96,73', 'M104,67 L104,73');
  const torso = o.coat ? 'M82,74 Q100,70 118,74 L124,140 L76,140 Z' : 'M84,74 Q100,70 116,74 L121,132 L79,132 Z';
  S.push(torso);
  F.push({ d: torso, c: o.shirt || '#5B8DEF' });
  if (o.coat) S.push('M100,74 L100,140', 'M90,96 L96,96');
  if (o.tie) {
    const t = 'M100,75 L96,84 L100,106 L104,84 Z';
    S.push(t);
    F.push({ d: t, c: '#D9534F' });
  }
  if (o.stetho) S.push('M90,76 Q86,100 100,104 Q114,100 110,76', 'M100,104 L100,112', C(100, 116, 4));
  const lowerY = o.coat ? 140 : 132;
  if (o.skirt) {
    const s = `M79,${lowerY} L70,158 L130,158 L121,${lowerY} Z`;
    S.push(s);
    F.push({ d: s, c: o.skirtC || '#2F3A56' });
    S.push('M90,158 L88,186', 'M110,158 L112,186');
  } else S.push(`M89,${lowerY} L86,184`, `M111,${lowerY} L114,184`, `M100,${lowerY} L100,${lowerY + 8}`);
  S.push('M86,186 L73,188', 'M112,186 L125,188');
  const arms = {
    down: ['M84,80 L70,124', 'M116,80 L130,124', C(69, 127, 4), C(131, 127, 4)],
    point: ['M84,80 L70,124', C(69, 127, 4), 'M116,80 L146,62 L160,50', C(162, 48, 4)],
    book: ['M84,82 L92,110', 'M116,82 L108,110'],
    chin: ['M84,80 L70,124', C(69, 127, 4), 'M116,80 Q138,104 120,98 L108,66', C(107, 64, 4)],
    wave: ['M84,80 L70,124', C(69, 127, 4), 'M116,80 L140,60 L146,34', C(147, 30, 5)],
  }[o.arms || 'down'];
  S.push(...arms);
  if (o.arms === 'book') {
    const bk = 'M84,100 L116,100 L116,122 L84,122 Z';
    S.push(bk, 'M100,100 L100,122');
    F.push({ d: bk, c: '#F2B544' });
  }
  if (o.cane) S.push('M131,128 L137,186', 'M131,128 Q131,116 140,118');
  if (o.pack) S.push('M118,82 Q138,84 136,122 L121,124');
  return { strokes: S, fills: F };
}

const char = (id: string, name: string, tags: string[], o: PersonOptions): DoodleDef => ({ id, cat: 'characters', name, tags, ...person(o) });
const prop = (id: string, name: string, tags: string[], strokes: string[], fills: DoodleFill[] = []): DoodleDef => ({
  id,
  cat: 'props',
  name,
  tags,
  strokes,
  fills,
});

export const LIBRARY: DoodleDef[] = [
  char('c-omar', 'Presenter – Omar', ['people', 'business'], { hair: 'spiky', glasses: true, tie: true, arms: 'point', shirt: '#3D5A80' }),
  char('c-ayesha', 'Teacher – Ayesha', ['people', 'education', 'faith'], { hijab: true, hairC: '#2E8B78', arms: 'book', skirt: true, shirt: '#F28C63', skin: 1 }),
  char('c-bilal', 'Student – Bilal', ['people', 'education'], { hair: 'short', arms: 'wave', pack: true, shirt: '#67B26F', skin: 2 }),
  char('c-rahim', 'Elder – Rahim', ['people', 'faith'], { hair: 'bald', beard: true, glasses: true, cane: true, shirt: '#8C7AE6', skin: 1 }),
  char('c-sara', 'Engineer – Sara', ['people', 'business'], { hat: true, long: true, arms: 'down', shirt: '#F2B544', skin: 0 }),
  char('c-hamza', 'Doctor – Hamza', ['people', 'health'], { hair: 'short', coat: true, stetho: true, arms: 'down', shirt: '#FFFFFF', skin: 3 }),
  char('c-zain', 'Thinker – Zain', ['people', 'education'], { hair: 'long', hairC: '#1F1A17', arms: 'chin', shirt: '#E76F51', skin: 2 }),
  char('c-mariam', 'Speaker – Mariam', ['people', 'business'], { long: true, hair: 'long', arms: 'point', skirt: true, skirtC: '#264653', shirt: '#2A9D8F', skin: 0 }),

  prop(
    'p-bulb',
    'Idea bulb',
    ['objects', 'education', 'business'],
    [
      'M100,30 C70,30 52,54 56,80 C59,98 72,108 78,122 L78,136 L122,136 L122,122 C128,108 141,98 144,80 C148,54 130,30 100,30',
      'M80,146 L120,146',
      'M84,156 L116,156',
      'M92,166 L108,166',
      'M92,122 L92,98 Q100,88 108,98 L108,122',
      'M100,6 L100,18',
      'M42,38 L50,46',
      'M158,38 L150,46',
      'M28,82 L40,82',
      'M172,82 L160,82',
    ],
    [{ d: 'M100,30 C70,30 52,54 56,80 C59,98 72,108 78,122 L78,136 L122,136 L122,122 C128,108 141,98 144,80 C148,54 130,30 100,30 Z', c: '#FFD84D' }],
  ),
  prop(
    'p-laptop',
    'Laptop',
    ['objects', 'business'],
    ['M50,58 L150,58 L150,128 L50,128 Z', 'M60,68 L140,68 L140,118 L60,118 Z', 'M30,136 L170,136 L160,150 L40,150 Z', 'M90,143 L110,143', 'M70,106 L86,90 L100,100 L126,78'],
    [
      { d: 'M50,58 L150,58 L150,128 L50,128 Z', c: '#C9CED6' },
      { d: 'M60,68 L140,68 L140,118 L60,118 Z', c: '#BFE3FF' },
      { d: 'M30,136 L170,136 L160,150 L40,150 Z', c: '#A8AFB9' },
    ],
  ),
  prop(
    'p-rocket',
    'Rocket launch',
    ['objects', 'business'],
    [
      'M100,22 C128,48 134,88 124,128 L76,128 C66,88 72,48 100,22',
      C(100, 72, 12),
      'M76,104 L56,140 L79,128',
      'M124,104 L144,140 L121,128',
      'M86,132 Q100,178 114,132',
      'M94,134 Q100,158 106,134',
    ],
    [
      { d: 'M100,22 C128,48 134,88 124,128 L76,128 C66,88 72,48 100,22 Z', c: '#EEF2F7' },
      { d: C(100, 72, 12), c: '#7CC6FF' },
      { d: 'M76,104 L56,140 L79,128 Z', c: '#FF6B5B' },
      { d: 'M124,104 L144,140 L121,128 Z', c: '#FF6B5B' },
      { d: 'M86,132 Q100,178 114,132 Z', c: '#FFB547' },
    ],
  ),
  prop(
    'p-chart',
    'Growth chart',
    ['objects', 'business', 'education'],
    [
      'M40,28 L40,160 L174,160',
      'M56,160 L56,122 L76,122 L76,160',
      'M90,160 L90,98 L110,98 L110,160',
      'M124,160 L124,72 L144,72 L144,160',
      'M50,110 L94,80 L118,92 L160,46',
      'M146,46 L160,46 L160,60',
    ],
    [
      { d: 'M56,160 L56,122 L76,122 L76,160 Z', c: '#2A9D8F' },
      { d: 'M90,160 L90,98 L110,98 L110,160 Z', c: '#F2B544' },
      { d: 'M124,160 L124,72 L144,72 L144,160 Z', c: '#E76F51' },
    ],
  ),
  prop(
    'p-clock',
    'Clock',
    ['objects'],
    [C(100, 100, 60), 'M100,100 L100,62', 'M100,100 L128,114', 'M100,44 L100,52', 'M156,100 L148,100', 'M100,156 L100,148', 'M44,100 L52,100'],
    [{ d: C(100, 100, 60), c: '#FFF4D6' }],
  ),
  prop(
    'p-speech',
    'Speech bubble',
    ['objects', 'shapes'],
    ['M36,50 Q36,32 56,32 L150,32 Q168,32 168,50 L168,108 Q168,126 150,126 L84,126 L56,156 L62,126 L56,126 Q36,126 36,108 Z', C(78, 80, 4), C(102, 80, 4), C(126, 80, 4)],
    [{ d: 'M36,50 Q36,32 56,32 L150,32 Q168,32 168,50 L168,108 Q168,126 150,126 L84,126 L56,156 L62,126 L56,126 Q36,126 36,108 Z', c: '#E2F4FF' }],
  ),
  prop(
    'p-thought',
    'Thought cloud',
    ['objects', 'shapes'],
    ['M60,110 Q36,110 40,88 Q30,64 56,60 Q62,36 90,44 Q108,26 130,42 Q160,38 160,66 Q178,82 162,100 Q160,120 134,116 Q120,132 96,120 Q80,128 60,110 Z', C(64, 144, 8), C(46, 166, 5)],
    [{ d: 'M60,110 Q36,110 40,88 Q30,64 56,60 Q62,36 90,44 Q108,26 130,42 Q160,38 160,66 Q178,82 162,100 Q160,120 134,116 Q120,132 96,120 Q80,128 60,110 Z', c: '#F3F0FF' }],
  ),
  prop('p-arrow', 'Curved arrow', ['shapes'], ['M30,140 C60,60 120,60 160,90', 'M136,72 L162,92 L132,102']),
  prop(
    'p-house',
    'House',
    ['objects', 'real estate'],
    ['M38,96 L100,42 L162,96', 'M54,86 L54,160 L146,160 L146,86', 'M88,160 L88,122 L112,122 L112,160', 'M120,104 L138,104 L138,122 L120,122 Z', 'M128,68 L128,52 L142,52 L142,80'],
    [
      { d: 'M54,86 L100,46 L146,86 L146,160 L54,160 Z', c: '#FFE3B3' },
      { d: 'M88,160 L88,122 L112,122 L112,160 Z', c: '#B5651D' },
      { d: 'M120,104 L138,104 L138,122 L120,122 Z', c: '#BFE3FF' },
    ],
  ),
  prop(
    'p-coin',
    'Coin',
    ['objects', 'money', 'business'],
    [C(100, 100, 50), C(100, 100, 38), 'M114,82 Q110,72 100,72 Q86,72 86,84 Q86,96 100,98 Q114,100 114,114 Q114,126 100,126 Q90,126 86,118', 'M100,62 L100,136'],
    [{ d: C(100, 100, 50), c: '#FFD24D' }],
  ),
  prop(
    'p-bag',
    'Money bag',
    ['objects', 'money'],
    [
      'M76,58 Q60,40 80,36 Q100,44 120,36 Q140,40 124,58',
      'M80,60 Q36,100 52,148 Q62,170 100,170 Q138,170 148,148 Q164,100 120,60 Z',
      'M80,60 L120,60',
      'M110,104 Q106,96 100,96 Q90,96 90,105 Q90,113 100,114 Q110,115 110,124 Q110,132 100,132 Q92,132 90,126',
      'M100,88 L100,140',
    ],
    [{ d: 'M80,60 Q36,100 52,148 Q62,170 100,170 Q138,170 148,148 Q164,100 120,60 Z', c: '#D9B26B' }],
  ),
  prop(
    'p-search',
    'Magnifier',
    ['objects'],
    [C(80, 80, 40), 'M108,110 L150,156 L162,144 L120,98'],
    [
      { d: C(80, 80, 40), c: '#D9F1FF' },
      { d: 'M108,110 L150,156 L162,144 L120,98 Z', c: '#5B4636' },
    ],
  ),
  prop(
    'p-heart',
    'Heart',
    ['shapes'],
    ['M100,160 C40,120 30,80 50,60 C70,40 92,50 100,70 C108,50 130,40 150,60 C170,80 160,120 100,160 Z'],
    [{ d: 'M100,160 C40,120 30,80 50,60 C70,40 92,50 100,70 C108,50 130,40 150,60 C170,80 160,120 100,160 Z', c: '#FF6B7A' }],
  ),
  prop(
    'p-globe',
    'Globe',
    ['objects', 'education'],
    [C(100, 100, 60), 'M40,100 L160,100', 'M100,40 C70,70 70,130 100,160', 'M100,40 C130,70 130,130 100,160', 'M50,70 L150,70', 'M50,130 L150,130'],
    [{ d: C(100, 100, 60), c: '#9FD6FF' }],
  ),
  prop(
    'p-star',
    'Star',
    ['shapes'],
    ['M100,28 L118,78 L170,80 L130,112 L144,162 L100,134 L56,162 L70,112 L30,80 L82,78 Z'],
    [{ d: 'M100,28 L118,78 L170,80 L130,112 L144,162 L100,134 L56,162 L70,112 L30,80 L82,78 Z', c: '#FFD24D' }],
  ),
  prop(
    'p-mosque',
    'Mosque',
    ['faith', 'buildings'],
    [
      'M60,100 Q60,58 100,48 Q140,58 140,100',
      'M48,100 L152,100 L152,168 L48,168 Z',
      'M88,168 L88,138 Q100,122 112,138 L112,168',
      'M24,168 L24,72 L36,72 L36,168',
      'M164,168 L164,72 L176,72 L176,168',
      'M22,72 L30,52 L38,72',
      'M162,72 L170,52 L178,72',
      'M100,48 L100,36',
      'M104,22 Q92,26 96,36 Q100,30 104,22',
    ],
    [
      { d: 'M60,100 Q60,58 100,48 Q140,58 140,100 Z', c: '#5FBFA5' },
      { d: 'M48,100 L152,100 L152,168 L48,168 Z', c: '#F4E9D8' },
      { d: 'M24,168 L24,72 L36,72 L36,168 Z', c: '#F4E9D8' },
      { d: 'M164,168 L164,72 L176,72 L176,168 Z', c: '#F4E9D8' },
    ],
  ),
  prop(
    'p-church',
    'Church',
    ['faith', 'buildings'],
    ['M58,82 L100,48 L142,82', 'M64,80 L64,168 L136,168 L136,80', 'M100,48 L100,18', 'M90,28 L110,28', 'M88,168 L88,138 Q100,126 112,138 L112,168', C(100, 100, 9)],
    [
      { d: 'M64,82 L100,52 L136,82 L136,168 L64,168 Z', c: '#F4E9D8' },
      { d: 'M88,168 L88,138 Q100,126 112,138 L112,168 Z', c: '#8C5A3C' },
      { d: C(100, 100, 9), c: '#9FD6FF' },
    ],
  ),
  prop(
    'p-lantern',
    'Lantern',
    ['faith', 'objects'],
    [
      'M94,40 Q100,24 106,40',
      'M86,40 L114,40 L120,56 L80,56 Z',
      'M76,56 L124,56 L130,140 L70,140 Z',
      'M100,56 L100,140',
      'M66,140 L134,140 L128,156 L72,156 Z',
      'M100,120 Q90,106 100,90 Q110,106 100,120',
    ],
    [
      { d: 'M76,56 L124,56 L130,140 L70,140 Z', c: '#FFE9A8' },
      { d: 'M86,40 L114,40 L120,56 L80,56 Z', c: '#C9A24D' },
      { d: 'M66,140 L134,140 L128,156 L72,156 Z', c: '#C9A24D' },
      { d: 'M100,120 Q90,106 100,90 Q110,106 100,120 Z', c: '#FF9F43' },
    ],
  ),
  prop(
    'p-candle',
    'Candle',
    ['faith', 'objects'],
    ['M80,80 L120,80 L120,170 L80,170 Z', 'M100,80 L100,70', 'M100,68 Q86,50 100,28 Q114,50 100,68', 'M120,96 Q112,100 112,114', 'M58,170 L142,170 L132,182 L68,182 Z'],
    [
      { d: 'M80,80 L120,80 L120,170 L80,170 Z', c: '#FFF7E6' },
      { d: 'M100,68 Q86,50 100,28 Q114,50 100,68 Z', c: '#FFB547' },
      { d: 'M58,170 L142,170 L132,182 L68,182 Z', c: '#C9A24D' },
    ],
  ),
  prop(
    'p-book',
    'Open book',
    ['faith', 'education', 'objects'],
    [
      'M100,60 Q70,44 36,52 L36,150 Q70,142 100,158 Q130,142 164,150 L164,52 Q130,44 100,60',
      'M100,60 L100,158',
      'M50,76 L88,72',
      'M50,92 L88,88',
      'M50,108 L88,104',
      'M112,72 L150,76',
      'M112,88 L150,92',
      'M112,104 L150,108',
    ],
    [{ d: 'M100,60 Q70,44 36,52 L36,150 Q70,142 100,158 Q130,142 164,150 L164,52 Q130,44 100,60 Z', c: '#FFFDF5' }],
  ),
  prop(
    'p-trophy',
    'Trophy',
    ['objects', 'business'],
    [
      'M64,40 L136,40 L132,92 Q128,118 100,120 Q72,118 68,92 Z',
      'M64,52 Q40,52 44,74 Q48,90 68,92',
      'M136,52 Q160,52 156,74 Q152,90 132,92',
      'M92,120 L92,140 L108,140 L108,120',
      'M72,140 L128,140 L128,158 L72,158 Z',
    ],
    [
      { d: 'M64,40 L136,40 L132,92 Q128,118 100,120 Q72,118 68,92 Z', c: '#FFD24D' },
      { d: 'M72,140 L128,140 L128,158 L72,158 Z', c: '#8C5A3C' },
    ],
  ),
  prop(
    'p-phone',
    'Phone',
    ['objects', 'business'],
    [
      'M70,24 L130,24 Q140,24 140,34 L140,166 Q140,176 130,176 L70,176 Q60,176 60,166 L60,34 Q60,24 70,24 Z',
      'M68,40 L132,40 L132,152 L68,152 Z',
      'M94,164 L106,164',
      'M78,56 L122,56 L122,72 L78,72 Z',
      'M78,84 L122,84',
      'M78,96 L110,96',
    ],
    [
      { d: 'M70,24 L130,24 Q140,24 140,34 L140,166 Q140,176 130,176 L70,176 Q60,176 60,166 L60,34 Q60,24 70,24 Z', c: '#3A3F4B' },
      { d: 'M68,40 L132,40 L132,152 L68,152 Z', c: '#E2F4FF' },
    ],
  ),
  prop(
    'p-target',
    'Target',
    ['objects', 'business'],
    [C(96, 104, 60), C(96, 104, 40), C(96, 104, 18), 'M96,104 L156,44', 'M144,40 L160,40 L160,56'],
    [
      { d: C(96, 104, 60), c: '#FF6B5B' },
      { d: C(96, 104, 40), c: '#FFFFFF' },
      { d: C(96, 104, 18), c: '#FF6B5B' },
    ],
  ),
  prop('p-check', 'Checkbox', ['shapes'], ['M40,40 L160,40 L160,160 L40,160 Z', 'M62,100 L92,130 L144,66'], [{ d: 'M40,40 L160,40 L160,160 L40,160 Z', c: '#DDF5E5' }]),
];

LIBRARY.push(...DECOR);

export const TAGS = ['people', 'business', 'education', 'faith', 'health', 'money', 'objects', 'buildings', 'real estate', 'shapes', 'decor'];

const escAttr = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export const DOODLE_LINE_WIDTH = 3.4;

/**
 * SVG for a doodle. Strokes are split into one <path> per subpath so the hand draws each piece
 * separately. Fills are marked data-nodraw: they show in the art but the hand doesn't trace them.
 */
export function doodleSvg(def: Pick<DoodleDef, 'strokes' | 'fills' | 'ink' | 'lineWidth'>, opts: { color: boolean; ink: string }): string {
  const ink = opts.color && def.ink ? def.ink : opts.ink;
  const fills = opts.color ? def.fills.map((f) => `<path data-nodraw="1" d="${escAttr(f.d)}" fill="${escAttr(f.c)}"/>`).join('') : '';
  const paths = def.strokes
    .flatMap((d) => d.split(/(?=M)/))
    .filter((d) => d.trim())
    .map((d) => `<path d="${escAttr(d)}"/>`)
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${DOODLE_VIEWBOX} ${DOODLE_VIEWBOX}">${fills}` +
    `<g fill="none" stroke="${escAttr(ink)}" stroke-width="${def.lineWidth ?? DOODLE_LINE_WIDTH}" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`
  );
}

/** Checks AI-returned path data: absolute M start, path characters only, bounded size. */
export function validStrokes(arr: unknown): string[] {
  return (Array.isArray(arr) ? arr : [])
    .map(String)
    .filter((d) => /^\s*M/.test(d) && d.length < 4000 && !/[^MLHVCSQTAZmlhvcsqtaz0-9.,\s-]/.test(d))
    .slice(0, 80);
}
