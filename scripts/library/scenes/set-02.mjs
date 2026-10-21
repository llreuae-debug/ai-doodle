import { C, at, bearFront, bird, bubble, clock, dashes, doc, dog, ground, head, heart, laptop, leaf, oval, person, poly, puff, rect, rrect, scene, shape, sm, sparkle, star, swoosh, tube } from './kit.mjs';

/** Cog wheel with `n` square teeth. */
const gear = (cx, cy, r, n, rot = 0) => {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = ((i / n) * 360 + rot) * (Math.PI / 180), w = Math.PI / n / 2;
    for (const [rr, da] of [[r * 0.8, -w * 1.25], [r, -w * 0.8], [r, w * 0.8], [r * 0.8, w * 1.25]]) pts.push([cx + Math.cos(a + da) * rr, cy + Math.sin(a + da) * rr]);
  }
  return poly(pts, true);
};

export default [
  (() => {
    const s = scene();
    ground(s, 62, 178, 28);
    person(s, 58, 140, { pose: 'hold', shirt: C.lav, armB: [[0, -33], [12, -28], [22, -40]], armF: [[6, -33], [18, -30], [27, -42]], head: { hair: 'dark', mood: 'shout' } });
    s.fill(rrect(92, 98, 9, 18, 3), C.ink);
    const cone = poly([[84, 84], [126, 62], [126, 118], [84, 96]], true);
    s.fill(cone, C.pink).dots(cone, C.pinkDot, 8, 1.1).fill(oval(126, 90, 9, 28), C.white).hatch(oval(126, 90, 9, 28), { angle: 70 });
    s.line(swoosh(124, 90, 30, -35, 35, 3, 9));
    s.fill(star(150, 36, 7, 3, 5), C.olive).fill(star(168, 140, 6, 2.6, 5), C.lav);
    return s.done('sc-megaphone', 'Big announcement', ['announcement', 'megaphone', 'marketing', 'news', 'shout', 'promotion']);
  })(),

  (() => {
    const s = scene();
    ground(s, 100, 178, 66, 5);
    const jar = rrect(96, 104, 58, 70, 12);
    s.fill(jar, C.white);
    for (const [y, x] of [[164, 112], [156, 128], [148, 116], [140, 132], [132, 120]]) s.fill(oval(x, y, 13, 4.5), C.olive);
    s.hatch(poly([[140, 108], [150, 108], [150, 170], [140, 170]], true), { angle: 60 });
    s.fill(rrect(92, 96, 66, 10, 3), C.pink);
    s.line(sm([[125, 96], [124, 72], [128, 52]]));
    s.fill(leaf(124, 74, 26, -150), C.olive).fill(leaf(126, 62, 28, -30), C.olive).fill(leaf(128, 52, 18, -80), C.olive);
    person(s, 46, 146, { k: 0.85, pose: 'hold', shirt: C.olive, pants: C.lav, armB: [[0, -33], [12, -22], [24, -20]], armF: [[6, -33], [16, -20], [28, -22]], head: { hair: 'bob', hairC: C.pink, mood: 'happy' } });
    const can = poly([[62, 112], [86, 112], [88, 132], [60, 132]], true);
    s.fill(can, C.lav).dots(can, C.lavDot, 5, 1).fill(poly([[86, 120], [108, 96], [111, 100], [88, 126]], true), C.lav);
    s.line(sm([[110, 104], [113, 110]]), sm([[114, 100], [119, 106]]), sm([[116, 94], [122, 98]]));
    return s.done('sc-savings-plant', 'Growing savings', ['savings', 'money', 'growth', 'invest', 'coins', 'plant']);
  })(),

  (() => {
    const s = scene();
    ground(s, 120, 178, 50, 5);
    s.line(sm([[106, 124], [92, 172]]), sm([[142, 124], [156, 172]]));
    const rings = [[46, C.pink], [36, C.white], [26, C.olive], [16, C.white], [7, C.lav]];
    for (const [r, c] of rings) s.fill(oval(124, 84, r, r), c);
    s.dots(oval(124, 84, 46, 46), C.pinkDot, 10, 1.1);
    s.line(sm([[124, 84], [170, 40]]));
    s.fill(poly([[162, 38], [176, 24], [178, 34], [172, 48], [182, 46]], true), C.lav);
    s.line(swoosh(124, 84, 54, 120, 160, 2, 6));
    person(s, 44, 140, { k: 0.8, pose: 'cheer', shirt: C.pink, head: { hair: 'cap', capC: C.olive, mood: 'grin' } });
    return s.done('sc-target-hit', 'Bullseye', ['target', 'goal', 'aim', 'bullseye', 'success', 'strategy']);
  })(),

  (() => {
    const s = scene();
    bubble(s, 64, 52, 76, 46, 52, 98, C.lav);
    s.dots(rrect(30, 32, 68, 40, 10), C.lavDot, 8, 1);
    s.fill(oval(48, 52, 4, 4), C.ink).fill(oval(64, 52, 4, 4), C.ink).fill(oval(80, 52, 4, 4), C.ink);
    bubble(s, 136, 76, 66, 42, 150, 118, C.pink);
    s.fill(heart(136, 76, 11), C.white);
    s.fill('M18,184 C18,150 32,140 52,140 C72,140 86,150 86,184 Z', C.olive).dots('M18,184 C18,150 32,140 52,140 C72,140 86,150 86,184 Z', C.oliveDot, 8, 1);
    head(s, 52, 120, 20, { face: 1, hair: 'dark', mood: 'grin' });
    s.fill('M114,184 C114,154 128,144 148,144 C168,144 182,154 182,184 Z', C.white).hatch('M114,184 C114,154 128,144 148,144 C168,144 182,154 182,184 Z', { angle: 50 });
    head(s, 148, 126, 20, { face: -1, hair: 'bob', hairC: C.lav, mood: 'happy' });
    return s.done('sc-chat', 'Friendly chat', ['chat', 'conversation', 'talk', 'message', 'support', 'customer']);
  })(),

  (() => {
    const s = scene();
    ground(s, 96, 176, 60, 5);
    s.fill(rrect(32, 44, 120, 126, 8), C.white).fill(poly([[32, 52], [32, 72], [152, 72], [152, 52], [146, 44], [38, 44]], true), C.olive).dots(rect(32, 44, 120, 28), C.oliveDot, 10, 1);
    s.fill(rrect(56, 34, 8, 20, 4), C.ink).fill(rrect(120, 34, 8, 20, 4), C.ink);
    const cells = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) cells.push([42 + c * 27, 82 + r * 27]);
    s.tint(rect(...cells[6], 22, 22), C.pink);
    s.line(cells.map(([x, y]) => rect(x, y, 22, 22)).join(' '));
    s.line(cells.slice(0, 6).map(([x, y]) => poly([[x + 5, y + 12], [x + 10, y + 17], [x + 18, y + 6]])).join(' '));
    s.fill(poly([[138, 164], [176, 116], [184, 122], [146, 170]], true), C.pink).fill(poly([[138, 164], [146, 170], [134, 176]], true), C.white).fill(poly([[176, 116], [184, 122], [185, 118], [180, 113]], true), C.lav);
    return s.done('sc-calendar', 'Plan the month', ['calendar', 'schedule', 'planning', 'date', 'event', 'tasks']);
  })(),

  (() => {
    const s = scene();
    ground(s, 100, 178, 70, 5);
    s.fill(rect(124, 148, 10, 26), C.white).fill(rect(140, 148, 10, 26), C.white).solid(rrect(120, 170, 16, 7, 3)).solid(rrect(138, 170, 16, 7, 3));
    s.line(sm([[137, 62], [137, 46]])).fill(oval(137, 43, 5, 5), C.pink);
    s.fill(rrect(114, 62, 46, 36, 10), C.white).fill(rrect(120, 70, 34, 18, 6), C.lav);
    s.fill(oval(130, 79, 3.5, 3.5), C.ink).fill(oval(144, 79, 3.5, 3.5), C.ink);
    s.fill(rrect(110, 100, 54, 52, 10), C.olive).dots(rrect(110, 100, 54, 52, 10), C.oliveDot, 10, 1).fill(rrect(124, 112, 26, 16, 4), C.white);
    s.fill(oval(130, 120, 2.5, 2.5), C.pink).fill(oval(138, 120, 2.5, 2.5), C.lav);
    s.fill(tube([[116, 112], [104, 116], [96, 116]], 10, 10), C.olive);
    person(s, 64, 146, { k: 0.9, pose: 'hold', shirt: C.pink, armF: [[6, -33], [20, -33], [32, -34]], head: { hair: 'tuft', mood: 'grin' } });
    s.fill(oval(96, 116, 6, 6), C.lav);
    return s.done('sc-robot-handshake', 'Meet the robot', ['robot', 'ai', 'handshake', 'automation', 'technology', 'partner']);
  })(),

  (() => {
    const s = scene();
    const cl = puff(100, 64, 64, 38, 8, 0.2, 4);
    s.fill(cl, C.lav).dots(cl, C.lavDot, 16, 1.1);
    s.fill(poly([[100, 40], [120, 62], [109, 62], [109, 86], [91, 86], [91, 62], [80, 62]], true), C.white);
    s.line(dashes((t) => [100, 148 - t * 40], 4));
    laptop(s, 100, 176, 72, C.olive);
    doc(s, 40, 130, 26, 32, -14, { lines: 2 });
    doc(s, 160, 128, 26, 32, 12, { lines: 2 });
    s.line(swoosh(40, 130, 22, 200, 240, 2, 5), swoosh(160, 128, 22, -60, -20, 2, 5));
    return s.done('sc-cloud-upload', 'Upload to the cloud', ['cloud', 'upload', 'backup', 'storage', 'data', 'sync']);
  })(),

  (() => {
    const s = scene();
    ground(s, 96, 178, 70, 5);
    s.fill(gear(70, 88, 42, 9, 8), C.olive).dots(gear(70, 88, 42, 9, 8), C.oliveDot, 10, 1).fill(oval(70, 88, 12, 12), C.white);
    s.fill(gear(122, 124, 30, 7, 0), C.pink).dots(gear(122, 124, 30, 7, 0), C.pinkDot, 8, 1).fill(oval(122, 124, 9, 9), C.white);
    s.line(swoosh(70, 88, 48, 190, 240, 2, 5), swoosh(122, 124, 36, -20, 30, 2, 5));
    person(s, 164, 140, { k: 0.85, face: -1, pose: 'hold', shirt: C.lav, armB: [[0, -33], [12, -24], [24, -20]], armF: [[6, -33], [16, -24], [28, -22]], head: { hair: 'cap', capC: C.pink } });
    const w = tube([[144, 120], [124, 124]], 9, 9);
    s.fill(w, C.white).hatch(w, { angle: 40 }).fill('M114,116 A11,11 0 1,1 126,132 L122,124 L116,124 Z', C.white);
    s.fill(oval(142, 121, 5, 5), C.white);
    return s.done('sc-gears', 'Fixing the machine', ['gears', 'settings', 'process', 'maintenance', 'engineering', 'support']);
  })(),

  (() => {
    const s = scene();
    s.fill('M34,140 A66,66 0 0,1 166,140 Z', C.lav).dots('M34,140 A66,66 0 0,1 166,140 Z', C.lavDot, 14, 1.1).line(sm([[22, 140], [178, 140]]));
    s.line([200, 228, 256, 284, 312, 340].map((a) => { const r = (a * Math.PI) / 180; return poly([[100 + Math.cos(r) * 74, 140 + Math.sin(r) * 74], [100 + Math.cos(r) * 84, 140 + Math.sin(r) * 84]]); }).join(' '));
    s.fill(oval(100, 166, 56, 10), C.white).hatch(oval(100, 166, 56, 10), { angle: -20 });
    s.fill('M130,110 C156,106 160,140 128,146', C.white).line('M130,110 C156,106 160,140 128,146 M131,120 C144,118 144,134 128,136');
    const mug = 'M66,96 L134,96 L130,150 C128,160 72,160 70,150 Z';
    s.fill(mug, C.pink).dots(mug, C.pinkDot, 10, 1.1).fill(oval(100, 96, 34, 7), C.ink);
    s.line(sm([[82, 120], [88, 126], [94, 120]]), sm([[106, 120], [112, 126], [118, 120]]), sm([[96, 134], [100, 137], [104, 134]]));
    s.line(sm([[86, 84], [80, 72], [88, 60], [82, 46]]), sm([[102, 82], [96, 68], [104, 54], [98, 38]]), sm([[118, 84], [112, 72], [120, 60], [114, 48]]));
    return s.done('sc-coffee', 'Morning coffee', ['coffee', 'morning', 'break', 'cafe', 'tired', 'drink']);
  })(),

  (() => {
    const s = scene();
    ground(s, 96, 168, 54, 5);
    s.line(sm([[40, 102], [28, 90], [32, 76]]));
    s.fill(tube([[58, 116], [52, 140], [48, 160]], 13, 11), C.white).fill(tube([[118, 114], [128, 138], [138, 158]], 13, 11), C.white);
    const body = tube([[48, 106], [94, 110], [124, 100]], 36, 32);
    s.fill(body, C.white).tint(oval(70, 100, 14, 10), C.olive).tint(oval(104, 116, 10, 7), C.olive);
    s.fill(tube([[72, 120], [76, 142], [70, 160]], 13, 11), C.white).fill(tube([[108, 118], [112, 140], [118, 160]], 13, 11), C.white);
    s.fill(oval(48, 162, 8, 4.5), C.ink).fill(oval(72, 162, 8, 4.5), C.ink).fill(oval(120, 162, 8, 4.5), C.ink).fill(oval(140, 160, 8, 4.5), C.ink);
    dog(s, 134, 80, 22, { ear: C.olive });
    s.fill(tube([[148, 98], [176, 88]], 13, 13), C.white).line(sm([[154, 95], [170, 89]]));
    s.line(sm([[22, 120], [34, 120]]), sm([[18, 134], [30, 134]]));
    return s.done('sc-dog-paper', 'Dog fetching the paper', ['dog', 'news', 'newspaper', 'pet', 'delivery', 'fetch']);
  })(),
];
