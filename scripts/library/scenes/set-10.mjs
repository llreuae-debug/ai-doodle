import { C, at, bird, bulb, dashes, doc, dog, ground, handOf, head, heart, leaf, mitt, oval, person, plant, poly, puff, rect, ring, rrect, scene, shape, shoe, sm, sparkle, star, swoosh, tube } from './kit.mjs';

export default [
  // 41. sc-mountain-flag: Mountain peak summit with victory flag planted against clouds
  (() => {
    const s = scene();
    ground(s, 100, 172, 52, 4);
    // Dramatic mountain peak summit
    const peak = shape([[28, 172], [100, 72], [172, 172], [138, 172], [100, 92], [62, 172]]);
    s.fill(peak, C.lav).dots(peak, C.lavDot, 14, 1.1);
    // Snow-capped peak facet (white with hatch)
    const snowCap = poly([[100, 72], [122, 114], [100, 106], [80, 118]], true);
    s.fill(snowCap, C.white).hatch(snowCap, { angle: -45, gap: 3.5 });
    // Flagpole planted on very peak summit
    s.line(sm([[100, 72], [100, 36]]));
    // Triangular pennant victory flag fluttering right
    const flag = shape([[100, 36], [136, 46], [100, 56]]);
    s.fill(flag, C.pink).dots(flag, C.pinkDot, 6, 0.9);
    // Fluffy cloud banks floating beside mountain
    const c1 = puff(50, 118, 22, 12, 5, 0.18, 3);
    const c2 = puff(150, 126, 20, 11, 5, 0.18, 6);
    s.fill(c1, C.white).fill(c2, C.white);
    // Triumph sparkles at peak
    s.fill(sparkle(100, 24, 6), C.olive);
    s.fill(sparkle(146, 38, 4), C.pink);
    return s.done('sc-mountain-flag', 'Flag planted on the summit', ['mountain', 'summit', 'flag', 'success', 'goal', 'achievement', 'adventure']);
  })(),

  // 42. sc-medal-ribbon: Golden victory medal embossed with laurel star and striped ribbon
  (() => {
    const s = scene();
    ground(s, 100, 178, 48, 5);
    // V-shaped striped neck ribbon at top
    const ribL = poly([[100, 48], [76, 42], [82, 106], [100, 114]], true);
    const ribR = poly([[100, 48], [124, 42], [118, 106], [100, 114]], true);
    s.fill(ribL, C.lav).dots(ribL, C.lavDot, 8, 1.0);
    s.fill(ribR, C.pink).dots(ribR, C.pinkDot, 8, 1.0);
    // Ribbon center hanger loop
    s.fill(rrect(94, 108, 12, 6, 2), C.white);
    // Large round gold medal disc
    const medalOuter = oval(100, 134, 32, 32);
    s.fill(medalOuter, C.olive).dots(medalOuter, C.oliveDot, 12, 1.1);
    // Inner bevel circle
    s.fill(oval(100, 134, 25, 25), C.white).hatch(oval(100, 134, 25, 25), { angle: 45, gap: 3.5 });
    // Embossed star in center
    s.fill(star(100, 134, 12, 5.2, 5), C.pink);
    // Laurel leaf wreath flanking star
    s.fill(leaf(88, 134, 8, -120, 0.4), C.olive);
    s.fill(leaf(112, 134, 8, -60, 0.4), C.olive);
    // Victory aura sparkles
    s.fill(sparkle(64, 114, 5), C.pink);
    s.fill(sparkle(136, 114, 5), C.lav);
    s.fill(sparkle(100, 28, 5), C.olive);
    return s.done('sc-medal-ribbon', 'Champion medal of honour', ['medal', 'award', 'victory', 'champion', 'first place', 'success', 'winner']);
  })(),

  // 43. sc-hot-air-balloon: Whimsical striped hot-air balloon drifting gently above clouds
  (() => {
    const s = scene();
    ground(s, 100, 172, 46, 4);
    // Fluffy cloud sea at base
    const cloudSea = puff(100, 160, 48, 9, 8, 0.16, 4);
    s.fill(cloudSea, C.lav).dots(cloudSea, C.lavDot, 12, 1.0);
    // Hot-air balloon main envelope
    const balloon = shape([
      [100, 36], [128, 46], [138, 72], [124, 104],
      [112, 120], [88, 120], [76, 104], [62, 72], [72, 46]
    ]);
    s.fill(balloon, C.white);
    // Vertical decorative color gores / stripes
    // Center stripe (pink)
    const goreMid = shape([[92, 36], [108, 36], [108, 120], [92, 120]]);
    s.fill(goreMid, C.pink).dots(goreMid, C.pinkDot, 10, 1.0);
    // Left stripe (olive)
    const goreL = shape([[72, 46], [86, 40], [86, 120], [80, 112]]);
    s.fill(goreL, C.olive).dots(goreL, C.oliveDot, 8, 0.9);
    // Right stripe (olive)
    const goreR = shape([[128, 46], [114, 40], [114, 120], [120, 112]]);
    s.fill(goreR, C.olive).dots(goreR, C.oliveDot, 8, 0.9);
    // Ropes connecting envelope to basket
    s.line(
      sm([[92, 120], [94, 134]]),
      sm([[108, 120], [106, 134]]),
      sm([[88, 120], [92, 134]]),
      sm([[112, 120], [108, 134]])
    );
    // Woven passenger basket
    const basket = poly([[90, 134], [110, 134], [108, 150], [92, 150]], true);
    s.fill(basket, C.pink).hatch(basket, { angle: 45, gap: 3 });
    // Drifting breeze arcs
    s.line(
      sm([[48, 68], [54, 76], [48, 84]]),
      sm([[148, 64], [156, 72], [148, 80]])
    );
    s.fill(sparkle(142, 44, 4), C.lav);
    return s.done('sc-hot-air-balloon', 'Hot air balloon journey', ['balloon', 'travel', 'adventure', 'sky', 'clouds', 'journey', 'flight']);
  })(),

  // 44. sc-graduation-cap: Tossed graduation mortarboard cap trailing confetti and scroll
  (() => {
    const s = scene();
    ground(s, 100, 178, 50, 5);
    // Rolled diploma scroll with red ribbon at base
    const diploma = poly([[74, 150], [126, 150], [124, 168], [72, 168]], true);
    s.fill(diploma, C.white).hatch(diploma, { angle: 0, gap: 3.5 });
    // Red ribbon tied around diploma
    s.fill(rrect(94, 148, 12, 22, 2), C.pink);
    s.line(sm([[98, 170], [92, 176]]), sm([[102, 170], [108, 176]]));
    // Tossed graduation cap (mortarboard) flying high
    // Diamond top board angled in perspective
    const board = poly([[100, 52], [152, 74], [100, 96], [48, 74]], true);
    s.fill(board, C.ink);
    // Skull cap base underneath board
    const skullCap = shape([[76, 86], [100, 94], [124, 86], [120, 106], [100, 114], [80, 106]]);
    s.fill(skullCap, C.olive).dots(skullCap, C.oliveDot, 6, 0.9);
    // Center button and hanging tassel
    s.solid(oval(100, 74, 3, 3));
    s.line(sm([[100, 74], [132, 82], [138, 112]]));
    s.fill(rrect(134, 112, 8, 14, 2), C.pink);
    // Celebration confetti and ribbons exploding in air
    s.fill(sparkle(42, 60, 5), C.lav);
    s.fill(sparkle(158, 62, 5), C.pink);
    s.fill(oval(64, 116, 4, 4), C.olive);
    s.fill(oval(144, 126, 4, 4), C.lav);
    s.line(sm([[58, 92], [64, 86], [58, 80]]));
    return s.done('sc-graduation-cap', 'Graduation cap and diploma', ['graduation', 'cap', 'diploma', 'degree', 'education', 'success', 'celebrate']);
  })(),

  // 45. sc-treasure-chest: Open pirate treasure chest sparkling with coins and chalice
  (() => {
    const s = scene();
    ground(s, 100, 178, 56, 5);
    // Open lid tilted back
    const lid = poly([[62, 98], [138, 98], [134, 76], [66, 76]], true);
    s.fill(lid, C.lav).dots(lid, C.lavDot, 8, 1.0);
    s.line(sm([[66, 76], [100, 68], [134, 76]])); // curved top
    // Chest wooden box base
    const chest = poly([[62, 114], [138, 114], [132, 168], [68, 168]], true);
    s.fill(chest, C.olive).dots(chest, C.oliveDot, 12, 1.1);
    // Metal reinforced bands and lock latch
    s.line(sm([[82, 114], [82, 168]]), sm([[118, 114], [118, 168]]));
    s.fill(rrect(94, 120, 12, 14, 2), C.pink);
    s.solid(oval(100, 127, 2, 2));
    // Mountain of sparkling gold coins overflowing
    s.fill(puff(100, 112, 32, 10, 6, 0.2, 5), C.white);
    s.fill(oval(84, 108, 6, 6), C.pink);
    s.fill(oval(98, 104, 7, 7), C.white);
    s.fill(oval(114, 108, 6, 6), C.pink);
    // Golden chalice poking out of chest
    s.fill(shape([[106, 92], [120, 92], [116, 108], [110, 108]]), C.lav);
    // Sparkling rays radiating from wealth
    s.fill(sparkle(100, 52, 6), C.pink);
    s.fill(sparkle(68, 60, 4), C.olive);
    s.fill(sparkle(138, 60, 5), C.lav);
    return s.done('sc-treasure-chest', 'Overflowing treasure chest', ['treasure', 'chest', 'wealth', 'gold', 'coins', 'reward', 'fortune']);
  })(),

  // 46. sc-lighthouse-beacon: Coastal lighthouse on rocky cliff projecting beam through fog
  (() => {
    const s = scene();
    ground(s, 100, 178, 58, 5);
    // Rocky ocean cliff at bottom left
    const rocks = shape([[24, 178], [94, 178], [90, 148], [42, 154]]);
    s.fill(rocks, C.olive).hatch(rocks, { angle: -45, gap: 3.5 });
    // Ocean rolling waves below
    s.line(
      sm([[88, 172], [118, 168], [148, 172], [176, 168]]),
      sm([[96, 176], [124, 174], [152, 176]])
    );
    // Tapering lighthouse tower
    const tower = poly([[56, 152], [76, 152], [72, 78], [60, 78]], true);
    s.fill(tower, C.white);
    // Red horizontal warning stripes
    s.fill(poly([[58, 134], [74, 134], [73, 118], [59, 118]], true), C.pink);
    s.fill(poly([[60, 102], [72, 102], [71, 88], [61, 88]], true), C.pink);
    // Lantern room gallery deck and dome
    s.fill(rrect(54, 74, 24, 5, 1), C.ink);
    s.fill(rrect(58, 60, 16, 14, 2), C.white);
    s.fill(shape([[56, 60], [66, 50], [76, 60]]), C.lav);
    // Powerful beam of light projecting across the sea
    const beam = poly([[74, 64], [174, 44], [174, 102], [74, 70]], true);
    s.fill(beam, C.lav).dots(beam, C.lavDot, 12, 1.2);
    // Guiding stars in night sky
    s.fill(sparkle(142, 34, 5), C.pink);
    s.fill(sparkle(42, 48, 4), C.olive);
    return s.done('sc-lighthouse-beacon', 'Lighthouse beam across the sea', ['lighthouse', 'sea', 'beacon', 'navigation', 'guidance', 'safety', 'hope']);
  })(),

  // 47. sc-trophy-pedestal: Gleaming victory trophy cup on three-tiered winner podium
  (() => {
    const s = scene();
    ground(s, 100, 178, 58, 5);
    // Three-tiered winner podium (1st in middle, 2nd left, 3rd right)
    // 2nd place block on left (lavender)
    const p2 = rrect(42, 134, 34, 40, 2);
    s.fill(p2, C.lav).dots(p2, C.lavDot, 6, 0.9);
    s.solid(oval(59, 152, 4, 6)); // '2' numeral
    // 3rd place block on right (olive)
    const p3 = rrect(124, 144, 34, 30, 2);
    s.fill(p3, C.olive).dots(p3, C.oliveDot, 6, 0.9);
    s.solid(oval(141, 158, 4, 6)); // '3' numeral
    // 1st place center block (pink)
    const p1 = rrect(76, 118, 48, 56, 3);
    s.fill(p1, C.pink).dots(p1, C.pinkDot, 10, 1.0);
    s.solid(oval(100, 144, 3, 7)); // '1' numeral
    // Gleaming victory trophy cup on top of 1st place
    const cup = shape([[84, 68], [116, 68], [112, 94], [104, 102], [96, 102], [88, 94]]);
    s.fill(cup, C.white);
    // Cup handles on left and right
    s.line(
      sm([[86, 74], [74, 76], [74, 90], [90, 94]]),
      sm([[114, 74], [126, 76], [126, 90], [110, 94]])
    );
    // Cup stem and base
    s.fill(poly([[96, 102], [104, 102], [106, 112], [94, 112]], true), C.olive);
    s.fill(rrect(88, 112, 24, 6, 2), C.ink);
    // Winner star embossed on cup
    s.fill(star(100, 84, 7, 3.2, 5), C.pink);
    s.fill(sparkle(100, 48, 6), C.olive);
    return s.done('sc-trophy-pedestal', 'Victory podium and trophy', ['trophy', 'podium', 'winner', 'victory', 'first place', 'champion', 'success']);
  })(),

  // 48. sc-confetti-popper: Party popper exploding with confetti streamers and coils
  (() => {
    const s = scene();
    ground(s, 70, 178, 48, 5);
    // Party popper conical horn held at bottom left
    const popper = poly([[42, 170], [74, 134], [92, 150], [54, 178]], true);
    s.fill(popper, C.pink).dots(popper, C.pinkDot, 8, 1.0);
    // Diagonal decorative stripes on cone
    s.fill(poly([[50, 160], [60, 150], [72, 160], [60, 170]], true), C.olive);
    s.fill(oval(83, 142, 13, 9, 45), C.lav);
    // Explosive confetti burst radiating outward
    // Swirling ribbon coils
    s.line(
      sm([[88, 136], [106, 118], [98, 108], [116, 94], [110, 84], [126, 70]]),
      sm([[82, 142], [94, 136], [104, 144], [118, 136], [128, 146]])
    );
    // Confetti shapes (stars, triangles, dots)
    s.fill(star(144, 52, 7, 3.2, 5), C.pink);
    s.fill(star(108, 56, 6, 2.8, 5), C.olive);
    s.fill(sparkle(132, 108, 6), C.lav);
    s.fill(sparkle(156, 88, 5), C.olive);
    s.solid(oval(116, 68, 3, 3));
    s.solid(oval(148, 126, 3, 3));
    s.fill(poly([[128, 62], [134, 56], [136, 64]], true), C.pink);
    s.fill(poly([[152, 110], [160, 108], [156, 116]], true), C.lav);
    return s.done('sc-confetti-popper', 'Party popper celebration', ['confetti', 'party', 'celebrate', 'festival', 'joy', 'congratulations', 'surprise']);
  })(),

  // 49. sc-rocket-orbit: Retro rocket ship swooshing around a ringed planet with starry trails
  (() => {
    const s = scene();
    ground(s, 100, 178, 48, 5);
    // Ringed planet in background center (lavender)
    const planet = oval(100, 108, 28, 28);
    s.fill(planet, C.lav).dots(planet, C.lavDot, 10, 1.0);
    // Planet planetary rings
    s.line(
      sm([[62, 118], [100, 124], [138, 118]]),
      sm([[62, 118], [100, 92], [138, 118]])
    );
    // Rocket swooshing in orbit
    s.line(dashes((t) => [60 + t * 50, 152 - t * 84], 5));
    // Sleek rocket body angled up-right
    const rocket = shape([[98, 72], [116, 52], [134, 68], [116, 88]]);
    s.fill(rocket, C.white);
    // Rocket nose cone in pink
    s.fill(shape([[116, 52], [128, 62], [122, 68], [110, 58]]), C.pink);
    // Rocket circular porthole window
    s.fill(oval(114, 70, 4, 4), C.olive);
    // Rocket fins on tail
    s.fill(poly([[98, 72], [90, 68], [94, 80]], true), C.pink);
    s.fill(poly([[116, 88], [112, 98], [122, 94]], true), C.pink);
    // Fire exhaust plume from nozzle
    s.fill(shape([[98, 78], [84, 88], [92, 84]]), C.lav);
    // Twinkling cosmos stars
    s.fill(star(46, 68, 6, 2.8, 5), C.white);
    s.fill(star(152, 48, 7, 3.2, 5), C.white);
    s.fill(sparkle(146, 136, 5), C.pink);
    return s.done('sc-rocket-orbit', 'Rocket orbiting a ringed planet', ['rocket', 'space', 'planet', 'orbit', 'startup', 'launch', 'cosmos']);
  })(),

  // 50. sc-magic-door: Glowing open doorway revealing a lush meadow beyond the frame
  (() => {
    const s = scene();
    ground(s, 100, 178, 54, 5);
    // Ornate doorway frame in deep white with hatch
    const frame = poly([[62, 62], [138, 62], [134, 168], [66, 168]], true);
    s.fill(frame, C.white).hatch(frame, { angle: -45, gap: 4 });
    // Doorway opening revealing vibrant world inside
    const opening = poly([[70, 70], [130, 70], [128, 168], [72, 168]], true);
    s.fill(opening, C.lav).dots(opening, C.lavDot, 10, 1.0);
    // Rolling green meadows and flower hills inside door
    const meadow = shape([[72, 142], [94, 134], [128, 146], [128, 168], [72, 168]]);
    s.fill(meadow, C.olive).dots(meadow, C.oliveDot, 6, 0.9);
    // Little daisy flowers blossoming in the meadow
    s.fill(oval(88, 148, 3, 3), C.pink);
    s.fill(oval(112, 152, 3, 3), C.white);
    // Door swinging open on hinges (perspective polygon)
    const doorLeaf = poly([[70, 70], [92, 64], [94, 162], [72, 168]], true);
    s.fill(doorLeaf, C.pink).dots(doorLeaf, C.pinkDot, 8, 1.0);
    // Brass door handle
    s.solid(oval(88, 116, 2, 2));
    // Magic light rays streaming out from open doorway
    s.line(
      sm([[62, 70], [48, 64]]),
      sm([[64, 100], [46, 102]]),
      sm([[136, 70], [152, 64]]),
      sm([[134, 100], [154, 102]])
    );
    s.fill(sparkle(100, 48, 6), C.pink);
    s.fill(sparkle(148, 126, 4), C.olive);
    return s.done('sc-magic-door', 'Open door to new possibilities', ['door', 'opportunity', 'new beginning', 'future', 'portal', 'hope', 'welcome']);
  })(),
];
