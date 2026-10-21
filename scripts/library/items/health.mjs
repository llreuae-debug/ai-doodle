import { arc, circle, item, line, poly, rays, rrect } from '../draw.mjs';

const health = (id, name, tags, strokes, fills) => item('health', id, name, ['health', ...tags], strokes, fills);

const heart = 'M100,170 C40,130 20,100 30,70 C40,42 80,38 100,66 C120,38 160,42 170,70 C180,100 160,130 100,170 Z';
const smallHeart = 'M160,50 C150,44 146,38 148,33 C150,28 157,28 160,34 C163,28 170,28 172,33 C174,38 170,44 160,50 Z';
const cross = poly([[90, 82], [110, 82], [110, 100], [128, 100], [128, 120], [110, 120], [110, 138], [90, 138], [90, 120], [72, 120], [72, 100], [90, 100]], true);
const tooth = 'M60,50 Q60,30 80,32 Q100,40 120,32 Q140,30 140,50 Q140,90 128,118 Q122,146 112,146 Q104,146 100,118 Q96,146 88,146 Q78,146 72,118 Q60,90 60,50 Z';

export default [
  health(
    'he-heart-pulse',
    'Heartbeat',
    ['heart', 'cardio', 'care'],
    [heart, 'M36,104 L68,104 L78,84 L92,130 L104,74 L114,114 L122,104 L164,104', arc(62, 76, 18, 200, 260), smallHeart, ...rays(30, 32, 3, 10, 4)],
    [
      { d: heart, c: '#E4572E' },
      { d: smallHeart, c: '#F7A3A3' },
    ],
  ),
  health(
    'he-pills',
    'Medicine',
    ['pills', 'medicine', 'pharmacy'],
    [
      'M100,50 L50,50 A20,20 0 0,0 50,90 L100,90 Z',
      'M100,50 L150,50 A20,20 0 0,1 150,90 L100,90',
      line(52, 60, 80, 60),
      circle(64, 140, 26),
      line(46, 158, 82, 122),
      circle(136, 140, 26),
      line(118, 122, 154, 158),
      ...rays(170, 104, 3, 9, 4, 45),
    ],
    [
      { d: 'M100,50 L50,50 A20,20 0 0,0 50,90 L100,90 Z', c: '#E4572E' },
      { d: 'M100,50 L150,50 A20,20 0 0,1 150,90 L100,90 Z', c: '#FFFFFF' },
      { d: circle(64, 140, 26), c: '#F4F1E8' },
      { d: circle(136, 140, 26), c: '#DCEBFA' },
    ],
  ),
  health(
    'he-first-aid',
    'First aid kit',
    ['first aid', 'emergency', 'care'],
    [rrect(28, 60, 144, 102, 12), 'M78,60 L78,44 L122,44 L122,60', 'M86,60 L86,52 L114,52 L114,60', cross, line(40, 76, 60, 76), line(140, 76, 160, 76), line(40, 146, 60, 146), line(140, 146, 160, 146)],
    [
      { d: rrect(28, 60, 144, 102, 12), c: '#F4F1E8' },
      { d: cross, c: '#E4572E' },
    ],
  ),
  health(
    'he-stethoscope',
    'Stethoscope',
    ['doctor', 'checkup', 'clinic'],
    [
      circle(70, 26, 4),
      circle(130, 26, 4),
      'M70,30 Q60,70 100,100',
      'M130,30 Q140,70 100,100',
      'M100,100 Q100,142 128,150 Q158,156 158,136',
      circle(158, 122, 14),
      circle(158, 122, 7),
      circle(100, 100, 3),
      'M70,30 Q100,20 130,30',
      'M20,172 L60,172 L68,158 L78,182 L88,164 L94,172 L130,172',
    ],
    [
      { d: circle(158, 122, 14), c: '#A0AEC0' },
      { d: circle(70, 26, 4), c: '#2B2B2B' },
      { d: circle(130, 26, 4), c: '#2B2B2B' },
    ],
  ),
  health(
    'he-tooth',
    'Healthy tooth',
    ['dental', 'teeth', 'hygiene'],
    [
      tooth,
      arc(84, 60, 14, 190, 260),
      ...rays(152, 42, 4, 12, 4),
      rrect(38, 164, 92, 10, 5),
      rrect(130, 158, 32, 12, 3),
      line(136, 158, 136, 150),
      line(146, 158, 146, 150),
      line(156, 158, 156, 150),
    ],
    [
      { d: tooth, c: '#FFFFFF' },
      { d: rrect(38, 164, 92, 10, 5), c: '#3D7DCA' },
      { d: rrect(130, 158, 32, 12, 3), c: '#DCEBFA' },
    ],
  ),
];
