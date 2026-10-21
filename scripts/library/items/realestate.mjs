import { circle, ellipse, item, join, line, poly, rect, rrect } from '../draw.mjs';

const re = (id, name, tags, strokes, fills) => item('realestate', id, name, ['real estate', 'buildings', ...tags], strokes, fills);

const roof = poly([[34, 96], [100, 40], [166, 96]], true);
const flatWindows = [0, 1, 2, 3].flatMap((row) => [0, 1, 2].map((col) => rect(66 + col * 24, 44 + row * 30, 14, 18)));

export default [
  re(
    're-house',
    'House',
    ['home', 'property'],
    [
      rect(46, 92, 108, 80),
      roof,
      'M128,70 L128,50 L142,50 L142,82',
      rect(88, 128, 24, 44),
      circle(106, 152, 2),
      rect(56, 106, 22, 20),
      line(67, 106, 67, 126),
      rect(122, 106, 22, 20),
      line(133, 106, 133, 126),
      line(24, 172, 176, 172),
    ],
    [
      { d: rect(46, 92, 108, 80), c: '#F4E1C1' },
      { d: roof, c: '#C8553D' },
      { d: rect(88, 128, 24, 44), c: '#7A4E2D' },
      { d: join(rect(56, 106, 22, 20), rect(122, 106, 22, 20)), c: '#BFE3F5' },
    ],
  ),
  re(
    're-apartment',
    'Apartment block',
    ['flats', 'city', 'property'],
    [
      rect(56, 30, 88, 150),
      line(52, 30, 148, 30),
      rect(110, 18, 22, 12),
      ...flatWindows,
      rect(88, 156, 24, 24),
      rect(22, 96, 34, 84),
      line(30, 110, 48, 110),
      line(30, 126, 48, 126),
      line(30, 142, 48, 142),
    ],
    [
      { d: rect(56, 30, 88, 150), c: '#D9D4C7' },
      { d: rect(22, 96, 34, 84), c: '#B8C4D6' },
      { d: rect(88, 156, 24, 24), c: '#7A4E2D' },
      { d: rect(110, 18, 22, 12), c: '#7A8FA6' },
    ],
  ),
  re(
    're-key',
    'House key',
    ['keys', 'home', 'sale'],
    [
      circle(55, 100, 30),
      circle(55, 100, 10),
      'M84,94 L170,94 L170,106 L84,106',
      'M150,106 L150,124 L158,124 L158,114 L164,114 L164,124 L170,124 L170,106',
      'M38,76 Q30,60 44,52',
      rrect(28, 140, 44, 28, 5),
      circle(36, 154, 3),
      'M36,151 Q40,138 48,130',
      line(46, 84, 64, 84),
      line(46, 116, 64, 116),
    ],
    [
      { d: join(circle(55, 100, 30), rect(84, 94, 86, 12)), c: '#E3B04B' },
      { d: circle(55, 100, 10), c: '#FFFFFF' },
      { d: rrect(28, 140, 44, 28, 5), c: '#F7F3E8' },
    ],
  ),
  re(
    're-sale-sign',
    'Sale sign',
    ['for sale', 'property', 'sign'],
    [
      line(46, 180, 46, 36),
      line(42, 48, 156, 48),
      line(70, 48, 70, 66),
      line(132, 48, 132, 66),
      rrect(58, 66, 86, 54, 6),
      poly([[84, 94], [101, 78], [118, 94]], true),
      rect(88, 94, 26, 18),
      line(30, 180, 70, 180),
      'M130,180 Q134,170 138,180',
      'M146,180 Q150,168 154,180',
    ],
    [
      { d: rrect(58, 66, 86, 54, 6), c: '#E4572E' },
      { d: join(poly([[84, 94], [101, 78], [118, 94]], true), rect(88, 94, 26, 18)), c: '#FFFFFF' },
    ],
  ),
  re(
    're-front-door',
    'Front door',
    ['home', 'welcome', 'entrance'],
    [
      rect(56, 26, 88, 150),
      rrect(66, 36, 68, 140, 4),
      rrect(76, 48, 48, 46, 4),
      rrect(76, 106, 48, 52, 4),
      circle(124, 118, 4),
      line(40, 176, 160, 176),
      rect(150, 140, 22, 36),
      'M152,140 Q148,118 160,110 Q172,118 168,140',
      ellipse(100, 182, 34, 3),
    ],
    [
      { d: rect(56, 26, 88, 150), c: '#E8E2D5' },
      { d: rrect(66, 36, 68, 140, 4), c: '#2E6B8A' },
      { d: circle(124, 118, 4), c: '#E3B04B' },
      { d: rect(150, 140, 22, 36), c: '#C8553D' },
      { d: 'M152,140 Q148,118 160,110 Q172,118 168,140 Z', c: '#7BB662' },
    ],
  ),
];
