import { circle, ellipse, hlines, item, join, line, place, poly, rrect } from '../draw.mjs';

const edu = (id, name, tags, strokes, fills) => item('education', id, name, ['education', ...tags], strokes, fills);

const leftPage = 'M100,62 Q70,50 32,58 L32,150 Q70,142 100,154 Z';
const rightPage = 'M100,62 Q130,50 168,58 L168,150 Q130,142 100,154 Z';
const cover = 'M24,64 L24,160 Q62,152 100,162 Q138,152 176,160 L176,64';

// Pencil, drawn along x from the eraser (0) to the point (150), then turned to point up-right.
const P = (pts) => poly(place(pts, 36, 166, -45), true);
const PL = (pts) => poly(place(pts, 36, 166, -45));
const pencilBody = P([[30, -11], [124, -11], [124, 11], [30, 11]]);
const pencilFerrule = P([[16, -11], [30, -11], [30, 11], [16, 11]]);
const pencilEraser = P([[2, -11], [16, -11], [16, 11], [2, 11]]);
const pencilCone = P([[124, -11], [150, 0], [124, 11]]);
const pencilLead = P([[142, -3.5], [150, 0], [142, 3.5]]);

const globeLand = ['M70,62 Q84,50 98,58 Q104,72 92,80 Q80,78 74,90 Q62,84 70,62 Z', 'M106,98 Q124,92 132,104 Q128,122 114,128 Q104,118 106,98 Z'];

export default [
  edu(
    'ed-open-book',
    'Open book',
    ['reading', 'study', 'school'],
    [cover, leftPage, rightPage, line(100, 62, 100, 154), ...hlines(42, 78, 48, 14, 4), ...hlines(110, 78, 48, 14, 4), 'M146,52 L146,30 L154,38 L162,30 L162,56'],
    [
      { d: `${cover} Z`, c: '#3D7DCA' },
      { d: leftPage, c: '#FFFFFF' },
      { d: rightPage, c: '#FFFFFF' },
      { d: 'M146,52 L146,30 L154,38 L162,30 L162,56 Z', c: '#E4572E' },
    ],
  ),
  edu(
    'ed-grad-cap',
    'Graduation cap',
    ['graduation', 'university', 'success'],
    [
      poly([[100, 46], [180, 78], [100, 110], [20, 78]], true),
      'M54,92 L54,128 Q100,150 146,128 L146,92',
      'M54,128 Q100,138 146,128',
      circle(100, 78, 4),
      'M100,78 L152,94 L152,130',
      poly([[146, 130], [158, 130], [162, 150], [142, 150]], true),
      line(148, 136, 147, 150),
      line(156, 136, 157, 150),
    ],
    [
      { d: poly([[100, 46], [180, 78], [100, 110], [20, 78]], true), c: '#2B2B2B' },
      { d: 'M54,92 L54,128 Q100,150 146,128 L146,92 Z', c: '#3B3B3B' },
      { d: poly([[146, 130], [158, 130], [162, 150], [142, 150]], true), c: '#F2C14E' },
    ],
  ),
  edu(
    'ed-pencil',
    'Pencil',
    ['writing', 'school', 'draw'],
    [pencilBody, PL([[30, -4], [124, -4]]), PL([[30, 4], [124, 4]]), pencilFerrule, PL([[21, -11], [21, 11]]), PL([[25, -11], [25, 11]]), pencilEraser, pencilCone, pencilLead, 'M90,174 Q104,164 118,174 Q132,184 146,174'],
    [
      { d: pencilBody, c: '#F2C14E' },
      { d: pencilFerrule, c: '#B8BDC4' },
      { d: pencilEraser, c: '#F07C8A' },
      { d: pencilCone, c: '#F3D9B1' },
      { d: pencilLead, c: '#2B2B2B' },
    ],
  ),
  edu(
    'ed-globe',
    'Globe',
    ['geography', 'world', 'school'],
    [
      circle(100, 88, 52),
      ellipse(100, 88, 22, 52),
      line(48, 88, 152, 88),
      'M56,62 Q100,74 144,62',
      'M56,114 Q100,102 144,114',
      ...globeLand,
      'M44,124 A64,64 0 0,0 150,140',
      line(100, 150, 100, 164),
      ellipse(100, 170, 32, 8),
    ],
    [
      { d: circle(100, 88, 52), c: '#7EC8E3' },
      { d: join(globeLand), c: '#7BB662' },
      { d: ellipse(100, 170, 32, 8), c: '#8B5A2B' },
    ],
  ),
  edu(
    'ed-backpack',
    'School bag',
    ['school', 'kids', 'study'],
    [
      'M76,52 Q76,30 100,30 Q124,30 124,52',
      rrect(50, 50, 100, 126, 24),
      rrect(68, 112, 64, 52, 12),
      'M68,126 Q100,136 132,126',
      line(100, 132, 100, 146),
      'M50,82 Q38,112 50,152',
      'M150,82 Q162,112 150,152',
      rrect(84, 66, 32, 14, 6),
    ],
    [
      { d: rrect(50, 50, 100, 126, 24), c: '#3D7DCA' },
      { d: rrect(68, 112, 64, 52, 12), c: '#5A9BE0' },
      { d: rrect(84, 66, 32, 14, 6), c: '#F2C14E' },
    ],
  ),
];
