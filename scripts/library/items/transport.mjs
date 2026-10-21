import { circle, item, join, line, poly, rect, rrect } from '../draw.mjs';

const transport = (id, name, tags, strokes, fills) => item('transport', id, name, ['transport', ...tags], strokes, fills);

const carBody = 'M24,130 L28,106 L60,100 L80,76 L130,76 L150,100 L172,108 L176,130 Z';
const carWindows = [poly([[68, 100], [84, 82], [102, 82], [102, 100]], true), poly([[110, 100], [110, 82], [126, 82], [140, 100]], true)];
const wheels = (pts, r) => pts.map(([x, y]) => circle(x, y, r));
const busWindows = [0, 1, 2, 3].map((i) => rect(36 + i * 28, 64, 22, 26));
const planeBody = 'M28,100 Q28,88 48,88 L150,88 Q174,92 178,100 Q174,108 150,112 L48,112 Q28,112 28,100 Z';
const planeWings = [poly([[92, 88], [116, 40], [132, 40], [120, 88]], true), poly([[92, 112], [116, 160], [132, 160], [120, 112]], true)];
const planeTail = poly([[42, 88], [32, 60], [46, 60], [62, 88]], true);
const rickRoof = 'M34,96 Q36,54 88,50 L150,50 Q160,50 160,62 L160,96 Z';
const rickBody = 'M28,96 L172,96 L174,136 L26,136 Z';

export default [
  transport(
    'tr-car',
    'Car',
    ['car', 'drive', 'road'],
    [carBody, ...carWindows, line(106, 100, 106, 128), ...wheels([[60, 132], [140, 132]], 16), ...wheels([[60, 132], [140, 132]], 6), circle(166, 116, 4), line(24, 124, 34, 124), line(20, 150, 180, 150)],
    [
      { d: carBody, c: '#E4572E' },
      { d: join(carWindows), c: '#BFE3F5' },
      { d: join(wheels([[60, 132], [140, 132]], 16)), c: '#2B2B2B' },
      { d: join(wheels([[60, 132], [140, 132]], 6)), c: '#A0AEC0' },
    ],
  ),
  transport(
    'tr-bicycle',
    'Bicycle',
    ['bike', 'cycling', 'fitness'],
    [
      ...wheels([[54, 130], [146, 130]], 30),
      'M54,130 L94,130 L128,86 L78,90 Z',
      line(78, 90, 94, 130),
      line(128, 86, 146, 130),
      'M70,82 L90,82 L88,88 L72,88 Z',
      line(78, 90, 80, 84),
      'M124,78 Q132,70 144,74',
      line(128, 86, 126, 78),
      circle(94, 130, 6),
    ],
    [
      { d: join(wheels([[54, 130], [146, 130]], 30)), c: '#EEF2F6' },
      { d: 'M70,82 L90,82 L88,88 L72,88 Z', c: '#2B2B2B' },
    ],
  ),
  transport(
    'tr-bus',
    'Bus',
    ['bus', 'school bus', 'city'],
    [rrect(24, 48, 152, 102, 12), ...busWindows, rect(150, 64, 18, 56), line(24, 104, 150, 104), circle(166, 132, 5), ...wheels([[60, 150], [140, 150]], 14), line(176, 70, 182, 66)],
    [
      { d: rrect(24, 48, 152, 102, 12), c: '#F2C14E' },
      { d: join(busWindows, rect(150, 64, 18, 56)), c: '#BFE3F5' },
      { d: join(wheels([[60, 150], [140, 150]], 14)), c: '#2B2B2B' },
    ],
  ),
  transport(
    'tr-airplane',
    'Airplane',
    ['plane', 'travel', 'flight'],
    [planeBody, ...planeWings, planeTail, ...[70, 86, 102, 134, 150].map((x) => circle(x, 98, 3.5)), 'M162,92 Q170,94 172,100'],
    [
      { d: planeBody, c: '#F4F1E8' },
      { d: join(planeWings), c: '#3D7DCA' },
      { d: planeTail, c: '#E4572E' },
    ],
  ),
  transport(
    'tr-rickshaw',
    'Auto rickshaw',
    ['rickshaw', 'south asian', 'city'],
    [rickRoof, rickBody, line(44, 96, 52, 60), rect(104, 62, 44, 34), line(112, 112, 160, 112), ...wheels([[52, 140], [146, 140]], 16), ...wheels([[52, 140], [146, 140]], 5), circle(30, 110, 4), line(20, 158, 180, 158)],
    [
      { d: rickRoof, c: '#2E8B78' },
      { d: rickBody, c: '#F2C14E' },
      { d: join(wheels([[52, 140], [146, 140]], 16)), c: '#2B2B2B' },
      { d: rect(104, 62, 44, 34), c: '#1F1F1F' },
    ],
  ),
];
