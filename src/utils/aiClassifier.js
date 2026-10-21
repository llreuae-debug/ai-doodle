// Neural & Heuristic AI Doodle Classifier
// Analyzes canvas strokes, topology, symmetry, aspect ratio, curvature, and density

export const CATEGORIES = [
  { id: 'sun', label: 'Sun', emoji: '☀️', hints: ['round center', 'outward rays'] },
  { id: 'star', label: 'Star', emoji: '⭐', hints: ['5 points', 'sharp corners'] },
  { id: 'heart', label: 'Heart', emoji: '❤️', hints: ['twin rounded top', 'pointed bottom'] },
  { id: 'smile', label: 'Smiley Face', emoji: '😊', hints: ['circle head', 'two eyes', 'curved mouth'] },
  { id: 'cloud', label: 'Cloud', emoji: '☁️', hints: ['fluffy bumps', 'flat bottom'] },
  { id: 'tree', label: 'Tree', emoji: '🌳', hints: ['tall vertical trunk', 'bushy crown'] },
  { id: 'flower', label: 'Flower', emoji: '🌸', hints: ['center core', 'radial petals', 'stem'] },
  { id: 'house', label: 'House', emoji: '🏠', hints: ['triangle roof', 'square base', 'door'] },
  { id: 'rocket', label: 'Rocket', emoji: '🚀', hints: ['pointed nosecone', 'fins', 'exhaust flame'] },
  { id: 'car', label: 'Car', emoji: '🚗', hints: ['horizontal body', 'two wheels on bottom'] },
  { id: 'bicycle', label: 'Bicycle', emoji: '🚲', hints: ['two circular wheels', 'frame connecting them'] },
  { id: 'cat', label: 'Cat', emoji: '🐱', hints: ['pointed ears on top', 'round face', 'whiskers'] },
  { id: 'dog', label: 'Dog', emoji: '🐶', hints: ['floppy ears', 'snout', 'collar'] },
  { id: 'fish', label: 'Fish', emoji: '🐟', hints: ['oval body', 'triangular tail fin'] },
  { id: 'butterfly', label: 'Butterfly', emoji: '🦋', hints: ['vertical body', 'bilateral wings'] },
  { id: 'airplane', label: 'Airplane', emoji: '✈️', hints: ['long fuselage', 'cross wings', 'tail fin'] },
  { id: 'pizza', label: 'Pizza', emoji: '🍕', hints: ['triangle slice', 'crust top', 'toppings'] },
  { id: 'coffee', label: 'Coffee Cup', emoji: '☕', hints: ['cylinder mug', 'curved handle', 'steam'] },
  { id: 'icecream', label: 'Ice Cream', emoji: '🍦', hints: ['cone at bottom', 'scoop on top'] },
  { id: 'moon', label: 'Crescent Moon', emoji: '🌙', hints: ['curved arc', 'hollow crescent'] },
  { id: 'lightning', label: 'Lightning', emoji: '⚡', hints: ['jagged zigzag', 'sharp angles'] },
  { id: 'umbrella', label: 'Umbrella', emoji: '☂️', hints: ['dome canopy', 'hook handle stick'] },
  { id: 'clock', label: 'Clock', emoji: '⏰', hints: ['circle rim', 'two hands in center'] },
  { id: 'glasses', label: 'Glasses', emoji: '👓', hints: ['two circular rims', 'bridge between them'] },
  { id: 'crown', label: 'Crown', emoji: '👑', hints: ['jagged 3-5 peaks', 'flat band base'] },
  { id: 'diamond', label: 'Diamond', emoji: '💎', hints: ['flat top', 'faceted angles', 'bottom point'] },
  { id: 'lightbulb', label: 'Light Bulb', emoji: '💡', hints: ['pear bulb', 'threaded base', 'glow rays'] },
  { id: 'apple', label: 'Apple', emoji: '🍎', hints: ['indented top', 'stem and leaf'] },
  { id: 'donut', label: 'Donut', emoji: '🍩', hints: ['outer ring', 'hollow hole in middle'] },
  { id: 'guitar', label: 'Guitar', emoji: '🎸', hints: ['figure-8 body', 'long neck'] },
  { id: 'eye', label: 'Eye', emoji: '👁️', hints: ['almond eyelids', 'pupil iris in center'] },
  { id: 'mountain', label: 'Mountains', emoji: '⛰️', hints: ['triangle peaks in a row'] },
  { id: 'balloon', label: 'Balloon', emoji: '🎈', hints: ['oval balloon', 'string dangling below'] },
  { id: 'key', label: 'Key', emoji: '🔑', hints: ['round head', 'long shaft', 'teeth notches'] },
  { id: 'gift', label: 'Gift Box', emoji: '🎁', hints: ['square box', 'ribbon cross', 'bow on top'] },
  { id: 'rainbow', label: 'Rainbow', emoji: '🌈', hints: ['parallel nested concentric arches'] },
  { id: 'spider', label: 'Spider', emoji: '🕷️', hints: ['round body', '4 legs on each side'] },
  { id: 'mushroom', label: 'Mushroom', emoji: '🍄', hints: ['rounded cap', 'stalk beneath'] },
  { id: 'boat', label: 'Sailboat', emoji: '⛵', hints: ['curved hull boat', 'triangle sail'] },
  { id: 'book', label: 'Open Book', emoji: '📖', hints: ['two curved page wings', 'spine center'] },
];

