// AI Sketch-to-Art Generative Engine

export const ART_STYLES = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk 2077',
    tagline: 'High-tech neon & dark futuristic rain',
    palette: ['#00f3ff', '#ec4899', '#3b82f6', '#10b981', '#090a10'],
    icon: '⚡'
  },
  {
    id: 'ghibli',
    name: 'Studio Ghibli',
    tagline: 'Lush anime gouache & sunlit watercolor',
    palette: ['#34d399', '#60a5fa', '#fef08a', '#fb923c', '#064e3b'],
    icon: '🍃'
  },
  {
    id: 'pixar',
    name: '3D Claymation',
    tagline: 'Glossy soft clay, toy studio rim-light',
    palette: ['#f97316', '#38bdf8', '#a855f7', '#fbbf24', '#1e1b4b'],
    icon: '🧸'
  },
  {
    id: 'watercolor',
    name: 'Dreamy Watercolor',
    tagline: 'Organic paper bleeds & pastel pigment',
    palette: ['#f472b6', '#38bdf8', '#a78bfa', '#fde047', '#fffbeb'],
    icon: '🎨'
  },
  {
    id: 'synthwave',
    name: '80s Synthwave',
    tagline: 'Retro wireframe laser grids & neon sunset',
    palette: ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b', '#18022e'],
    icon: '🌆'
  },
  {
    id: 'oil',
    name: 'Cosmic Oil Painting',
    tagline: 'Impasto knife strokes & gold leaf nebula',
    palette: ['#d97706', '#1e3a8a', '#4c1d95', '#fbbf24', '#0f172a'],
    icon: '✨'
  }
];

/**
 * Procedurally transforms a doodle canvas into a stylized masterpiece
 */
