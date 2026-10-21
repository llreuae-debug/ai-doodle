import { circle, ellipse, item, join, line, poly, rect, rrect, star, wedge } from '../draw.mjs';

const biz = (id, name, tags, strokes, fills) => item('business', id, name, ['business', ...tags], strokes, fills);

const bars = [
  [42, 130, 22, '#7EC8E3'],
  [74, 108, 22, '#5A9BE0'],
  [106, 88, 22, '#3D7DCA'],
  [138, 62, 22, '#2E5E9E'],
];

/** One coin layer of a stack: rim and sides, seen from slightly above. */
const coinLayer = (cx, y, r) => `M${cx - r},${y} L${cx - r},${y + 10} A${r},8 0 0,0 ${cx + r},${y + 10} L${cx + r},${y}`;

export default [
  biz(
    'bz-bar-chart',
    'Rising bar chart',
    ['growth', 'chart', 'money'],
    [
      poly([[30, 28], [30, 170], [178, 170]]),
      ...bars.map(([x, y, w]) => rect(x, y, w, 170 - y)),
      'M40,112 L78,90 L110,98 L150,46',
      poly([[136, 44], [152, 42], [150, 58]]),
      line(26, 130, 30, 130),
      line(26, 90, 30, 90),
      line(26, 50, 30, 50),
    ],
    bars.map(([x, y, w, c]) => ({ d: rect(x, y, w, 170 - y), c })),
  ),
  biz(
    'bz-briefcase',
    'Briefcase',
    ['work', 'office', 'job'],
    [
      rrect(28, 62, 144, 100, 10),
      'M78,62 L78,46 Q78,38 86,38 L114,38 Q122,38 122,46 L122,62',
      'M88,62 L88,48 L112,48 L112,62',
      line(28, 98, 88, 98),
      line(112, 98, 172, 98),
      rrect(88, 90, 24, 18, 3),
      line(100, 98, 100, 104),
      line(44, 72, 44, 152),
      line(156, 72, 156, 152),
    ],
    [
      { d: rrect(28, 62, 144, 100, 10), c: '#8B5A2B' },
      { d: rrect(88, 90, 24, 18, 3), c: '#E3B04B' },
    ],
  ),
  biz(
    'bz-coins',
    'Stacks of coins',
    ['money', 'savings', 'finance'],
    [
      ...[160, 148, 136, 124].map((y) => coinLayer(68, y, 30)),
      ellipse(68, 124, 30, 8),
      ...[160, 148, 136].map((y) => coinLayer(134, y, 30)),
      ellipse(134, 136, 30, 8),
      circle(128, 70, 26),
      circle(128, 70, 19),
      star(128, 70, 9, 4, 5),
    ],
    [
      { d: join(ellipse(68, 124, 30, 8), ellipse(134, 136, 30, 8)), c: '#F2C14E' },
      { d: circle(128, 70, 26), c: '#F2C14E' },
      { d: star(128, 70, 9, 4, 5), c: '#E3A33B' },
    ],
  ),
  biz(
    'bz-target',
    'Target and arrow',
    ['goal', 'aim', 'strategy'],
    [
      circle(90, 110, 60),
      circle(90, 110, 42),
      circle(90, 110, 24),
      circle(90, 110, 8),
      line(90, 110, 158, 42),
      line(150, 50, 150, 32),
      line(150, 50, 168, 50),
      line(158, 42, 158, 24),
      line(158, 42, 176, 42),
      'M40,40 Q48,34 56,40',
      'M34,54 Q42,48 50,54',
    ],
    [
      { d: circle(90, 110, 60), c: '#E4572E' },
      { d: circle(90, 110, 42), c: '#FFFFFF' },
      { d: circle(90, 110, 24), c: '#E4572E' },
      { d: circle(90, 110, 8), c: '#FFFFFF' },
    ],
  ),
  biz(
    'bz-pie-chart',
    'Pie chart',
    ['chart', 'report', 'data'],
    [
      wedge(80, 100, 58, -90, 40),
      wedge(80, 100, 58, 40, 160),
      wedge(75, 97, 58, 160, 270),
      rect(150, 62, 12, 12),
      line(168, 68, 182, 68),
      rect(150, 94, 12, 12),
      line(168, 100, 182, 100),
      rect(150, 126, 12, 12),
      line(168, 132, 182, 132),
    ],
    [
      { d: wedge(80, 100, 58, -90, 40), c: '#3D7DCA' },
      { d: wedge(80, 100, 58, 40, 160), c: '#F2C14E' },
      { d: wedge(75, 97, 58, 160, 270), c: '#E4572E' },
      { d: rect(150, 62, 12, 12), c: '#3D7DCA' },
      { d: rect(150, 94, 12, 12), c: '#F2C14E' },
      { d: rect(150, 126, 12, 12), c: '#E4572E' },
    ],
  ),
];