/**
 * Extracts geometrical and topological features from strokes
 * strokes: Array of { points: [{x, y, p}], color, width }
 */
export function extractStrokeFeatures(strokes) {
  if (!strokes || strokes.length === 0) return null;

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let totalLength = 0;
  let allPoints = [];
  let sharpCorners = 0;
  let closedLoops = 0;

  strokes.forEach(stroke => {
    const pts = stroke.points;
    if (!pts || pts.length === 0) return;

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      allPoints.push(p);

      if (i > 0) {
        const dx = p.x - pts[i - 1].x;
        const dy = p.y - pts[i - 1].y;
        totalLength += Math.hypot(dx, dy);
      }

      // Corner detection via angle change
      if (i > 2 && i < pts.length - 2) {
        const pPrev = pts[i - 2];
        const pNext = pts[i + 2];
        const v1x = p.x - pPrev.x, v1y = p.y - pPrev.y;
        const v2x = pNext.x - p.x, v2y = pNext.y - p.y;
        const mag1 = Math.hypot(v1x, v1y);
        const mag2 = Math.hypot(v2x, v2y);
        if (mag1 > 3 && mag2 > 3) {
          const dot = (v1x * v2x + v1y * v2y) / (mag1 * mag2);
          if (dot < 0.25) { // Sharp turn > 75 degrees
            sharpCorners++;
          }
        }
      }
    }

    // Check if stroke starts and ends near each other (closed loop)
    if (pts.length > 8) {
      const start = pts[0];
      const end = pts[pts.length - 1];
      const dist = Math.hypot(end.x - start.x, end.y - start.y);
      const strokeExtent = Math.max(maxX - minX, maxY - minY);
      if (dist < 30 || dist < strokeExtent * 0.15) {
        closedLoops++;
      }
    }
  });

  if (allPoints.length < 5) return null;

  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const aspectRatio = width / height;
  const bboxArea = width * height;
  const perimeter = 2 * (width + height);

  // Center of mass
  let sumX = 0, sumY = 0;
  allPoints.forEach(p => {
    sumX += p.x;
    sumY += p.y;
  });
  const comX = sumX / allPoints.length;
  const comY = sumY / allPoints.length;
  const normComX = (comX - minX) / width;   // 0.5 is centered
  const normComY = (comY - minY) / height;  // <0.45 is top heavy, >0.55 is bottom heavy

  // Quadrant distribution & symmetry
  let topCount = 0, bottomCount = 0, leftCount = 0, rightCount = 0;
  allPoints.forEach(p => {
    if (p.y < minY + height * 0.5) topCount++;
    else bottomCount++;
    if (p.x < minX + width * 0.5) leftCount++;
    else rightCount++;
  });

  const horizontalSymmetry = 1 - Math.abs(leftCount - rightCount) / allPoints.length;
  const verticalSymmetry = 1 - Math.abs(topCount - bottomCount) / allPoints.length;

  // Circularity measure
  const radiusEst = (width + height) / 4;
  let radialDevSum = 0;
  allPoints.forEach(p => {
    const r = Math.hypot(p.x - comX, p.y - comY);
    radialDevSum += Math.abs(r - radiusEst);
  });
  const circularity = Math.max(0, 1 - (radialDevSum / allPoints.length) / (radiusEst + 1));

  return {
    strokeCount: strokes.length,
    pointCount: allPoints.length,
    width,
    height,
    aspectRatio,
    totalLength,
    density: totalLength / perimeter,
    normComX,
    normComY,
    sharpCorners,
    closedLoops,
    horizontalSymmetry,
    verticalSymmetry,
    circularity,
    bounds: { minX, maxX, minY, maxY, width, height }
  };
}

