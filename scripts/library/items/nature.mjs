import { arc, blob, circle, item, join, line, poly, rays, scallop } from '../draw.mjs';

const nature = (id, name, tags, strokes, fills) => item('nature', id, name, ['nature', ...tags], strokes, fills);

const canopy = blob([[100, 22], [150, 36], [164, 84], [140, 122], [100, 128], [58, 122], [36, 84], [52, 36]]);
const trunk = 'M90,178 L94,120 L106,120 L110,178 Z';
const fruit = [circle(76, 70, 6), circle(122, 58, 6), circle(130, 100, 6)];
const rainCloud = 'M44,92 A22,22 0 0,1 50,52 A30,30 0 0,1 104,36 A26,26 0 0,1 146,56 A20,20 0 0,1 150,92 Z';
const drop = (x, y) => `M${x},${y} Q${x - 6},${y + 12} ${x},${y + 16} Q${x + 6},${y + 12} ${x},${y} Z`;
const drops = [drop(56, 110), drop(80, 126), drop(64, 150), drop(128, 112), drop(150, 132), drop(134, 156)];
const bolt = poly([[104, 100], [90, 134], [104, 134], [94, 168], [122, 124], [106, 124], [116, 100]], true);
const petals = scallop(100, 70, 24, 6, 13);
const leaves = ['M98,148 Q72,138 66,118 Q90,120 98,148 Z', 'M102,134 Q126,124 134,104 Q110,108 102,134 Z'];
const peakA = poly([[18, 170], [74, 70], [130, 170]], true);
const peakB = poly([[82, 170], [134, 92], [182, 170]], true);
const snow = [poly([[61, 93], [74, 70], [87, 93], [80, 88], [74, 96], [68, 88]], true), poly([[122, 110], [134, 92], [146, 110], [140, 106], [134, 113], [128, 106]], true)];

export default [
  nature(
    'na-tree',
    'Tree',
    ['tree', 'environment', 'growth'],
    [canopy, trunk, line(100, 140, 86, 126), line(102, 150, 116, 134), ...fruit, line(40, 178, 160, 178), 'M60,178 Q64,170 68,178'],
    [
      { d: canopy, c: '#7BB662' },
      { d: trunk, c: '#8B5A2B' },
      { d: join(fruit), c: '#E4572E' },
    ],
  ),
  nature(
    'na-sun',
    'Sun',
    ['sun', 'summer', 'weather'],
    [circle(100, 100, 40), ...rays(100, 100, 52, 78, 12), circle(86, 94, 3), circle(114, 94, 3), 'M84,112 Q100,126 116,112'],
    [
      { d: circle(100, 100, 40), c: '#F2C14E' },
      { d: circle(100, 104, 28), c: '#F7D774' },
    ],
  ),
  nature(
    'na-storm',
    'Rain cloud',
    ['rain', 'weather', 'storm'],
    [rainCloud, ...drops, bolt],
    [
      { d: rainCloud, c: '#B8C4D6' },
      { d: join(drops), c: '#7EC8E3' },
      { d: bolt, c: '#F2C14E' },
    ],
  ),
  nature(
    'na-flower',
    'Flower',
    ['flower', 'spring', 'garden'],
    [petals, circle(100, 70, 14), 'M100,96 Q94,136 100,178', ...leaves, line(70, 178, 130, 178), arc(100, 70, 8, 200, 300), 'M150,40 Q156,34 162,40'],
    [
      { d: petals, c: '#F2A6C1' },
      { d: circle(100, 70, 14), c: '#F2C14E' },
      { d: join(leaves), c: '#7BB662' },
    ],
  ),
  nature(
    'na-mountains',
    'Mountains',
    ['mountains', 'travel', 'landscape'],
    [circle(150, 50, 18), peakA, peakB, ...snow, 'M40,48 Q46,42 52,48 Q58,42 64,48', 'M80,34 Q85,29 90,34 Q95,29 100,34', line(18, 170, 182, 170)],
    [
      { d: circle(150, 50, 18), c: '#F2C14E' },
      { d: peakA, c: '#7A8FA6' },
      { d: peakB, c: '#5C6F86' },
      { d: join(snow), c: '#FFFFFF' },
    ],
  ),
];
