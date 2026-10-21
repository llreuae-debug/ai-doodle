import type { DoodleDef, DoodleFill } from './doodles';

/**
 * Decorations for templates and slides: squiggles, scribbles, underlines, a paper plane and its
 * dashed trail, a whiteboard, a plant and books. Original line art in the 200×200 doodle space;
 * coloured strokes show in colour mode.
 */

const C = (cx: number, cy: number, r: number) => `M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`;

/** A cubic Bézier split into short dashes, each its own stroke, so the hand draws a dashed line. */
function dashed(p0: [number, number], c1: [number, number], c2: [number, number], p1: [number, number], dashes = 12): string[] {
  const at = (t: number) => {
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
      u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1],
    ].map((v) => Math.round(v * 10) / 10);
  };
  const out: string[] = [];
  for (let i = 0; i < dashes; i++) {
    const a = at(i / dashes);
    const b = at((i + 0.55) / dashes);
    out.push(`M${a[0]},${a[1]} L${b[0]},${b[1]}`);
  }
  return out;
}

const decor = (id: string, name: string, strokes: string[], extra: { fills?: DoodleFill[]; ink?: string; lineWidth?: number } = {}): DoodleDef => ({
  id,
  cat: 'props',
  name,
  tags: ['decor', 'shapes'],
  strokes,
  fills: extra.fills ?? [],
  ink: extra.ink,
  lineWidth: extra.lineWidth,
});

