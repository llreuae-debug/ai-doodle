import { arc, circle, ellipse, item, line } from '../draw.mjs';

const SKIN = '#FFD66B';
const CHEEK = '#F7A3A3';
const head = circle(100, 100, 66);

const face = (id, name, tags, strokes, fills) => item('faces', id, name, ['faces', 'emotion', ...tags], [head, ...strokes], [{ d: head, c: SKIN }, ...fills]);

export default [
  face(
    'fa-happy',
    'Happy face',
    ['happy', 'smile'],
    [
      arc(76, 92, 9, 200, 340),
      arc(124, 92, 9, 200, 340),
      line(64, 72, 86, 68),
      line(114, 68, 136, 72),
      'M66,114 Q100,154 134,114 Q100,126 66,114 Z',
      'M88,131 Q100,140 112,131',
      circle(64, 116, 8),
      circle(136, 116, 8),
    ],
    [
      { d: 'M66,114 Q100,154 134,114 Q100,126 66,114 Z', c: '#B5413A' },
      { d: circle(64, 116, 8), c: CHEEK },
      { d: circle(136, 116, 8), c: CHEEK },
    ],
  ),
  face(
    'fa-sad',
    'Sad face',
    ['sad', 'upset'],
    [
      circle(78, 94, 6),
      circle(122, 94, 6),
      line(62, 82, 86, 72),
      line(114, 72, 138, 82),
      'M74,138 Q100,114 126,138',
      'M138,104 Q128,122 138,128 Q148,122 138,104 Z',
      line(136, 114, 135, 119),
      'M94,152 Q100,155 106,152',
    ],
    [
      { d: circle(78, 94, 6), c: '#2B2B2B' },
      { d: circle(122, 94, 6), c: '#2B2B2B' },
      { d: 'M138,104 Q128,122 138,128 Q148,122 138,104 Z', c: '#7EC8E3' },
    ],
  ),
  face(
    'fa-surprised',
    'Surprised face',
    ['surprised', 'wow', 'shock'],
    [
      circle(78, 90, 11),
      circle(122, 90, 11),
      circle(78, 92, 4),
      circle(122, 92, 4),
      arc(78, 78, 16, 200, 330),
      arc(122, 78, 16, 210, 340),
      ellipse(100, 134, 12, 16),
      line(100, 18, 100, 28),
      line(70, 24, 76, 32),
      line(130, 24, 124, 32),
    ],
    [
      { d: ellipse(100, 134, 12, 16), c: '#6B2A26' },
      { d: circle(78, 92, 4), c: '#2B2B2B' },
      { d: circle(122, 92, 4), c: '#2B2B2B' },
    ],
  ),
  face(
    'fa-thinking',
    'Thinking face',
    ['thinking', 'idea', 'question'],
    [
      circle(80, 96, 9),
      circle(120, 96, 9),
      circle(83, 92, 3.5),
      circle(123, 92, 3.5),
      line(66, 80, 88, 78),
      arc(120, 84, 14, 210, 320),
      'M84,134 Q100,128 118,136',
      circle(154, 40, 5),
      circle(166, 27, 7),
      'M104,148 Q100,156 112,160',
    ],
    [
      { d: circle(83, 92, 3.5), c: '#2B2B2B' },
      { d: circle(123, 92, 3.5), c: '#2B2B2B' },
      { d: circle(154, 40, 5), c: '#DCEBFA' },
      { d: circle(166, 27, 7), c: '#DCEBFA' },
    ],
  ),
  face(
    'fa-wink',
    'Winking face',
    ['wink', 'playful', 'fun'],
    [
      arc(78, 96, 10, 200, 340),
      circle(122, 94, 9),
      circle(123, 95, 4),
      line(64, 78, 88, 80),
      line(112, 76, 136, 74),
      'M70,118 Q100,146 130,118',
      'M100,132 Q102,152 114,150 Q122,146 118,128',
      line(108, 134, 110, 144),
      circle(62, 118, 8),
      circle(138, 118, 8),
    ],
    [
      { d: circle(123, 95, 4), c: '#2B2B2B' },
      { d: 'M100,132 Q102,152 114,150 Q122,146 118,128 Z', c: '#F07C8A' },
      { d: circle(62, 118, 8), c: CHEEK },
      { d: circle(138, 118, 8), c: CHEEK },
    ],
  ),
];
