import { C, at, bearFront, bird, bubble, cat, dashes, doc, ground, head, heart, leaf, mitt, oval, person, plant, poly, puff, rect, rrect, scene, shape, sm, sparkle, star, swoosh, tube } from './kit.mjs';

export default [
  (() => {
    const s = scene();
    s.fill(puff(40, 132, 22, 11, 5, 0.2, 6), C.white).fill(puff(160, 50, 20, 10, 5, 0.2, 2), C.white);
    s.line(poly([[74, 104], [86, 140]]), poly([[126, 104], [114, 140]]), poly([[92, 110], [94, 140]]), poly([[108, 110], [106, 140]]));
    const env = 'M100,18 C140,18 156,46 152,72 C148,94 130,106 112,112 L88,112 C70,106 52,94 48,72 C44,46 60,18 100,18 Z';
    s.fill(env, C.pink).tint('M100,18 C88,30 82,60 88,112 L112,112 C118,60 112,30 100,18 Z', C.lav).tint('M60,30 C50,46 48,80 72,104 L80,106 C66,80 64,50 72,26 Z', C.olive).tint('M140,30 C150,46 152,80 128,104 L120,106 C134,80 136,50 128,26 Z', C.olive);
    s.line(sm([[100, 18], [88, 40], [86, 80], [88, 112]]), sm([[100, 18], [112, 40], [114, 80], [112, 112]]));
    bearFront(s, 100, 126, 13);
    s.fill(rrect(80, 136, 40, 30, 4), C.white).hatch(rrect(80, 136, 40, 30, 4), { angle: 30 }).line(sm([[80, 146], [120, 146]]));
    return s.done('sc-balloon-ride', 'Hot-air balloon ride', ['balloon', 'travel', 'journey', 'adventure', 'sky', 'bear']);
  })(),

  (() => {
    const s = scene();
    ground(s, 100, 178, 60, 5);
    s.line('M120,150 C150,150 160,120 140,110 C120,100 110,130 130,134 C150,138 168,122 172,96');
    s.fill(oval(126, 150, 22, 22), C.lav).dots(oval(126, 150, 22, 22), C.lavDot, 6, 1).line(sm([[108, 140], [126, 132], [144, 140]]), sm([[106, 154], [126, 146], [146, 156]]), sm([[116, 168], [130, 160], [140, 168]]));
    const body = shape([[30, 172], [36, 140], [56, 126], [82, 128], [96, 150], [92, 172]]);
    s.line(sm([[34, 160], [20, 150], [24, 130]]));
    s.fill(body, C.pink).dots(body, C.pinkDot, 10, 1.1);
    s.fill(mitt(94, 154, 8, 1, 0), C.pink).fill(mitt(84, 168, 8, 1, 0), C.pink);
    cat(s, 72, 112, 22, { mood: 'grin' });
    return s.done('sc-cat-yarn', 'Cat with a ball of yarn', ['cat', 'yarn', 'play', 'tangled', 'complex', 'pet']);
  })(),

  (() => {
    const s = scene();
    ground(s, 100, 178, 70, 5);
    s.fill(rect(98, 32, 74, 144), C.white).fill(poly([[106, 40], [164, 40], [164, 176], [106, 176]], true), C.olive).dots(rect(106, 40, 58, 136), C.oliveDot, 10, 1);
    s.tint(poly([[106, 176], [64, 176], [86, 40], [106, 40]], true), C.pale);
    s.fill(oval(152, 112, 4, 4), C.pink);
    s.line(sm([[96, 60], [80, 56]]), sm([[96, 90], [76, 92]]), sm([[96, 120], [80, 128]]));
    person(s, 54, 140, { k: 0.95, pose: 'hold', armB: [[0, -33], [12, -28], [24, -32]], armF: [[6, -33], [18, -30], [28, -34]], shirt: C.lav, pants: C.olive, head: { hair: 'bun', mood: 'grin' } });
    s.fill('M70,92 A11,11 0 1,1 78,112 L84,104 Z', C.pink).fill(tube([[80, 104], [104, 116]], 8, 8), C.pink).fill(poly([[96, 116], [96, 124], [100, 124], [100, 118]], true), C.pink);
    return s.done('sc-key-door', 'Unlocking the door', ['key', 'door', 'opportunity', 'unlock', 'access', 'new start']);
  })(),

  (() => {
    const s = scene();
    ground(s, 100, 178, 70, 5);
    person(s, 64, 140, { pose: 'stand', armF: [[6, -33], [20, -46], [30, -62]], shirt: C.olive, pants: 'hatch', head: { hair: 'dark', mood: 'happy' } });
    person(s, 136, 140, { face: -1, pose: 'stand', armF: [[6, -33], [20, -46], [30, -62]], shirt: C.pink, pants: C.lav, head: { hair: 'bob', hairC: C.lav, mood: 'happy' } });
    s.line([[100, 64, 92, 52], [100, 64, 108, 52], [100, 64, 100, 48], [100, 64, 86, 62], [100, 64, 114, 62]].map(([a, b, c, d]) => poly([[a + (c - a) * 0.4, b + (d - b) * 0.4], [c, d]])).join(' '));
    s.fill(sparkle(56, 40, 7), C.lav).fill(sparkle(146, 36, 8), C.olive);
    return s.done('sc-high-five', 'High five', ['high five', 'teamwork', 'success', 'celebrate', 'friends', 'deal']);
  })(),

  (() => {
    const s = scene();
    s.line(Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return poly([[70 + Math.cos(a) * 40, 72 + Math.sin(a) * 40], [70 + Math.cos(a) * 48, 72 + Math.sin(a) * 48]]); }).join(' '));
    s.fill(oval(70, 72, 32, 32), C.pink).dots(oval(70, 72, 32, 32), C.pinkDot, 10, 1.1);
    s.fill(rrect(47, 60, 21, 14, 6), C.ink).fill(rrect(73, 60, 21, 14, 6), C.ink).line(sm([[68, 65], [73, 65]]));
    s.line(sm([[57, 85], [70, 94], [83, 85]]));
    s.line(sm([[134, 98], [156, 42]]));
    const glass = poly([[118, 102], [162, 102], [156, 172], [124, 172]], true);
    s.fill(glass, C.white).fill(poly([[120, 118], [160, 118], [156, 172], [124, 172]], true), C.olive).dots(poly([[120, 118], [160, 118], [156, 172], [124, 172]], true), C.oliveDot, 8, 1);
    s.fill(rrect(132, 132, 12, 12, 2), C.white).fill(rrect(144, 148, 10, 10, 2), C.white);
    s.fill('M154,104 A16,16 0 0,1 178,96 L170,108 Z', C.lav).line(sm([[164, 102], [172, 99]]));
    s.hatch(oval(140, 178, 30, 4), { angle: -60, gap: 3 });
    return s.done('sc-summer', 'Sunny weekend', ['summer', 'sun', 'holiday', 'weekend', 'lemonade', 'relax']);
  })(),

  (() => {
    const s = scene();
    ground(s, 100, 178, 72, 5);
    s.fill(oval(50, 150, 26, 26), C.white).line(oval(50, 150, 4, 4)).fill(oval(150, 150, 26, 26), C.white).line(oval(150, 150, 4, 4));
    s.hatch(oval(50, 150, 26, 26), { angle: 20, gap: 6 }).hatch(oval(150, 150, 26, 26), { angle: 20, gap: 6 });
    s.fill(oval(50, 150, 20, 20), C.white).fill(oval(150, 150, 20, 20), C.white);
    s.line(poly([[50, 150], [82, 104], [130, 104], [150, 150]]), poly([[82, 104], [100, 150], [130, 104]]), poly([[100, 150], [50, 150]]), sm([[136, 104], [138, 88], [130, 84]]), sm([[76, 104], [70, 92]]));
    s.fill(rrect(62, 86, 22, 8, 4), C.ink);
    person(s, 82, 98, { k: 0.85, pose: 'walk', armB: [[0, -33], [20, -26], [46, -16]], armF: [[6, -33], [24, -26], [50, -16]], legB: [[-3, 0], [14, 22], [20, 54]], legF: [[3, 0], [26, 14], [20, 46]], shirt: C.lav, pants: C.pink, head: { hair: 'cap', capC: C.olive, mood: 'grin' } });
    s.line(sm([[18, 110], [32, 110]]), sm([[22, 122], [40, 122]]));
    return s.done('sc-bike-ride', 'Bike ride', ['bicycle', 'cycling', 'eco', 'commute', 'exercise', 'travel']);
  })(),

  (() => {
    const s = scene();
    ground(s, 100, 178, 34);
    person(s, 100, 140, { pose: 'hold', armB: [[0, -33], [-2, -46], [-10, -56]], armF: [[6, -33], [22, -46], [28, -58]], shirt: C.olive, pants: 'hatch', head: { hair: 'cap', capC: C.pink } });
    const box = poly([[64, 30], [132, 22], [138, 80], [70, 88]], true);
    s.fill(box, C.white).hatch(poly([[64, 30], [132, 22], [138, 80], [70, 88]], true), { angle: 60, gap: 5 }).fill(poly([[94, 27], [106, 26], [112, 84], [100, 85]], true), C.lav);
    s.line(sm([[112, 48], [126, 46]]), sm([[114, 58], [128, 56]]));
    s.fill(mitt(88, 88, 6), C.white).fill(mitt(128, 82, 6), C.white);
    s.line(swoosh(100, 54, 50, 160, 200, 2, 6));
    return s.done('sc-delivery', 'Package delivery', ['delivery', 'package', 'box', 'shipping', 'courier', 'order']);
  })(),

  (() => {
    const s = scene();
    ground(s, 108, 178, 44, 5);
    const bin = poly([[74, 92], [142, 92], [134, 176], [82, 176]], true);
    s.fill(bin, C.olive).dots(bin, C.oliveDot, 10, 1).fill(rrect(68, 82, 80, 12, 4), C.olive);
    s.fill(oval(108, 134, 20, 20), C.white).fill(leaf(98, 146, 26, -50), C.olive).line(sm([[100, 144], [112, 130]]));
    doc(s, 60, 50, 26, 32, -24, { lines: 2 });
    s.fill('M134,56 L142,30 L150,30 L156,56 L156,72 L134,72 Z', C.lav).fill(rect(140, 20, 12, 10), C.pink);
    s.line(swoosh(60, 50, 24, 40, 80, 2, 5), swoosh(146, 50, 26, 100, 140, 2, 5));
    return s.done('sc-recycle', 'Recycle it', ['recycle', 'eco', 'environment', 'green', 'waste', 'sustainability']);
  })(),

  (() => {
    const s = scene();
    ground(s, 100, 178, 70, 5);
    s.line(sm([[84, 132], [74, 176]]), sm([[148, 132], [158, 176]]), sm([[116, 132], [116, 172]]));
    s.fill(rrect(70, 34, 112, 98, 4), C.white);
    s.line(poly([[82, 116], [100, 96], [118, 104], [146, 66], [166, 56]]), poly([[158, 52], [168, 54], [164, 64]]));
    s.fill(rect(84, 50, 8, 6), C.pink).fill(rect(84, 60, 8, 6), C.lav).line(sm([[96, 53], [118, 53]]), sm([[96, 63], [112, 63]]));
    s.tint(poly([[140, 120], [160, 120], [160, 90], [140, 100]], true), C.pale);
    person(s, 40, 140, { k: 0.9, pose: 'point', armF: [[6, -33], [20, -40], [34, -52]], shirt: C.pink, pants: C.olive, head: { hair: 'bob', hairC: C.ink, mood: 'grin' } });
    return s.done('sc-presentation', 'Presenting results', ['presentation', 'meeting', 'chart', 'report', 'pitch', 'business']);
  })(),

  (() => {
    const s = scene();
    s.fill(oval(100, 170, 64, 9), C.white).hatch(oval(100, 170, 64, 9), { angle: -20 });
    s.fill(rrect(48, 116, 104, 52, 8), C.pink).dots(rrect(48, 116, 104, 52, 8), C.pinkDot, 10, 1.1);
    s.fill('M48,128 C60,140 70,124 82,136 C94,148 104,124 118,136 C130,148 140,124 152,132 L152,120 C152,116 148,116 148,116 L52,116 C48,116 48,120 48,124 Z', C.white);
    s.fill(rrect(56, 92, 88, 26, 6), C.lav).dots(rrect(56, 92, 88, 26, 6), C.lavDot, 6, 1);
    for (const x of [76, 100, 124]) s.fill(rect(x - 3, 70, 6, 22), C.white).fill(`M${x},54 C${x + 6},62 ${x + 5},68 ${x},68 C${x - 5},68 ${x - 6},62 ${x},54 Z`, C.pink);
    s.fill(sparkle(42, 70, 7), C.olive).fill(sparkle(158, 66, 8), C.olive);
    cat(s, 164, 144, 13, { c: C.lav, dotC: C.lavDot });
    s.fill(poly([[153, 126], [161, 104], [171, 126]], true), C.olive).fill(oval(161, 104, 3, 3), C.pink);
    return s.done('sc-birthday', 'Birthday cake', ['birthday', 'cake', 'party', 'celebrate', 'anniversary', 'candles']);
  })(),
];
