import { circle, hlines, item, join, line, rays, scallop, star } from '../draw.mjs';

const shape = (id, name, tags, strokes, fills) => item('shapes', id, name, ['shapes', ...tags], strokes, fills);

const speech = 'M40,40 L160,40 Q176,40 176,56 L176,114 Q176,130 160,130 L86,130 L58,162 L64,130 L40,130 Q24,130 24,114 L24,56 Q24,40 40,40 Z';
const thought = scallop(104, 80, 56, 11, 18);
const trail = [circle(56, 152, 10), circle(38, 172, 6)];
const arrow = 'M30,150 Q40,72 118,62 L118,38 L172,80 L118,122 L118,98 Q66,102 30,150 Z';
const burst = star(100, 100, 82, 62, 16);
const band = 'M44,70 L156,70 L156,116 L44,116 Z';
const tails = ['M44,84 L18,84 L30,106 L18,128 L60,128 L60,116', 'M156,84 L182,84 L170,106 L182,128 L140,128 L140,116'];
const folds = ['M44,116 L60,128 L60,116 Z', 'M156,116 L140,128 L140,116 Z'];

export default [
  shape(
    'sh-speech',
    'Speech bubble',
    ['callout', 'talk', 'quote'],
    [speech, ...hlines(44, 68, 112, 18, 3), circle(166, 40, 11), circle(166, 40, 4), ...rays(30, 30, 4, 10, 3, 200)],
    [
      { d: speech, c: '#FFFFFF' },
      { d: circle(166, 40, 11), c: '#E4572E' },
    ],
  ),
  shape(
    'sh-thought',
    'Thought bubble',
    ['callout', 'think', 'idea'],
    [thought, ...trail, ...hlines(76, 70, 56, 18, 2), ...rays(170, 150, 3, 10, 4, 45)],
    [
      { d: thought, c: '#F4F7FB' },
      { d: join(trail), c: '#F4F7FB' },
    ],
  ),
  shape(
    'sh-curved-arrow',
    'Curved arrow',
    ['arrow', 'next', 'direction'],
    [circle(30, 156, 6), arrow, 'M48,128 Q62,92 104,82', line(20, 112, 34, 104), line(26, 126, 40, 118), line(36, 94, 48, 88), ...rays(170, 140, 3, 10, 4, 45)],
    [
      { d: arrow, c: '#E4572E' },
      { d: circle(30, 156, 6), c: '#2B2B2B' },
    ],
  ),
  shape(
    'sh-starburst',
    'Starburst',
    ['badge', 'sale', 'highlight'],
    [burst, circle(100, 100, 46), ...hlines(72, 88, 56, 14, 3), ...rays(100, 100, 50, 56, 8, 22.5)],
    [
      { d: burst, c: '#F2C14E' },
      { d: circle(100, 100, 46), c: '#FFFFFF' },
    ],
  ),
  shape(
    'sh-banner',
    'Ribbon banner',
    ['banner', 'title', 'ribbon'],
    [band, ...tails, ...folds, line(62, 88, 138, 88), line(72, 100, 128, 100), ...rays(100, 44, 4, 12, 3, -150)],
    [
      { d: join(tails.map((t) => `${t} Z`)), c: '#B8323C' },
      { d: band, c: '#E4572E' },
      { d: join(folds), c: '#7A1F28' },
    ],
  ),
];
