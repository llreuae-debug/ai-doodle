// AI Autocomplete & Smart Shape Correction Engine

/**
 * Detects if a stroke is an intended geometric primitive
 * (Line, Circle, Rectangle, Triangle) and returns smoothed points
 */
export function straightenShape(stroke) {
  if (!stroke || !stroke.points || stroke.points.length < 5) return stroke;

  const pts = stroke.points;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  pts.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const width = maxX - minX;
  const height = maxY - minY;
  const start = pts[0];
  const end = pts[pts.length - 1];
  const isClosed = Math.hypot(end.x - start.x, end.y - start.y) < Math.max(width, height) * 0.25;

  // 1. Is it a straight line?
  if (!isClosed) {
    const directDist = Math.hypot(end.x - start.x, end.y - start.y);
    let totalLength = 0;
    for (let i = 1; i < pts.length; i++) {
      totalLength += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
    }
    // If path length is close to direct Euclidean distance, snap to perfect straight line!
    if (totalLength < directDist * 1.15) {
      return {
        ...stroke,
        points: [start, end]
      };
    }
  }

  // 2. Is it a Circle / Ellipse?
  if (isClosed && Math.abs(width - height) < Math.max(width, height) * 0.3) {
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const radius = (width + height) / 4;

    let radialVariance = 0;
    pts.forEach(p => {
      const r = Math.hypot(p.x - centerX, p.y - centerY);
      radialVariance += Math.abs(r - radius);
    });

    if (radialVariance / pts.length < radius * 0.28) {
      // Generate clean circle points
      const newPoints = [];
      const steps = 36;
      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        newPoints.push({
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          p: 0.5
        });
      }
      return {
        ...stroke,
        points: newPoints
      };
    }
  }

  // 3. Is it a Rectangle / Box?
  if (isClosed && pts.length > 12) {
    // Generate clean bounding rectangle
    const newPoints = [
      { x: minX, y: minY, p: 0.5 },
      { x: maxX, y: minY, p: 0.5 },
      { x: maxX, y: maxY, p: 0.5 },
      { x: minX, y: maxY, p: 0.5 },
      { x: minX, y: minY, p: 0.5 }
    ];
    // Check if original points stay mostly near the perimeter of the box
    let boxFitScore = 0;
    pts.forEach(p => {
      const dLeft = Math.abs(p.x - minX);
      const dRight = Math.abs(p.x - maxX);
      const dTop = Math.abs(p.y - minY);
      const dBottom = Math.abs(p.y - maxY);
      const minEdgeDist = Math.min(dLeft, dRight, dTop, dBottom);
      if (minEdgeDist < Math.max(width, height) * 0.18) boxFitScore++;
    });

    if (boxFitScore / pts.length > 0.72) {
      return {
        ...stroke,
        points: newPoints
      };
    }
  }

  return stroke;
}

/**
 * Returns procedural vector strokes to embellish/complete a doodle category
 */
