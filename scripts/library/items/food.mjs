import { arc, circle, ellipse, item, join, line } from '../draw.mjs';

const food = (id, name, tags, strokes, fills) => item('food', id, name, ['food', ...tags], strokes, fills);

const steam = (x) => `M${x},74 Q${x - 8},62 ${x},52 Q${x + 8},42 ${x},30`;
const glass = 'M64,80 L136,80 L126,162 L74,162 Z';
const tea = 'M67,98 L133,98 L126,162 L74,162 Z';
const apple = 'M100,62 C80,46 40,52 42,102 C44,150 80,170 100,156 C120,170 156,150 158,102 C160,52 120,46 100,62 Z';
const leaf = 'M104,42 Q124,26 142,36 Q124,50 104,42 Z';
const slice = 'M100,172 L40,52 Q100,32 160,52 Z';
const crust = 'M40,52 Q100,32 160,52 Q164,60 156,66 Q100,48 44,66 Q36,60 40,52 Z';
const pepperoni = [circle(84, 84, 9), circle(116, 90, 9), circle(98, 118, 8), circle(102, 146, 6)];
const bowl = 'M34,102 Q40,162 100,166 Q160,162 166,102 Z';
const rice = 'M44,102 Q58,58 100,56 Q142,58 156,102 Z';
const carrot = 'M36,172 Q58,122 120,72 Q142,64 148,86 Q102,132 36,172 Z';
const carrotLeaves = ['M134,72 Q132,44 118,28 Q140,40 142,70 Z', 'M140,74 Q154,48 172,40 Q160,60 146,80 Z', 'M138,72 Q150,34 146,18 Q160,40 144,76 Z'];

export default [
  food(
    'fo-chai',
    'Cup of chai',
    ['tea', 'chai', 'drink'],
    [steam(84), steam(100), steam(116), glass, line(67, 98, 133, 98), ellipse(100, 80, 36, 6), line(80, 106, 84, 150), ellipse(100, 168, 52, 9)],
    [
      { d: ellipse(100, 168, 52, 9), c: '#F4E1C1' },
      { d: glass, c: '#EAF4FA' },
      { d: tea, c: '#C68B59' },
    ],
  ),
  food(
    'fo-apple',
    'Apple',
    ['fruit', 'healthy', 'snack'],
    [apple, 'M100,62 Q98,46 104,32', leaf, line(110, 40, 136, 36), arc(70, 96, 18, 190, 250), ellipse(100, 176, 42, 5), line(150, 128, 156, 120), line(156, 140, 164, 136)],
    [
      { d: apple, c: '#E4572E' },
      { d: leaf, c: '#7BB662' },
    ],
  ),
  food(
    'fo-pizza',
    'Pizza slice',
    ['pizza', 'fast food', 'party'],
    [slice, crust, ...pepperoni, circle(70, 100, 4), circle(124, 118, 4), 'M84,138 Q86,152 90,148'],
    [
      { d: slice, c: '#F6C453' },
      { d: crust, c: '#D9963A' },
      { d: join(pepperoni), c: '#C8323C' },
    ],
  ),
  food(
    'fo-rice-bowl',
    'Bowl of rice',
    ['rice', 'biryani', 'meal'],
    [rice, bowl, ellipse(100, 102, 66, 10), line(70, 86, 76, 82), line(92, 72, 98, 70), line(112, 82, 118, 86), line(130, 74, 134, 78), steam(86), steam(114), ellipse(100, 174, 30, 5)],
    [
      { d: rice, c: '#F7E7B4' },
      { d: bowl, c: '#3D7DCA' },
      { d: join(circle(80, 92, 4), circle(122, 92, 4)), c: '#7BB662' },
    ],
  ),
  food(
    'fo-carrot',
    'Carrot',
    ['vegetable', 'healthy', 'garden'],
    [carrot, ...carrotLeaves, line(70, 140, 80, 146), line(88, 124, 98, 130), line(104, 106, 114, 112), line(120, 90, 128, 96)],
    [
      { d: carrot, c: '#F28C28' },
      { d: join(carrotLeaves), c: '#7BB662' },
    ],
  ),
];
