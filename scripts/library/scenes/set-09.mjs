import { C, at, bird, bulb, dashes, doc, dog, ground, handOf, head, heart, leaf, mitt, oval, person, plant, poly, puff, rect, ring, rrect, scene, shape, shoe, sm, sparkle, star, swoosh, tube } from './kit.mjs';

export default [
  // 31. sc-bicycle-basket: Vintage bicycle with woven basket overflowing with flowers
  (() => {
    const s = scene();
    ground(s, 100, 178, 56, 5);
    // Two bicycle wheels
    // Rear wheel on left
    s.fill(oval(56, 142, 22, 22), C.white);
    s.fill(oval(56, 142, 17, 17), C.white);
    s.solid(oval(56, 142, 4, 4));
    // Front wheel on right
    s.fill(oval(144, 142, 22, 22), C.white);
    s.fill(oval(144, 142, 17, 17), C.white);
    s.solid(oval(144, 142, 4, 4));
    // Bicycle diamond frame tubes
    s.line(
      sm([[56, 142], [92, 142]]), // chainstay
      sm([[56, 142], [84, 108]]), // seatstay
      sm([[92, 142], [84, 108]]), // seattube
      sm([[92, 142], [132, 108]]), // downtube
      sm([[84, 108], [128, 108]]), // toptube
      sm([[144, 142], [132, 96]])  // fork & stem
    );
    // Saddle on seattube
    s.fill(rrect(78, 104, 16, 5, 2), C.ink);
    // Handlebars curving forward
    s.line(sm([[132, 96], [136, 90], [144, 92]]));
    // Woven basket on front handlebars filled with flowers
    const basket = poly([[136, 92], [162, 92], [158, 112], [138, 112]], true);
    s.fill(basket, C.pink).hatch(basket, { angle: 45, gap: 3.5 });
    // Blossoming flowers spilling out of basket
    s.fill(oval(142, 86, 6, 6), C.lav).dots(oval(142, 86, 6, 6), C.lavDot, 3, 0.8);
    s.fill(oval(154, 84, 7, 7), C.olive).dots(oval(154, 84, 7, 7), C.oliveDot, 3, 0.8);
    s.fill(oval(148, 76, 6, 6), C.lav);
    s.fill(leaf(146, 80, 10, -60, 0.4), C.olive);
    s.fill(sparkle(162, 74, 4), C.pink);
    return s.done('sc-bicycle-basket', 'Bicycle with a flower basket', ['bicycle', 'flowers', 'basket', 'spring', 'cycling', 'weekend', 'eco']);
  })(),

  // 32. sc-watering-bonsai: Watering can showering droplets on miniature bonsai tree
  (() => {
    const s = scene();
    ground(s, 110, 178, 54, 5);
    // Bonsai shallow ceramic pot on right
    const pot = poly([[108, 154], [156, 154], [150, 172], [114, 172]], true);
    s.fill(pot, C.lav).dots(pot, C.lavDot, 8, 1.0);
    s.fill(rrect(104, 150, 56, 6, 2), C.white);
    // Gnarled miniature bonsai trunk & twisted branches
    const trunk = tube([[132, 150], [134, 134], [128, 118], [134, 106]], 12, 8);
    s.fill(trunk, C.pink);
    s.line(sm([[128, 118], [146, 112], [152, 102]]));
    // Lush green foliage cloud clusters
    const f1 = puff(130, 96, 16, 12, 6, 0.2, 3);
    const f2 = puff(152, 94, 14, 10, 5, 0.2, 7);
    s.fill(f1, C.olive).dots(f1, C.oliveDot, 8, 1.0);
    s.fill(f2, C.olive).dots(f2, C.oliveDot, 6, 1.0);
    // Watering can floating on top left
    const canBody = poly([[44, 72], [76, 72], [74, 104], [46, 104]], true);
    s.fill(canBody, C.pink).dots(canBody, C.pinkDot, 8, 1.0);
    // Can loop handle on left
    s.line(sm([[46, 74], [34, 76], [34, 100], [48, 102]]));
    // Long angled watering spout and sprinkler rose head
    s.line(sm([[74, 94], [94, 82]]));
    s.fill(poly([[94, 78], [100, 80], [98, 88], [92, 86]], true), C.white);
    // Gentle water droplets raining onto bonsai
    s.line(
      dashes((t) => [98 + t * 24, 86 + t * 26], 3),
      dashes((t) => [96 + t * 22, 92 + t * 26], 3)
    );
    s.fill(sparkle(116, 78, 4), C.lav);
    return s.done('sc-watering-bonsai', 'Watering a bonsai tree', ['bonsai', 'plant', 'care', 'water', 'gardening', 'nature', 'growth']);
  })(),

  // 33. sc-campfire-cozy: Cozy night campfire with crackling logs and marshmallow on skewer
  (() => {
    const s = scene();
    ground(s, 100, 178, 52, 5);
    // Stone fire pit ring at base
    s.fill(oval(74, 166, 9, 6), C.white).hatch(oval(74, 166, 9, 6), { angle: 30, gap: 2.5 });
    s.fill(oval(126, 166, 9, 6), C.white).hatch(oval(126, 166, 9, 6), { angle: 30, gap: 2.5 });
    s.fill(oval(100, 170, 10, 6), C.white).hatch(oval(100, 170, 10, 6), { angle: 30, gap: 2.5 });
    // Crossed wooden campfire logs
    const log1 = poly([[62, 160], [138, 140], [136, 148], [60, 168]], true);
    const log2 = poly([[138, 160], [62, 140], [64, 148], [140, 168]], true);
    s.fill(log1, C.olive);
    s.fill(log2, C.olive);
    // Fiery flame shapes leaping upward
    // Outer flame in lavender
    const flameOuter = shape([[82, 150], [94, 118], [100, 78], [108, 114], [118, 150], [100, 158]]);
    s.fill(flameOuter, C.lav).dots(flameOuter, C.lavDot, 8, 1.0);
    // Inner vibrant flame in pink
    const flameInner = shape([[88, 150], [98, 126], [100, 96], [104, 126], [112, 150]]);
    s.fill(flameInner, C.pink);
    // Roasting wooden skewer stick
    s.line(sm([[160, 88], [116, 114]]));
    // Marshmallow on tip of stick
    const mallow = rrect(112, 110, 12, 8, 3);
    s.fill(mallow, C.white);
    // Floating ember sparks in night sky
    s.solid(oval(92, 68, 2, 2));
    s.solid(oval(108, 62, 1.8, 1.8));
    s.fill(sparkle(100, 48, 5), C.pink);
    s.fill(sparkle(78, 86, 4), C.lav);
    return s.done('sc-campfire-cozy', 'Cozy campfire and marshmallow', ['campfire', 'fire', 'camping', 'marshmallow', 'night', 'cozy', 'warmth']);
  })(),

  // 34. sc-camping-tent: Triangular A-frame tent pitched under starry sky with lantern
  (() => {
    const s = scene();
    ground(s, 100, 178, 56, 5);
    // Distant mountain ridge backdrop
    const mtn = poly([[32, 172], [76, 108], [122, 172]], true);
    s.fill(mtn, C.lav).hatch(mtn, { angle: 45, gap: 4.5 });
    // Starry night sky twinkles
    s.fill(star(46, 58, 6, 2.8, 5), C.white);
    s.fill(star(154, 52, 7, 3.2, 5), C.white);
    s.fill(sparkle(100, 42, 5), C.lav);
    // A-frame tent front and side
    // Tent side canvas (pink)
    const tentSide = poly([[74, 96], [148, 114], [140, 168], [66, 164]], true);
    s.fill(tentSide, C.pink).dots(tentSide, C.pinkDot, 12, 1.1);
    // Tent front triangular entrance
    const tentFront = poly([[74, 96], [66, 164], [108, 164]], true);
    s.fill(tentFront, C.olive);
    // Open tent flap door revealing interior glow
    const tentDoor = poly([[74, 110], [74, 164], [98, 164]], true);
    s.fill(tentDoor, C.ink);
    // Tent ridge pole & guy lines with stakes
    s.line(
      sm([[74, 96], [148, 114]]),
      sm([[74, 96], [46, 172]]),
      sm([[148, 114], [168, 172]])
    );
    // Glowing camping lantern on right
    s.fill(rrect(144, 152, 12, 16, 2), C.white);
    s.fill(oval(150, 160, 3, 3), C.pink);
    s.line(sm([[144, 152], [150, 146], [156, 152]]));
    s.line(
      sm([[140, 160], [134, 160]]),
      sm([[160, 160], [166, 160]])
    );
    return s.done('sc-camping-tent', 'Camping under the stars', ['camping', 'tent', 'stars', 'night', 'nature', 'outdoor', 'adventure']);
  })(),

  // 35. sc-teacup-lemon: Steaming ceramic teacup with teabag tag and lemon slice
  (() => {
    const s = scene();
    ground(s, 100, 178, 52, 5);
    // Teacup saucer at base
    s.fill(oval(100, 166, 38, 7), C.white);
    // Teacup body in lavender
    const cup = poly([[72, 122], [128, 122], [122, 162], [78, 162]], true);
    s.fill(cup, C.lav).dots(cup, C.lavDot, 10, 1.0);
    // Cup handle on left
    s.fill(shape([[74, 130], [54, 134], [58, 154], [76, 150]]), C.white);
    s.fill(shape([[74, 134], [62, 138], [64, 148], [76, 144]]), C.lav);
    // Warm tea surface liquid
    s.fill(oval(100, 122, 28, 6), C.olive);
    // Teabag string draped over rim with hanging tag
    s.line(sm([[104, 124], [116, 122], [122, 138]]));
    s.fill(poly([[118, 138], [126, 138], [126, 148], [118, 148]], true), C.pink);
    // Slice of lemon resting on saucer
    s.fill(oval(136, 162, 12, 12), C.pink).dots(oval(136, 162, 12, 12), C.pinkDot, 4, 0.8);
    s.fill(oval(136, 162, 8, 8), C.white);
    s.line(
      sm([[136, 154], [136, 170]]),
      sm([[128, 162], [144, 162]])
    );
    // Whimsical rising steam curves
    s.line(
      sm([[92, 116], [96, 98], [90, 84], [94, 70]]),
      sm([[104, 116], [108, 96], [102, 82], [106, 68]]),
      sm([[114, 116], [118, 102], [112, 90], [116, 76]])
    );
    s.fill(sparkle(100, 52, 5), C.pink);
    return s.done('sc-teacup-lemon', 'Warm cup of tea with lemon', ['tea', 'cup', 'lemon', 'cozy', 'drink', 'morning', 'relax']);
  })(),

  // 36. sc-yoga-sun: Figure in serene lotus meditation pose before radiant setting sun
  (() => {
    const s = scene();
    ground(s, 100, 178, 54, 5);
    // Giant setting sun half-circle behind figure
    const sun = shape([[48, 148], [54, 102], [76, 68], [100, 56], [124, 68], [146, 102], [152, 148]]);
    s.fill(sun, C.pink).dots(sun, C.pinkDot, 14, 1.1);
    // Radiant sunbeams radiating outward
    s.line(
      sm([[56, 74], [44, 64]]),
      sm([[82, 54], [76, 40]]),
      sm([[118, 54], [124, 40]]),
      sm([[144, 74], [156, 64]]),
      sm([[100, 50], [100, 34]])
    );
    // Meditating figure in solid black silhouette / ink
    // Crossed legs in lotus base
    const lotusLegs = shape([[64, 166], [82, 150], [100, 156], [118, 150], [136, 166], [100, 170]]);
    s.fill(lotusLegs, C.ink);
    // Torso upright in white with hatch
    const torso = poly([[92, 156], [108, 156], [106, 118], [94, 118]], true);
    s.fill(torso, C.white).hatch(torso, { angle: -45, gap: 3.5 });
    // Meditating arms resting gently on knees with mudra hands
    s.line(
      sm([[96, 122], [80, 136], [74, 154]]),
      sm([[104, 122], [120, 136], [126, 154]])
    );
    s.fill(oval(74, 154, 3, 3), C.white).fill(oval(126, 154, 3, 3), C.white);
    // Head in profile / calm tilt
    s.fill(oval(100, 104, 10, 10), C.ink);
    // Topknot hair bun
    s.fill(oval(100, 92, 4, 4), C.ink);
    // Serenity sparkle above head
    s.fill(sparkle(100, 78, 6), C.lav);
    return s.done('sc-yoga-sun', 'Sunset lotus meditation', ['yoga', 'meditation', 'sunset', 'mindfulness', 'calm', 'peace', 'wellness']);
  })(),

  // 37. sc-puppy-butterfly: Playful puppy trotting on grassy trail chasing a butterfly
  (() => {
    const s = scene();
    ground(s, 100, 178, 58, 5);
    // Grassy winding garden path
    s.line(
      sm([[24, 172], [60, 170], [100, 172], [140, 170], [176, 172]]),
      sm([[34, 168], [32, 160]]),
      sm([[162, 168], [164, 160]])
    );
    // Fluttering butterfly top right
    const bFlyL = shape([[142, 68], [130, 56], [138, 74]]);
    const bFlyR = shape([[142, 68], [154, 56], [146, 74]]);
    s.fill(bFlyL, C.pink);
    s.fill(bFlyR, C.lav);
    s.solid(oval(142, 68, 1.5, 4));
    // Dotted flight trail of butterfly
    s.line(dashes((t) => [112 + t * 30, 94 - t * 24], 4));
    // Playful floppy-eared puppy running right
    // Paws & legs in running pose
    s.line(
      sm([[68, 142], [58, 164]]),
      sm([[78, 142], [86, 164]]),
      sm([[104, 142], [116, 162]]),
      sm([[94, 142], [96, 164]])
    );
    // Puppy body in warm white with hatch
    const pupBody = oval(86, 134, 20, 14);
    s.fill(pupBody, C.white).hatch(pupBody, { angle: 45, gap: 3.5 });
    // Wagging tail raised up high
    s.line(sm([[68, 130], [54, 114], [58, 110]]));
    // Puppy head in olive
    dog(s, 112, 118, 13, { face: 1, c: C.olive, ear: C.pink });
    // Cheerful attention lines above puppy head
    s.line(
      sm([[120, 96], [124, 90]]),
      sm([[128, 100], [134, 96]])
    );
    return s.done('sc-puppy-butterfly', 'Puppy chasing a butterfly', ['puppy', 'dog', 'pet', 'butterfly', 'playful', 'nature', 'happy']);
  })(),

  // 38. sc-hiker-backpack: Sturdy hiking backpack with rolled sleeping mat and canteen
  (() => {
    const s = scene();
    ground(s, 100, 178, 48, 5);
    // Main backpack canvas body
    const packBody = rrect(68, 74, 64, 84, 8);
    s.fill(packBody, C.olive).dots(packBody, C.oliveDot, 14, 1.1);
    // Front zippered compartment pocket in lavender
    const frontPocket = rrect(76, 108, 48, 42, 5);
    s.fill(frontPocket, C.lav).dots(frontPocket, C.lavDot, 8, 1.0);
    s.line(sm([[80, 118], [120, 118]])); // zipper line
    // Two vertical compression buckles & straps
    s.line(sm([[86, 74], [86, 154]]), sm([[114, 74], [114, 154]]));
    s.fill(rrect(84, 104, 4, 8, 1), C.ink);
    s.fill(rrect(112, 104, 4, 8, 1), C.ink);
    // Rolled sleeping mat strapped to top
    const rollMat = rrect(58, 54, 84, 18, 7);
    s.fill(rollMat, C.pink).dots(rollMat, C.pinkDot, 8, 1.0);
    s.fill(oval(62, 63, 4, 7), C.white); // side spiral of roll
    // Canteen water flask tucked into side mesh pocket
    const canteen = shape([[58, 116], [68, 116], [68, 146], [58, 146]]);
    s.fill(canteen, C.white);
    s.fill(rrect(60, 110, 6, 6, 1), C.ink);
    // Trail trekking pole leaning against pack
    s.line(sm([[136, 62], [148, 168]]));
    s.fill(rrect(134, 64, 5, 14, 2), C.pink);
    s.fill(sparkle(148, 52, 5), C.olive);
    return s.done('sc-hiker-backpack', 'Trail backpack for adventure', ['backpack', 'hiking', 'travel', 'adventure', 'outdoors', 'journey', 'mountains']);
  })(),

  // 39. sc-curated-plants: Three curated potted plants on a floating wooden shelf
  (() => {
    const s = scene();
    ground(s, 100, 178, 56, 5);
    // Floating wooden wall shelf
    const shelf = rrect(38, 148, 124, 10, 2);
    s.fill(shelf, C.white).hatch(shelf, { angle: 0, gap: 3.5 });
    // Left shelf bracket & right bracket underneath
    s.line(sm([[54, 158], [54, 172]]), sm([[146, 158], [146, 172]]));
    // Plant 1 (Left): Succulent in round bowl
    s.fill(poly([[52, 136], [76, 136], [72, 148], [56, 148]], true), C.pink);
    s.fill(oval(64, 128, 9, 8), C.olive).dots(oval(64, 128, 9, 8), C.oliveDot, 4, 0.8);
    s.fill(oval(64, 122, 6, 6), C.olive);
    // Plant 2 (Middle): Potted leafy monstera in lavender pot
    s.fill(poly([[88, 126], [112, 126], [108, 148], [92, 148]], true), C.lav).dots(poly([[88, 126], [112, 126], [108, 148], [92, 148]], true), C.lavDot, 5, 0.9);
    s.line(sm([[100, 126], [94, 94]]), sm([[100, 126], [108, 92]]));
    s.fill(leaf(94, 94, 20, -110, 0.5), C.olive);
    s.fill(leaf(108, 92, 22, -65, 0.5), C.olive);
    // Plant 3 (Right): Tall desert cactus in terracotta pot
    s.fill(poly([[128, 130], [152, 130], [148, 148], [132, 148]], true), C.pink);
    const cactus = tube([[140, 130], [140, 96]], 12, 12);
    s.fill(cactus, C.olive).dots(cactus, C.oliveDot, 6, 0.8);
    // Cactus side branch arms
    s.line(sm([[134, 114], [128, 114], [128, 104]]), sm([[146, 108], [152, 108], [152, 98]]));
    s.fill(sparkle(100, 72, 5), C.pink);
    return s.done('sc-curated-plants', 'Curated house plants on a shelf', ['plants', 'succulent', 'cactus', 'home', 'decor', 'green', 'interior']);
  })(),

  // 40. sc-reading-chair: Comfortable wingback armchair with an open novel resting
  (() => {
    const s = scene();
    ground(s, 100, 178, 54, 5);
    // Four tapered wooden chair legs
    s.line(
      sm([[64, 154], [58, 174]]),
      sm([[76, 154], [72, 174]]),
      sm([[124, 154], [128, 174]]),
      sm([[136, 154], [142, 174]])
    );
    // Armchair tall backrest in olive
    const chairBack = shape([[68, 70], [132, 70], [136, 134], [64, 134]]);
    s.fill(chairBack, C.olive).dots(chairBack, C.oliveDot, 14, 1.1);
    // Wingback side ears
    s.fill(shape([[68, 70], [54, 82], [62, 112], [68, 108]]), C.olive);
    s.fill(shape([[132, 70], [146, 82], [138, 112], [132, 108]]), C.olive);
    // Deep seat cushion in lavender
    const cushion = rrect(58, 130, 84, 24, 6);
    s.fill(cushion, C.lav).dots(cushion, C.lavDot, 8, 1.0);
    // Rolled armrests flanking cushion
    s.fill(oval(56, 134, 8, 12), C.pink);
    s.fill(oval(144, 134, 8, 12), C.pink);
    // Open novel book resting on chair cushion
    const bookL = poly([[100, 132], [82, 126], [80, 140], [100, 144]], true);
    const bookR = poly([[100, 132], [118, 126], [120, 140], [100, 144]], true);
    s.fill(bookL, C.white);
    s.fill(bookR, C.white);
    s.line(sm([[84, 132], [96, 134]]), sm([[104, 134], [116, 132]]));
    // Warm reading lamp / cozy aura sparkles above
    s.fill(sparkle(100, 50, 6), C.pink);
    s.fill(sparkle(138, 56, 4), C.lav);
    return s.done('sc-reading-chair', 'Cozy armchair and good book', ['reading', 'chair', 'book', 'cozy', 'relax', 'weekend', 'home']);
  })(),
];
