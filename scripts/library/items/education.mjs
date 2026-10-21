import { arc, circle, ellipse, hlines, item, join, line, place, poly, rect, rrect, star } from '../draw.mjs';

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
  edu(
    'ed-microscope',
    'Science microscope',
    ['science', 'biology', 'lab', 'microscope', 'research'],
    [
      rrect(52, 154, 96, 20, 6),
      poly([[88, 154], [88, 104], [116, 70], [128, 70], [104, 102], [104, 154]]),
      rrect(112, 28, 22, 62, 5),
      circle(123, 28, 9),
      poly([[112, 90], [134, 90], [128, 108], [118, 108]], true),
      rrect(72, 116, 44, 8, 2),
      circle(100, 102, 12),
      circle(100, 102, 6),
    ],
    [
      { d: rrect(52, 154, 96, 20, 6), c: '#334155' },
      { d: rrect(112, 28, 22, 62, 5), c: '#38BDF8' },
      { d: circle(100, 102, 12), c: '#F59E0B' },
      { d: rrect(72, 116, 44, 8, 2), c: '#1E293B' },
    ],
  ),
  edu(
    'ed-chalkboard',
    'Classroom chalkboard',
    ['blackboard', 'chalk', 'teacher', 'math', 'classroom'],
    [
      rrect(34, 38, 132, 92, 8),
      rrect(44, 48, 112, 72, 4),
      rect(30, 128, 140, 8),
      line(50, 136, 40, 174),
      line(150, 136, 160, 174),
      line(100, 136, 100, 174),
      rrect(120, 124, 24, 6, 2),
      line(56, 74, 90, 74),
      line(100, 66, 108, 82),
      line(116, 74, 140, 74),
    ],
    [
      { d: rrect(34, 38, 132, 92, 8), c: '#92400E' },
      { d: rrect(44, 48, 112, 72, 4), c: '#065F46' },
      { d: rrect(120, 124, 24, 6, 2), c: '#FEF08A' },
    ],
  ),
  edu(
    'ed-diploma',
    'Graduation diploma',
    ['diploma', 'degree', 'certificate', 'achievement', 'scroll'],
    [
      rrect(44, 50, 112, 100, 12),
      ellipse(44, 100, 12, 50),
      ellipse(156, 100, 12, 50),
      rect(94, 50, 14, 100),
      circle(101, 100, 14),
      poly([[94, 112], [88, 144], [101, 136], [114, 144], [108, 112]], true),
      line(64, 76, 86, 76),
      line(64, 92, 86, 92),
      line(116, 76, 138, 76),
      line(116, 92, 138, 92),
    ],
    [
      { d: rrect(44, 50, 112, 100, 12), c: '#FEF3C7' },
      { d: rect(94, 50, 14, 100), c: '#DC2626' },
      { d: circle(101, 100, 14), c: '#F59E0B' },
      { d: poly([[94, 112], [88, 144], [101, 136], [114, 144], [108, 112]], true), c: '#DC2626' },
    ],
  ),
  edu(
    'ed-ruler-set',
    'Geometry ruler set',
    ['ruler', 'geometry', 'triangle', 'math', 'drafting'],
    [
      poly([[38, 154], [148, 154], [38, 44]], true),
      poly([[52, 142], [124, 142], [52, 70]], true),
      ...[60, 75, 90, 105, 120, 135].map((x) => line(x, 154, x, 148)),
      ...[60, 75, 90, 105, 120, 135].map((y) => line(38, y, 44, y)),
      arc(104, 74, 40, 180, 0),
      line(64, 74, 144, 74),
      circle(104, 74, 6),
    ],
    [
      { d: poly([[38, 154], [148, 154], [38, 44]], true), c: '#FED7AA' },
      { d: poly([[52, 142], [124, 142], [52, 70]], true), c: '#FFFFFF' },
      { d: `${arc(104, 74, 40, 180, 0)} Z`, c: '#BFDBFE' },
    ],
  ),
  edu(
    'ed-flask-beaker',
    'Science beaker',
    ['chemistry', 'flask', 'beaker', 'science', 'experiment'],
    [
      poly([[84, 40], [116, 40], [116, 76], [152, 148], [48, 148], [84, 76]], true),
      rrect(80, 34, 40, 8, 3),
      poly([[58, 128], [142, 128], [148, 140], [52, 140]], true),
      circle(88, 112, 6),
      circle(114, 102, 5),
      circle(100, 86, 4),
      line(90, 80, 102, 80),
      line(86, 96, 104, 96),
      line(82, 112, 106, 112),
    ],
    [
      { d: poly([[84, 40], [116, 40], [116, 76], [152, 148], [48, 148], [84, 76]], true), c: '#E0F2FE' },
      { d: poly([[58, 128], [142, 128], [148, 140], [52, 140]], true), c: '#38BDF8' },
      { d: circle(88, 112, 6), c: '#BAE6FD' },
    ],
  ),
  edu(
    'ed-alarm-bell',
    'School bell',
    ['bell', 'alarm', 'recess', 'class', 'school'],
    [
      'M62,130 C62,72 82,60 100,60 C118,60 138,72 138,130 Z',
      rrect(54, 126, 92, 12, 5),
      rrect(94, 20, 12, 42, 4),
      circle(100, 24, 7),
      circle(100, 144, 9),
      line(100, 134, 100, 140),
      line(44, 76, 52, 84),
      line(156, 76, 148, 84),
    ],
    [
      { d: 'M62,130 C62,72 82,60 100,60 C118,60 138,72 138,130 Z', c: '#F59E0B' },
      { d: rrect(54, 126, 92, 12, 5), c: '#D97706' },
      { d: rrect(94, 20, 12, 42, 4), c: '#78350F' },
      { d: circle(100, 144, 9), c: '#92400E' },
    ],
  ),
  edu(
    'ed-book-stack',
    'Stack of books',
    ['books', 'library', 'study', 'textbook', 'reading'],
    [
      rrect(44, 134, 112, 26, 6),
      line(44, 147, 156, 147),
      rrect(48, 104, 104, 26, 6),
      line(48, 117, 152, 117),
      rrect(54, 74, 92, 26, 6),
      line(54, 87, 146, 87),
      poly([[128, 74], [136, 60], [144, 74]]),
      poly([[100, 42], [130, 52], [100, 62], [70, 52]], true),
    ],
    [
      { d: rrect(44, 134, 112, 26, 6), c: '#1E40AF' },
      { d: rrect(48, 104, 104, 26, 6), c: '#047857' },
      { d: rrect(54, 74, 92, 26, 6), c: '#B91C1C' },
      { d: poly([[100, 42], [130, 52], [100, 62], [70, 52]], true), c: '#F59E0B' },
    ],
  ),
  edu(
    'ed-palette',
    'Painting palette',
    ['art', 'palette', 'paint', 'creativity', 'color'],
    [
      'M60,60 C40,90 40,130 70,150 C100,170 140,160 156,134 C170,110 160,80 134,70 C120,64 116,74 104,74 C90,74 80,40 60,60 Z',
      circle(136, 118, 10),
      circle(72, 84, 7),
      circle(96, 66, 7),
      circle(80, 114, 7),
      circle(108, 138, 7),
      poly([[48, 160], [130, 68], [138, 74], [56, 166]], true),
      poly([[130, 68], [152, 42], [158, 48], [138, 74]], true),
    ],
    [
      { d: 'M60,60 C40,90 40,130 70,150 C100,170 140,160 156,134 C170,110 160,80 134,70 C120,64 116,74 104,74 C90,74 80,40 60,60 Z', c: '#FDE68A' },
      { d: circle(72, 84, 7), c: '#EF4444' },
      { d: circle(96, 66, 7), c: '#3B82F6' },
      { d: circle(80, 114, 7), c: '#10B981' },
      { d: circle(108, 138, 7), c: '#F59E0B' },
      { d: poly([[130, 68], [152, 42], [158, 48], [138, 74]], true), c: '#1E293B' },
    ],
  ),
  edu(
    'ed-compass',
    'Drafting compass',
    ['compass', 'math', 'geometry', 'drawing', 'tools'],
    [
      circle(100, 36, 10),
      line(100, 24, 100, 30),
      poly([[94, 44], [62, 164], [68, 166], [98, 46]], true),
      poly([[106, 44], [138, 164], [132, 166], [102, 46]], true),
      arc(100, 100, 24, 210, 330),
      circle(100, 100, 4),
      line(62, 164, 58, 174),
      rect(134, 154, 8, 18),
    ],
    [
      { d: circle(100, 36, 10), c: '#64748B' },
      { d: poly([[94, 44], [62, 164], [68, 166], [98, 46]], true), c: '#94A3B8' },
      { d: poly([[106, 44], [138, 164], [132, 166], [102, 46]], true), c: '#94A3B8' },
      { d: rect(134, 154, 8, 18), c: '#1E293B' },
    ],
  ),
  edu(
    'ed-award-medal',
    'Academic medal',
    ['medal', 'award', 'first place', 'achievement', 'success'],
    [
      poly([[76, 26], [94, 90], [106, 90], [124, 26], [106, 26], [100, 66], [94, 26]], true),
      line(82, 26, 96, 76),
      line(118, 26, 104, 76),
      rrect(92, 86, 16, 8, 2),
      circle(100, 122, 34),
      circle(100, 122, 26),
      star(100, 122, 14, 6, 5),
      circle(100, 122, 4),
      arc(100, 122, 20, 130, 230),
      arc(100, 122, 20, -50, 50),
    ],
    [
      { d: poly([[76, 26], [94, 90], [106, 90], [124, 26], [106, 26], [100, 66], [94, 26]], true), c: '#2563EB' },
      { d: circle(100, 122, 34), c: '#F59E0B' },
      { d: star(100, 122, 14, 6, 5), c: '#FDE047' },
    ],
  ),
];

