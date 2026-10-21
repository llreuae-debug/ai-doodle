import { C, at, bird, bulb, dashes, doc, ground, handOf, head, heart, leaf, mitt, oval, person, plant, poly, puff, rect, ring, rrect, scene, shape, shoe, sm, sparkle, star, swoosh, tube } from './kit.mjs';

export default [
  // 1. sc-wind-fan: Whimsical cloud face blowing gusts into retro fan machine with falling leaves
  (() => {
    const s = scene();
    ground(s, 110, 178, 55, 6);
    // Cloud face blowing wind on left
    const cloud = puff(52, 60, 32, 20, 7, 0.18, 4);
    s.fill(cloud, C.lav).dots(cloud, C.lavDot, 12, 1.0);
    // Cloud facial expression (closed blowing eye, arched brow, blowing mouth)
    s.line(
      sm([[42, 54], [46, 52], [50, 54]]),
      sm([[38, 48], [46, 46], [52, 49]]),
      sm([[56, 64], [62, 67], [58, 71]])
    );
    // Wind gusts streaming right
    s.line(
      sm([[64, 62], [84, 65], [108, 62], [130, 68]]),
      sm([[62, 72], [80, 76], [100, 74], [122, 80]]),
      sm([[68, 82], [88, 85], [112, 84]])
    );
    // Falling autumn leaves blown in the wind
    s.fill(leaf(62, 98, 14, -30, 0.4), C.olive);
    s.fill(leaf(94, 92, 13, -70, 0.4), C.pink);
    s.fill(leaf(80, 112, 12, -45, 0.4), C.olive);
    // Retro fan machine on right
    // Fan stand base and neck
    s.fill(poly([[128, 172], [156, 172], [152, 160], [132, 160]], true), C.white).hatch(poly([[130, 160], [154, 160], [156, 172], [128, 172]], true), { angle: -30 });
    s.fill(poly([[140, 160], [144, 160], [144, 110], [140, 110]], true), C.pink);
    // Fan motor casing / head
    const hood = poly([[122, 110], [162, 110], [158, 56], [126, 56]], true);
    s.fill(hood, C.pink).dots(hood, C.pinkDot, 10, 1.1);
    s.fill(oval(142, 54, 18, 8), C.olive);
    s.line(sm([[142, 46], [148, 38], [166, 44], [168, 112], [172, 168]]));
    // Fan cage circular rim and blades inside
    s.fill(oval(142, 102, 19, 19), C.white);
    s.fill(oval(142, 102, 5, 5), C.ink);
    // 3 curved fan blades
    s.fill(shape([[142, 102], [132, 88], [146, 86]]), C.ink);
    s.fill(shape([[142, 102], [156, 100], [152, 114]]), C.ink);
    s.fill(shape([[142, 102], [134, 112], [130, 100]]), C.ink);
    // Cage front protective grill arcs
    s.line(
      sm([[124, 102], [142, 84], [160, 102]]),
      sm([[126, 110], [142, 120], [158, 110]]),
      swoosh(142, 102, 23, 130, 180, 2, 4)
    );
    return s.done('sc-wind-fan', 'Wind fan and cloud', ['wind', 'weather', 'fan', 'cloud', 'nature', 'cool', 'breeze']);
  })(),

  // 2. sc-poly-metrics: 3D isometric polygon with connecting nodes and memo lines
  (() => {
    const s = scene();
    ground(s, 100, 176, 50, 5);
    // Center 3D faceted polygon
    const pTop = poly([[100, 56], [128, 72], [100, 88], [72, 72]], true);
    const pLeft = poly([[72, 72], [100, 88], [100, 126], [72, 110]], true);
    const pRight = poly([[100, 88], [128, 72], [128, 110], [100, 126]], true);
    const pFrontL = poly([[72, 110], [100, 126], [86, 136], [58, 120]], true);
    s.fill(pTop, C.lav).dots(pTop, C.lavDot, 8, 1.0);
    s.fill(pLeft, C.olive).dots(pLeft, C.oliveDot, 8, 1.0);
    s.fill(pRight, C.pink).dots(pRight, C.pinkDot, 8, 1.0);
    s.fill(pFrontL, C.white).hatch(pFrontL, { angle: -45, gap: 3.5 });
    // Center anchor node dots
    s.solid(oval(72, 72, 3, 3));
    s.solid(oval(128, 72, 3, 3));
    s.solid(oval(100, 126, 3, 3));
    s.solid(oval(100, 88, 3, 3));
    // Connector arms radiating to icons
    // 1. Top left arm -> Thumbs up icon
    s.line(poly([[72, 72], [48, 54]]));
    const thumbBox = rrect(30, 40, 18, 18, 4);
    s.fill(thumbBox, C.lav);
    s.line(
      sm([[35, 52], [39, 52], [41, 46], [43, 46], [41, 52], [45, 52], [45, 56], [35, 56]]),
      sm([[28, 48], [24, 46]]),
      sm([[28, 52], [22, 52]])
    );
    // 2. Star icon on left
    s.fill(star(34, 86, 8, 3.8, 5), C.white);
    s.line(sm([[26, 98], [44, 98]]), sm([[26, 104], [40, 104]]));
    // 3. Heart icon bottom left
    s.line(poly([[72, 110], [48, 134]]));
    s.fill(heart(40, 138, 7, 0), C.pink);
    s.line(sm([[50, 134], [68, 134]]), sm([[50, 140], [64, 140]]));
    // 4. Eye icon top right
    s.line(poly([[128, 72], [152, 52]]));
    s.fill(shape([[146, 52], [156, 44], [166, 52], [156, 60]]), C.olive);
    s.solid(oval(156, 52, 2.5, 2.5));
    s.line(sm([[148, 40], [152, 36]]), sm([[156, 38], [156, 34]]), sm([[164, 40], [160, 36]]));
    s.line(sm([[148, 66], [164, 66]]), sm([[148, 72], [160, 72]]));
    // 5. Arrow icon bottom right
    s.line(poly([[128, 110], [150, 126]]));
    s.fill(poly([[148, 116], [156, 126], [140, 126]], true), C.ink);
    s.fill(rect(144, 126, 8, 10), C.ink);
    s.line(sm([[136, 144], [158, 144]]), sm([[136, 150], [152, 150]]));
    return s.done('sc-poly-metrics', 'Faceted polygon and metrics', ['diagram', 'metrics', 'analytics', 'data', 'polygon', 'strategy', 'kpi']);
  })(),

  // 3. sc-balloon-doc: Floating contract/receipt held aloft by 3 animal/portrait balloons
  (() => {
    const s = scene();
    ground(s, 100, 178, 38, 5);
    // Balloon 1 (Middle): Goat balloon in olive
    s.fill(oval(100, 52, 19, 19), C.olive).dots(oval(100, 52, 19, 19), C.oliveDot, 8, 1.1);
    // Goat head features (horns, ears, snout, eyes)
    s.fill(shape([[92, 44], [86, 30], [94, 34], [98, 44]]), C.lav);
    s.fill(shape([[108, 44], [114, 30], [106, 34], [102, 44]]), C.lav);
    s.fill(shape([[94, 52], [100, 62], [106, 52]]), C.white);
    s.solid(oval(96, 48, 1.5, 1.5)).solid(oval(104, 48, 1.5, 1.5));
    s.line(sm([[98, 58], [100, 60], [102, 58]]));
    // Balloon 2 (Left): Rooster balloon in lavender
    s.fill(oval(56, 76, 16, 16), C.lav).dots(oval(56, 76, 16, 16), C.lavDot, 7, 1.0);
    // Rooster comb and beak
    s.fill(shape([[52, 62], [55, 54], [58, 62], [61, 55], [63, 62]]), C.pink);
    s.fill(shape([[62, 74], [70, 77], [62, 80]]), C.pink);
    s.solid(oval(58, 73, 1.5, 1.5));
    // Balloon 3 (Right): Smiling portrait balloon in pink
    s.fill(oval(144, 76, 16, 16), C.pink).dots(oval(144, 76, 16, 16), C.pinkDot, 7, 1.0);
    // Portrait hair and smile
    s.fill(shape([[136, 68], [144, 62], [152, 68], [150, 78], [138, 78]]), C.olive);
    s.solid(oval(142, 74, 1.4, 1.4)).solid(oval(148, 74, 1.4, 1.4));
    s.line(sm([[142, 81], [145, 83], [148, 81]]));
    // Balloon ties & strings converging to document
    s.line(
      sm([[100, 71], [100, 96]]),
      sm([[56, 92], [76, 108], [94, 116]]),
      sm([[144, 92], [124, 108], [106, 116]])
    );
    // Motion curves around floating balloons
    s.line(
      sm([[84, 88], [88, 84]]),
      sm([[114, 84], [118, 88]])
    );
    // Floating paper receipt / scroll
    const docOutline = shape([[90, 116], [116, 114], [120, 162], [102, 156], [74, 166], [82, 118]]);
    s.fill(docOutline, C.white).hatch(docOutline, { angle: -35, gap: 4.2 });
    // Text lines on paper
    s.line(
      sm([[88, 128], [110, 126]]),
      sm([[86, 134], [106, 133]]),
      sm([[84, 140], [114, 138]])
    );
    // Barcode block at bottom of receipt
    s.fill(rrect(86, 146, 22, 5, 1), C.ink);
    return s.done('sc-balloon-doc', 'Balloons lifting a document', ['document', 'contract', 'balloons', 'receipt', 'finance', 'animals', 'float']);
  })(),

  // 4. sc-croc-pond: Crocodile in bowler hat and striped trousers peering down at lily pad bloom
  (() => {
    const s = scene();
    ground(s, 110, 178, 65, 5);
    // Water ripples and lily pad on left
    s.line(
      sm([[24, 170], [42, 174], [62, 168]]),
      sm([[28, 174], [44, 178], [58, 173]])
    );
    // Floating lily pad
    s.fill(oval(42, 166, 16, 7), C.lav);
    // Delicate blooming water lotus on lily pad
    s.line(sm([[42, 166], [42, 142]]));
    const lotus = shape([[36, 144], [42, 132], [48, 144], [42, 148]]);
    s.fill(lotus, C.pink);
    s.fill(leaf(42, 138, 12, -45, 0.4), C.olive);
    s.fill(leaf(42, 138, 12, -135, 0.4), C.olive);
    // Dragon-fly hovering over flower
    s.solid(oval(38, 126, 4, 1.5));
    s.line(sm([[34, 122], [38, 126], [42, 122]]), sm([[34, 128], [38, 126], [42, 128]]));
    // Crocodile body on right leaning down
    // Tail in back
    s.fill(shape([[158, 138], [172, 124], [170, 150], [154, 154]]), C.olive);
    // Striped trousers and feet
    const legs = poly([[118, 156], [144, 138], [156, 160], [142, 172], [132, 164], [120, 172]], true);
    s.fill(legs, C.white).hatch(legs, { angle: 65, gap: 3.2 });
    s.solid(shoe(116, 172, -1, 1, 0)).solid(shoe(138, 172, -1, 1, 0));
    // Coat and torso leaning forward
    const coat = poly([[96, 138], [142, 130], [146, 148], [98, 156]], true);
    s.fill(coat, C.white);
    s.line(sm([[98, 156], [142, 148]]));
    // Front arm reaching down
    s.fill(tube([[132, 136], [108, 146], [82, 148]], 11, 9), C.white);
    s.fill(mitt(78, 148, 5, -1, 0), C.olive);
    // Crocodile long head & snout
    const jawBottom = shape([[82, 132], [136, 122], [144, 134], [90, 140]]);
    const jawTop = shape([[76, 118], [126, 112], [140, 124], [80, 128]]);
    s.fill(jawBottom, C.lav);
    s.fill(jawTop, C.pink).dots(jawTop, C.pinkDot, 8, 1.0);
    // Nostril bump & cute eye
    s.fill(oval(84, 116, 3, 3), C.olive);
    s.solid(oval(118, 114, 3, 3));
    // Bowler hat tilted on head
    const hatBrim = rrect(114, 110, 24, 4, 2);
    const hatDome = shape([[120, 110], [122, 98], [134, 98], [136, 110]]);
    s.fill(hatBrim, C.ink).fill(hatDome, C.ink);
    // Attention/curiosity waves above hat
    s.line(
      sm([[126, 92], [130, 88], [136, 90]]),
      sm([[130, 84], [134, 80], [140, 82]])
    );
    return s.done('sc-croc-pond', 'Crocodile in a bowler hat', ['crocodile', 'alligator', 'nature', 'flower', 'pond', 'curious', 'character']);
  })(),

  // 5. sc-shield-run: Running hero carrying checkmark shield with ruffled cloud edge
  (() => {
    const s = scene();
    ground(s, 100, 178, 50, 5);
    // Speed lines behind runner
    s.line(
      sm([[28, 142], [48, 142]]),
      sm([[22, 148], [42, 148]]),
      sm([[32, 154], [52, 154]])
    );
    // Running person
    person(s, 96, 132, {
      pose: 'run',
      face: 1,
      shirt: C.white,
      pants: 'hatch',
      head: { hair: 'dark', mood: 'happy' }
    });
    // Arm extended forward holding shield
    s.line(sm([[92, 108], [76, 114], [80, 128]]));
    // Large verified shield in front of character
    // Shield outer silhouette
    const shieldBox = shape([[82, 68], [102, 60], [122, 68], [120, 114], [102, 130], [84, 114]]);
    s.fill(shieldBox, C.white);
    // Top border accent in lavender
    const topAccent = shape([[82, 68], [102, 60], [122, 68], [120, 76], [102, 70], [84, 76]]);
    s.fill(topAccent, C.lav);
    // Bottom ruffled cloud scallop border in pink
    const botAccent = shape([[84, 106], [90, 112], [96, 108], [102, 114], [108, 108], [114, 112], [120, 106], [120, 114], [102, 130], [84, 114]]);
    s.fill(botAccent, C.pink);
    // Center bold green checkmark badge
    s.fill(oval(102, 92, 12, 12), C.white);
    s.line(sm([[94, 92], [100, 98], [110, 84]]));
    // Concentric protective aura waves around shield
    s.line(
      sm([[124, 78], [130, 92], [126, 106]]),
      sm([[132, 74], [138, 92], [134, 110]])
    );
    return s.done('sc-shield-run', 'Running with a verified shield', ['security', 'shield', 'verified', 'fast', 'protection', 'runner', 'trust']);
  })(),

  // 6. sc-hippo-cinema: Cozy hippo astronaut in headphones relaxing on beanbag watching VR screen
  (() => {
    const s = scene();
    ground(s, 100, 178, 60, 5);
    // Olive beanbag chair
    const beanbag = shape([[60, 140], [70, 124], [94, 124], [120, 140], [128, 166], [98, 174], [64, 168]]);
    s.fill(beanbag, C.olive).dots(beanbag, C.oliveDot, 12, 1.2);
    // Hippo / astronaut character leaning back on beanbag
    // Torso in cozy white textured sweater
    const torso = poly([[78, 134], [110, 134], [116, 156], [74, 156]], true);
    s.fill(torso, C.white).hatch(torso, { angle: 45, gap: 3.2 });
    // Crossed feet kicked up in black boots
    s.solid(shoe(122, 144, 1, 0.85, 20)).solid(shoe(124, 136, 1, 0.85, -15));
    // Arms resting on belly
    s.line(sm([[84, 138], [96, 146], [108, 142]]));
    // Hippo head in lavender
    s.fill(oval(72, 114, 14, 12), C.lav).dots(oval(72, 114, 14, 12), C.lavDot, 6, 1.0);
    // Hippo snout and round ears
    s.fill(oval(62, 112, 4, 4), C.lav);
    s.fill(shape([[76, 110], [90, 110], [92, 120], [74, 120]]), C.white);
    s.solid(oval(88, 114, 1.5, 1.5));
    // Happy relaxed closed eye
    s.line(sm([[72, 110], [76, 113], [80, 110]]));
    // Headphones over ears
    s.fill(oval(68, 114, 4, 6), C.ink);
    s.line(sm([[68, 108], [72, 102], [78, 104]]));
    // Sound/enjoyment arcs above headphones
    s.line(
      sm([[62, 104], [66, 98], [72, 98]]),
      sm([[60, 98], [66, 92], [74, 92]])
    );
    // Curved wide panoramic VR/cinema screen in front
    const screen = shape([[114, 88], [156, 76], [162, 110], [118, 120]]);
    s.fill(screen, C.white).hatch(screen, { angle: -40, gap: 4 });
    // Play button icon on screen in pink
    s.fill(poly([[134, 94], [144, 100], [134, 106]], true), C.pink);
    // Striped tub of popcorn beside the chair
    const popcornTub = poly([[140, 146], [158, 146], [154, 168], [142, 168]], true);
    s.fill(popcornTub, C.white).hatch(popcornTub, { angle: 90, gap: 3.5 });
    s.fill(puff(149, 142, 10, 5, 5, 0.2, 3), C.white);
    return s.done('sc-hippo-cinema', 'Cozy VR cinema and popcorn', ['cinema', 'movie', 'vr', 'video', 'relax', 'hippo', 'popcorn', 'entertainment']);
  })(),

  // 7. sc-lightbulb-greenhouse: Giant lightbulb functioning as greenhouse with sprout
  (() => {
    const s = scene();
    ground(s, 100, 178, 48, 5);
    // Radiant energy rays around bulb
    s.line(
      sm([[52, 60], [40, 52]]),
      sm([[52, 92], [38, 92]]),
      sm([[148, 60], [160, 52]]),
      sm([[148, 92], [162, 92]]),
      sm([[100, 36], [100, 24]])
    );
    // Giant glass lightbulb outline
    const bulbGlass = shape([
      [84, 142], [76, 126], [66, 104], [66, 80],
      [80, 56], [100, 48], [120, 56], [134, 80],
      [134, 104], [124, 126], [116, 142]
    ]);
    s.fill(bulbGlass, C.white);
    // Screw base of bulb
    s.fill(rrect(84, 142, 32, 14, 3), C.pink).dots(rrect(84, 142, 32, 14, 3), C.pinkDot, 6, 1);
    s.fill(poly([[88, 156], [112, 156], [106, 166], [94, 166]], true), C.ink);
    // Soil mound inside bulb base
    const soil = shape([[78, 138], [100, 132], [122, 138], [116, 142], [84, 142]]);
    s.fill(soil, C.pink).hatch(soil, { angle: -30, gap: 2.8 });
    // Sprouting plant growing inside bulb
    s.line(sm([[100, 134], [100, 84]]));
    s.fill(leaf(100, 106, 22, -40, 0.45), C.olive).dots(leaf(100, 106, 22, -40, 0.45), C.oliveDot, 5, 0.9);
    s.fill(leaf(100, 96, 20, -140, 0.45), C.olive).dots(leaf(100, 96, 20, -140, 0.45), C.oliveDot, 5, 0.9);
    s.fill(leaf(100, 84, 16, -90, 0.4), C.lav);
    // Little glowing spark stars inside
    s.fill(sparkle(86, 78, 5), C.lav);
    s.fill(sparkle(116, 74, 4), C.pink);
    return s.done('sc-lightbulb-greenhouse', 'Greenhouse inside a bulb', ['greenhouse', 'idea', 'sustainable', 'plant', 'eco', 'growth', 'clean']);
  })(),

  // 8. sc-coffee-brain: Ceramic coffee mug with steam forming creative brain outline
  (() => {
    const s = scene();
    ground(s, 100, 178, 52, 5);
    // Ceramic coffee cup
    const cup = poly([[72, 118], [128, 118], [122, 164], [78, 164]], true);
    s.fill(cup, C.pink).dots(cup, C.pinkDot, 12, 1.1);
    // Mug saucer underneath
    s.fill(oval(100, 168, 38, 7), C.white);
    // Handle on the right
    s.fill(shape([[126, 126], [146, 130], [142, 154], [124, 150]]), C.white);
    s.fill(shape([[126, 132], [138, 134], [136, 148], [124, 144]]), C.pink);
    // Dark hot coffee surface rim
    s.fill(oval(100, 118, 28, 6), C.ink);
    // Rising steam curving upwards into a brain silhouette
    s.line(
      sm([[88, 112], [84, 98], [76, 88]]),
      sm([[112, 112], [116, 98], [124, 88]])
    );
    // Left and right lobes of creative brain cloud in steam
    const leftLobe = puff(82, 62, 18, 22, 6, 0.22, 5);
    const rightLobe = puff(118, 62, 18, 22, 6, 0.22, 8);
    s.fill(leftLobe, C.lav).dots(leftLobe, C.lavDot, 8, 1.0);
    s.fill(rightLobe, C.lav).dots(rightLobe, C.lavDot, 8, 1.0);
    // Brain gyri convolutions inside steam
    s.line(
      sm([[74, 56], [82, 60], [78, 68]]),
      sm([[82, 50], [88, 56], [86, 68]]),
      sm([[126, 56], [118, 60], [122, 68]]),
      sm([[118, 50], [112, 56], [114, 68]])
    );
    // Creative inspiration sparks
    s.fill(sparkle(100, 38, 6), C.olive);
    s.fill(sparkle(60, 50, 4), C.pink);
    s.fill(sparkle(140, 52, 4), C.olive);
    return s.done('sc-coffee-brain', 'Coffee fuel for the brain', ['coffee', 'brain', 'creativity', 'focus', 'morning', 'energy', 'idea']);
  })(),

  // 9. sc-compass-star: Vintage brass compass pointing towards the north star
  (() => {
    const s = scene();
    ground(s, 100, 178, 44, 5);
    // Shining 8-point guiding star at the top
    s.fill(star(100, 42, 18, 6, 8), C.lav).dots(star(100, 42, 18, 6, 8), C.lavDot, 8, 1.0);
    s.fill(star(100, 42, 8, 3.5, 4), C.white);
    // Compass body in olive & white
    const compassOuter = oval(100, 124, 38, 38);
    s.fill(compassOuter, C.olive).dots(compassOuter, C.oliveDot, 14, 1.1);
    s.fill(oval(100, 124, 30, 30), C.white);
    // Top brass loop / hanger ring
    s.fill(oval(100, 84, 8, 8), C.olive);
    s.fill(oval(100, 84, 4, 4), C.white);
    // Cardinal direction ticks on compass rose
    s.line(
      sm([[100, 96], [100, 102]]),
      sm([[100, 146], [100, 152]]),
      sm([[72, 124], [78, 124]]),
      sm([[122, 124], [128, 124]])
    );
    // Compass needle: North pointing up (pink), South pointing down (hatch)
    const northNeedle = poly([[100, 100], [107, 124], [93, 124]], true);
    const southNeedle = poly([[100, 148], [107, 124], [93, 124]], true);
    s.fill(northNeedle, C.pink);
    s.fill(southNeedle, C.white).hatch(southNeedle, { angle: -45, gap: 2.5 });
    // Center brass pivot point
    s.solid(oval(100, 124, 4, 4));
    // Guiding rays connecting compass to star
    s.line(
      dashes((t) => [100, 86 - t * 24], 4),
      sm([[82, 48], [74, 42]]),
      sm([[118, 48], [126, 42]])
    );
    return s.done('sc-compass-star', 'Guiding compass and north star', ['compass', 'direction', 'navigation', 'star', 'guidance', 'strategy', 'goal']);
  })(),

  // 10. sc-telescope-moon: Brass telescope on tripod discovering a smiling moon
  (() => {
    const s = scene();
    ground(s, 120, 178, 48, 5);
    // Crescent smiling moon in top left
    const moon = shape([
      [42, 34], [62, 40], [70, 58], [62, 78], [42, 84],
      [54, 72], [56, 58], [54, 44]
    ]);
    s.fill(moon, C.lav).dots(moon, C.lavDot, 10, 1.0);
    // Moon eye and smile
    s.solid(oval(54, 52, 2, 2));
    s.line(sm([[50, 62], [54, 65], [58, 62]]));
    // Little constellations surrounding moon
    s.fill(sparkle(78, 38, 5), C.pink);
    s.fill(sparkle(34, 60, 4), C.olive);
    s.fill(sparkle(52, 98, 4), C.pink);
    // Telescope tripod stand on right
    s.line(
      sm([[124, 124], [96, 174]]),
      sm([[124, 124], [126, 174]]),
      sm([[124, 124], [152, 174]]),
      sm([[108, 154], [140, 154]])
    );
    s.fill(oval(124, 124, 6, 6), C.ink);
    // Telescope tube angled towards moon
    const tubeBody = poly([[138, 134], [148, 142], [96, 88], [88, 80]], true);
    s.fill(tubeBody, C.pink).dots(tubeBody, C.pinkDot, 8, 1.0);
    // Eyepiece on right
    s.fill(rrect(144, 138, 12, 8, 2), C.olive);
    // Front lens barrel on left pointing up
    s.fill(poly([[84, 76], [98, 88], [94, 94], [80, 82]], true), C.olive);
    // Focus adjustments and sight line
    s.line(
      sm([[124, 112], [128, 116]]),
      dashes((t) => [82 - t * 24, 74 - t * 20], 3)
    );
    return s.done('sc-telescope-moon', 'Telescope stargazing at the moon', ['telescope', 'astronomy', 'moon', 'stars', 'discovery', 'space', 'vision']);
  })(),
];
