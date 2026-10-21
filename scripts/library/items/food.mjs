import { arc, circle, ellipse, item, join, line, poly, rect, rrect } from '../draw.mjs';

const food = (id, name, tags, strokes, fills) => item('food', id, name, ['food', ...tags], strokes, fills);

const steam = (x) => `M${x},74 Q${x - 8},62 ${x},52 Q${x + 8},42 ${x},30`;
const glass = 'M64,80 L136,80 L126,162 L74,162 Z';
const tea = 'M67,98 L133,98 L126,162 L74,162 Z';

export default [
  // 1. Chai Cup
  food(
    'fo-chai',
    'Cup of Chai',
    ['tea', 'chai', 'karak', 'drink', 'hot'],
    [
      steam(84),
      steam(100),
      steam(116),
      glass,
      line(67, 98, 133, 98),
      ellipse(100, 80, 36, 6),
      line(80, 106, 84, 150),
      line(120, 106, 116, 150),
      ellipse(100, 168, 52, 9),
      ellipse(100, 168, 42, 6),
    ],
    [
      { d: ellipse(100, 168, 52, 9), c: '#F4E1C1' },
      { d: glass, c: '#EAF4FA' },
      { d: tea, c: '#C68B59' },
    ]
  ),

  // 2. Samosa
  food(
    'fo-samosa',
    'Crispy Samosa',
    ['samosa', 'snack', 'pastry', 'appetizer', 'fried'],
    [
      'M100,42 L162,148 Q100,160 38,148 Z',
      'M100,42 Q96,104 100,154',
      'M38,148 Q100,140 162,148',
      'M62,108 Q78,114 96,110',
      'M104,110 Q122,116 138,108',
      'M50,132 Q72,136 94,132',
      'M106,132 Q128,136 150,132',
      ellipse(152, 142, 16, 10),
      ellipse(152, 140, 12, 7),
      line(146, 138, 158, 138),
    ],
    [
      { d: 'M100,42 L162,148 Q100,160 38,148 Z', c: '#E89E3A' },
      { d: 'M100,42 Q96,104 100,154 Q132,152 162,148 L100,42 Z', c: '#D48624' },
      { d: ellipse(152, 142, 16, 10), c: '#3D7D32' },
      { d: ellipse(152, 140, 12, 7), c: '#52A445' },
    ]
  ),

  // 3. Biryani Handi
  food(
    'fo-biryani',
    'Biryani Handi Pot',
    ['biryani', 'rice', 'handi', 'curry', 'dinner'],
    [
      'M50,105 C48,162 152,162 150,105 L146,96 L54,96 Z',
      ellipse(100, 96, 46, 10),
      'M54,96 Q100,56 146,96 Z',
      line(76, 80, 84, 76),
      line(100, 72, 108, 68),
      line(120, 80, 128, 76),
      circle(88, 86, 4),
      circle(114, 84, 4),
      steam(88),
      steam(112),
      poly([[136, 92], [168, 54], [174, 58], [142, 96]], true),
      ellipse(100, 166, 44, 7),
    ],
    [
      { d: 'M50,105 C48,162 152,162 150,105 L146,96 L54,96 Z', c: '#B45309' },
      { d: ellipse(100, 96, 46, 10), c: '#78350F' },
      { d: 'M54,96 Q100,56 146,96 Z', c: '#F59E0B' },
      { d: join(circle(88, 86, 4), circle(114, 84, 4)), c: '#16A34A' },
      { d: poly([[136, 92], [168, 54], [174, 58], [142, 96]], true), c: '#D97706' },
    ]
  ),

  // 4. Tandoori Naan
  food(
    'fo-naan',
    'Tandoor Naan',
    ['naan', 'bread', 'roti', 'flatbread', 'tandoor'],
    [
      'M100,34 C146,44 166,112 148,162 C130,180 70,180 52,162 C34,112 54,44 100,34 Z',
      ellipse(100, 114, 26, 18),
      ellipse(82, 80, 10, 7),
      ellipse(120, 84, 9, 6),
      ellipse(78, 126, 8, 6),
      ellipse(122, 130, 9, 7),
      ellipse(102, 150, 8, 5),
      line(94, 104, 98, 110),
      line(106, 108, 112, 112),
      line(96, 120, 102, 124),
    ],
    [
      { d: 'M100,34 C146,44 166,112 148,162 C130,180 70,180 52,162 C34,112 54,44 100,34 Z', c: '#E9C487' },
      { d: ellipse(100, 114, 26, 18), c: '#FDE047' },
      { d: join(ellipse(82, 80, 10, 7), ellipse(120, 84, 9, 6), ellipse(78, 126, 8, 6), ellipse(122, 130, 9, 7), ellipse(102, 150, 8, 5)), c: '#78350F' },
    ]
  ),

  // 5. Fruit Bowl
  food(
    'fo-fruit-bowl',
    'Fresh Fruit Bowl',
    ['fruit', 'bowl', 'healthy', 'apple', 'banana', 'grapes'],
    [
      'M38,106 Q40,166 100,168 Q160,166 162,106 Z',
      ellipse(100, 106, 62, 14),
      circle(76, 92, 18),
      circle(124, 92, 18),
      'M62,80 Q100,68 142,94 Q100,82 62,80 Z',
      circle(94, 98, 7),
      circle(106, 98, 7),
      circle(100, 108, 7),
      line(124, 74, 128, 66),
      ellipse(100, 172, 42, 6),
    ],
    [
      { d: 'M38,106 Q40,166 100,168 Q160,166 162,106 Z', c: '#E2E8F0' },
      { d: circle(76, 92, 18), c: '#F97316' },
      { d: circle(124, 92, 18), c: '#EF4444' },
      { d: 'M62,80 Q100,68 142,94 Q100,82 62,80 Z', c: '#FBBF24' },
      { d: join(circle(94, 98, 7), circle(106, 98, 7), circle(100, 108, 7)), c: '#8B5CF6' },
    ]
  ),

  // 6. Burger
  food(
    'fo-burger',
    'Gourmet Cheeseburger',
    ['burger', 'cheeseburger', 'fast food', 'patty', 'meal'],
    [
      'M42,90 C42,44 158,44 158,90 Z',
      'M38,90 Q48,98 62,92 Q78,102 96,92 Q114,102 134,92 Q148,98 162,90',
      rrect(44, 98, 112, 14, 4),
      'M40,114 L160,114 L146,128 L118,118 L88,132 L40,114 Z',
      rrect(40, 126, 120, 18, 5),
      rrect(44, 144, 112, 22, 8),
      ellipse(72, 64, 4, 2),
      ellipse(100, 58, 4, 2),
      ellipse(128, 64, 4, 2),
      ellipse(86, 76, 4, 2),
      ellipse(114, 76, 4, 2),
    ],
    [
      { d: 'M42,90 C42,44 158,44 158,90 Z', c: '#E29948' },
      { d: 'M40,90 Q48,98 62,92 Q78,102 96,92 Q114,102 134,92 Q148,98 162,90 L160,98 L40,98 Z', c: '#22C55E' },
      { d: rrect(44, 98, 112, 14, 4), c: '#EF4444' },
      { d: 'M40,114 L160,114 L146,128 L118,118 L88,132 L40,114 Z', c: '#FACC15' },
      { d: rrect(40, 126, 120, 18, 5), c: '#5A3521' },
      { d: rrect(44, 144, 112, 22, 8), c: '#E29948' },
    ]
  ),

  // 7. Chef Skillet
  food(
    'fo-skillet',
    'Chef Skillet Pan',
    ['skillet', 'pan', 'cooking', 'chef', 'fry'],
    [
      ellipse(90, 118, 52, 28),
      'M38,118 Q40,152 90,154 Q140,152 142,118 Z',
      rrect(138, 112, 42, 12, 4),
      circle(172, 118, 3),
      ellipse(90, 118, 28, 16),
      circle(90, 118, 10),
      circle(68, 114, 4),
      circle(112, 120, 4),
      'M72,74 Q80,60 76,44',
      'M94,70 Q104,54 98,40',
      'M114,74 Q124,62 118,48',
    ],
    [
      { d: 'M38,118 Q40,152 90,154 Q140,152 142,118 Z', c: '#1E293B' },
      { d: ellipse(90, 118, 52, 28), c: '#334155' },
      { d: ellipse(90, 118, 28, 16), c: '#F8FAFC' },
      { d: circle(90, 118, 10), c: '#F59E0B' },
      { d: join(circle(68, 114, 4), circle(112, 120, 4)), c: '#16A34A' },
      { d: rrect(138, 112, 42, 12, 4), c: '#0F172A' },
    ]
  ),

  // 8. Coffee Mug
  food(
    'fo-coffee',
    'Coffee Mug & Latte Art',
    ['coffee', 'latte', 'mug', 'cappuccino', 'cafe'],
    [
      'M56,88 L64,154 Q100,166 136,154 L144,88 Z',
      ellipse(100, 88, 44, 12),
      ellipse(100, 90, 39, 9),
      'M100,94 C94,88 88,90 92,96 L100,102 L108,96 C112,90 106,88 100,94 Z',
      'M142,100 Q172,102 168,126 Q164,146 138,142',
      'M140,108 Q162,109 158,126 Q155,138 137,136',
      steam(84),
      steam(100),
      steam(116),
      ellipse(100, 168, 54, 8),
    ],
    [
      { d: ellipse(100, 168, 54, 8), c: '#E2E8F0' },
      { d: 'M56,88 L64,154 Q100,166 136,154 L144,88 Z', c: '#3B82F6' },
      { d: ellipse(100, 90, 39, 9), c: '#6F4E37' },
      { d: 'M100,94 C94,88 88,90 92,96 L100,102 L108,96 C112,90 106,88 100,94 Z', c: '#FFFBEB' },
    ]
  ),

  // 9. Pizza Slice
  food(
    'fo-pizza',
    'Pizza Slice',
    ['pizza', 'fast food', 'slice', 'party', 'snack'],
    [
      'M40,52 Q100,32 160,52 Q164,62 156,68 Q100,50 44,68 Q36,62 40,52 Z',
      'M40,52 Q100,32 160,52 L102,172 Z',
      circle(84, 84, 10),
      circle(116, 92, 10),
      circle(96, 120, 9),
      circle(104, 146, 6),
      circle(68, 98, 4),
      circle(126, 118, 4),
      'M86,138 Q88,152 92,148',
    ],
    [
      { d: 'M40,52 Q100,32 160,52 L102,172 Z', c: '#F6C453' },
      { d: 'M40,52 Q100,32 160,52 Q164,62 156,68 Q100,50 44,68 Q36,62 40,52 Z', c: '#D9963A' },
      { d: join(circle(84, 84, 10), circle(116, 92, 10), circle(96, 120, 9), circle(104, 146, 6)), c: '#C8323C' },
      { d: join(circle(68, 98, 4), circle(126, 118, 4)), c: '#16A34A' },
    ]
  ),

  // 10. Ice Cream Cone
  food(
    'fo-ice-cream',
    'Ice Cream Cone',
    ['ice cream', 'cone', 'dessert', 'sweet', 'summer'],
    [
      'M72,112 L100,178 L128,112 Z',
      line(78, 125, 122, 125),
      line(85, 142, 115, 142),
      line(92, 160, 108, 160),
      line(82, 116, 110, 168),
      line(118, 116, 90, 168),
      circle(100, 100, 28),
      circle(100, 70, 24),
      'M80,112 Q85,124 90,112',
      'M110,112 Q115,124 120,112',
      circle(100, 42, 10),
      'M100,38 Q116,22 126,28',
    ],
    [
      { d: 'M72,112 L100,178 L128,112 Z', c: '#D97706' },
      { d: circle(100, 100, 28), c: '#78350F' },
      { d: circle(100, 70, 24), c: '#F472B6' },
      { d: circle(100, 42, 10), c: '#DC2626' },
    ]
  ),

  // 11. Frosted Donut
  food(
    'fo-donut',
    'Frosted Sprinkle Donut',
    ['donut', 'doughnut', 'bakery', 'sweet', 'dessert'],
    [
      circle(100, 100, 58),
      circle(100, 100, 22),
      'M52,100 C52,70 70,52 100,52 C130,52 148,70 148,100 C148,112 142,122 136,118 C130,114 124,126 116,122 C108,118 102,126 94,120 C86,114 80,124 74,118 C68,112 52,120 52,100 Z',
      line(76, 76, 84, 74),
      line(114, 72, 122, 74),
      line(74, 96, 82, 98),
      line(122, 96, 128, 92),
      line(88, 114, 94, 112),
      line(112, 114, 118, 116),
      line(98, 64, 104, 62),
    ],
    [
      { d: circle(100, 100, 58), c: '#E2A053' },
      { d: 'M52,100 C52,70 70,52 100,52 C130,52 148,70 148,100 C148,112 142,122 136,118 C130,114 124,126 116,122 C108,118 102,126 94,120 C86,114 80,124 74,118 C68,112 52,120 52,100 Z', c: '#F472B6' },
      { d: circle(100, 100, 22), c: '#FFFFFF' },
      { d: join(circle(80, 75, 2.5), circle(118, 73, 2.5), circle(78, 97, 2.5), circle(125, 94, 2.5), circle(101, 63, 2.5)), c: '#38BDF8' },
    ]
  ),

  // 12. Club Sandwich
  food(
    'fo-sandwich',
    'Club Sandwich',
    ['sandwich', 'club', 'lunch', 'toast', 'deli'],
    [
      poly([[36, 154], [164, 154], [100, 58]], true),
      poly([[44, 148], [156, 148], [100, 68]], true),
      line(50, 134, 150, 134),
      line(58, 120, 142, 120),
      line(66, 106, 134, 106),
      'M54,134 Q62,142 74,136 Q86,144 98,136 Q110,144 122,136 Q134,142 146,134',
      line(100, 26, 100, 68),
      circle(100, 44, 8),
      circle(100, 44, 3),
      line(70, 120, 84, 120),
      line(116, 120, 130, 120),
    ],
    [
      { d: poly([[36, 154], [164, 154], [100, 58]], true), c: '#A36A29' },
      { d: poly([[44, 148], [156, 148], [100, 68]], true), c: '#FDE68A' },
      { d: 'M54,134 Q62,142 74,136 Q86,144 98,136 Q110,144 122,136 Q134,142 146,134 L150,134 L50,134 Z', c: '#22C55E' },
      { d: circle(100, 44, 8), c: '#65A30D' },
    ]
  ),

  // 13. Ramen Bowl
  food(
    'fo-ramen',
    'Ramen Noodle Bowl',
    ['ramen', 'noodles', 'soup', 'japanese', 'dinner'],
    [
      'M38,105 C38,166 162,166 162,105 Z',
      ellipse(100, 105, 62, 14),
      ellipse(100, 106, 56, 11),
      line(30, 92, 170, 80),
      line(30, 97, 170, 85),
      ellipse(82, 104, 14, 10),
      circle(82, 104, 6),
      rrect(122, 78, 22, 28, 3),
      'M62,112 Q70,104 78,112 Q86,120 94,112',
      'M96,114 Q104,106 112,114 Q120,122 128,114',
      steam(90),
      steam(110),
      ellipse(100, 168, 44, 6),
    ],
    [
      { d: 'M38,105 C38,166 162,166 162,105 Z', c: '#DC2626' },
      { d: ellipse(100, 106, 56, 11), c: '#B45309' },
      { d: rrect(122, 78, 22, 28, 3), c: '#1F2937' },
      { d: ellipse(82, 104, 14, 10), c: '#F9FAFB' },
      { d: circle(82, 104, 6), c: '#F59E0B' },
    ]
  ),

  // 14. Fresh Salad
  food(
    'fo-salad',
    'Fresh Garden Salad Bowl',
    ['salad', 'healthy', 'vegetables', 'diet', 'greens'],
    [
      'M40,112 C40,168 160,168 160,112 Z',
      ellipse(100, 112, 60, 14),
      circle(76, 102, 10),
      circle(124, 104, 10),
      circle(100, 116, 12),
      'M56,104 Q72,88 92,100',
      'M108,100 Q128,88 144,104',
      'M80,116 Q100,98 120,116',
      line(148, 42, 130, 94),
      line(126, 92, 134, 96),
      ellipse(100, 172, 42, 6),
    ],
    [
      { d: 'M40,112 C40,168 160,168 160,112 Z', c: '#854D0E' },
      { d: ellipse(100, 112, 60, 14), c: '#15803D' },
      { d: join(circle(76, 102, 10), circle(124, 104, 10)), c: '#EF4444' },
      { d: circle(100, 116, 12), c: '#86EFAC' },
      { d: poly([[146, 40], [150, 44], [132, 96], [128, 92]], true), c: '#94A3B8' },
    ]
  ),

  // 15. Birthday Cake
  food(
    'fo-cake',
    'Birthday Celebration Cake',
    ['cake', 'birthday', 'party', 'celebration', 'dessert'],
    [
      rrect(44, 118, 112, 50, 8),
      rrect(64, 76, 72, 42, 6),
      rect(96, 46, 8, 30),
      'M100,28 C94,36 94,42 100,46 C106,42 106,36 100,28 Z',
      line(44, 138, 156, 138),
      line(64, 96, 136, 96),
      'M44,118 Q58,128 72,118 Q86,128 100,118 Q114,128 128,118 Q142,128 156,118',
      'M64,76 Q76,84 88,76 Q100,84 112,76 Q124,84 136,76',
      ellipse(100, 172, 64, 8),
    ],
    [
      { d: ellipse(100, 172, 64, 8), c: '#E2E8F0' },
      { d: rrect(44, 118, 112, 50, 8), c: '#FBCFE8' },
      { d: rrect(64, 76, 72, 42, 6), c: '#F472B6' },
      { d: rect(96, 46, 8, 30), c: '#38BDF8' },
      { d: 'M100,28 C94,36 94,42 100,46 C106,42 106,36 100,28 Z', c: '#F59E0B' },
    ]
  ),
];
