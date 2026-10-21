import { circle, item, join, line, poly, rect, rrect } from '../draw.mjs';

const transport = (id, name, tags, strokes, fills) => item('transport', id, name, ['transport', ...tags], strokes, fills);
const steam = (x) => `M${x},74 Q${x - 8},62 ${x},52 Q${x + 8},42 ${x},30`;

export default [
  // 1. Auto Rickshaw
  transport(
    'tr-rickshaw',
    'Auto Rickshaw',
    ['rickshaw', 'tuk tuk', 'city', 'transport', 'taxi'],
    [
      'M34,88 Q36,48 88,44 L154,44 Q164,44 164,56 L164,88 Z',
      'M28,88 L170,88 L172,132 L26,132 Z',
      line(44, 88, 52, 54),
      rect(106, 54, 46, 32),
      line(114, 108, 160, 108),
      circle(48, 140, 16),
      circle(48, 140, 5),
      circle(146, 140, 16),
      circle(146, 140, 5),
      circle(28, 104, 5),
      line(20, 158, 180, 158),
    ],
    [
      { d: 'M34,88 Q36,48 88,44 L154,44 Q164,44 164,56 L164,88 Z', c: '#16A34A' },
      { d: 'M28,88 L170,88 L172,132 L26,132 Z', c: '#FACC15' },
      { d: rect(106, 54, 46, 32), c: '#1E293B' },
      { d: join(circle(48, 140, 16), circle(146, 140, 16)), c: '#27272A' },
      { d: join(circle(48, 140, 5), circle(146, 140, 5)), c: '#E4E4E7' },
    ]
  ),

  // 2. City Bicycle
  transport(
    'tr-bicycle',
    'City Bicycle',
    ['bicycle', 'bike', 'cycling', 'commute', 'fitness'],
    [
      circle(52, 132, 28),
      circle(148, 132, 28),
      circle(52, 132, 6),
      circle(148, 132, 6),
      'M52,132 L94,132 L128,86 L78,90 Z',
      line(78, 90, 94, 132),
      line(128, 86, 148, 132),
      'M70,82 L90,82 L88,88 L72,88 Z',
      line(78, 90, 80, 84),
      'M124,78 Q132,70 144,74',
      line(128, 86, 126, 78),
      circle(94, 132, 7),
      rect(136, 76, 22, 16),
      line(136, 84, 158, 84),
      line(20, 162, 180, 162),
    ],
    [
      { d: join(circle(52, 132, 28), circle(148, 132, 28)), c: '#EEF2F6' },
      { d: 'M70,82 L90,82 L88,88 L72,88 Z', c: '#1E293B' },
      { d: rect(136, 76, 22, 16), c: '#D97706' },
      { d: 'M52,132 L94,132 L128,86 L78,90 Z', c: '#3B82F6' },
    ]
  ),

  // 3. Delivery Scooter
  transport(
    'tr-scooter',
    'Delivery Scooter',
    ['scooter', 'delivery', 'moped', 'courier', 'food delivery'],
    [
      poly([[128, 80], [156, 96], [146, 134], [124, 134]], true),
      rrect(36, 76, 44, 44, 4),
      rrect(80, 106, 42, 12, 4),
      'M80,118 L124,134 L96,134 Z',
      circle(54, 140, 16),
      circle(54, 140, 5),
      circle(146, 140, 16),
      circle(146, 140, 5),
      circle(154, 102, 5),
      'M130,76 L138,68 L146,72',
      line(36, 98, 80, 98),
      line(20, 158, 180, 158),
    ],
    [
      { d: poly([[128, 80], [156, 96], [146, 134], [124, 134]], true), c: '#EF4444' },
      { d: rrect(36, 76, 44, 44, 4), c: '#F59E0B' },
      { d: rrect(80, 106, 42, 12, 4), c: '#18181B' },
      { d: join(circle(54, 140, 16), circle(146, 140, 16)), c: '#27272A' },
      { d: join(circle(54, 140, 5), circle(146, 140, 5)), c: '#E2E8F0' },
    ]
  ),

  // 4. City Transit Bus
  transport(
    'tr-bus',
    'City Transit Bus',
    ['bus', 'transit', 'public transport', 'city', 'commute'],
    [
      rrect(24, 52, 152, 98, 12),
      rect(36, 64, 22, 26),
      rect(64, 64, 22, 26),
      rect(92, 64, 22, 26),
      rect(120, 64, 22, 26),
      rect(150, 64, 18, 56),
      line(24, 104, 150, 104),
      circle(166, 132, 5),
      circle(58, 148, 15),
      circle(58, 148, 5),
      circle(140, 148, 15),
      circle(140, 148, 5),
      line(174, 72, 180, 68),
      line(20, 165, 180, 165),
    ],
    [
      { d: rrect(24, 52, 152, 98, 12), c: '#3B82F6' },
      { d: join(rect(36, 64, 22, 26), rect(64, 64, 22, 26), rect(92, 64, 22, 26), rect(120, 64, 22, 26), rect(150, 64, 18, 56)), c: '#BAE6FD' },
      { d: join(circle(58, 148, 15), circle(140, 148, 15)), c: '#1F2937' },
      { d: join(circle(58, 148, 5), circle(140, 148, 5)), c: '#E2E8F0' },
      { d: circle(166, 132, 5), c: '#FEF08A' },
    ]
  ),

  // 5. Passenger Car
  transport(
    'tr-car',
    'Passenger Sedan Car',
    ['car', 'sedan', 'automobile', 'drive', 'road'],
    [
      'M24,126 L28,104 L60,98 L82,74 L132,74 L152,98 L172,106 L176,128 Z',
      poly([[68, 98], [84, 80], [102, 80], [102, 98]], true),
      poly([[108, 98], [108, 80], [126, 80], [142, 98]], true),
      line(105, 98, 105, 126),
      circle(58, 130, 16),
      circle(58, 130, 6),
      circle(142, 130, 16),
      circle(142, 130, 6),
      circle(168, 116, 4),
      line(24, 122, 32, 122),
      line(20, 148, 180, 148),
    ],
    [
      { d: 'M24,126 L28,104 L60,98 L82,74 L132,74 L152,98 L172,106 L176,128 Z', c: '#E11D48' },
      { d: join(poly([[68, 98], [84, 80], [102, 80], [102, 98]], true), poly([[108, 98], [108, 80], [126, 80], [142, 98]], true)), c: '#E0F2FE' },
      { d: join(circle(58, 130, 16), circle(142, 130, 16)), c: '#1E293B' },
      { d: join(circle(58, 130, 6), circle(142, 130, 6)), c: '#CBD5E1' },
    ]
  ),

  // 6. Airplane
  transport(
    'tr-airplane',
    'Commercial Jet Airliner',
    ['airplane', 'plane', 'jet', 'flight', 'travel', 'airline'],
    [
      'M26,98 Q26,84 48,84 L152,84 Q176,88 180,98 Q176,108 152,112 L48,112 Q26,112 26,98 Z',
      poly([[92, 84], [118, 36], [134, 36], [122, 84]], true),
      poly([[92, 112], [118, 164], [134, 164], [122, 112]], true),
      poly([[42, 84], [30, 52], [46, 52], [64, 84]], true),
      circle(72, 98, 3),
      circle(88, 98, 3),
      circle(104, 98, 3),
      circle(120, 98, 3),
      circle(136, 98, 3),
      circle(152, 98, 3),
      'M164,92 Q172,94 174,98',
      rrect(112, 126, 16, 8, 3),
      rrect(112, 64, 16, 8, 3),
    ],
    [
      { d: 'M26,98 Q26,84 48,84 L152,84 Q176,88 180,98 Q176,108 152,112 L48,112 Q26,112 26,98 Z', c: '#F8FAFC' },
      { d: join(poly([[92, 84], [118, 36], [134, 36], [122, 84]], true), poly([[92, 112], [118, 164], [134, 164], [122, 112]], true)), c: '#2563EB' },
      { d: poly([[42, 84], [30, 52], [46, 52], [64, 84]], true), c: '#DC2626' },
      { d: join(rrect(112, 126, 16, 8, 3), rrect(112, 64, 16, 8, 3)), c: '#64748B' },
    ]
  ),

  // 7. Cargo Truck
  transport(
    'tr-truck',
    'Cargo Semi-Trailer Truck',
    ['truck', 'cargo', 'shipping', 'freight', 'transport', 'logistics'],
    [
      rect(24, 62, 88, 72),
      'M112,78 L142,78 L160,102 L164,134 L112,134 Z',
      poly([[120, 84], [140, 84], [152, 102], [120, 102]], true),
      rect(114, 52, 5, 26),
      circle(44, 138, 14),
      circle(44, 138, 5),
      circle(76, 138, 14),
      circle(76, 138, 5),
      circle(146, 138, 14),
      circle(146, 138, 5),
      line(42, 62, 42, 134),
      line(60, 62, 60, 134),
      line(78, 62, 78, 134),
      line(96, 62, 96, 134),
      circle(162, 120, 4),
      line(20, 154, 180, 154),
    ],
    [
      { d: rect(24, 62, 88, 72), c: '#0284C7' },
      { d: 'M112,78 L142,78 L160,102 L164,134 L112,134 Z', c: '#EA580C' },
      { d: poly([[120, 84], [140, 84], [152, 102], [120, 102]], true), c: '#E0F2FE' },
      { d: join(circle(44, 138, 14), circle(76, 138, 14), circle(146, 138, 14)), c: '#1F2937' },
      { d: join(circle(44, 138, 5), circle(76, 138, 5), circle(146, 138, 5)), c: '#E2E8F0' },
    ]
  ),

  // 8. Metro Train
  transport(
    'tr-train',
    'Metro Passenger Train',
    ['train', 'metro', 'subway', 'transit', 'rail', 'express'],
    [
      'M34,62 L128,62 Q168,70 172,110 L172,134 L34,134 Z',
      poly([[132, 70], [156, 76], [162, 104], [132, 104]], true),
      rect(44, 76, 22, 24),
      rect(74, 76, 22, 24),
      rect(104, 76, 22, 24),
      poly([[55, 62], [70, 40], [85, 40], [75, 62]], false),
      circle(154, 122, 5),
      circle(166, 122, 5),
      line(34, 114, 172, 114),
      line(20, 146, 180, 146),
      line(20, 152, 180, 152),
      line(40, 146, 36, 152),
      line(80, 146, 76, 152),
      line(120, 146, 116, 152),
      line(160, 146, 156, 152),
    ],
    [
      { d: 'M34,62 L128,62 Q168,70 172,110 L172,134 L34,134 Z', c: '#F1F5F9' },
      { d: poly([[132, 70], [156, 76], [162, 104], [132, 104]], true), c: '#0284C7' },
      { d: join(rect(44, 76, 22, 24), rect(74, 76, 22, 24), rect(104, 76, 22, 24)), c: '#0284C7' },
      { d: join(circle(154, 122, 5), circle(166, 122, 5)), c: '#FBBF24' },
      { d: 'M34,124 L172,124 L172,134 L34,134 Z', c: '#E11D48' },
    ]
  ),

  // 9. Yellow Taxi Cab
  transport(
    'tr-taxi',
    'Yellow City Taxi',
    ['taxi', 'cab', 'city', 'yellow cab', 'ride', 'travel'],
    [
      'M24,124 L30,102 L62,96 L84,72 L132,72 L154,96 L174,104 L176,126 Z',
      poly([[70, 96], [86, 78], [104, 78], [104, 96]], true),
      poly([[110, 96], [110, 78], [128, 78], [144, 96]], true),
      rrect(96, 58, 26, 13, 3),
      rect(34, 110, 134, 6),
      line(107, 96, 107, 124),
      circle(60, 128, 15),
      circle(60, 128, 5),
      circle(142, 128, 15),
      circle(142, 128, 5),
      circle(168, 114, 4),
      line(20, 146, 180, 146),
    ],
    [
      { d: 'M24,124 L30,102 L62,96 L84,72 L132,72 L154,96 L174,104 L176,126 Z', c: '#FACC15' },
      { d: join(poly([[70, 96], [86, 78], [104, 78], [104, 96]], true), poly([[110, 96], [110, 78], [128, 78], [144, 96]], true)), c: '#BAE6FD' },
      { d: rrect(96, 58, 26, 13, 3), c: '#FEF08A' },
      { d: rect(34, 110, 134, 6), c: '#18181B' },
      { d: join(circle(60, 128, 15), circle(142, 128, 15)), c: '#1F2937' },
    ]
  ),

  // 10. Passenger Ferry
  transport(
    'tr-ferry',
    'Passenger Ferry Boat',
    ['ferry', 'boat', 'ship', 'cruise', 'sea', 'water'],
    [
      poly([[26, 118], [166, 118], [152, 152], [42, 152]], true),
      rect(48, 88, 96, 30),
      rect(56, 94, 18, 16),
      rect(80, 94, 18, 16),
      rect(104, 94, 18, 16),
      rrect(72, 68, 36, 20, 3),
      poly([[116, 88], [118, 64], [130, 64], [128, 88]], true),
      steam(124),
      'M20,154 Q45,148 70,154 Q95,160 120,154 Q145,148 170,154',
      'M25,164 Q50,158 75,164 Q100,170 125,164 Q150,158 175,164',
      line(48, 88, 48, 118),
      line(144, 88, 144, 118),
    ],
    [
      { d: poly([[26, 118], [166, 118], [152, 152], [42, 152]], true), c: '#DC2626' },
      { d: rect(48, 88, 96, 30), c: '#F8FAFC' },
      { d: join(rect(56, 94, 18, 16), rect(80, 94, 18, 16), rect(104, 94, 18, 16)), c: '#38BDF8' },
      { d: poly([[116, 88], [118, 64], [130, 64], [128, 88]], true), c: '#F59E0B' },
      { d: rrect(72, 68, 36, 20, 3), c: '#F1F5F9' },
    ]
  ),
];
