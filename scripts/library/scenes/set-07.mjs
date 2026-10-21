import { C, at, bird, bulb, dashes, doc, ground, handOf, head, heart, leaf, mitt, oval, person, plant, poly, puff, rect, ring, rrect, scene, shape, shoe, sm, sparkle, star, swoosh, tube } from './kit.mjs';

export default [
  // 11. sc-cloud-server: Fluffy cloud plugged into miniature server rack with blinking LED dots
  (() => {
    const s = scene();
    ground(s, 100, 178, 52, 5);
    // Fluffy cloud floating above
    const cloud = puff(100, 52, 34, 19, 7, 0.18, 9);
    s.fill(cloud, C.lav).dots(cloud, C.lavDot, 12, 1.0);
    // Cloud friendly calm face
    s.line(
      sm([[92, 50], [96, 52], [100, 50]]),
      sm([[104, 50], [108, 52], [112, 50]]),
      sm([[98, 58], [102, 60], [106, 58]])
    );
    // Cable connecting cloud to server rack below
    s.line(sm([[100, 68], [100, 96], [82, 104], [82, 124]]));
    // Miniature server rack unit below
    const rack = rrect(72, 114, 56, 54, 4);
    s.fill(rack, C.white).hatch(rack, { angle: -45, gap: 4 });
    // 3 server blade drawers
    const b1 = rrect(76, 118, 48, 12, 2);
    const b2 = rrect(76, 134, 48, 12, 2);
    const b3 = rrect(76, 150, 48, 12, 2);
    s.fill(b1, C.pink).dots(b1, C.pinkDot, 5, 0.9);
    s.fill(b2, C.olive).dots(b2, C.oliveDot, 5, 0.9);
    s.fill(b3, C.lav).dots(b3, C.lavDot, 5, 0.9);
    // Blinking LED indicator status lights
    s.solid(oval(82, 124, 2, 2)).solid(oval(88, 124, 2, 2));
    s.solid(oval(82, 140, 2, 2)).solid(oval(88, 140, 2, 2));
    s.solid(oval(82, 156, 2, 2)).solid(oval(88, 156, 2, 2));
    // Data sync signal arcs
    s.line(
      sm([[134, 124], [140, 130], [134, 136]]),
      sm([[140, 120], [148, 130], [140, 140]]),
      sm([[62, 52], [54, 58], [62, 64]])
    );
    return s.done('sc-cloud-server', 'Cloud server infrastructure', ['cloud', 'server', 'database', 'hosting', 'backup', 'tech', 'data']);
  })(),

  // 12. sc-origami-crane: Folded paper origami bird taking flight from an open book
  (() => {
    const s = scene();
    ground(s, 100, 178, 55, 5);
    // Open hardcover book at base
    const bookL = poly([[100, 148], [48, 136], [46, 160], [100, 172]], true);
    const bookR = poly([[100, 148], [152, 136], [154, 160], [100, 172]], true);
    s.fill(bookL, C.lav).dots(bookL, C.lavDot, 8, 1.0);
    s.fill(bookR, C.lav).dots(bookR, C.lavDot, 8, 1.0);
    // Book pages thickness and text lines
    s.fill(poly([[100, 144], [52, 133], [50, 154], [100, 166]], true), C.white).hatch(poly([[100, 144], [52, 133], [50, 154], [100, 166]], true), { angle: 30, gap: 3.5 });
    s.fill(poly([[100, 144], [148, 133], [150, 154], [100, 166]], true), C.white).hatch(poly([[100, 144], [148, 133], [150, 154], [100, 166]], true), { angle: -30, gap: 3.5 });
    // Book spine center crease
    s.line(sm([[100, 144], [100, 172]]));
    // Dotted flight trail ascending from book
    s.line(dashes((t) => [100 - Math.sin(t * Math.PI) * 16, 140 - t * 65], 6));
    // Geometric origami crane taking flight above
    const wingL = poly([[100, 75], [54, 48], [88, 85]], true);
    const wingR = poly([[100, 75], [146, 48], [112, 85]], true);
    const body = poly([[100, 62], [112, 85], [100, 102], [88, 85]], true);
    const headNeck = poly([[88, 85], [74, 62], [66, 64], [80, 75]], true);
    const tail = poly([[112, 85], [128, 70], [118, 92]], true);
    s.fill(wingL, C.pink);
    s.fill(wingR, C.pink);
    s.fill(body, C.olive).dots(body, C.oliveDot, 5, 0.9);
    s.fill(headNeck, C.olive);
    s.fill(tail, C.white);
    // Magic sparkles around flight
    s.fill(sparkle(62, 38, 5), C.olive);
    s.fill(sparkle(138, 38, 4), C.lav);
    s.fill(sparkle(100, 36, 4), C.pink);
    return s.done('sc-origami-crane', 'Origami crane taking flight', ['origami', 'creativity', 'book', 'learning', 'flight', 'freedom', 'art']);
  })(),

  // 13. sc-code-terminal: Retro CRT computer monitor displaying code brackets
  (() => {
    const s = scene();
    ground(s, 100, 178, 54, 5);
    // Monitor stand and base
    s.fill(poly([[82, 172], [118, 172], [112, 158], [88, 158]], true), C.white).hatch(poly([[82, 172], [118, 172], [112, 158], [88, 158]], true), { angle: -30 });
    s.fill(rrect(92, 146, 16, 14, 2), C.pink);
    // Outer retro monitor casing
    const monitorBox = rrect(48, 64, 104, 84, 8);
    s.fill(monitorBox, C.pink).dots(monitorBox, C.pinkDot, 14, 1.1);
    // CRT screen display inside
    const screenBox = rrect(56, 72, 88, 68, 5);
    s.fill(screenBox, C.white).hatch(screenBox, { angle: 0, gap: 4.5, c: C.pale });
    // Code brackets < / > displayed boldly on screen
    // Left angle bracket <
    s.line(poly([[74, 94], [64, 104], [74, 114]]));
    // Slash /
    s.line(poly([[90, 116], [104, 92]]));
    // Right angle bracket >
    s.line(poly([[120, 94], [130, 104], [120, 114]]));
    // Code text line bars underneath
    s.fill(rrect(68, 124, 24, 4, 1), C.lav);
    s.fill(rrect(98, 124, 30, 4, 1), C.olive);
    // Ventilation louvres on top
    s.line(
      sm([[64, 68], [82, 68]]),
      sm([[88, 68], [106, 68]]),
      sm([[112, 68], [130, 68]])
    );
    // Floating digital sparks
    s.fill(sparkle(38, 62, 5), C.lav);
    s.fill(sparkle(162, 70, 5), C.olive);
    return s.done('sc-code-terminal', 'Code on a retro terminal', ['code', 'developer', 'software', 'programming', 'terminal', 'tech', 'screen']);
  })(),

  // 14. sc-data-funnel: Giant funnel filtering scattered raw data into polished gems
  (() => {
    const s = scene();
    ground(s, 100, 178, 48, 5);
    // Raw chaotic data shapes entering top of funnel
    s.fill(star(68, 38, 7, 3.5, 5), C.lav);
    s.fill(poly([[94, 28], [106, 28], [106, 40], [94, 40]], true), C.pink);
    s.fill(oval(128, 36, 7, 7), C.olive);
    s.line(
      sm([[74, 46], [82, 58]]),
      sm([[100, 42], [100, 56]]),
      sm([[124, 46], [116, 58]])
    );
    // Large funnel cone
    const funnelTop = poly([[52, 64], [148, 64], [114, 118], [86, 118]], true);
    s.fill(funnelTop, C.white).hatch(funnelTop, { angle: -45, gap: 4 });
    s.fill(oval(100, 64, 48, 8), C.lav).dots(oval(100, 64, 48, 8), C.lavDot, 8, 1.0);
    // Funnel vertical spout tube
    const spout = poly([[86, 118], [114, 118], [110, 144], [90, 144]], true);
    s.fill(spout, C.pink).dots(spout, C.pinkDot, 6, 0.9);
    // Polished sparkling gem emerging at bottom
    const gem = poly([[100, 152], [114, 162], [100, 174], [86, 162]], true);
    s.fill(gem, C.olive).dots(gem, C.oliveDot, 6, 1.0);
    s.fill(poly([[100, 152], [108, 162], [100, 174]], true), C.white);
    // Sparkles of clarity around refined output
    s.fill(sparkle(74, 164, 4), C.pink);
    s.fill(sparkle(126, 164, 5), C.lav);
    s.line(
      sm([[82, 146], [78, 140]]),
      sm([[118, 146], [122, 140]])
    );
    return s.done('sc-data-funnel', 'Filtering and refining data', ['data', 'analytics', 'funnel', 'refine', 'insights', 'conversion', 'pipeline']);
  })(),

  // 15. sc-creative-palette: Painter artist palette overflowing with colorful paint and brushes
  (() => {
    const s = scene();
    ground(s, 100, 178, 54, 5);
    // Wooden palette body
    const palette = shape([
      [56, 120], [44, 94], [64, 62], [108, 52], [148, 68],
      [156, 106], [138, 138], [106, 144], [84, 136]
    ]);
    s.fill(palette, C.white).hatch(palette, { angle: 25, gap: 4 });
    // Thumb grip hole
    s.fill(oval(72, 118, 8, 11, -20), C.white);
    // Colorful paint dollops on palette
    s.fill(oval(74, 76, 9, 8), C.lav).dots(oval(74, 76, 9, 8), C.lavDot, 5, 0.9);
    s.fill(oval(102, 66, 10, 8), C.pink).dots(oval(102, 66, 10, 8), C.pinkDot, 5, 0.9);
    s.fill(oval(132, 80, 9, 8), C.olive).dots(oval(132, 80, 9, 8), C.oliveDot, 5, 0.9);
    s.fill(oval(136, 108, 8, 8), C.lav);
    // Two paintbrushes sticking through thumb hole
    // Brush 1 angled left
    const b1Handle = poly([[70, 124], [52, 168], [48, 166], [66, 122]], true);
    s.fill(b1Handle, C.ink);
    s.fill(poly([[70, 124], [78, 104], [74, 102], [66, 122]], true), C.pink);
    s.fill(shape([[78, 104], [86, 88], [80, 86], [74, 102]]), C.olive);
    // Brush 2 angled right
    const b2Handle = poly([[74, 124], [88, 168], [92, 166], [78, 122]], true);
    s.fill(b2Handle, C.pink);
    s.fill(poly([[74, 124], [68, 104], [72, 102], [78, 122]], true), C.olive);
    s.fill(shape([[68, 104], [60, 88], [66, 86], [72, 102]]), C.lav);
    // Creative splash droplets
    s.solid(oval(116, 42, 3, 3));
    s.solid(oval(148, 54, 2.5, 2.5));
    s.fill(sparkle(100, 36, 5), C.pink);
    return s.done('sc-creative-palette', 'Artist palette and paintbrushes', ['art', 'creative', 'design', 'palette', 'paint', 'craft', 'color']);
  })(),

  // 16. sc-music-headphones: Floating retro cassette tape wrapped in headphone cords
  (() => {
    const s = scene();
    ground(s, 100, 178, 48, 5);
    // Large overhead stereo headphones
    // Headband arc
    s.line(sm([[62, 94], [72, 48], [100, 40], [128, 48], [138, 94]]));
    // Left ear cushion
    const earL = rrect(54, 88, 16, 26, 6);
    s.fill(earL, C.olive).dots(earL, C.oliveDot, 6, 1.0);
    // Right ear cushion
    const earR = rrect(130, 88, 16, 26, 6);
    s.fill(earR, C.olive).dots(earR, C.oliveDot, 6, 1.0);
    // Retro cassette tape in center
    const cassette = rrect(68, 92, 64, 42, 4);
    s.fill(cassette, C.pink).dots(cassette, C.pinkDot, 10, 1.0);
    // Cassette label area
    const label = rrect(74, 98, 52, 22, 3);
    s.fill(label, C.white);
    // Two tape reels inside
    s.fill(oval(88, 109, 6, 6), C.ink);
    s.fill(oval(112, 109, 6, 6), C.ink);
    s.fill(oval(88, 109, 2.5, 2.5), C.white);
    s.fill(oval(112, 109, 2.5, 2.5), C.white);
    // Headphone audio cord curling down
    s.line(
      sm([[62, 114], [60, 142], [76, 154], [100, 146], [124, 158], [136, 144], [138, 114]])
    );
    // Musical eighth notes floating up
    s.line(
      sm([[44, 76], [44, 62], [54, 66], [54, 80]]),
      sm([[148, 72], [148, 58], [158, 62]])
    );
    s.solid(oval(41, 77, 4, 3, -20)).solid(oval(51, 81, 4, 3, -20)).solid(oval(145, 73, 4, 3, -20));
    return s.done('sc-music-headphones', 'Cassette tape and headphones', ['music', 'audio', 'sound', 'headphones', 'cassette', 'podcast', 'listen']);
  })(),

  // 17. sc-ai-sparkle-wand: Robotic hand holding a magic wand transforming ideas
  (() => {
    const s = scene();
    ground(s, 100, 178, 50, 5);
    // Mechanical robotic arm extending from left
    const armTube = tube([[28, 148], [56, 142], [82, 134]], 14, 12);
    s.fill(armTube, C.white).hatch(armTube, { angle: -45, gap: 3.5 });
    // Arm metal joint cuff
    s.fill(oval(56, 142, 6, 8, 20), C.lav);
    // Robot hand holding wand
    s.fill(oval(84, 132, 8, 9, 10), C.pink);
    s.fill(tube([[84, 132], [96, 124]], 6, 5), C.pink);
    s.fill(tube([[86, 134], [94, 132]], 5, 4), C.pink);
    // Magic wand angled up-right
    const wandShaft = poly([[86, 142], [134, 74], [138, 76], [90, 144]], true);
    s.fill(wandShaft, C.ink);
    // Magic star tip on wand
    s.fill(star(138, 70, 14, 6, 5), C.olive).dots(star(138, 70, 14, 6, 5), C.oliveDot, 6, 0.9);
    s.fill(star(138, 70, 6, 2.8, 5), C.white);
    // Swirling fairy dust aura / sparkles transforming outward
    s.line(
      sm([[124, 88], [142, 88], [152, 78], [148, 62], [130, 56]]),
      swoosh(138, 70, 18, -40, 20, 2, 5)
    );
    s.fill(sparkle(162, 56, 6), C.pink);
    s.fill(sparkle(142, 38, 4), C.lav);
    s.fill(sparkle(116, 44, 5), C.olive);
    return s.done('sc-ai-sparkle-wand', 'Robot wand and creative sparks', ['ai', 'robot', 'magic', 'creativity', 'automation', 'future', 'transform']);
  })(),

  // 18. sc-network-globe: Stylized wireframe globe with orbiting communication satellites
  (() => {
    const s = scene();
    ground(s, 100, 178, 52, 5);
    // Center globe sphere
    const globe = oval(100, 104, 38, 38);
    s.fill(globe, C.lav).dots(globe, C.lavDot, 14, 1.1);
    // Longitude and latitude curved wireframe grid lines
    s.line(
      sm([[100, 66], [100, 142]]),
      sm([[62, 104], [138, 104]]),
      sm([[100, 66], [82, 104], [100, 142]]),
      sm([[100, 66], [118, 104], [100, 142]]),
      sm([[68, 86], [100, 92], [132, 86]]),
      sm([[68, 122], [100, 116], [132, 122]])
    );
    // Orbiting communication elliptical path ring
    s.line(
      dashes((t) => {
        const a = t * Math.PI * 2;
        return [100 + Math.cos(a) * 56, 104 + Math.sin(a) * 20 - Math.cos(a) * 16];
      }, 14)
    );
    // Satellite 1 top right
    const sat1 = poly([[142, 68], [152, 60], [158, 68], [148, 76]], true);
    s.fill(sat1, C.pink);
    s.fill(poly([[150, 56], [162, 48], [166, 54], [154, 62]], true), C.olive);
    s.fill(poly([[138, 72], [126, 80], [130, 86], [142, 78]], true), C.olive);
    // Satellite 2 bottom left
    const sat2 = poly([[52, 134], [60, 128], [66, 134], [58, 140]], true);
    s.fill(sat2, C.pink);
    s.fill(poly([[44, 140], [36, 146], [40, 150], [48, 144]], true), C.olive);
    // Wireless signal ripple arcs
    s.line(
      sm([[134, 76], [130, 82]]),
      sm([[66, 126], [72, 120]])
    );
    return s.done('sc-network-globe', 'Global communication network', ['network', 'global', 'satellite', 'connectivity', 'world', 'internet', 'data']);
  })(),

  // 19. sc-battery-charge: Giant battery getting filled with green energy and lightning bolt
  (() => {
    const s = scene();
    ground(s, 100, 178, 52, 5);
    // Battery top terminal nub
    s.fill(rrect(92, 46, 16, 8, 2), C.pink);
    // Main battery cylindrical casing
    const casing = rrect(68, 54, 64, 108, 8);
    s.fill(casing, C.white).hatch(casing, { angle: -45, gap: 4 });
    // Green power charge level (65% filled)
    const charge = rrect(72, 92, 56, 66, 5);
    s.fill(charge, C.olive).dots(charge, C.oliveDot, 12, 1.1);
    // High-voltage lightning bolt emblem in center
    const bolt = poly([
      [104, 70], [92, 98], [102, 98],
      [96, 128], [112, 94], [102, 94]
    ], true);
    s.fill(bolt, C.white);
    // Energy sparkles radiating outward
    s.line(
      sm([[56, 84], [44, 80]]),
      sm([[56, 114], [42, 114]]),
      sm([[144, 84], [156, 80]]),
      sm([[144, 114], [158, 114]])
    );
    s.fill(sparkle(48, 62, 5), C.lav);
    s.fill(sparkle(152, 64, 5), C.pink);
    return s.done('sc-battery-charge', 'Battery charging with clean energy', ['battery', 'charge', 'power', 'energy', 'eco', 'sustainable', 'electric']);
  })(),

  // 20. sc-fingerprint-lock: Biometric fingerprint scanner unlocking an ornate padlock
  (() => {
    const s = scene();
    ground(s, 100, 178, 48, 5);
    // Open shackle of padlock at top
    s.line(
      sm([[78, 92], [78, 62], [100, 48], [122, 62], [122, 74]])
    );
    // Padlock solid body
    const lockBody = rrect(64, 88, 72, 64, 8);
    s.fill(lockBody, C.lav).dots(lockBody, C.lavDot, 14, 1.1);
    // Biometric scanner circular screen inside lock
    s.fill(oval(100, 120, 22, 22), C.white);
    // Fingerprint whorl ridges inside scanner
    s.line(
      sm([[96, 116], [98, 112], [102, 112], [104, 116]]),
      sm([[92, 120], [96, 106], [104, 106], [108, 120]]),
      sm([[88, 124], [94, 100], [106, 100], [112, 124]]),
      sm([[92, 128], [98, 134], [102, 134], [108, 128]])
    );
    // Security unlocked checkmark status
    s.fill(oval(124, 94, 9, 9), C.olive);
    s.line(sm([[120, 94], [123, 97], [128, 91]]));
    // Aura lines around open shackle
    s.line(
      sm([[126, 60], [134, 56]]),
      sm([[128, 70], [136, 72]])
    );
    return s.done('sc-fingerprint-lock', 'Biometric fingerprint padlock', ['security', 'lock', 'fingerprint', 'biometrics', 'privacy', 'cyber', 'access']);
  })(),
];