export function generateFlourishStrokes(category, bounds, baseColor = '#00f3ff') {
  if (!bounds) return [];
  const { minX, maxX, minY, maxY, width, height } = bounds;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const flourishStrokes = [];

  const addStroke = (points, color = baseColor, brush = 'pen', widthVal = 4) => {
    flourishStrokes.push({
      points,
      color,
      brush,
      width: widthVal,
      opacity: 1
    });
  };

  if (category === 'sun') {
    // Radiant sun rays
    const rOuter = Math.max(width, height) * 0.65;
    const rFar = rOuter * 1.35;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x1 = centerX + Math.cos(angle) * rOuter;
      const y1 = centerY + Math.sin(angle) * rOuter;
      const x2 = centerX + Math.cos(angle) * rFar;
      const y2 = centerY + Math.sin(angle) * rFar;
      addStroke([{ x: x1, y: y1 }, { x: x2, y: y2 }], '#f59e0b', 'neon', 5);
    }
    // Cute sunglasses on the sun
    const eyeY = centerY - height * 0.05;
    addStroke([
      { x: centerX - width * 0.28, y: eyeY },
      { x: centerX - width * 0.08, y: eyeY },
      { x: centerX - width * 0.08, y: eyeY + height * 0.14 },
      { x: centerX - width * 0.28, y: eyeY + height * 0.14 },
      { x: centerX - width * 0.28, y: eyeY }
    ], '#0f172a', 'pen', 4);
    addStroke([
      { x: centerX + width * 0.08, y: eyeY },
      { x: centerX + width * 0.28, y: eyeY },
      { x: centerX + width * 0.28, y: eyeY + height * 0.14 },
      { x: centerX + width * 0.08, y: eyeY + height * 0.14 },
      { x: centerX + width * 0.08, y: eyeY }
    ], '#0f172a', 'pen', 4);
    addStroke([{ x: centerX - width * 0.08, y: eyeY + 4 }, { x: centerX + width * 0.08, y: eyeY + 4 }], '#0f172a', 'pen', 3);
  } else if (category === 'rocket') {
    // Fire exhaust flames
    const flameY = maxY + 5;
    addStroke([
      { x: centerX - width * 0.2, y: flameY },
      { x: centerX, y: flameY + height * 0.35 },
      { x: centerX + width * 0.2, y: flameY }
    ], '#ef4444', 'neon', 6);
    addStroke([
      { x: centerX - width * 0.1, y: flameY + 4 },
      { x: centerX, y: flameY + height * 0.2 },
      { x: centerX + width * 0.1, y: flameY + 4 }
    ], '#fbbf24', 'neon', 4);
    // Speed star sparkles
    addStroke([
      { x: minX - width * 0.3, y: centerY },
      { x: minX - width * 0.15, y: centerY + 10 }
    ], '#a855f7', 'sparkle', 3);
    addStroke([
      { x: maxX + width * 0.3, y: centerY - 20 },
      { x: maxX + width * 0.15, y: centerY - 10 }
    ], '#00f3ff', 'sparkle', 3);
  } else if (category === 'cat') {
    // Whiskers and blushing cheeks
    const cheekY = centerY + height * 0.1;
    // Left whiskers
    addStroke([
      { x: centerX - width * 0.18, y: cheekY - 4 },
      { x: minX - width * 0.25, y: cheekY - 14 }
    ], '#f43f5e', 'pen', 3);
    addStroke([
      { x: centerX - width * 0.18, y: cheekY + 6 },
      { x: minX - width * 0.25, y: cheekY + 12 }
    ], '#f43f5e', 'pen', 3);
    // Right whiskers
    addStroke([
      { x: centerX + width * 0.18, y: cheekY - 4 },
      { x: maxX + width * 0.25, y: cheekY - 14 }
    ], '#f43f5e', 'pen', 3);
    addStroke([
      { x: centerX + width * 0.18, y: cheekY + 6 },
      { x: maxX + width * 0.25, y: cheekY + 12 }
    ], '#f43f5e', 'pen', 3);
  } else if (category === 'tree' || category === 'flower') {
    // Ground soil / grass base & cute leaves
    const groundY = maxY + 8;
    addStroke([
      { x: minX - width * 0.3, y: groundY },
      { x: maxX + width * 0.3, y: groundY }
    ], '#10b981', 'neon', 5);
    // Little grass tufts
    for (let x = minX - width * 0.2; x <= maxX + width * 0.2; x += 30) {
      addStroke([
        { x, y: groundY },
        { x: x + 6, y: groundY - 12 }
      ], '#10b981', 'pen', 3);
    }
  } else if (category === 'coffee') {
    // Steam wisps
    for (let i = -1; i <= 1; i++) {
      const sx = centerX + i * (width * 0.2);
      addStroke([
        { x: sx, y: minY - 5 },
        { x: sx + 8, y: minY - 25 },
        { x: sx - 4, y: minY - 45 }
      ], '#94a3b8', 'neon', 4);
    }
  } else if (category === 'cloud') {
    // Rain droplets or lightning
    for (let i = 0; i < 4; i++) {
      const rx = minX + (width / 5) * (i + 1);
      addStroke([
        { x: rx, y: maxY + 10 },
        { x: rx - 5, y: maxY + 25 }
      ], '#00f3ff', 'neon', 4);
    }
  } else {
    // Generic magic starbursts around the doodle
    const corners = [
      { x: minX - 25, y: minY - 25 },
      { x: maxX + 25, y: minY - 25 },
      { x: minX - 25, y: maxY + 25 },
      { x: maxX + 25, y: maxY + 25 }
    ];
    corners.forEach(c => {
      addStroke([
        { x: c.x - 8, y: c.y },
        { x: c.x + 8, y: c.y }
      ], '#a855f7', 'sparkle', 3);
      addStroke([
        { x: c.x, y: c.y - 8 },
        { x: c.x, y: c.y + 8 }
      ], '#00f3ff', 'sparkle', 3);
    });
  }

  return flourishStrokes;
}