export async function renderMasterpiece({ sourceCanvas, styleId, promptText, detectedCategory }) {
  const width = 1024;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Background gradient based on selected style
  switch (styleId) {
    case 'cyberpunk': {
      // Dark rainy cityscape vibe
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#05070f');
      bgGrad.addColorStop(0.6, '#0b0f1e');
      bgGrad.addColorStop(1, '#1a0b2e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Cyber grid on bottom half
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
      ctx.lineWidth = 1.5;
      const horizon = height * 0.65;
      for (let x = 0; x <= width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, horizon);
        ctx.lineTo(width / 2 + (x - width / 2) * 2.8, height);
        ctx.stroke();
      }
      for (let y = horizon; y <= height; y += (height - y) * 0.22 + 8) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Neon bokeh lights
      for (let i = 0; i < 35; i++) {
        const bx = Math.random() * width;
        const by = Math.random() * horizon;
        const br = 4 + Math.random() * 25;
        const bGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        const col = Math.random() > 0.5 ? 'rgba(0, 243, 255,' : 'rgba(236, 72, 153,';
        bGrad.addColorStop(0, col + '0.4)');
        bGrad.addColorStop(1, col + '0)');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'ghibli': {
      // Soft vibrant sky and warm hills
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.7);
      skyGrad.addColorStop(0, '#38bdf8');
      skyGrad.addColorStop(0.65, '#93c5fd');
      skyGrad.addColorStop(1, '#fef08a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Fluffy gouache anime clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (let i = 0; i < 6; i++) {
        const cx = 150 + i * 160;
        const cy = 180 + Math.sin(i) * 60;
        ctx.beginPath();
        ctx.arc(cx, cy, 70, 0, Math.PI * 2);
        ctx.arc(cx - 50, cy + 15, 55, 0, Math.PI * 2);
        ctx.arc(cx + 50, cy + 15, 60, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rolling green hills at bottom
      const hillGrad = ctx.createLinearGradient(0, height * 0.65, 0, height);
      hillGrad.addColorStop(0, '#22c55e');
      hillGrad.addColorStop(1, '#15803d');
      ctx.fillStyle = hillGrad;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.75);
      ctx.bezierCurveTo(width * 0.3, height * 0.68, width * 0.7, height * 0.82, width, height * 0.72);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.fill();
      break;
    }

    case 'synthwave': {
      // 80s gradient sun and horizon
      const synthSky = ctx.createLinearGradient(0, 0, 0, height * 0.65);
      synthSky.addColorStop(0, '#110227');
      synthSky.addColorStop(0.5, '#4a0e4e');
      synthSky.addColorStop(1, '#e11d48');
      ctx.fillStyle = synthSky;
      ctx.fillRect(0, 0, width, height);

      // Big sliced retro sun
      const sunY = height * 0.48;
      const sunR = 140;
      const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
      sunGrad.addColorStop(0, '#fbbf24');
      sunGrad.addColorStop(1, '#ec4899');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(width / 2, sunY, sunR, 0, Math.PI * 2);
      ctx.fill();

      // Sun horizontal stripes
      ctx.fillStyle = '#2d063b';
      for (let s = 1; s <= 7; s++) {
        const sy = sunY + s * 16;
        ctx.fillRect(width / 2 - sunR, sy, sunR * 2, s * 2.2);
      }

      // Purple bottom grid
      ctx.fillStyle = '#0d0117';
      ctx.fillRect(0, height * 0.65, width, height * 0.35);
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2;
      for (let x = -width; x <= width * 2; x += 70) {
        ctx.beginPath();
        ctx.moveTo(width / 2, height * 0.65);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      break;
    }

    case 'watercolor': {
      // Warm textured textured cream paper
      ctx.fillStyle = '#faf8f2';
      ctx.fillRect(0, 0, width, height);

      // Soft water washes
      const washes = [
        { x: width * 0.3, y: height * 0.3, r: 240, c: 'rgba(244, 114, 182, 0.22)' },
        { x: width * 0.7, y: height * 0.4, r: 220, c: 'rgba(56, 189, 248, 0.22)' },
        { x: width * 0.5, y: height * 0.7, r: 280, c: 'rgba(167, 139, 250, 0.25)' }
      ];
      washes.forEach(w => {
        const rad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.r);
        rad.addColorStop(0, w.c);
        rad.addColorStop(0.7, w.c.replace(/[\d.]+\)$/, '0.08)'));
        rad.addColorStop(1, 'rgba(250, 248, 242, 0)');
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }

    case 'pixar': {
      // Studio cyclorama light
      const studioGrad = ctx.createRadialGradient(width * 0.5, height * 0.4, 80, width * 0.5, height * 0.5, width * 0.85);
      studioGrad.addColorStop(0, '#6366f1');
      studioGrad.addColorStop(0.6, '#312e81');
      studioGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = studioGrad;
      ctx.fillRect(0, 0, width, height);

      // Soft ground shadow plane
      const shadowGrad = ctx.createRadialGradient(width / 2, height * 0.78, 20, width / 2, height * 0.78, 300);
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0.45)');
      shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(width / 2, height * 0.78, 280, 50, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'oil':
    default: {
      // Cosmic deep indigo with nebula swirl
      const oilGrad = ctx.createRadialGradient(width * 0.4, height * 0.45, 50, width * 0.5, height * 0.5, width * 0.8);
      oilGrad.addColorStop(0, '#431407');
      oilGrad.addColorStop(0.3, '#1e1b4b');
      oilGrad.addColorStop(0.7, '#0f172a');
      oilGrad.addColorStop(1, '#020617');
      ctx.fillStyle = oilGrad;
      ctx.fillRect(0, 0, width, height);

      // Golden stardust points
      for (let i = 0; i < 90; i++) {
        const sx = Math.random() * width;
        const sy = Math.random() * height;
        const sr = Math.random() * 2.5;
        ctx.fillStyle = Math.random() > 0.3 ? '#fef08a' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }

  // Draw the user doodle with stylistic enhancements and glow
  if (sourceCanvas) {
    ctx.save();
    // Render multi-layer bloom / shadow
    if (styleId === 'cyberpunk') {
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 25;
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 45;
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
    } else if (styleId === 'pixar') {
      // 3D Rim light highlight & bevel
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = -4;
      ctx.shadowOffsetY = -6;
      ctx.drawImage(sourceCanvas, 0, 0, width, height);

      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 8;
      ctx.shadowOffsetY = 10;
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
    } else if (styleId === 'synthwave') {
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 30;
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 12;
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
    }
    ctx.restore();
  }

  // Final atmospheric polish pass (vignette + grain)
  const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.4, width / 2, height / 2, width * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL('image/png');
}
