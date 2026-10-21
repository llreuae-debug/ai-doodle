import { C, at, bird, bulb, dashes, doc, ground, handOf, head, heart, leaf, mitt, oval, person, plant, poly, puff, rect, ring, rrect, scene, shape, shoe, sm, sparkle, star, swoosh, tube } from './kit.mjs';

export default [
  // 21. sc-chess-strategy: King chess piece leading friendly pawn pieces on chessboard
  (() => {
    const s = scene();
    ground(s, 100, 178, 54, 5);
    // Chessboard perspective plane at base
    const board = poly([[46, 172], [154, 172], [140, 148], [60, 148]], true);
    s.fill(board, C.white).hatch(board, { angle: -30, gap: 4 });
    s.line(
      sm([[72, 172], [80, 148]]),
      sm([[100, 172], [100, 148]]),
      sm([[128, 172], [120, 148]]),
      sm([[53, 160], [147, 160]])
    );
    // King piece in center
    const kingBase = poly([[86, 154], [114, 154], [110, 144], [90, 144]], true);
    s.fill(kingBase, C.pink);
    const kingBody = poly([[90, 144], [110, 144], [108, 96], [92, 96]], true);
    s.fill(kingBody, C.pink).dots(kingBody, C.pinkDot, 8, 1.0);
    // King crown and cross
    const crown = shape([[86, 96], [114, 96], [116, 78], [106, 84], [100, 74], [94, 84], [84, 78]]);
    s.fill(crown, C.pink);
    s.fill(rrect(98, 62, 4, 12, 1), C.ink);
    s.fill(rrect(94, 66, 12, 4, 1), C.ink);
    // Friendly small pawn pieces flanking king
    // Left pawn in olive
    s.fill(poly([[64, 158], [80, 158], [78, 142], [66, 142]], true), C.olive);
    s.fill(oval(72, 134, 7, 7), C.olive).dots(oval(72, 134, 7, 7), C.oliveDot, 4, 0.9);
    // Right pawn in lavender
    s.fill(poly([[120, 158], [136, 158], [134, 142], [122, 142]], true), C.lav);
    s.fill(oval(128, 134, 7, 7), C.lav).dots(oval(128, 134, 7, 7), C.lavDot, 4, 0.9);
    // Strategy spark / light above king
    s.fill(sparkle(100, 48, 6), C.olive);
    return s.done('sc-chess-strategy', 'Chess strategy and leadership', ['chess', 'strategy', 'leadership', 'tactics', 'game', 'planning', 'business']);
  })(),

  // 22. sc-bridge-connect: Two characters building an arched bridge between two cliff peaks
  (() => {
    const s = scene();
    ground(s, 100, 178, 62, 5);
    // Left mountain cliff
    const cliffL = shape([[24, 178], [68, 178], [66, 120], [38, 120], [22, 148]]);
    s.fill(cliffL, C.lav).dots(cliffL, C.lavDot, 12, 1.0);
    // Right mountain cliff
    const cliffR = shape([[132, 120], [162, 120], [176, 148], [174, 178], [134, 178]]);
    s.fill(cliffR, C.lav).dots(cliffR, C.lavDot, 12, 1.0);
    // Arched stone suspension bridge connecting the cliffs
    const arch = shape([[52, 124], [100, 108], [148, 124], [146, 136], [100, 120], [54, 136]]);
    s.fill(arch, C.white).hatch(arch, { angle: -45, gap: 3.5 });
    s.line(sm([[54, 124], [100, 108], [146, 124]]));
    // Bridge vertical suspension cables
    s.line(
      sm([[74, 116], [74, 128]]),
      sm([[100, 108], [100, 120]]),
      sm([[126, 116], [126, 128]])
    );
    // Person on left cliff reaching out
    person(s, 48, 118, { k: 0.65, pose: 'cheer', face: 1, shirt: C.pink, pants: C.ink, head: { hair: 'dark' } });
    // Person on right cliff cheering
    person(s, 152, 118, { k: 0.65, pose: 'cheer', face: -1, shirt: C.olive, pants: C.ink, head: { hair: 'bun' } });
    // River valley water curves far below
    s.line(
      sm([[74, 168], [100, 164], [126, 168]]),
      sm([[80, 174], [100, 170], [120, 174]])
    );
    // Partnership celebration stars above
    s.fill(sparkle(100, 78, 6), C.pink);
    return s.done('sc-bridge-connect', 'Building a bridge between teams', ['bridge', 'connect', 'partnership', 'teamwork', 'collaboration', 'unity', 'across']);
  })(),

  // 23. sc-bullseye-arrows: Triple arrows clustered right in dead center of gold bullseye
  (() => {
    const s = scene();
    ground(s, 100, 178, 48, 5);
    // Tripod easel legs supporting target
    s.line(
      sm([[100, 112], [66, 174]]),
      sm([[100, 112], [134, 174]]),
      sm([[100, 112], [100, 174]]),
      sm([[78, 152], [122, 152]])
    );
    // Target concentric circular rings
    // Outer white ring
    s.fill(oval(100, 88, 38, 38), C.white).hatch(oval(100, 88, 38, 38), { angle: 30, gap: 4 });
    // Middle lavender ring
    s.fill(oval(100, 88, 28, 28), C.lav).dots(oval(100, 88, 28, 28), C.lavDot, 8, 1.0);
    // Inner olive ring
    s.fill(oval(100, 88, 18, 18), C.olive).dots(oval(100, 88, 18, 18), C.oliveDot, 6, 1.0);
    // Center pink bullseye spot
    s.fill(oval(100, 88, 8, 8), C.pink);
    // 3 Arrows striking dead center
    // Arrow 1: Straight center
    s.line(sm([[100, 88], [62, 54]]));
    s.fill(poly([[62, 54], [56, 44], [64, 48], [70, 46]], true), C.pink);
    // Arrow 2: Slightly above
    s.line(sm([[98, 86], [68, 44]]));
    s.fill(poly([[68, 44], [62, 34], [70, 38], [76, 36]], true), C.olive);
    // Arrow 3: Slightly below
    s.line(sm([[102, 90], [66, 68]]));
    s.fill(poly([[66, 68], [60, 58], [68, 62], [74, 60]], true), C.lav);
    // Impact exclamation lines
    s.line(
      sm([[108, 82], [118, 76]]),
      sm([[112, 92], [124, 94]]),
      sm([[106, 100], [116, 108]])
    );
    s.fill(sparkle(126, 74, 5), C.pink);
    return s.done('sc-bullseye-arrows', 'Hitting the bullseye every time', ['target', 'aim', 'goal', 'bullseye', 'accuracy', 'focus', 'success']);
  })(),

  // 24. sc-flying-piggy: Flying piggy bank with little wings dropping gold coins into chest
  (() => {
    const s = scene();
    ground(s, 100, 178, 52, 5);
    // Open treasure chest at bottom right
    const chest = poly([[108, 142], [152, 142], [156, 172], [104, 172]], true);
    s.fill(chest, C.olive).dots(chest, C.oliveDot, 10, 1.0);
    s.fill(rrect(102, 138, 54, 8, 2), C.pink);
    s.fill(oval(128, 142, 4, 4), C.white);
    // Gold coins piled inside chest
    s.fill(oval(120, 136, 6, 6), C.white);
    s.fill(oval(132, 134, 6, 6), C.white);
    s.fill(oval(142, 138, 6, 6), C.white);
    // Flying piggy bank top left
    // Little feathered wings fluttering
    const wing = shape([[68, 56], [82, 38], [94, 48], [84, 62]]);
    s.fill(wing, C.white);
    s.line(sm([[76, 52], [86, 44]]), sm([[80, 58], [90, 50]]));
    // Chubby round pig body in pink
    const pigBody = oval(68, 76, 24, 20);
    s.fill(pigBody, C.pink).dots(pigBody, C.pinkDot, 10, 1.1);
    // Pig snout on right
    s.fill(oval(90, 78, 6, 8), C.lav);
    s.solid(oval(90, 76, 1.4, 1.4)).solid(oval(90, 80, 1.4, 1.4));
    // Happy squinting eye & floppy ear
    s.line(sm([[76, 70], [80, 73], [84, 70]]));
    s.fill(shape([[62, 60], [70, 54], [72, 66]]), C.pink);
    // Curly tail on left
    s.line(sm([[44, 76], [38, 72], [42, 66], [46, 72]]));
    // Money slot on back
    s.fill(rrect(64, 58, 10, 3, 1), C.ink);
    // Floating coins raining down into chest
    s.fill(oval(92, 104, 7, 7), C.white);
    s.fill(oval(108, 118, 7, 7), C.white);
    s.fill(oval(124, 126, 7, 7), C.white);
    s.line(
      dashes((t) => [86 + t * 40, 88 + t * 44], 4)
    );
    return s.done('sc-flying-piggy', 'Flying piggy bank and savings', ['piggy bank', 'money', 'savings', 'wealth', 'finance', 'invest', 'flying']);
  })(),

  // 25. sc-handshake-deal: Warm stylized handshake over signed contract with celebration stars
  (() => {
    const s = scene();
    ground(s, 100, 178, 54, 5);
    // Signed contract paper resting on desk
    const contract = shape([[68, 114], [132, 114], [136, 168], [64, 168]]);
    s.fill(contract, C.white).hatch(contract, { angle: -30, gap: 4 });
    s.line(
      sm([[76, 126], [108, 126]]),
      sm([[76, 134], [122, 134]]),
      sm([[76, 142], [116, 142]]),
      sm([[76, 154], [92, 150], [108, 156]]) // signature squiggle
    );
    // Red wax seal on contract
    s.fill(oval(120, 154, 7, 7), C.pink).dots(oval(120, 154, 7, 7), C.pinkDot, 4, 0.8);
    // Two hands meeting in a firm handshake above contract
    // Left arm sleeve (lavender)
    const armL = tube([[28, 88], [58, 92], [82, 96]], 16, 14);
    s.fill(armL, C.lav).dots(armL, C.lavDot, 6, 1.0);
    s.fill(rrect(80, 88, 6, 16, 2), C.white); // white shirt cuff
    // Right arm sleeve (olive)
    const armR = tube([[172, 88], [142, 92], [118, 96]], 16, 14);
    s.fill(armR, C.olive).dots(armR, C.oliveDot, 6, 1.0);
    s.fill(rrect(114, 88, 6, 16, 2), C.white); // white shirt cuff
    // Clasping hands in center
    const handL = shape([[86, 92], [102, 92], [106, 104], [86, 104]]);
    const handR = shape([[114, 92], [98, 92], [96, 106], [114, 106]]);
    s.fill(handL, C.white).fill(handR, C.white);
    s.line(
      sm([[94, 94], [94, 102]]),
      sm([[100, 94], [100, 102]]),
      sm([[106, 94], [106, 102]])
    );
    // Deal celebratory sparkles above handshake
    s.fill(sparkle(100, 64, 7), C.pink);
    s.fill(sparkle(78, 56, 4), C.olive);
    s.fill(sparkle(122, 56, 4), C.lav);
    return s.done('sc-handshake-deal', 'Agreement and handshake deal', ['handshake', 'deal', 'agreement', 'partnership', 'trust', 'contract', 'business']);
  })(),

  // 26. sc-hourglass-sand: Sleek hourglass with flowing sand measuring focus time
  (() => {
    const s = scene();
    ground(s, 100, 178, 48, 5);
    // Wooden top and bottom plates
    s.fill(rrect(66, 42, 68, 10, 3), C.olive).dots(rrect(66, 42, 68, 10, 3), C.oliveDot, 6, 1.0);
    s.fill(rrect(66, 156, 68, 10, 3), C.olive).dots(rrect(66, 156, 68, 10, 3), C.oliveDot, 6, 1.0);
    // Vertical side pillars
    s.line(sm([[72, 52], [72, 156]]), sm([[128, 52], [128, 156]]));
    // Glass double bulbs
    const glass = shape([
      [76, 52], [124, 52], [118, 96], [104, 104], [104, 104],
      [118, 112], [124, 156], [76, 156], [82, 112], [96, 104],
      [82, 96]
    ]);
    s.fill(glass, C.white);
    // Sand in top bulb draining down
    const sandTop = shape([[82, 68], [118, 68], [110, 96], [102, 102], [98, 102], [90, 96]]);
    s.fill(sandTop, C.pink).dots(sandTop, C.pinkDot, 8, 1.0);
    // Trickling stream of sand falling through waist
    s.line(sm([[100, 102], [100, 134]]));
    // Accumulated pyramid pile of sand in bottom bulb
    const sandBot = shape([[82, 154], [118, 154], [112, 142], [100, 132], [88, 142]]);
    s.fill(sandBot, C.pink).dots(sandBot, C.pinkDot, 8, 1.0);
    // Time sparkle waves around glass
    s.line(
      sm([[60, 98], [54, 104], [60, 110]]),
      sm([[140, 98], [146, 104], [140, 110]])
    );
    s.fill(sparkle(142, 80, 5), C.lav);
    return s.done('sc-hourglass-sand', 'Hourglass measuring focus time', ['time', 'hourglass', 'deadline', 'focus', 'productivity', 'patience', 'speed']);
  })(),

  // 27. sc-growth-sprout-stairs: Staircase of ascending books leading to flourishing sprout
  (() => {
    const s = scene();
    ground(s, 100, 178, 58, 5);
    // Book stack 1 (Lowest) on left
    const b1 = rrect(38, 150, 36, 22, 3);
    s.fill(b1, C.lav).dots(b1, C.lavDot, 5, 0.9);
    s.fill(rect(40, 154, 32, 14), C.white).hatch(rect(40, 154, 32, 14), { angle: 0, gap: 3.5, c: C.pale });
    // Book stack 2 (Middle)
    const b2 = rrect(72, 126, 38, 46, 3);
    s.fill(b2, C.pink).dots(b2, C.pinkDot, 8, 0.9);
    s.fill(rect(74, 130, 34, 38), C.white).hatch(rect(74, 130, 34, 38), { angle: 0, gap: 3.5, c: C.pale });
    // Book stack 3 (Highest) on right
    const b3 = rrect(108, 100, 42, 72, 3);
    s.fill(b3, C.olive).dots(b3, C.oliveDot, 10, 0.9);
    s.fill(rect(110, 104, 38, 64), C.white).hatch(rect(110, 104, 38, 64), { angle: 0, gap: 3.5, c: C.pale });
    // Growth sprout blossoming from top book
    s.line(sm([[128, 100], [128, 58]]));
    s.fill(leaf(128, 76, 22, -45, 0.4), C.olive).dots(leaf(128, 76, 22, -45, 0.4), C.oliveDot, 4, 0.8);
    s.fill(leaf(128, 68, 20, -135, 0.4), C.olive).dots(leaf(128, 68, 20, -135, 0.4), C.oliveDot, 4, 0.8);
    // Blooming flower bud on top
    s.fill(oval(128, 54, 7, 7), C.pink);
    s.fill(sparkle(128, 40, 5), C.lav);
    // Ascending dotted progress curve
    s.line(dashes((t) => [46 + t * 76, 146 - t * 78], 5));
    return s.done('sc-growth-sprout-stairs', 'Stepping stones of learning', ['learning', 'growth', 'education', 'books', 'knowledge', 'study', 'progress']);
  })(),

  // 28. sc-broadcast-tower: Retro broadcast radio tower sending soundwave ripples across hills
  (() => {
    const s = scene();
    ground(s, 100, 178, 52, 5);
    // Rolling hills at horizon
    const hillL = shape([[28, 178], [76, 178], [74, 154], [30, 164]]);
    const hillR = shape([[118, 178], [170, 178], [168, 160], [120, 152]]);
    s.fill(hillL, C.lav).dots(hillL, C.lavDot, 6, 0.9);
    s.fill(hillR, C.lav).dots(hillR, C.lavDot, 6, 0.9);
    // Lattice radio broadcast tower
    // Base legs
    s.line(
      sm([[100, 82], [76, 172]]),
      sm([[100, 82], [124, 172]]),
      sm([[82, 154], [118, 154]]),
      sm([[88, 134], [112, 134]]),
      sm([[92, 114], [108, 114]]),
      sm([[82, 154], [112, 134]]),
      sm([[118, 154], [88, 134]]),
      sm([[88, 134], [108, 114]]),
      sm([[112, 134], [92, 114]])
    );
    // Top antenna mast
    s.line(sm([[100, 82], [100, 48]]));
    // Glowing broadcast beacon ball
    s.fill(oval(100, 46, 8, 8), C.pink).dots(oval(100, 46, 8, 8), C.pinkDot, 4, 0.8);
    // Concentric transmission radio broadcast waves
    s.line(
      swoosh(100, 46, 16, 130, 230, 3, 7),
      swoosh(100, 46, 16, -50, 50, 3, 7)
    );
    s.fill(sparkle(100, 24, 5), C.olive);
    return s.done('sc-broadcast-tower', 'Radio broadcast across hills', ['broadcast', 'radio', 'podcast', 'reach', 'marketing', 'communication', 'media']);
  })(),

  // 29. sc-lightbulb-gears: Translucent lightbulb filled with clockwork precision gears
  (() => {
    const s = scene();
    ground(s, 100, 178, 48, 5);
    // Glass bulb outline
    const bulbGlass = shape([
      [84, 142], [76, 126], [66, 104], [66, 80],
      [80, 56], [100, 48], [120, 56], [134, 80],
      [134, 104], [124, 126], [116, 142]
    ]);
    s.fill(bulbGlass, C.white);
    // Screw cap base
    s.fill(rrect(84, 142, 32, 14, 3), C.pink);
    s.fill(poly([[88, 156], [112, 156], [106, 166], [94, 166]], true), C.ink);
    // Interlocking precision gears inside bulb
    // Large gear in olive (center left)
    s.fill(oval(92, 84, 18, 18), C.olive).dots(oval(92, 84, 18, 18), C.oliveDot, 8, 1.0);
    s.fill(oval(92, 84, 6, 6), C.white);
    s.line(
      sm([[92, 62], [92, 66]]),
      sm([[92, 102], [92, 106]]),
      sm([[70, 84], [74, 84]]),
      sm([[110, 84], [114, 84]])
    );
    // Smaller interlocking gear in lavender (top right)
    s.fill(oval(114, 104, 13, 13), C.lav).dots(oval(114, 104, 13, 13), C.lavDot, 6, 0.9);
    s.fill(oval(114, 104, 4, 4), C.white);
    // Idea glow sparks around bulb
    s.line(
      sm([[52, 64], [42, 56]]),
      sm([[148, 64], [158, 56]]),
      sm([[100, 36], [100, 24]])
    );
    s.fill(sparkle(146, 88, 5), C.pink);
    return s.done('sc-lightbulb-gears', 'Gears turning inside an idea', ['gears', 'mechanics', 'engineering', 'idea', 'innovation', 'problem solving', 'process']);
  })(),

  // 30. sc-scales-balance: Balanced brass scales weighing quality vs quantity
  (() => {
    const s = scene();
    ground(s, 100, 178, 50, 5);
    // Central balance pillar and base
    s.fill(poly([[78, 172], [122, 172], [116, 160], [84, 160]], true), C.white).hatch(poly([[78, 172], [122, 172], [116, 160], [84, 160]], true), { angle: -30 });
    s.fill(poly([[97, 160], [103, 160], [103, 76], [97, 76]], true), C.pink);
    s.fill(oval(100, 74, 6, 6), C.ink);
    // Horizontal balanced balance beam
    s.fill(rrect(50, 72, 100, 5, 2), C.pink);
    // Left suspended pan (carrying sparkling gem)
    s.line(sm([[60, 76], [48, 114]]), sm([[60, 76], [72, 114]]));
    const panL = shape([[44, 114], [76, 114], [72, 126], [48, 126]]);
    s.fill(panL, C.olive).dots(panL, C.oliveDot, 5, 0.9);
    // Faceted diamond gem on left pan
    const gemL = poly([[60, 94], [70, 104], [60, 114], [50, 104]], true);
    s.fill(gemL, C.white);
    s.fill(sparkle(60, 84, 4), C.pink);
    // Right suspended pan (carrying neat weights)
    s.line(sm([[140, 76], [128, 114]]), sm([[140, 76], [152, 114]]));
    const panR = shape([[124, 114], [156, 114], [152, 126], [128, 126]]);
    s.fill(panR, C.olive).dots(panR, C.oliveDot, 5, 0.9);
    // Weight cylinders on right pan
    s.fill(rrect(132, 102, 16, 12, 2), C.lav);
    // Harmony balance aura at top
    s.fill(sparkle(100, 56, 5), C.olive);
    return s.done('sc-scales-balance', 'Balanced scales of justice', ['scales', 'balance', 'justice', 'equality', 'fair', 'compare', 'ethics']);
  })(),
];
