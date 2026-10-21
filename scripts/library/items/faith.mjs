import { circle, crescent, item, join, line, poly, rays, rect, star } from '../draw.mjs';

/**
 * Faith: buildings and objects only. No people or holy figures, and no Arabic or scripture
 * text (blank lines stand in for writing).
 */
const faith = (id, name, tags, strokes, fills) => item('faith', id, name, ['faith', ...tags], strokes, fills);

const dome = 'M60,96 Q60,54 100,44 Q140,54 140,96 Z';
const minaret = (x) => [rect(x, 66, 16, 110), poly([[x - 2, 66], [x + 8, 40], [x + 18, 66]], true), line(x - 3, 92, x + 19, 92)];
const arch = (x, y, w, h) => `M${x},${y + h} L${x},${y + w / 2} Q${x + w / 2},${y - w / 3} ${x + w},${y + w / 2} L${x + w},${y + h}`;
const beads = Array.from({ length: 18 }, (_, i) => {
  const a = (-90 + (i * 360) / 19) * (Math.PI / 180);
  return circle(100 + 54 * Math.cos(a), 84 + 50 * Math.sin(a), 6);
});

export default [
  faith(
    'fh-mosque',
    'Mosque',
    ['mosque', 'islam', 'building'],
    [
      dome,
      line(100, 44, 100, 32),
      crescent(100, 24, 7),
      rect(46, 96, 108, 80),
      arch(88, 140, 24, 36),
      arch(58, 112, 16, 24),
      arch(126, 112, 16, 24),
      ...minaret(24),
      ...minaret(160),
    ],
    [
      { d: dome, c: '#2E8B78' },
      { d: rect(46, 96, 108, 80), c: '#F4E9D8' },
      { d: join(rect(24, 66, 16, 110), rect(160, 66, 16, 110)), c: '#F4E9D8' },
      { d: join(poly([[22, 66], [32, 40], [42, 66]], true), poly([[158, 66], [168, 40], [178, 66]], true)), c: '#2E8B78' },
      { d: `${arch(88, 140, 24, 36)} Z`, c: '#7A4E2D' },
    ],
  ),
  faith(
    'fh-prayer-mat',
    'Prayer mat',
    ['prayer', 'islam', 'mat'],
    [
      rect(50, 26, 100, 148),
      rect(60, 36, 80, 128),
      arch(76, 70, 48, 54),
      poly([[100, 136], [112, 148], [100, 160], [88, 148]], true),
      line(70, 46, 130, 46),
      ...[58, 74, 90, 110, 126, 142].map((x) => line(x, 26, x, 18)),
      ...[58, 74, 90, 110, 126, 142].map((x) => line(x, 174, x, 182)),
    ],
    [
      { d: rect(50, 26, 100, 148), c: '#8E2C3A' },
      { d: rect(60, 36, 80, 128), c: '#C7A15A' },
      { d: `${arch(76, 70, 48, 54)} Z`, c: '#2E5E4E' },
      { d: poly([[100, 136], [112, 148], [100, 160], [88, 148]], true), c: '#8E2C3A' },
    ],
  ),
  faith(
    'fh-crescent-star',
    'Crescent and star',
    ['moon', 'ramadan', 'eid', 'night'],
    [crescent(90, 100, 60, 1.3), star(148, 72, 16, 7, 5), star(156, 132, 10, 4.5, 5), star(44, 168, 8, 3.5, 5), ...rays(150, 172, 3, 9, 4), ...rays(44, 40, 3, 10, 4, 45)],
    [
      { d: crescent(90, 100, 60, 1.3), c: '#F2C14E' },
      { d: join(star(148, 72, 16, 7, 5), star(156, 132, 10, 4.5, 5), star(44, 168, 8, 3.5, 5)), c: '#F2C14E' },
    ],
  ),
  faith(
    'fh-lantern',
    'Lantern',
    ['ramadan', 'eid', 'light'],
    [
      circle(100, 26, 6),
      line(100, 32, 100, 42),
      'M74,58 Q100,34 126,58 Z',
      poly([[72, 58], [128, 58], [140, 108], [128, 158], [72, 158], [60, 108]], true),
      line(86, 58, 86, 158),
      line(114, 58, 114, 158),
      'M80,160 L120,160 L112,176 L88,176 Z',
      ...rays(100, 108, 52, 62, 4, 45),
    ],
    [
      { d: poly([[72, 58], [128, 58], [140, 108], [128, 158], [72, 158], [60, 108]], true), c: '#FFE9A8' },
      { d: 'M74,58 Q100,34 126,58 Z', c: '#B07D2B' },
      { d: 'M80,160 L120,160 L112,176 L88,176 Z', c: '#B07D2B' },
    ],
  ),
  faith(
    'fh-prayer-beads',
    'Prayer beads',
    ['prayer', 'tasbih', 'dhikr'],
    [...beads, circle(100, 140, 8), line(100, 148, 100, 160), poly([[100, 160], [110, 182], [90, 182]], true)],
    [
      { d: join(beads), c: '#7A4E2D' },
      { d: circle(100, 140, 8), c: '#2E8B78' },
      { d: poly([[100, 160], [110, 182], [90, 182]], true), c: '#2E8B78' },
    ],
  ),
];
