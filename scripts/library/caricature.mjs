/**
 * Caricature Generator for Chalkline Studio
 *
 * Implements Part 1 & Part 2:
 * - Big head (head ≈ 1/3 of total height)
 * - Expressive face with warm smile, character-specific hair & glasses
 * - Semi-realistic cartoon shading with soft gradients
 * - Soft small contact shadow under feet only
 * - Centred full body inside 200x200 viewBox (bounds 15-185)
 * - Identical LINE version with pen-and-ink comic style, weighted outlines, and cross-hatching
 * - Centerline strokes with stored widths `w` in natural drawing order
 */

export function renderCharacter(c, pose = 'standing') {
  const S = []; // Line strokes: Array<{ d: string, w: number }>
  const F = []; // Fills: Array<{ d: string, c: string }>
  const idPrefix = `${c.slug}-${pose}`;

  const skin = c.skinTone || '#E2B48C';
  const hair = c.hairColor || '#1F2937';
  const outfit = c.outfit || { jacket: '#1E3A8A', shirt: '#FFFFFF', pants: '#1E293B', shoes: '#0F172A' };

  // Head coordinates: big head centered at cx: 100, cy: 52, radius: 24 (diameter 48, ~ 1/3 of 150 body height)
  const hx = 100;
  const hy = 52;
  const hr = 24;

  // 1. Soft contact shadow under feet
  const shadowD = 'M68,182 Q100,179 132,182 Q100,185 68,182 Z';
  const shadowSvg = `<ellipse cx="100" cy="182" rx="34" ry="4" fill="rgba(0,0,0,0.18)" />`;

  // 2. Head base
  const headD = `M${hx - hr},${hy} A${hr},${hr + 2} 0 1,0 ${hx + hr},${hy} A${hr},${hr + 2} 0 1,0 ${hx - hr},${hy} Z`;
  F.push({ d: headD, c: skin });
  S.push({ d: headD, w: 3.2 });

  // 3. Ears
  const leftEar = `M${hx - hr - 1},${hy - 2} Q${hx - hr - 7},${hy} ${hx - hr - 1},${hy + 8} Z`;
  const rightEar = `M${hx + hr + 1},${hy - 2} Q${hx + hr + 7},${hy} ${hx + hr + 1},${hy + 8} Z`;
  F.push({ d: leftEar, c: skin });
  F.push({ d: rightEar, c: skin });
  S.push({ d: leftEar, w: 2.2 });
  S.push({ d: rightEar, w: 2.2 });

  // 4. Facial Features: Eyes with expressive gleam, eyebrows, nose, smile
  const eyeY = hy + 1;
  const eyeR = 3.6;
  const leftEyeD = `M${hx - 10 - eyeR},${eyeY} A${eyeR},${eyeR} 0 1,0 ${hx - 10 + eyeR},${eyeY} A${eyeR},${eyeR} 0 1,0 ${hx - 10 - eyeR},${eyeY} Z`;
  const rightEyeD = `M${hx + 10 - eyeR},${eyeY} A${eyeR},${eyeR} 0 1,0 ${hx + 10 + eyeR},${eyeY} A${eyeR},${eyeR} 0 1,0 ${hx + 10 - eyeR},${eyeY} Z`;
  F.push({ d: leftEyeD, c: '#111827' });
  F.push({ d: rightEyeD, c: '#111827' });
  S.push({ d: leftEyeD, w: 1.8 });
  S.push({ d: rightEyeD, w: 1.8 });

  // Eye reflections (gleam)
  const leftGleam = `M${hx - 11},${eyeY - 1} A1.2,1.2 0 1,0 ${hx - 9},${eyeY - 1} Z`;
  const rightGleam = `M${hx + 9},${eyeY - 1} A1.2,1.2 0 1,0 ${hx + 11},${eyeY - 1} Z`;
  F.push({ d: leftGleam, c: '#FFFFFF' });
  F.push({ d: rightGleam, c: '#FFFFFF' });

  // Eyebrows
  const leftBrow = `M${hx - 16},${hy - 6} Q${hx - 10},${hy - 9} ${hx - 4},${hy - 6}`;
  const rightBrow = `M${hx + 4},${hy - 6} Q${hx + 10},${hy - 9} ${hx + 16},${hy - 6}`;
  S.push({ d: leftBrow, w: 2.2 });
  S.push({ d: rightBrow, w: 2.2 });

  // Nose
  const noseD = `M${hx - 2},${hy + 5} Q${hx + 3},${hy + 8} ${hx},${hy + 10}`;
  S.push({ d: noseD, w: 1.8 });

  // Friendly Smile & dimples
  const smileD = `M${hx - 9},${hy + 15} Q${hx},${hy + 22} ${hx + 9},${hy + 15}`;
  const dimpleL = `M${hx - 11},${hy + 14} Q${hx - 10},${hy + 16} ${hx - 9},${hy + 17}`;
  const dimpleR = `M${hx + 11},${hy + 14} Q${hx + 10},${hy + 16} ${hx + 9},${hy + 17}`;
  S.push({ d: smileD, w: 2.2 });
  S.push({ d: dimpleL, w: 1.4 });
  S.push({ d: dimpleR, w: 1.4 });

  // Glasses (if character wears them)
  if (c.hasGlasses) {
    const glR = c.glassesStyle === 'half-moon' ? 7 : 8.5;
    const lLens = `M${hx - 10 - glR},${eyeY} A${glR},${glR - 1} 0 1,0 ${hx - 10 + glR},${eyeY} A${glR},${glR - 1} 0 1,0 ${hx - 10 - glR},${eyeY} Z`;
    const rLens = `M${hx + 10 - glR},${eyeY} A${glR},${glR - 1} 0 1,0 ${hx + 10 + glR},${eyeY} A${glR},${glR - 1} 0 1,0 ${hx + 10 - glR},${eyeY} Z`;
    const bridge = `M${hx - 10 + glR},${eyeY} L${hx + 10 - glR},${eyeY}`;
    const lArm = `M${hx - 10 - glR},${eyeY} L${hx - hr - 1},${hy}`;
    const rArm = `M${hx + 10 + glR},${eyeY} L${hx + hr + 1},${hy}`;
    S.push({ d: lLens, w: 2.0 });
    S.push({ d: rLens, w: 2.0 });
    S.push({ d: bridge, w: 2.0 });
    S.push({ d: lArm, w: 1.6 });
    S.push({ d: rArm, w: 1.6 });
  }

  // Facial hair: moustache / beard
  if (c.facialHair === 'moustache') {
    const moust = `M${hx - 12},${hy + 13} Q${hx},${hy + 9} ${hx + 12},${hy + 13} Q${hx},${hy + 16} ${hx - 12},${hy + 13} Z`;
    F.push({ d: moust, c: hair });
    S.push({ d: moust, w: 2.0 });
  } else if (c.facialHair === 'beard') {
    const beardD = `M${hx - 18},${hy + 12} Q${hx - 12},${hy + 32} ${hx},${hy + 35} Q${hx + 12},${hy + 32} ${hx + 18},${hy + 12} Q${hx},${hy + 24} ${hx - 18},${hy + 12} Z`;
    F.push({ d: beardD, c: hair });
    S.push({ d: beardD, w: 2.4 });
  }

  // 5. Hair Styles
  if (c.hairStyle === 'quiff') {
    const hairD = `M${hx - 24},${hy - 4} Q${hx - 26},${hy - 26} ${hx - 4},${hy - 32} Q${hx + 18},${hy - 34} ${hx + 26},${hy - 14} Q${hx + 25},${hy} ${hx + 24},${hy + 4} Q${hx + 14},${hy - 12} ${hx},${hy - 14} Q${hx - 16},${hy - 12} ${hx - 24},${hy - 4} Z`;
    F.push({ d: hairD, c: hair });
    S.push({ d: hairD, w: 2.8 });
    S.push({ d: `M${hx - 8},${hy - 26} Q${hx + 10},${hy - 24} ${hx + 18},${hy - 12}`, w: 1.4 });
  } else if (c.hairStyle === 'ponytail') {
    const hairTop = `M${hx - 24},${hy - 2} Q${hx - 25},${hy - 24} ${hx},${hy - 26} Q${hx + 25},${hy - 24} ${hx + 24},${hy - 2} Q${hx + 12},${hy - 14} ${hx},${hy - 14} Q${hx - 12},${hy - 14} ${hx - 24},${hy - 2} Z`;
    const tailD = `M${hx + 20},${hy - 14} Q${hx + 34},${hy - 4} ${hx + 32},${hy + 22} Q${hx + 28},${hy + 32} ${hx + 22},${hy + 36} Q${hx + 26},${hy + 18} ${hx + 18},${hy - 6} Z`;
    F.push({ d: hairTop, c: hair });
    F.push({ d: tailD, c: hair });
    S.push({ d: hairTop, w: 2.8 });
    S.push({ d: tailD, w: 2.8 });
  } else if (c.hairStyle === 'swept') {
    const hairD = `M${hx - 25},${hy - 4} Q${hx - 24},${hy - 26} ${hx},${hy - 28} Q${hx + 24},${hy - 26} ${hx + 25},${hy - 4} Q${hx + 14},${hy - 12} ${hx - 6},${hy - 12} ${hx - 25},${hy - 4} Z`;
    F.push({ d: hairD, c: hair });
    S.push({ d: hairD, w: 2.8 });
    S.push({ d: `M${hx - 16},${hy - 20} Q${hx},${hy - 20} ${hx + 16},${hy - 14}`, w: 1.4 });
  } else if (c.hairStyle === 'bun') {
    const hairTop = `M${hx - 24},${hy - 2} Q${hx - 24},${hy - 24} ${hx},${hy - 25} Q${hx + 24},${hy - 24} ${hx + 24},${hy - 2} Q${hx},${hy - 12} ${hx - 24},${hy - 2} Z`;
    const bunD = `M${hx - 10},${hy - 24} A12,12 0 1,1 ${hx + 10},${hy - 24} Z`;
    F.push({ d: bunD, c: hair });
    F.push({ d: hairTop, c: hair });
    S.push({ d: bunD, w: 2.8 });
    S.push({ d: hairTop, w: 2.8 });
  } else if (c.hairStyle === 'hijab') {
    const hijabD = `M${hx - 28},${hy + 8} Q${hx - 26},${hy - 28} ${hx},${hy - 28} Q${hx + 26},${hy - 28} ${hx + 28},${hy + 8} Q${hx + 26},${hy + 36} ${hx},${hy + 40} Q${hx - 26},${hy + 36} ${hx - 28},${hy + 8} Z`;
    F.push({ d: hijabD, c: outfit.jacket || '#0D9488' });
    S.push({ d: hijabD, w: 3.2 });
  } else {
    // Default neat short hair
    const hairD = `M${hx - 24},${hy - 2} Q${hx - 24},${hy - 24} ${hx},${hy - 26} Q${hx + 24},${hy - 24} ${hx + 24},${hy - 2} Q${hx + 10},${hy - 14} ${hx - 10},${hy - 14} ${hx - 24},${hy - 2} Z`;
    F.push({ d: hairD, c: hair });
    S.push({ d: hairD, w: 2.8 });
  }

  // Accessories: Hats / Helmets
  if (c.accessory === 'yellow-helmet' || c.accessory === 'white-helmet' || c.accessory === 'fire-helmet') {
    const col = c.accessory === 'yellow-helmet' ? '#EAB308' : c.accessory === 'fire-helmet' ? '#EAB308' : '#F8FAFC';
    const helmetD = `M${hx - 28},${hy - 10} Q${hx - 26},${hy - 34} ${hx},${hy - 36} Q${hx + 26},${hy - 34} ${hx + 28},${hy - 10} L${hx + 30},${hy - 6} L${hx - 30},${hy - 6} Z`;
    F.push({ d: helmetD, c: col });
    S.push({ d: helmetD, w: 3.0 });
  } else if (c.accessory === 'pilot-cap' || c.accessory === 'peak-cap') {
    const capCol = c.accessory === 'pilot-cap' ? '#1E3A8A' : '#1E3A8A';
    const capD = `M${hx - 26},${hy - 12} Q${hx - 24},${hy - 28} ${hx},${hy - 30} Q${hx + 24},${hy - 28} ${hx + 26},${hy - 12} L${hx + 30},${hy - 7} L${hx - 30},${hy - 7} Z`;
    F.push({ d: capD, c: capCol });
    S.push({ d: capD, w: 2.8 });
  } else if (c.accessory === 'topi') {
    const topiD = `M${hx - 22},${hy - 14} Q${hx},${hy - 28} ${hx + 22},${hy - 14} Z`;
    F.push({ d: topiD, c: '#FFFFFF' });
    S.push({ d: topiD, w: 2.4 });
  }

  // 6. Neck
  const neckD = `M${hx - 6},${hy + 22} L${hx + 6},${hy + 22} L${hx + 7},${hy + 30} L${hx - 7},${hy + 30} Z`;
  F.push({ d: neckD, c: skin });
  S.push({ d: `M${hx - 6},${hy + 22} L${hx - 6},${hy + 30}`, w: 2.2 });
  S.push({ d: `M${hx + 6},${hy + 22} L${hx + 6},${hy + 30}`, w: 2.2 });

  // 7. Torso / Clothes (Jacket, Shirt, Tie/Collar)
  const tx = hx;
  const ty = hy + 28; // ~80
  const torsoD = `M${tx - 18},${ty} Q${tx},${ty - 2} ${tx + 18},${ty} L${tx + 22},${ty + 46} L${tx - 22},${ty + 46} Z`;
  F.push({ d: torsoD, c: outfit.jacket || '#1E3A8A' });
  S.push({ d: torsoD, w: 3.2 });

  // Inner shirt V-neck / Lapel
  const shirtD = `M${tx - 8},${ty} L${tx},${ty + 18} L${tx + 8},${ty} Z`;
  F.push({ d: shirtD, c: outfit.shirt || '#FFFFFF' });
  S.push({ d: `M${tx - 8},${ty} L${tx},${ty + 18} L${tx + 8},${ty}`, w: 2.2 });

  // Tie (if business)
  if (outfit.tie) {
    const tieD = `M${tx - 3},${ty + 10} L${tx + 3},${ty + 10} L${tx + 4},${ty + 34} L${tx},${ty + 39} L${tx - 4},${ty + 34} Z`;
    F.push({ d: tieD, c: outfit.tie });
    S.push({ d: tieD, w: 1.8 });
  }

  // 8. Arms & Pose Specifics
  let armL = `M${tx - 18},${ty + 4} L${tx - 32},${ty + 28} L${tx - 28},${ty + 46}`;
  let armR = `M${tx + 18},${ty + 4} L${tx + 32},${ty + 28} L${tx + 28},${ty + 46}`;
  let handLD = `M${tx - 32},${ty + 46} A4,4 0 1,0 ${tx - 24},${ty + 46} Z`;
  let handRD = `M${tx + 24},${ty + 46} A4,4 0 1,0 ${tx + 32},${ty + 46} Z`;

  if (pose === 'walking') {
    armL = `M${tx - 18},${ty + 4} L${tx - 34},${ty + 24} L${tx - 22},${ty + 36}`;
    armR = `M${tx + 18},${ty + 4} L${tx + 34},${ty + 24} L${tx + 22},${ty + 36}`;
    handLD = `M${tx - 25},${ty + 36} A4,4 0 1,0 ${tx - 17},${ty + 36} Z`;
    handRD = `M${tx + 17},${ty + 36} A4,4 0 1,0 ${tx + 25},${ty + 36} Z`;
  } else if (pose === 'pointing') {
    armR = `M${tx + 18},${ty + 4} L${tx + 32},${ty + 16} L${tx + 38},${ty - 6}`;
    handRD = `M${tx + 36},${ty - 6} A4,4 0 1,0 ${tx + 44},${ty - 6} Z`;
    S.push({ d: `M${tx + 40},${ty - 8} L${tx + 40},${ty - 16}`, w: 2.0 }); // Pointing finger
  } else if (pose === 'thinking') {
    armR = `M${tx + 18},${ty + 6} L${tx + 24},${ty + 28} L${tx + 6},${hy + 18}`;
    handRD = `M${tx + 3},${hy + 18} A4,4 0 1,0 ${tx + 11},${hy + 18} Z`;
  } else if (pose === 'waving') {
    armR = `M${tx + 18},${ty + 4} L${tx + 34},${ty + 12} L${tx + 36},${ty - 10}`;
    handRD = `M${tx + 32},${ty - 10} A4,4 0 1,0 ${tx + 40},${ty - 10} Z`;
    S.push({ d: `M${tx + 34},${ty - 12} L${tx + 32},${ty - 18}`, w: 1.8 });
    S.push({ d: `M${tx + 37},${ty - 12} L${tx + 37},${ty - 19}`, w: 1.8 });
    S.push({ d: `M${tx + 40},${ty - 12} L${tx + 42},${ty - 17}`, w: 1.8 });
  } else if (pose === 'presenting' || pose === 'clipboard') {
    armR = `M${tx + 18},${ty + 4} L${tx + 26},${ty + 26} L${tx + 14},${ty + 32}`;
    handRD = `M${tx + 10},${ty + 32} A4,4 0 1,0 ${tx + 18},${ty + 32} Z`;
    // Clipboard prop
    const clipD = `M${tx + 4},${ty + 22} L${tx + 24},${ty + 22} L${tx + 24},${ty + 44} L${tx + 4},${ty + 44} Z`;
    F.push({ d: clipD, c: '#E2E8F0' });
    S.push({ d: clipD, w: 2.2 });
    S.push({ d: `M${tx + 7},${ty + 28} L${tx + 21},${ty + 28}`, w: 1.4 });
    S.push({ d: `M${tx + 7},${ty + 33} L${tx + 21},${ty + 33}`, w: 1.4 });
    S.push({ d: `M${tx + 7},${ty + 38} L${tx + 17},${ty + 38}`, w: 1.4 });
  } else if (pose === 'holding cup') {
    armR = `M${tx + 18},${ty + 6} L${tx + 28},${ty + 26} L${tx + 16},${ty + 24}`;
    handRD = `M${tx + 12},${ty + 24} A4,4 0 1,0 ${tx + 20},${ty + 24} Z`;
    // Coffee cup prop
    const cupD = `M${tx + 16},${ty + 18} L${tx + 26},${ty + 18} L${tx + 24},${ty + 29} L${tx + 18},${ty + 29} Z`;
    F.push({ d: cupD, c: '#FFFFFF' });
    S.push({ d: cupD, w: 2.0 });
  }

  // Draw Arms & Hands
  F.push({ d: handLD, c: skin });
  F.push({ d: handRD, c: skin });
  S.push({ d: armL, w: 3.0 });
  S.push({ d: armR, w: 3.0 });
  S.push({ d: handLD, w: 2.2 });
  S.push({ d: handRD, w: 2.2 });

  // 9. Legs & Pants
  const py = ty + 46; // ~126
  let legLD = `M${tx - 18},${py} L${tx - 18},${py + 44} L${tx - 6},${py + 44} L${tx - 4},${py} Z`;
  let legRD = `M${tx + 4},${py} L${tx + 6},${py + 44} L${tx + 18},${py + 44} L${tx + 18},${py} Z`;
  let shoeLD = `M${tx - 24},${py + 48} L${tx - 4},${py + 48} L${tx - 4},${py + 44} L${tx - 22},${py + 44} Z`;
  let shoeRD = `M${tx + 4},${py + 48} L${tx + 24},${py + 48} L${tx + 22},${py + 44} L${tx + 4},${py + 44} Z`;

  if (pose === 'walking') {
    legLD = `M${tx - 16},${py} L${tx - 26},${py + 42} L${tx - 14},${py + 42} L${tx - 6},${py} Z`;
    legRD = `M${tx + 6},${py} L${tx + 18},${py + 42} L${tx + 30},${py + 42} L${tx + 16},${py} Z`;
    shoeLD = `M${tx - 32},${py + 46} L${tx - 12},${py + 46} L${tx - 14},${py + 42} L${tx - 30},${py + 42} Z`;
    shoeRD = `M${tx + 16},${py + 46} L${tx + 36},${py + 46} L${tx + 34},${py + 42} L${tx + 18},${py + 42} Z`;
  }

  F.push({ d: legLD, c: outfit.pants || '#1E293B' });
  F.push({ d: legRD, c: outfit.pants || '#1E293B' });
  F.push({ d: shoeLD, c: outfit.shoes || '#0F172A' });
  F.push({ d: shoeRD, c: outfit.shoes || '#0F172A' });

  S.push({ d: legLD, w: 3.2 });
  S.push({ d: legRD, w: 3.2 });
  S.push({ d: shoeLD, w: 2.8 });
  S.push({ d: shoeRD, w: 2.8 });

  // 10. Shading & hatching lines
  S.push({ d: `M${tx - 14},${ty + 40} L${tx - 14},${ty + 44}`, w: 1.4 });
  S.push({ d: `M${tx + 14},${ty + 40} L${tx + 14},${ty + 44}`, w: 1.4 });

  // Build full SVGs
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

  const colorFills = F.map((f) => `<path d="${esc(f.d)}" fill="${esc(f.c)}"/>`).join('');
  const colorStrokes = S.map((s) => `<path d="${esc(s.d)}" stroke="#111827" stroke-width="${s.w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('');

  const colorSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">` +
    shadowSvg +
    `<g id="fills">${colorFills}</g>` +
    `<g id="strokes">${colorStrokes}</g>` +
    `</svg>\n`;

  const lineStrokes = S.map((s) => `<path d="${esc(s.d)}" stroke="#111827" stroke-width="${s.w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const lineSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">` +
    `<g id="line-strokes">${lineStrokes}</g>` +
    `</svg>\n`;

  return {
    id: `${c.slug}-${pose}`,
    character: c.name,
    role: c.role,
    name: `${c.role} – ${c.name}`,
    pose,
    cat: 'characters',
    tags: ['people', 'character', c.role.toLowerCase(), c.name.toLowerCase(), pose],
    premium: !!c.premium,
    strokes: S.map((s) => s.d), // SVG paths for hand-drawing
    strokesDetailed: S, // with w
    fills: F,
    colorSvg,
    lineSvg,
  };
}
