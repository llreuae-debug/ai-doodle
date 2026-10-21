import { C, at, dashes, bear, bearFront, bird, bubble, bulb, cat, clock, doc, dog, ground, handOf, head, heart, laptop, leaf, oval, person, phone, plant, poly, puff, rect, rrect, scene, shape, sm, sparkle, star, swoosh, tube } from './kit.mjs';

export default [
  (() => {
    const s = scene();
    s.tint(oval(58, 172, 30, 7), C.lav).line(sm([[34, 172], [58, 178], [84, 171]]), sm([[44, 168], [70, 167]]));
    ground(s, 124, 178, 26);
    const cloud = puff(58, 42, 40, 22, 7, 0.16, 3);
    s.fill(cloud, C.lav).dots(cloud, C.lavDot, 14, 1.1);
    s.line(sm([[46, 38], [52, 34], [58, 38]]), sm([[64, 38], [70, 34], [76, 38]]), sm([[54, 52], [61, 48], [68, 52]]));
    s.line(...[[28, 72], [42, 80], [56, 70], [70, 80], [36, 96], [52, 104], [66, 94]].map(([x, y]) => sm([[x, y], [x - 3, y + 9]])));
    s.line(sm([[112, 60], [112, 118], [106, 124], [100, 118]]));
    s.fill(shape([[72, 88], [80, 66], [112, 52], [144, 66], [152, 88], [139, 82], [125, 88], [112, 82], [99, 88], [85, 82]]), C.pink).dots(shape([[80, 84], [90, 64], [112, 56], [104, 80]]), C.pinkDot, 10, 1.1);
    s.line(sm([[112, 52], [100, 70], [99, 88]]), sm([[112, 52], [124, 70], [125, 88]]));
    person(s, 126, 142, { k: 0.85, pose: 'walk', shirt: C.olive, armB: [[-3, -33], [-12, -27], [-15, -34]], head: { hair: 'dark' } });
    return s.done('sc-rain-umbrella', 'Rainy day umbrella', ['rain', 'weather', 'umbrella', 'cloud', 'protection', 'insurance']);
  })(),

  (() => {
    const s = scene();
    ground(s, 100, 178, 36);
    s.line(...[[40, 40], [160, 46], [52, 84], [150, 92], [34, 120], [166, 124]].map(([x, y], i) => (i % 2 ? sm([[x, y], [x + 4, y - 6]]) : sm([[x, y], [x + 5, y + 3]]))));
    s.fill(star(152, 64, 7, 3.2, 5), C.olive).fill(star(46, 100, 6, 2.8, 5), C.pink);
    const cup = [[78, 24], [122, 24], [119, 48], [108, 58], [92, 58], [81, 48]];
    s.line(sm([[80, 30], [66, 30], [68, 44], [82, 48]]), sm([[120, 30], [134, 30], [132, 44], [118, 48]]));
    s.fill(shape(cup), C.olive).dots(shape(cup), C.oliveDot, 8, 1);
    s.fill(poly([[96, 58], [104, 58], [105, 66], [95, 66]], true), C.olive).fill(rrect(84, 66, 32, 8, 2), C.ink);
    s.fill(star(100, 38, 8, 3.6, 5), C.white);
    person(s, 100, 143, { pose: 'lift', shirt: C.lav, pants: C.lav, paws: true, handC: C.lav, tummy: C.white, headLast: true, armB: [[-8, -33], [-24, -48], [-15, -72]], armF: [[8, -33], [24, -48], [15, -72]], headFn: (q, x, y, r) => bearFront(q, x, y + 2, r) });
    return s.done('sc-bear-trophy', 'Bear with a trophy', ['trophy', 'winner', 'award', 'success', 'bear', 'celebrate']);
  })(),

  (() => {
    const s = scene();
    ground(s, 96, 176, 60, 6);
    const base = poly([[38, 158], [154, 158], [166, 170], [26, 170]], true);
    s.fill(base, C.white).hatch(base, { angle: -20 }).line(sm([[84, 164], [108, 164]]));
    s.fill(rrect(44, 90, 104, 70, 6), C.white).fill(rect(52, 98, 88, 54), C.lav).dots(rect(52, 98, 88, 54), C.lavDot, 14, 1);
    s.fill(puff(96, 140, 26, 11, 6, 0.2, 5), C.white).fill(puff(74, 146, 14, 8, 5, 0.2, 9), C.white).fill(puff(118, 146, 14, 8, 5, 0.2, 2), C.white);
    s.fill(shape([[86, 118], [80, 134], [90, 128]]), C.olive).fill(shape([[106, 118], [112, 134], [102, 128]]), C.olive);
    s.fill(shape([[90, 120], [102, 120], [96, 134]]), C.pink);
    s.fill(shape([[96, 30], [108, 50], [108, 120], [84, 120], [84, 50]]), C.white).hatch(shape([[100, 40], [108, 50], [108, 120], [98, 120]]), { angle: 70, gap: 3 });
    s.fill(shape([[96, 30], [107, 48], [85, 48]]), C.pink).fill(oval(96, 70, 7, 7), C.olive).line(sm([[84, 100], [108, 100]]));
    s.line(swoosh(96, 120, 54, 205, 235), swoosh(96, 120, 54, -55, -25));
    return s.done('sc-rocket-launch', 'Rocket launch from a laptop', ['rocket', 'launch', 'startup', 'laptop', 'product', 'growth']);
  })(),

  (() => {
    const s = scene();
    ground(s, 100, 176, 70, 5);
    s.line(sm([[22, 172], [178, 172]]));
    const bars = [[26, 140, C.lav], [68, 122, C.pink], [110, 104, C.olive]];
    for (const [x, y, c] of bars) s.fill(rect(x, y, 34, 172 - y), c).dots(rect(x, y, 34, 172 - y), c === C.olive ? C.oliveDot : c === C.lav ? C.lavDot : C.pinkDot, 6, 1);
    s.line(poly([[30, 128], [62, 110], [76, 116], [104, 92]]), poly([[96, 90], [106, 90], [104, 100]]));
    s.line(sm([[152, 104], [152, 40]])).fill(shape([[152, 40], [178, 48], [152, 58]]), C.pink);
    person(s, 128, 77, { k: 0.66, pose: 'cheer', shirt: C.white, pants: C.lav, head: { hair: 'bun' } });
    s.line(swoosh(128, 40, 26, 200, 230, 2, 5), swoosh(128, 40, 26, -50, -20, 2, 5));
    return s.done('sc-chart-climb', 'Top of the growth chart', ['growth', 'chart', 'success', 'goal', 'progress', 'business']);
  })(),

  (() => {
    const s = scene();
    ground(s, 100, 160, 72, 5);
    const scr = laptop(s, 100, 156, 120, C.white, { dots: false });
    s.line([0, 1, 2, 3].map((i) => poly([[scr.x + 10 + (i % 2) * 10, scr.y + 12 + i * 10], [scr.x + scr.w - 30 - i * 8, scr.y + 12 + i * 10]])).join(' '));
    s.line(sm([[150, 126], [168, 122], [174, 108], [164, 100]]));
    const body = shape([[60, 140], [72, 120], [104, 112], [140, 118], [154, 132], [140, 144], [100, 146], [70, 146]]);
    s.fill(body, C.pink).dots(body, C.pinkDot, 12, 1.1);
    s.fill(shape([[118, 132], [134, 128], [146, 136], [132, 142]]), C.pink).line(sm([[96, 128], [118, 124]]));
    cat(s, 66, 120, 17, { mood: 'sleep' });
    s.line(poly([[132, 40], [144, 40], [132, 52], [144, 52]]), poly([[150, 22], [164, 22], [150, 36], [164, 36]]), poly([[120, 62], [128, 62], [120, 70], [128, 70]]));
    return s.done('sc-cat-laptop', 'Cat asleep on the laptop', ['cat', 'sleep', 'laptop', 'work from home', 'tired', 'rest']);
  })(),

  (() => {
    const s = scene();
    ground(s, 124, 176, 34);
    clock(s, 56, 74, 38, C.lav);
    s.line(sm([[70, 118], [92, 118]]), sm([[64, 130], [90, 130]]), sm([[74, 142], [94, 142]]));
    person(s, 124, 140, { pose: 'run', shirt: C.pink, head: { hair: 'dark', mood: 'shout' } });
    s.fill(shape([[166, 70], [170, 78], [166, 82], [162, 78]]), C.white).fill(shape([[174, 84], [177, 90], [174, 93], [171, 90]]), C.white);
    return s.done('sc-deadline-run', 'Racing the clock', ['deadline', 'time', 'clock', 'hurry', 'late', 'stress']);
  })(),

  (() => {
    const s = scene();
    ground(s, 82, 178, 30);
    bulb(s, 138, 58, 24, C.pink);
    s.dots(oval(138, 54, 18, 16), C.pinkDot, 8, 1);
    s.fill(oval(112, 98, 4, 4), C.white).fill(oval(120, 88, 5.5, 5.5), C.white);
    person(s, 80, 140, { pose: 'think', shirt: C.olive, head: { hair: 'cap', capC: C.lav } });
    return s.done('sc-idea-bulb', 'Bright idea', ['idea', 'lightbulb', 'think', 'creative', 'solution', 'brainstorm']);
  })(),

  (() => {
    const s = scene();
    ground(s, 100, 178, 80, 5);
    const right = poly([[100, 74], [148, 74], [148, 134], [100, 134], [100, 112], [108, 112], [108, 96], [100, 96]], true);
    s.fill(right, C.olive).dots(right, C.oliveDot, 10, 1.1);
    const left = 'M52,74 L100,74 L100,96 A9,9 0 1,1 100,112 L100,134 L52,134 Z';
    s.fill(left, C.lav).dots(left, C.lavDot, 10, 1.1);
    person(s, 34, 146, { k: 0.85, pose: 'hold', armB: [[0, -33], [12, -24], [22, -26]], armF: [[6, -33], [16, -22], [25, -24]], shirt: C.pink, head: { hair: 'dark' } });
    person(s, 166, 146, { k: 0.85, face: -1, pose: 'hold', armB: [[0, -33], [12, -24], [22, -26]], armF: [[6, -33], [16, -22], [25, -24]], shirt: C.white, pants: C.olive, head: { hair: 'bob', hairC: C.pink } });
    s.fill(sparkle(100, 52, 9), C.white).fill(sparkle(118, 40, 5), C.white).fill(sparkle(84, 40, 5), C.white);
    return s.done('sc-puzzle-team', 'Puzzle pieces fit together', ['teamwork', 'puzzle', 'partnership', 'collaboration', 'solution', 'together']);
  })(),

  (() => {
    const s = scene();
    ground(s, 140, 178, 30);
    s.fill(rect(136, 108, 8, 68), C.white).hatch(rect(136, 108, 8, 68), { angle: 70 });
    s.line(sm([[170, 100], [170, 66]])).fill(poly([[170, 66], [183, 70], [170, 76]], true), C.pink);
    const box = 'M108,110 L108,82 A32,26 0 0,1 172,82 L172,110 Z';
    s.fill(box, C.olive).dots(box, C.oliveDot, 12, 1.1).line(sm([[122, 110], [122, 84], [128, 70], [140, 62]]));
    bird(s, 138, 42, 12, { face: -1, c: C.lav, wing: C.pink, beak: C.olive });
    s.line(dashes((t) => [24 + t * 30 + Math.sin(t * 7) * 10, 150 - t * 70 - Math.cos(t * 7) * 8], 7));
    const top = poly([[100, 56], [36, 64], [58, 80]], true), low = poly([[100, 56], [58, 80], [52, 96]], true);
    s.fill(top, C.white).fill(low, C.white).hatch(low, { angle: 30 });
    s.line(swoosh(118, 40, 8, -40, 10, 2, 5));
    return s.done('sc-mail-plane', 'Paper plane mail', ['email', 'mail', 'send', 'message', 'newsletter', 'delivery']);
  })(),

  (() => {
    const s = scene();
    ground(s, 96, 176, 60, 5);
    doc(s, 70, 132, 60, 74, -10, { c: C.white });
    doc(s, 104, 136, 60, 74, 6, { c: C.white });
    s.line(sm([[132, 106], [168, 150]]));
    s.fill(tube([[134, 108], [170, 152]], 14, 14), C.ink);
    s.fill(oval(112, 80, 36, 36), C.olive).fill(oval(112, 80, 28, 28), C.lav);
    s.hatch(oval(112, 80, 28, 28), { angle: -45, gap: 5, c: C.white, w: 1.6 });
    s.fill(shape([[90, 82], [112, 68], [134, 82], [112, 94]]), C.white).fill(oval(112, 81, 8, 8), C.ink).fill(oval(115, 78, 2.4, 2.4), C.white);
    s.line(sm([[92, 62], [100, 56]]), sm([[128, 56], [136, 62]]));
    s.fill(sparkle(160, 46, 9), C.pink).fill(sparkle(46, 62, 6), C.olive);
    return s.done('sc-search-eye', 'Searching with a magnifier', ['search', 'find', 'research', 'magnifier', 'review', 'seo']);
  })(),
];