/**
 * Predicts the category from extracted features
 */
export function classifyDoodle(strokes) {
  const feat = extractStrokeFeatures(strokes);
  if (!feat || feat.pointCount < 10) {
    return {
      topGuess: null,
      predictions: [],
      speechPhrase: "Start doodling, I'm watching closely!"
    };
  }

  const scores = {};
  CATEGORIES.forEach(cat => { scores[cat.id] = 10; });

  const {
    strokeCount, aspectRatio, normComY, sharpCorners,
    closedLoops, horizontalSymmetry, verticalSymmetry, circularity, density
  } = feat;

  // 1. SUN: circular, high symmetry, rays (multiple strokes or high corner count)
  if (circularity > 0.65 && horizontalSymmetry > 0.7 && verticalSymmetry > 0.7) {
    scores.sun += 45;
    scores.clock += 35;
    scores.donut += 30;
    scores.smile += 35;
  }
  if (strokeCount > 4 && circularity > 0.5) {
    scores.sun += 40;
    scores.spider += 25;
  }

  // 2. STAR: sharp corners, high symmetry, ~1-2 strokes
  if (sharpCorners >= 5 && horizontalSymmetry > 0.65) {
    scores.star += 65;
    scores.crown += 40;
  }

  // 3. HEART: indent at top (normComY > 0.48), pointed bottom, high horiz symmetry, 1-2 strokes
  if (horizontalSymmetry > 0.75 && aspectRatio > 0.8 && aspectRatio < 1.4 && closedLoops >= 1) {
    scores.heart += 55;
    scores.apple += 35;
  }

  // 4. SMILE: outer circle + eyes/mouth
  if (strokeCount >= 3 && strokeCount <= 6 && circularity > 0.5) {
    scores.smile += 50;
    scores.cat += 30;
  }

  // 5. CLOUD: wide aspect ratio, fluffy curves, low sharp corners, bottom-flat
  if (aspectRatio > 1.3 && sharpCorners < 4 && normComY > 0.48) {
    scores.cloud += 50;
    scores.car += 30;
  }

  // 6. TREE: tall, vertical, top heavy (normComY < 0.48), 2-5 strokes
  if (aspectRatio < 0.85 && normComY < 0.48) {
    scores.tree += 55;
    scores.rocket += 40;
    scores.mushroom += 45;
    scores.icecream += 35;
  }

  // 7. FLOWER: center + petals + stem
  if (strokeCount >= 3 && aspectRatio < 1.1 && normComY > 0.45) {
    scores.flower += 50;
    scores.sun += 25;
  }

  // 8. HOUSE: sharp corners, vertical symmetry, square base
  if (sharpCorners >= 4 && aspectRatio > 0.7 && aspectRatio < 1.4 && strokeCount >= 2) {
    scores.house += 55;
    scores.gift += 40;
  }

  // 9. ROCKET: tall, sharp nosecone, bottom fins
  if (aspectRatio < 0.8 && sharpCorners >= 3 && normComY > 0.5) {
    scores.rocket += 55;
    scores.tree += 20;
    scores.sword += 35;
  }

  // 10. CAR & BICYCLE: horizontal aspect ratio, 2 lower circles
  if (aspectRatio > 1.35) {
    scores.car += 45;
    scores.bicycle += 40;
    scores.airplane += 35;
    scores.boat += 35;
  }
  if (strokeCount >= 3 && aspectRatio > 1.2 && closedLoops >= 2) {
    scores.bicycle += 60;
    scores.glasses += 55;
    scores.car += 35;
  }

  // 11. CAT & DOG: ears on top
  if (strokeCount >= 3 && normComY < 0.52 && horizontalSymmetry > 0.6) {
    scores.cat += 40;
    scores.dog += 35;
  }

  // 12. FISH: horizontal, tapered tail
  if (aspectRatio > 1.2 && aspectRatio < 2.5 && sharpCorners >= 2 && strokeCount <= 4) {
    scores.fish += 50;
    scores.boat += 30;
  }

  // 13. BUTTERFLY: high bilateral symmetry, vertical center
  if (horizontalSymmetry > 0.82 && aspectRatio > 0.9 && aspectRatio < 1.6) {
    scores.butterfly += 55;
    scores.book += 35;
  }

  // 14. PIZZA & ICE CREAM: triangle wedge
  if (aspectRatio < 1.2 && sharpCorners >= 2 && normComY > 0.45) {
    scores.pizza += 40;
    scores.icecream += 45;
  }

  // 15. COFFEE: cup with loop handle
  if (closedLoops >= 1 && aspectRatio > 0.8 && aspectRatio < 1.4) {
    scores.coffee += 40;
    scores.mug += 30;
  }

  // 16. MOON: crescent arc, single stroke, empty center
  if (strokeCount <= 2 && circularity < 0.45 && horizontalSymmetry < 0.6) {
    scores.moon += 45;
    scores.banana += 40;
  }

  // 17. LIGHTNING: very sharp corners, vertical zig-zag
  if (sharpCorners >= 4 && strokeCount <= 2 && aspectRatio < 0.9) {
    scores.lightning += 60;
  }

  // 18. UMBRELLA: top dome, vertical hook handle
  if (normComY < 0.42 && strokeCount >= 2 && aspectRatio > 0.8) {
    scores.umbrella += 50;
    scores.mushroom += 40;
  }

  // 19. CROWN: sharp top peaks, horizontal base
  if (sharpCorners >= 4 && aspectRatio > 1.1 && normComY > 0.5) {
    scores.crown += 55;
  }

  // 20. GLASSES: 2 loops, horizontal
  if (closedLoops >= 2 && aspectRatio > 1.4) {
    scores.glasses += 65;
    scores.bicycle += 40;
  }

  // 21. EYE: horizontal almond, 1-3 strokes
  if (aspectRatio > 1.3 && aspectRatio < 2.2 && strokeCount >= 2 && strokeCount <= 4) {
    scores.eye += 50;
    scores.fish += 30;
  }

  // 22. DIAMOND: faceted corners
  if (sharpCorners >= 4 && verticalSymmetry > 0.65 && horizontalSymmetry > 0.65) {
    scores.diamond += 50;
  }

  // 23. SPIDER: center body + 6-8 legs
  if (strokeCount >= 5 && circularity > 0.4) {
    scores.spider += 55;
    scores.sun += 30;
  }

  // 24. RAINBOW: multiple arched parallel strokes
  if (strokeCount >= 3 && aspectRatio > 1.2 && verticalSymmetry < 0.6) {
    scores.rainbow += 50;
  }

  // Convert raw scores into confidence percentages
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxScore = sorted[0][1];
  const minScore = sorted[sorted.length - 1][1];
  const scoreSpan = Math.max(maxScore - minScore, 15);

  const predictions = sorted.map(([id, score], idx) => {
    const cat = CATEGORIES.find(c => c.id === id) || { id, label: id, emoji: '✨' };
    // Confidence formula scaled reasonably between 40% - 97%
    const relativeFactor = (score - minScore) / scoreSpan;
    const basePct = 94 - idx * 12;
    const confidence = Math.min(97, Math.max(35, Math.round(basePct * 0.7 + relativeFactor * 25)));
    return {
      id: cat.id,
      label: cat.label,
      emoji: cat.emoji,
      confidence,
      hints: cat.hints
    };
  });

  const topGuess = predictions[0];

  // Dynamic speech line generator
  let speechPhrase = "";
  if (topGuess.confidence > 80) {
    speechPhrase = `I got it! That is definitely a ${topGuess.label}!`;
  } else if (topGuess.confidence > 60) {
    speechPhrase = `I see ${predictions[1]?.label || 'something'}, or maybe a ${topGuess.label}?`;
  } else {
    speechPhrase = `I'm thinking... is it a ${topGuess.label} or a ${predictions[1]?.label}?`;
  }

  return {
    topGuess,
    predictions,
    speechPhrase,
    features: feat
  };
}