export const DECOR: DoodleDef[] = [
  decor('d-squiggle-pink', 'Squiggle (pink)', ['M18,40 C60,0 70,70 50,90 C30,110 60,160 100,130 C140,100 150,170 190,150'], { ink: '#C2489B', lineWidth: 9 }),
  decor('d-squiggle-gold', 'Squiggle (gold)', ['M15,60 C55,30 90,40 110,80 C125,110 165,120 185,80 C195,55 170,40 160,70'], { ink: '#E2A72E', lineWidth: 10 }),
  decor('d-loop-pink', 'Loop (pink)', ['M20,190 C20,120 70,90 110,120 C140,140 120,180 95,160 C70,140 110,70 185,60'], { ink: '#C2489B', lineWidth: 9 }),
  decor('d-wave', 'Wavy underline', ['M15,100 C35,75 50,125 70,100 C90,75 105,125 125,100 C145,75 160,125 185,100'], { ink: '#E2A72E', lineWidth: 6 }),
  decor('d-zigzag', 'Zigzag underline', ['M10,110 L40,90 L55,112 L85,88 L100,112 L130,88 L145,110 L190,85', 'M30,125 L60,108 L75,126 L105,106 L120,126 L170,104'], { ink: '#3B5BDB', lineWidth: 5 }),
  decor(
    'd-scribble',
    'Scribble burst',
    ['M60,170 C45,110 55,50 75,110', 'M78,165 C70,90 85,30 100,105', 'M98,160 C95,85 112,25 122,100', 'M118,158 C120,95 140,50 140,110', 'M135,160 C142,115 160,95 155,140'],
    { ink: '#3B5BDB', lineWidth: 6 },
  ),
  decor('d-burst', 'Sparkle lines', ['M100,25 L100,70', 'M145,40 L122,78', 'M172,82 L132,100', 'M55,40 L78,78'], { ink: '#3B5BDB', lineWidth: 7 }),
  decor('d-underline', 'Double underline', ['M15,95 C70,86 130,86 185,95', 'M45,112 C85,105 125,105 165,112'], { ink: '#7F56D9', lineWidth: 6 }),
  decor('d-dots', 'Dots', [C(40, 40, 4), C(75, 30, 4), C(110, 45, 4), C(55, 75, 4), C(95, 80, 4), C(135, 70, 4), C(80, 115, 4), C(120, 110, 4)], { ink: '#2B2B2B', lineWidth: 5 }),
  decor(
    'd-plane',
    'Paper plane',
    ['M25,105 L175,40 L125,165 L95,128 Z', 'M175,40 L95,128 L90,165 L112,142'],
    { fills: [{ d: 'M25,105 L175,40 L125,165 L95,128 Z', c: '#FFFFFF' }], ink: '#3A3F4B', lineWidth: 4 },
  ),
  decor('d-trail', 'Dashed trail', [...dashed([15, 185], [60, 60], [130, 200], [185, 20], 16)], { ink: '#3A3F4B', lineWidth: 4 }),
  decor('d-trail-loop', 'Dashed loop', [...dashed([15, 20], [140, 10], [150, 120], [80, 110], 10), ...dashed([80, 110], [30, 105], [60, 170], [185, 175], 10)], { ink: '#3A3F4B', lineWidth: 4 }),
  decor(
    'd-whiteboard',
    'Whiteboard',
    ['M14,30 L186,30 L186,150 L14,150 Z', 'M24,40 L176,40 L176,140 L24,140 Z', 'M40,160 L160,160', 'M55,150 L55,160', 'M145,150 L145,160', 'M70,155 L90,155', 'M110,155 L125,155'],
    {
      fills: [
        { d: 'M14,30 L186,30 L186,150 L14,150 Z', c: '#E8EAEE' },
        { d: 'M24,40 L176,40 L176,140 L24,140 Z', c: '#FFFFFF' },
      ],
      lineWidth: 4,
    },
  ),
  decor(
    'd-plant',
    'Potted plant',
    [
      'M72,140 L128,140 L120,188 L80,188 Z',
      'M66,128 L134,128 L134,140 L66,140 Z',
      'M100,128 C98,95 100,70 100,45',
      'M100,95 C80,80 60,85 52,100 C70,108 90,104 100,95',
      'M100,75 C118,58 140,60 150,72 C132,84 112,84 100,75',
      'M100,55 C88,38 90,22 100,12 C110,22 112,38 100,55',
    ],
    {
      fills: [
        { d: 'M72,140 L128,140 L120,188 L80,188 Z', c: '#E9C9A8' },
        { d: 'M100,95 C80,80 60,85 52,100 C70,108 90,104 100,95 Z', c: '#8FD18C' },
        { d: 'M100,75 C118,58 140,60 150,72 C132,84 112,84 100,75 Z', c: '#8FD18C' },
        { d: 'M100,55 C88,38 90,22 100,12 C110,22 112,38 100,55 Z', c: '#8FD18C' },
      ],
    },
  ),
  decor(
    'd-books',
    'Book stack',
    ['M45,150 L160,150 L160,180 L45,180 Z', 'M55,120 L150,120 L150,150 L55,150 Z', 'M40,90 L145,90 L145,120 L40,120 Z', 'M150,150 L150,180', 'M60,135 L130,135', 'M50,105 L120,105'],
    {
      fills: [
        { d: 'M45,150 L160,150 L160,180 L45,180 Z', c: '#7CC6FF' },
        { d: 'M55,120 L150,120 L150,150 L55,150 Z', c: '#FF9F7A' },
        { d: 'M40,90 L145,90 L145,120 L40,120 Z', c: '#FFD24D' },
      ],
    },
  ),
  decor(
    'd-laptop',
    'Laptop (blank screen)',
    ['M50,58 L150,58 L150,128 L50,128 Z', 'M60,68 L140,68 L140,118 L60,118 Z', 'M30,136 L170,136 L160,150 L40,150 Z', 'M90,143 L110,143'],
    {
      fills: [
        { d: 'M50,58 L150,58 L150,128 L50,128 Z', c: '#C9CED6' },
        { d: 'M60,68 L140,68 L140,118 L60,118 Z', c: '#FFFFFF' },
        { d: 'M30,136 L170,136 L160,150 L40,150 Z', c: '#A8AFB9' },
      ],
    },
  ),
  decor('d-pastel-curve', 'Pastel curve', ['M15,15 C70,50 10,110 60,150 C80,165 75,185 60,195'], { ink: '#B79AD1', lineWidth: 5 }),
  decor('d-pastel-hill', 'Pastel hills', ['M5,190 C30,130 70,120 100,150 C130,115 170,125 195,190'], { ink: '#9ACBB8', lineWidth: 5 }),
  decor('d-pastel-stroke', 'Pastel underline', ['M15,100 C60,92 120,94 185,98', 'M50,110 C90,104 130,106 160,110'], { ink: '#B79AD1', lineWidth: 6 }),
  decor('d-speedlines', 'Motion lines', ['M40,40 C25,80 25,120 40,160', 'M60,55 C48,85 48,115 60,145'], { ink: '#3A3F4B', lineWidth: 5 }),
];
