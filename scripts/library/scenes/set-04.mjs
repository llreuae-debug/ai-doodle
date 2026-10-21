import { C, at, bird, bubble, bulb, cat, dashes, ground, head, heart, laptop, leaf, mitt, oval, person, phone, poly, puff, rect, rrect, scene, shape, sm, sparkle, star, swoosh, tube } from './kit.mjs';

/** Wavy water line from x0 to x1 at y. */
const waves = (x0, x1, y, n = 5, amp = 3) => {
  const w = (x1 - x0) / n;
  return sm(Array.from({ length: n * 2 + 1 }, (_, i) => [x0 + (i * w) / 2, y + (i % 2 ? -amp : amp)]));
};

export default [
  (() => {
    const s = scene();
    ground(s, 120, 178, 50, 5);
    s.line(sm([[124, 120], [100, 174]]), sm([[124, 120], [128, 176]]), sm([[124, 120], [154, 172]]));
    s.fill(oval(104, 70, 16, 16), C.olive).fill(oval(140, 66, 18, 18), C.olive).line(oval(104, 70, 6, 6), oval(140, 66, 7, 7));
    s.fill(rrect(94, 84, 60, 38, 6), C.lav).dots(rrect(94, 84, 60, 38, 6), C.lavDot, 8, 1).fill(poly([[154, 92], [174, 82], [174, 124], [154, 114]], true), C.ink);
    person(s, 58, 140, { k: 0.9, pose: 'hold', armB: [[0, -33], [12, -24], [26, -30]], armF: [[6, -33], [18, -22], [30, -28]], shirt: C.pink, head: { hair: 'cap', capC: C.ink, mood: 'grin' } });
    const board = poly([[146, 150], [182, 150], [182, 176], [146, 176]], true);
    s.fill(board, C.white).line(sm([[152, 160], [176, 160]]), sm([[152, 168], [168, 168]]));
    s.fill(poly([[144, 140], [180, 130], [183, 140], [147, 150]], true), C.ink);
    s.fill(poly([[152, 138], [158, 136], [162, 145], [156, 147]], true), C.white).fill(poly([[166, 134], [172, 132], [176, 141], [170, 143]], true), C.white);
    return s.done('sc-film-set', 'Lights, camera, action', ['film', 'video', 'camera', 'movie', 'production', 'director']);
  })(),

  (() => {
    const s = scene();
    s.fill(poly([[70, 176], [130, 176], [118, 164], [82, 164]], true), C.olive).fill(rect(96, 54, 8, 112), C.white).hatch(rect(96, 54, 8, 112), { angle: 70 });
    s.fill(oval(100, 50, 8, 8), C.pink).fill(rrect(30, 64, 140, 8, 4), C.ink);
    s.line(poly([[40, 70], [24, 120]]), poly([[40, 70], [60, 120]]), poly([[160, 70], [140, 120]]), poly([[160, 70], [176, 120]]));
    s.fill('M18,120 L66,120 A24,14 0 0,1 18,120 Z', C.lav).fill('M134,120 L182,120 A24,14 0 0,1 134,120 Z', C.lav);
    s.fill(heart(42, 104, 15), C.pink).dots(heart(42, 104, 15), C.pinkDot, 6, 1);
    for (const [x, y] of [[148, 116], [168, 116], [158, 108], [158, 100]]) s.fill(oval(x, y, 9, 4), C.olive);
    s.fill(sparkle(100, 26, 7), C.white);
    return s.done('sc-balance', 'Work-life balance', ['balance', 'scale', 'work life', 'fair', 'compare', 'decision']);
  })(),

  (() => {
    const s = scene();
    ground(s, 60, 178, 34);
    s.fill(star(150, 44, 26, 12, 5, -80), C.pink).dots(star(150, 44, 26, 12, 5, -80), C.pinkDot, 8, 1);
    s.line(swoosh(150, 44, 32, 100, 150, 2, 6));
    const rails = sm([[40, 176], [128, 66]]) + ' ' + sm([[62, 178], [146, 74]]);
    s.line(rails, Array.from({ length: 7 }, (_, i) => { const t = 0.08 + i * 0.13; return sm([[40 + 88 * t, 176 - 110 * t], [62 + 84 * t, 178 - 104 * t]]); }).join(' '));
    person(s, 92, 122, { k: 0.7, pose: 'lift', face: 1, armB: [[-2, -33], [8, -46], [16, -58]], armF: [[6, -33], [16, -46], [24, -56]], legB: [[-4, 0], [6, 14], [2, 30]], legF: [[4, 0], [16, 8], [12, 26]], shirt: C.olive, pants: C.lav, head: { hair: 'bun', hairC: C.ink } });
    return s.done('sc-ladder-star', 'Reach for the stars', ['ambition', 'ladder', 'star', 'career', 'dream', 'climb']);
  })(),

  (() => {
    const s = scene();
    s.fill(poly([[18, 132], [182, 132], [182, 182], [18, 182]], true), C.lav).dots(rect(18, 132, 164, 50), C.lavDot, 14, 1.1);
    s.line(waves(26, 80, 146, 4, 2), waves(110, 172, 162, 4, 2));
    s.fill(rect(18, 118, 64, 12), C.white).hatch(rect(18, 118, 64, 12), { angle: -20 }).line(sm([[30, 130], [30, 168]]), sm([[66, 130], [66, 168]]));
    person(s, 50, 112, { k: 0.75, pose: 'sit', armF: [[3, -33], [14, -24], [24, -30]], armB: [[-5, -33], [6, -22], [20, -28]], shirt: C.pink, pants: C.olive, head: { hair: 'cap', capC: C.lav } });
    s.line(sm([[66, 90], [108, 44], [146, 32]]), sm([[146, 32], [146, 82]]));
    bulb(s, 146, 98, 13, C.white);
    s.line(swoosh(146, 98, 22, 230, 310, 1, 0));
    return s.done('sc-fishing-ideas', 'Fishing for ideas', ['idea', 'fishing', 'brainstorm', 'creative', 'search', 'inspiration']);
  })(),

  (() => {
    const s = scene();
    s.line(waves(22, 70, 168, 3, 2), waves(130, 178, 172, 3, 2));
    s.fill(oval(100, 160, 64, 16), C.lav).dots(oval(100, 160, 64, 16), C.lavDot, 10, 1).line(poly([[100, 160], [140, 150]]));
    s.line(sm([[156, 150], [158, 110]])).fill(shape([[158, 110], [146, 96], [150, 88], [158, 96], [164, 86], [170, 92], [168, 104]]), C.pink);
    const body = shape([[60, 156], [58, 120], [72, 98], [100, 92], [128, 98], [142, 120], [140, 156]]);
    s.fill(oval(74, 86, 14, 14), C.olive).fill(oval(126, 86, 14, 14), C.olive);
    s.fill(body, C.olive).dots(body, C.oliveDot, 12, 1.1);
    s.fill(oval(74, 84, 7, 7), C.white).fill(oval(126, 84, 7, 7), C.white).solid(oval(75, 85, 3, 3)).solid(oval(125, 85, 3, 3));
    s.line(sm([[80, 108], [100, 116], [120, 108]]));
    phone(s, 100, 140, 24, 36, -8, C.lav);
    s.line(sm([[94, 136], [106, 134]]), sm([[95, 143], [104, 142]]));
    s.fill(mitt(87, 152, 7), C.olive).fill(mitt(114, 149, 7), C.olive);
    return s.done('sc-frog-phone', 'Frog scrolling a phone', ['frog', 'phone', 'social media', 'scroll', 'app', 'relax']);
  })(),

  (() => {
    const s = scene();
    s.line(waves(18, 182, 160, 8, 3), waves(40, 160, 174, 6, 2));
    s.line(sm([[56, 66], [52, 50], [44, 40]]), sm([[56, 66], [60, 48], [70, 40]]));
    s.fill(rrect(66, 70, 30, 24, 2), C.pink).fill(rrect(98, 70, 30, 24, 2), C.olive).fill(rrect(82, 48, 30, 22, 2), C.white).hatch(rrect(82, 48, 30, 22, 2), { angle: 40 });
    const whale = 'M28,124 C30,96 70,90 104,92 C140,94 156,110 160,124 C170,116 176,104 182,100 C180,116 178,130 168,140 C150,152 70,156 44,150 C30,146 26,136 28,124 Z';
    s.fill(whale, C.lav).dots(whale, C.lavDot, 14, 1.1).fill('M34,134 C60,148 120,148 158,136 C150,148 70,156 44,150 C34,146 32,140 34,134 Z', C.white);
    s.solid(oval(50, 118, 3.5, 4)).line(sm([[36, 130], [46, 134], [56, 132]]));
    return s.done('sc-whale-cargo', 'Whale carrying cargo', ['whale', 'shipping', 'cargo', 'logistics', 'containers', 'delivery']);
  })(),

  (() => {
    const s = scene();
    const hill = 'M18,182 C40,140 110,128 182,150 L182,182 Z';
    s.fill(hill, C.olive).dots(hill, C.oliveDot, 14, 1.1);
    s.line(sm([[66, 104], [100, 70], [132, 48]]));
    s.fill(poly([[132, 20], [154, 40], [136, 66], [114, 46]], true), C.pink).line(poly([[132, 20], [136, 66]]), poly([[114, 46], [154, 40]]));
    s.line(sm([[136, 66], [140, 84], [130, 98], [138, 114]]));
    s.fill(poly([[138, 80], [146, 76], [146, 86]], true), C.lav).fill(poly([[134, 100], [126, 96], [126, 106]], true), C.lav);
    person(s, 52, 128, { k: 0.8, pose: 'point', armF: [[6, -33], [14, -40], [18, -32]], shirt: C.lav, pants: C.white, head: { hair: 'bob', hairC: C.pink, mood: 'grin' } });
    s.line(swoosh(134, 42, 30, -30, 10, 3, 5));
    return s.done('sc-kite', 'Flying a kite', ['kite', 'freedom', 'wind', 'outdoors', 'play', 'weekend']);
  })(),

  (() => {
    const s = scene();
    s.line(dashes((t) => [18 + t * 50, 170], 5));
    s.fill('M50,170 C56,150 80,146 112,150 L150,148 C160,146 166,138 168,128 L176,128 C178,150 166,170 140,172 Z', C.pink).dots('M60,166 C70,154 90,152 140,156 L140,168 Z', C.pinkDot, 8, 1);
    s.line(sm([[160, 130], [154, 108], [148, 100]]), sm([[170, 130], [174, 108], [180, 100]]));
    s.fill(oval(148, 98, 4, 4), C.ink).fill(oval(180, 98, 4, 4), C.ink);
    s.fill(rect(74, 104, 60, 46), C.white).fill(poly([[66, 106], [104, 72], [142, 106]], true), C.lav).dots(poly([[66, 106], [104, 72], [142, 106]], true), C.lavDot, 6, 1);
    s.fill(rrect(96, 122, 16, 28, 2), C.olive).fill(rect(80, 112, 12, 12), C.white).line(sm([[86, 112], [86, 124]]), sm([[80, 118], [92, 118]]));
    s.fill(rect(122, 76, 8, 18), C.white).line(sm([[126, 72], [130, 62], [124, 54], [130, 44]]));
    return s.done('sc-snail-home', 'Snail moving house', ['home', 'moving', 'real estate', 'snail', 'slow', 'house']);
  })(),

  (() => {
    const s = scene();
    ground(s, 52, 178, 28);
    person(s, 50, 140, { k: 0.9, pose: 'hold', armF: [[6, -33], [18, -32], [30, -36]], shirt: C.olive, pants: C.pink, head: { hair: 'dark', mood: 'grin' } });
    const mag = 'M84,90 L104,90 C104,112 124,112 124,90 L144,90 C144,140 84,140 84,90 Z';
    s.fill(mag, C.pink).dots(mag, C.pinkDot, 8, 1).fill(rect(84, 90, 20, 12), C.white).fill(rect(124, 90, 20, 12), C.white).hatch(rect(84, 90, 20, 12), { angle: 40 }).hatch(rect(124, 90, 20, 12), { angle: 40 });
    for (const [x, y, r, c] of [[110, 40, 11, C.pink], [150, 52, 9, C.lav], [166, 96, 10, C.pink], [164, 140, 8, C.lav]]) s.fill(heart(x, y, r), c);
    s.line(sm([[112, 60], [114, 76]]), sm([[142, 64], [134, 78]]), sm([[154, 98], [150, 98]]), sm([[154, 134], [148, 126]]));
    return s.done('sc-magnet-likes', 'Attracting likes', ['magnet', 'attract', 'customers', 'likes', 'marketing', 'audience']);
  })(),

  (() => {
    const s = scene();
    ground(s, 116, 176, 52, 5);
    const scr = laptop(s, 116, 172, 96, C.white, { dots: false });
    s.line([0, 1, 2].map((i) => sm([[scr.x + 8, scr.y + 10 + i * 9], [scr.x + 40 - i * 6, scr.y + 10 + i * 9]])).join(' '));
    s.line(sm([[124, 96], [112, 86]]), sm([[130, 94], [136, 82]]), sm([[112, 104], [102, 102]]), sm([[112, 114], [104, 120]]), sm([[146, 104], [154, 100]]), sm([[146, 114], [154, 120]]));
    const bug = oval(129, 110, 18, 14);
    s.fill(oval(129, 96, 9, 7), C.ink).fill(bug, C.olive).dots(bug, C.oliveDot, 6, 1).line(sm([[129, 98], [129, 124]]));
    person(s, 44, 140, { k: 0.85, pose: 'point', armF: [[6, -33], [18, -36], [30, -44]], shirt: C.lav, head: { hair: 'tuft', glasses: true } });
    s.fill(tube([[72, 100], [80, 90]], 6, 6), C.ink).fill(oval(86, 80, 13, 13), C.white).hatch(oval(86, 80, 9, 9), { angle: -45, gap: 4 });
    return s.done('sc-bug-hunt', 'Hunting a bug', ['bug', 'debug', 'code', 'developer', 'error', 'fix']);
  })(),
];
