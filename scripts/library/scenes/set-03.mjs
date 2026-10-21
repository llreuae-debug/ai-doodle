import { C, at, bearFront, bubble, dashes, doc, ground, head, heart, leaf, mitt, oval, person, phone, poly, puff, rect, rrect, scene, shape, sm, sparkle, star, swoosh, tube } from './kit.mjs';

/** Envelope centred at (x, y). */
const envelope = (s, x, y, w, h, c = C.white, deg = 0) => {
  const P = (pts) => at(pts, x, y, 1, 1, deg);
  s.fill(poly(P([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]), true), c);
  s.line(poly(P([[-w / 2, -h / 2], [0, h * 0.1], [w / 2, -h / 2]])));
};

export default [
  (() => {
    const s = scene();
    ground(s, 100, 178, 30);
    s.line(dashes((t) => [100 + Math.cos(Math.PI * (1 + t)) * 58, 92 + Math.sin(Math.PI * (1 + t)) * 52], 10));
    person(s, 100, 140, { pose: 'cheer', armB: [[-4, -33], [-20, -38], [-32, -50]], armF: [[6, -33], [22, -38], [34, -50]], shirt: C.olive, pants: C.pink, head: { hair: 'dark', mood: 'grin' } });
    s.fill(heart(44, 74, 13), C.pink).fill(star(100, 34, 15, 7, 5), C.lav);
    envelope(s, 156, 74, 30, 22, C.white, 12);
    s.line(swoosh(44, 74, 18, 100, 150, 2, 5), swoosh(156, 74, 20, 30, 80, 2, 5));
    return s.done('sc-juggling', 'Juggling tasks', ['multitasking', 'juggle', 'busy', 'tasks', 'balance', 'skills']);
  })(),

  (() => {
    const s = scene();
    s.fill(oval(150, 46, 16, 16), C.pink).dots(oval(150, 46, 16, 16), C.pinkDot, 6, 1);
    s.fill(puff(46, 54, 22, 11, 5, 0.2, 3), C.white);
    const back = poly([[96, 172], [140, 92], [182, 172]], true);
    s.fill(back, C.lav).dots(back, C.lavDot, 10, 1.1);
    const mtn = poly([[18, 172], [92, 60], [150, 172]], true);
    s.fill(mtn, C.olive).dots(mtn, C.oliveDot, 14, 1.1);
    s.fill(poly([[92, 60], [106, 82], [98, 78], [90, 88], [82, 78], [77, 83]], true), C.white);
    s.hatch(poly([[92, 60], [150, 172], [118, 172]], true), { angle: 60, c: C.oliveDot });
    s.line(sm([[94, 58], [94, 24]])).fill(poly([[94, 24], [116, 31], [94, 38]], true), C.pink);
    person(s, 84, 44, { k: 0.38, pose: 'cheer', shirt: C.pink, head: { hair: 'cap', capC: C.lav } });
    return s.done('sc-summit', 'Reaching the summit', ['mountain', 'summit', 'goal', 'achievement', 'adventure', 'challenge']);
  })(),

  (() => {
    const s = scene();
    s.hatch(oval(100, 172, 52, 7), { angle: -60, gap: 3.2 });
    s.fill(oval(100, 168, 46, 10), C.lav).dots(oval(100, 168, 46, 10), C.lavDot, 8, 1);
    person(s, 100, 150, { pose: 'stand', legB: [[-4, 0], [-30, 10], [6, 16]], legF: [[4, 0], [30, 10], [-6, 16]], armB: [[-4, -33], [-16, -16], [-28, -2]], armF: [[6, -33], [18, -16], [30, -2]], shirt: C.pink, pants: C.olive, paws: false, head: { hair: 'bun', mood: 'sleep' } });
    s.fill(leaf(36, 70, 22, -30), C.olive).fill(leaf(160, 56, 20, -150), C.olive).fill(leaf(150, 110, 16, 200), C.lav);
    s.line(sm([[40, 112], [30, 100], [40, 92], [48, 100], [40, 104]]), sm([[162, 82], [172, 72], [164, 64], [156, 70], [162, 74]]));
    s.fill(sparkle(56, 40, 6), C.white).fill(sparkle(140, 30, 5), C.white);
    return s.done('sc-meditate', 'Calm meditation', ['meditation', 'calm', 'mindfulness', 'relax', 'yoga', 'wellbeing']);
  })(),

  (() => {
    const s = scene();
    s.line(sm([[20, 170], [180, 170]]));
    s.fill(rect(28, 170, 144, 10), C.white).hatch(rect(28, 170, 144, 10), { angle: -20 });
    s.fill(tube([[78, 150], [68, 140]], 12, 12), C.lav).fill(tube([[120, 150], [130, 140]], 12, 12), C.lav);
    const body = shape([[60, 172], [64, 130], [84, 116], [116, 116], [136, 130], [140, 172]]);
    s.fill(body, C.lav).dots(body, C.lavDot, 10, 1).fill(oval(100, 148, 18, 18), C.white);
    bearFront(s, 100, 92, 30);
    s.line(sm([[70, 92], [72, 56], [100, 46], [128, 56], [130, 92]]));
    s.fill(rrect(62, 82, 14, 24, 6), C.olive).fill(rrect(124, 82, 14, 24, 6), C.olive);
    s.line(sm([[162, 170], [162, 132]]), sm([[148, 170], [176, 170]]));
    s.fill(rrect(150, 100, 24, 34, 12), C.pink).hatch(rrect(150, 100, 24, 34, 12), { angle: 0, gap: 4, c: C.pinkDot });
    s.line(swoosh(162, 116, 22, -75, -45, 3, 5));
    return s.done('sc-podcast', 'Podcast bear', ['podcast', 'microphone', 'audio', 'radio', 'bear', 'record']);
  })(),

  (() => {
    const s = scene();
    ground(s, 100, 178, 70, 5);
    s.fill(rrect(96, 66, 30, 30, 3), C.pink).fill(rrect(118, 56, 34, 40, 3), C.lav).fill(rrect(132, 76, 26, 22, 3), C.olive);
    s.line(sm([[111, 66], [111, 96]]), sm([[135, 56], [135, 80]]));
    const basket = poly([[86, 92], [170, 92], [160, 140], [96, 140]], true);
    s.fill(basket, C.white).line(poly([[100, 92], [104, 140]]), poly([[118, 92], [120, 140]]), poly([[136, 92], [136, 140]]), poly([[154, 92], [152, 140]]), poly([[88, 108], [166, 108]]), poly([[92, 124], [163, 124]]));
    s.line(sm([[96, 140], [100, 152], [160, 152]]), sm([[86, 92], [80, 104], [70, 104]]));
    s.fill(oval(106, 162, 8, 8), C.ink).fill(oval(152, 162, 8, 8), C.ink);
    person(s, 44, 140, { k: 0.95, pose: 'walk', armB: [[0, -33], [12, -32], [24, -36]], armF: [[6, -33], [18, -34], [27, -37]], shirt: C.lav, head: { hair: 'bob', hairC: C.olive, mood: 'grin' } });
    return s.done('sc-shopping', 'Shopping cart', ['shopping', 'cart', 'ecommerce', 'store', 'buy', 'order']);
  })(),

  (() => {
    const s = scene();
    const wingL = shape([[62, 92], [26, 70], [30, 82], [18, 86], [30, 96], [26, 106], [60, 110]]);
    const wingR = shape([[138, 92], [174, 70], [170, 82], [182, 86], [170, 96], [174, 106], [140, 110]]);
    s.fill(wingL, C.white).hatch(wingL, { angle: 40 }).fill(wingR, C.white).hatch(wingR, { angle: -40 });
    s.fill(rrect(54, 70, 92, 58, 8), C.lav).dots(rrect(54, 70, 92, 58, 8), C.lavDot, 12, 1.1);
    s.fill(rect(54, 82, 92, 10), C.ink).fill(rrect(64, 100, 18, 12, 3), C.pink).line(sm([[96, 116], [134, 116]]));
    for (const [x, y] of [[70, 150], [96, 166], [124, 146], [146, 170]]) s.fill(oval(x, y, 9, 9), C.olive).line(oval(x, y, 4.5, 4.5));
    s.line(swoosh(100, 98, 66, 150, 175, 2, 6), swoosh(100, 98, 66, 5, 30, 2, 6));
    return s.done('sc-flying-card', 'Flying payment card', ['payment', 'credit card', 'money', 'checkout', 'fast', 'finance']);
  })(),

  (() => {
    const s = scene();
    ground(s, 110, 178, 66, 5);
    const panels = [[[72, 70], [102, 62], [102, 160], [72, 168]], [[102, 62], [132, 70], [132, 168], [102, 160]], [[132, 70], [162, 62], [162, 160], [132, 168]]];
    panels.forEach((p, i) => s.fill(poly(p, true), [C.olive, C.pink, C.lav][i]).dots(poly(p, true), [C.oliveDot, C.pinkDot, C.lavDot][i], 6, 1));
    s.line(dashes((t) => [80 + t * 66, 150 - t * 60 - Math.sin(t * 6) * 10], 8));
    s.fill('M146,92 C146,78 160,74 164,86 C168,96 156,104 155,112 C150,104 146,100 146,92 Z', C.white).fill(oval(156, 88, 3.5, 3.5), C.ink);
    person(s, 42, 140, { k: 0.9, pose: 'point', armF: [[6, -33], [20, -34], [32, -30]], shirt: C.olive, pants: 'hatch', head: { hair: 'cap', capC: C.pink, mood: 'grin' } });
    return s.done('sc-travel-map', 'Planning the route', ['travel', 'map', 'route', 'journey', 'location', 'trip']);
  })(),

  (() => {
    const s = scene();
    s.fill(tube([[44, 170], [56, 150], [74, 136]], 22, 20), C.lav).fill(tube([[156, 170], [144, 150], [126, 136]], 22, 20), C.olive);
    s.fill(heart(100, 78, 46), C.pink).dots(heart(100, 78, 46), C.pinkDot, 16, 1.2);
    s.fill(mitt(80, 128, 13, 1, -20), C.white).fill(mitt(120, 128, 13, 1, -160), C.white);
    s.line(sm([[72, 62], [80, 54], [90, 58]]));
    s.fill(sparkle(40, 50, 8), C.white).fill(sparkle(162, 40, 7), C.white).fill(sparkle(160, 98, 5), C.white);
    return s.done('sc-heart-hands', 'Heart in hands', ['care', 'love', 'charity', 'health', 'kindness', 'support']);
  })(),

  (() => {
    const s = scene();
    ground(s, 100, 178, 60, 5);
    const books = [[44, 148, 112, 24, C.olive], [52, 124, 98, 24, C.pink], [40, 100, 116, 24, C.lav]];
    for (const [x, y, w, h, c] of books) s.fill(rrect(x, y, w, h, 4), c).fill(rect(x + w - 16, y + 4, 10, h - 8), C.white).line(sm([[x + 8, y + h / 2], [x + w - 28, y + h / 2]]));
    s.fill(shape([[72, 100], [70, 70], [78, 42], [88, 50], [112, 50], [122, 42], [130, 70], [128, 100]]), C.olive).dots(oval(100, 74, 26, 20), C.oliveDot, 8, 1);
    s.fill(oval(100, 86, 16, 14), C.white).line(sm([[92, 82], [96, 86], [100, 82], [104, 86], [108, 82]]), sm([[94, 92], [100, 96], [106, 92]]));
    s.fill(oval(88, 64, 10, 10), C.white).fill(oval(112, 64, 10, 10), C.white).solid(oval(89, 65, 4, 4)).solid(oval(111, 65, 4, 4));
    s.line(sm([[98, 64], [102, 64]])).fill(poly([[96, 72], [104, 72], [100, 80]], true), C.pink);
    return s.done('sc-owl-books', 'Wise owl on books', ['owl', 'books', 'learning', 'education', 'knowledge', 'study']);
  })(),

  (() => {
    const s = scene();
    ground(s, 80, 178, 30);
    person(s, 72, 140, { pose: 'hold', armB: [[0, -33], [12, -20], [24, -24]], armF: [[6, -33], [16, -20], [27, -24]], shirt: C.pink, pants: C.lav, head: { hair: 'dark', mood: 'shout', tilt: 12 } });
    phone(s, 106, 122, 18, 32, 14, C.olive);
    s.fill(oval(99, 130, 5, 5), C.white).fill(oval(106, 129, 5, 5), C.white);
    bubble(s, 146, 58, 50, 40, 122, 96, C.lav);
    s.fill('M134,66 C134,46 158,46 158,66 L162,70 L130,70 Z', C.white).fill(oval(146, 72, 4, 3), C.ink);
    s.line(sm([[162, 34], [170, 26]]), sm([[168, 46], [180, 42]]), sm([[128, 34], [122, 26]]));
    return s.done('sc-notification', 'New notification', ['notification', 'alert', 'phone', 'message', 'app', 'surprise']);
  })(),
];
