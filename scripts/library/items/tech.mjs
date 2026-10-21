import { arc, circle, item, join, line, poly, rect, rrect } from '../draw.mjs';

const tech = (id, name, tags, strokes, fills) => item('tech', id, name, ['tech', ...tags], strokes, fills);

const cloud = 'M50,118 A22,22 0 0,1 54,76 A30,30 0 0,1 108,60 A26,26 0 0,1 150,80 A20,20 0 0,1 148,118 Z';
const deviceBoxes = [rect(34, 152, 30, 20), rect(86, 152, 28, 22), rect(136, 152, 30, 20)];

/** Gear outline: `teeth` flat-topped teeth between radius r and ri. */
function gear(cx, cy, r, ri, teeth) {
  const pts = [];
  for (let i = 0; i < teeth * 4; i++) {
    const a = ((i * 90) / teeth - 90 + 360 / teeth / 8) * (Math.PI / 180);
    const rr = i % 4 < 2 ? r : ri;
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  return poly(pts, true);
}

export default [
  tech(
    'te-laptop',
    'Laptop',
    ['computer', 'work', 'online'],
    [
      rrect(44, 44, 112, 78, 6),
      rect(52, 52, 96, 62),
      'M44,122 L156,122 L172,146 L28,146 Z',
      rect(84, 132, 32, 8),
      line(64, 100, 64, 86),
      line(76, 100, 76, 76),
      line(88, 100, 88, 92),
      'M100,96 L114,80 L126,88 L138,68',
    ],
    [
      { d: rrect(44, 44, 112, 78, 6), c: '#4A5568' },
      { d: rect(52, 52, 96, 62), c: '#DCEBFA' },
      { d: 'M44,122 L156,122 L172,146 L28,146 Z', c: '#A0AEC0' },
    ],
  ),
  tech(
    'te-smartphone',
    'Smartphone',
    ['mobile', 'app', 'phone'],
    [
      rrect(64, 24, 72, 152, 12),
      rect(72, 40, 56, 116),
      line(92, 32, 108, 32),
      circle(100, 166, 5),
      rrect(80, 50, 16, 16, 4),
      rrect(104, 50, 16, 16, 4),
      rrect(80, 74, 16, 16, 4),
      rrect(104, 74, 16, 16, 4),
      arc(146, 38, 10, -60, 30),
      arc(146, 38, 18, -60, 30),
    ],
    [
      { d: rrect(64, 24, 72, 152, 12), c: '#2B2B2B' },
      { d: rect(72, 40, 56, 116), c: '#BFE3F5' },
      { d: join(rrect(80, 50, 16, 16, 4), rrect(104, 74, 16, 16, 4)), c: '#E4572E' },
      { d: join(rrect(104, 50, 16, 16, 4), rrect(80, 74, 16, 16, 4)), c: '#7BB662' },
    ],
  ),
  tech(
    'te-cloud',
    'Cloud storage',
    ['cloud', 'upload', 'data'],
    [cloud, line(100, 110, 100, 80), poly([[88, 92], [100, 78], [112, 92]]), line(64, 118, 50, 152), line(100, 118, 100, 152), line(136, 118, 150, 152), ...deviceBoxes],
    [
      { d: cloud, c: '#DCEBFA' },
      { d: join(deviceBoxes), c: '#A0AEC0' },
    ],
  ),
  tech(
    'te-gears',
    'Gears',
    ['settings', 'process', 'engineering'],
    [gear(84, 114, 58, 46, 10), circle(84, 114, 16), circle(84, 114, 32), gear(150, 50, 26, 19, 8), circle(150, 50, 7), arc(150, 50, 34, 120, 170), arc(84, 114, 66, -40, 0), arc(84, 114, 66, 140, 180)],
    [
      { d: gear(84, 114, 58, 46, 10), c: '#A0AEC0' },
      { d: gear(150, 50, 26, 19, 8), c: '#F2C14E' },
      { d: circle(84, 114, 16), c: '#FFFFFF' },
      { d: circle(150, 50, 7), c: '#FFFFFF' },
    ],
  ),
  tech(
    'te-robot',
    'Robot',
    ['ai', 'automation', 'bot'],
    [
      line(100, 44, 100, 28),
      circle(100, 23, 6),
      rrect(56, 44, 88, 70, 14),
      circle(82, 74, 10),
      circle(118, 74, 10),
      rect(80, 94, 40, 10),
      line(90, 94, 90, 104),
      line(100, 94, 100, 104),
      line(110, 94, 110, 104),
      rect(46, 64, 10, 24),
      rect(144, 64, 10, 24),
      rect(92, 114, 16, 10),
      rrect(64, 124, 72, 52, 10),
      circle(100, 150, 10),
    ],
    [
      { d: rrect(56, 44, 88, 70, 14), c: '#B8C4D6' },
      { d: join(circle(82, 74, 10), circle(118, 74, 10)), c: '#7EC8E3' },
      { d: rrect(64, 124, 72, 52, 10), c: '#B8C4D6' },
      { d: circle(100, 23, 6), c: '#E4572E' },
      { d: circle(100, 150, 10), c: '#F2C14E' },
    ],
  ),
];
