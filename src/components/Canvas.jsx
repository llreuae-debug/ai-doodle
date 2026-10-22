import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { sound } from '../utils/audio';
import { straightenShape } from '../utils/aiAutocomplete';

const Canvas = forwardRef(({
  activeColor = '#00f3ff',
  brushType = 'neon',
  brushSize = 6,
  brushOpacity = 1,
  symmetryMode = 'none',
  gridType = 'dots',
  smartShape = false,
  canvasBg = '#0d0f17',
  onStrokesChange = () => {},
}, ref) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const particleCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef(null);
  const strokesRef = useRef([]);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const rainbowHueRef = useRef(0);
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);

  // Resize canvas to container with devicePixelRatio
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const pCanvas = particleCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Save current drawing content
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    if (pCanvas) {
      pCanvas.width = rect.width * dpr;
      pCanvas.height = rect.height * dpr;
      pCanvas.style.width = `${rect.width}px`;
      pCanvas.style.height = `${rect.height}px`;
    }

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Redraw strokes
    redrawAllStrokes();
  }, []);

  // Redraw all strokes onto main canvas
  const redrawAllStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    strokesRef.current.forEach(stroke => {
      renderSingleStroke(ctx, stroke);
    });
    ctx.restore();
  }, []);

  // Render a stroke on any canvas context with realistic hand-drawn stroke textures
  const renderSingleStroke = (ctx, stroke, exportScale = 1) => {
    if (!stroke || !stroke.points || stroke.points.length === 0) return;
    const { points, color, brush = 'pencil', width, opacity } = stroke;
    const canvas = canvasRef.current;
    const w = canvas ? canvas.width / (window.devicePixelRatio || 1) : 800;
    const h = canvas ? canvas.height / (window.devicePixelRatio || 1) : 600;

    // Symmetry passes
    const transforms = getSymmetryTransforms(stroke.symmetry || 'none', w, h);

    transforms.forEach(transform => {
      ctx.save();
      transform(ctx);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (brush === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = width;
        ctx.globalAlpha = 1;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.globalAlpha = opacity ?? 1;
      }

      if (points.length === 1) {
        const pt = points[0];
        const p = pt.p || 0.6;
        const radius = (width * (0.6 + p * 0.6)) / 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(0.8, radius), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      // --- Realistic Hand-Drawn Medium Rendering ---
      if (brush === 'pencil') {
        // Natural graphite pencil with authentic paper grain and pressure sensitivity
        ctx.globalAlpha = (opacity ?? 1) * 0.88;
        for (let i = 1; i < points.length; i++) {
          const p0 = points[i - 1];
          const p1 = points[i];
          const pressure = p1.p || 0.55;
          const strokeW = Math.max(0.75, width * (0.65 + pressure * 0.7));

          ctx.lineWidth = strokeW;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();

          // Organic graphite paper grain / fiber micro-jitter
          if (strokeW > 2) {
            ctx.lineWidth = strokeW * 0.45;
            ctx.globalAlpha = (opacity ?? 1) * 0.35;
            const jitterX = ((i * 7) % 5 - 2) * 0.3;
            const jitterY = ((i * 11) % 5 - 2) * 0.3;
            ctx.beginPath();
            ctx.moveTo(p0.x + jitterX, p0.y + jitterY);
            ctx.lineTo(p1.x + jitterX, p1.y + jitterY);
            ctx.stroke();
            ctx.globalAlpha = (opacity ?? 1) * 0.88;
          }
        }
      } else if (brush === 'pen' || brush === 'ink') {
        // Authentic fine fountain / technical ink pen with organic tapering
        for (let i = 1; i < points.length; i++) {
          const p0 = points[i - 1];
          const p1 = points[i];
          const pressure = p1.p || 0.6;
          ctx.lineWidth = Math.max(0.8, width * (0.6 + pressure * 0.8));
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
      } else if (brush === 'charcoal') {
        // Rich velvety charcoal stick with powdery edge diffusion
        ctx.shadowColor = color;
        ctx.shadowBlur = width * 0.6;
        ctx.globalAlpha = (opacity ?? 1) * 0.82;
        for (let i = 1; i < points.length; i++) {
          const p0 = points[i - 1];
          const p1 = points[i];
          const pressure = p1.p || 0.6;
          ctx.lineWidth = Math.max(1.2, width * (0.75 + pressure * 0.65));
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      } else if (brush === 'brush') {
        // Natural bristle brush: multi-hair organic spread responding to hand pressure
        const hairs = 3;
        for (let h = 0; h < hairs; h++) {
          const offsetRatio = (h - (hairs - 1) / 2) * 0.28;
          ctx.globalAlpha = (opacity ?? 1) * (0.7 + h * 0.1);
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            const pt = points[i];
            const p = pt.p || 0.6;
            const hairOffset = width * offsetRatio * (0.5 + p * 0.8);
            ctx.lineWidth = Math.max(0.6, width * 0.45 * (0.5 + p * 0.7));
            ctx.lineTo(pt.x + hairOffset, pt.y + hairOffset);
          }
          ctx.stroke();
        }
      } else if (brush === 'marker') {
        // Translucent chisel art marker with natural ink overlap
        ctx.globalAlpha = (opacity ?? 1) * 0.68;
        ctx.lineWidth = width * 1.15;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
      } else if (brush === 'neon') {
        ctx.shadowColor = color;
        ctx.shadowBlur = width * 2.4;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.stroke();
      } else {
        // Smooth organic curve default
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.stroke();
      }

      ctx.restore();
    });
  };

  // Helper for symmetry transformations
  const getSymmetryTransforms = (mode, width, height) => {
    const cx = width / 2;
    const cy = height / 2;
    const normal = [(ctx) => {}];

    if (mode === 'vertical') {
      return [
        (ctx) => {},
        (ctx) => { ctx.translate(width, 0); ctx.scale(-1, 1); }
      ];
    } else if (mode === 'horizontal') {
      return [
        (ctx) => {},
        (ctx) => { ctx.translate(0, height); ctx.scale(1, -1); }
      ];
    } else if (mode === 'quad') {
      return [
        (ctx) => {},
        (ctx) => { ctx.translate(width, 0); ctx.scale(-1, 1); },
        (ctx) => { ctx.translate(0, height); ctx.scale(1, -1); },
        (ctx) => { ctx.translate(width, height); ctx.scale(-1, -1); }
      ];
    } else if (mode === 'mandala') {
      const transforms = [];
      for (let i = 0; i < 8; i++) {
        transforms.push((ctx) => {
          ctx.translate(cx, cy);
          ctx.rotate((i * Math.PI) / 4);
          if (i % 2 === 1) ctx.scale(1, -1);
          ctx.translate(-cx, -cy);
        });
      }
      return transforms;
    }
    return normal;
  };

  // Particle sparkle animation loop
  useEffect(() => {
    const pCanvas = particleCanvasRef.current;
    if (!pCanvas) return;
    const ctx = pCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const animateParticles = () => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, pCanvas.width, pCanvas.height);
      ctx.scale(dpr, dpr);

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.025;
        p.scale *= 0.96;

        if (p.alpha <= 0 || p.scale <= 0.1) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(animateParticles);
    };

    animFrameRef.current = requestAnimationFrame(animateParticles);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Save history snapshot for Undo/Redo
  const pushHistory = () => {
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(JSON.parse(JSON.stringify(strokesRef.current)));
    if (historyRef.current.length > 30) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    onStrokesChange(strokesRef.current);
  };

  // Pointer event handlers
  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isDrawingRef.current = true;
    sound.init();

    // Determine color
    let strokeColor = activeColor;
    if (brushType === 'rainbow') {
      rainbowHueRef.current = (rainbowHueRef.current + 25) % 360;
      strokeColor = `hsl(${rainbowHueRef.current}, 100%, 65%)`;
    }

    currentStrokeRef.current = {
      points: [{ x, y, p: e.pressure || 0.5 }],
      color: strokeColor,
      brush: brushType,
      width: brushSize,
      opacity: brushOpacity,
      symmetry: symmetryMode,
      timestamp: Date.now()
    };

    sound.playDrawStroke();

    // Render single point
    const ctx = canvas.getContext('2d');
    renderSingleStroke(ctx, currentStrokeRef.current);
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pts = currentStrokeRef.current.points;
    const lastPt = pts[pts.length - 1];
    const dist = Math.hypot(x - lastPt.x, y - lastPt.y);

    if (dist > 3) {
      pts.push({ x, y, p: e.pressure || 0.5 });
      sound.playDrawStroke();

      // Sparkle brush adds floating glittering particles
      if (brushType === 'sparkle') {
        for (let i = 0; i < 2; i++) {
          particlesRef.current.push({
            x: x + (Math.random() - 0.5) * 16,
            y: y + (Math.random() - 0.5) * 16,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5 - 0.5,
            scale: 2 + Math.random() * 3,
            alpha: 1,
            color: activeColor
          });
        }
      }

      // Incremental render
      const ctx = canvas.getContext('2d');
      renderSingleStroke(ctx, currentStrokeRef.current);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;

    let finalStroke = currentStrokeRef.current;
    if (smartShape) {
      finalStroke = straightenShape(finalStroke);
    }

    strokesRef.current.push(finalStroke);
    currentStrokeRef.current = null;

    redrawAllStrokes();
    pushHistory();
  };

  // Imperative Canvas API exposed via ref
  useImperativeHandle(ref, () => ({
    clear: () => {
      sound.playClear();
      strokesRef.current = [];
      redrawAllStrokes();
      pushHistory();
    },
    undo: () => {
      if (historyIndexRef.current > 0) {
        historyIndexRef.current--;
        strokesRef.current = JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current]));
        redrawAllStrokes();
        onStrokesChange(strokesRef.current);
        sound.playClick();
      } else if (historyIndexRef.current === 0) {
        historyIndexRef.current = -1;
        strokesRef.current = [];
        redrawAllStrokes();
        onStrokesChange(strokesRef.current);
        sound.playClick();
      }
    },
    redo: () => {
      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyIndexRef.current++;
        strokesRef.current = JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current]));
        redrawAllStrokes();
        onStrokesChange(strokesRef.current);
        sound.playClick();
      }
    },
    getStrokes: () => strokesRef.current,
    setStrokes: (newStrokes) => {
      strokesRef.current = newStrokes;
      redrawAllStrokes();
      pushHistory();
    },
    addFlourishStrokes: (flourishes) => {
      if (!flourishes || flourishes.length === 0) return;
      strokesRef.current = [...strokesRef.current, ...flourishes];
      redrawAllStrokes();
      pushHistory();
      sound.playDing();
    },
    getCanvasElement: () => canvasRef.current,
    toDataURL: (type = 'image/png', bg = canvasBg, resolution = 'display') => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      const displayW = canvas.width / (window.devicePixelRatio || 1);
      const displayH = canvas.height / (window.devicePixelRatio || 1);

      let targetW = canvas.width;
      let targetH = canvas.height;
      let scale = window.devicePixelRatio || 1;

      if (resolution === '8k' || resolution === '4320p' || resolution === '8k-png' || resolution === 'transparent-8k-png') {
        targetW = 7680;
        targetH = Math.round((7680 * (displayH / displayW)) / 2) * 2;
        scale = targetW / displayW;
      } else if (resolution === '4k' || resolution === '2160p' || resolution === '4k-png') {
        targetW = 3840;
        targetH = Math.round((3840 * (displayH / displayW)) / 2) * 2;
        scale = targetW / displayW;
      }

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = targetW;
      exportCanvas.height = targetH;
      const expCtx = exportCanvas.getContext('2d');
      if (!expCtx) return canvas.toDataURL(type);

      if (bg) {
        expCtx.fillStyle = bg;
        expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      }

      expCtx.save();
      expCtx.scale(scale, scale);
      strokesRef.current.forEach(stroke => {
        renderSingleStroke(expCtx, stroke, scale);
      });
      expCtx.restore();

      return exportCanvas.toDataURL(type);
    },
    exportUltraHD: (resolution = '8k', bg = canvasBg) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const displayW = canvas.width / (window.devicePixelRatio || 1);
      const displayH = canvas.height / (window.devicePixelRatio || 1);
      const targetW = resolution === '8k' ? 7680 : 3840;
      const targetH = Math.round((targetW * (displayH / displayW)) / 2) * 2;
      const scale = targetW / displayW;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = targetW;
      exportCanvas.height = targetH;
      const expCtx = exportCanvas.getContext('2d');
      if (!expCtx) return null;

      if (bg) {
        expCtx.fillStyle = bg;
        expCtx.fillRect(0, 0, targetW, targetH);
      }
      expCtx.save();
      expCtx.scale(scale, scale);
      strokesRef.current.forEach(stroke => {
        renderSingleStroke(expCtx, stroke, scale);
      });
      expCtx.restore();

      return {
        width: targetW,
        height: targetH,
        dataUrl: exportCanvas.toDataURL('image/png'),
        resolutionLabel: resolution === '8k' ? `8K Ultra-HD (${targetW}×${targetH})` : `4K Ultra-HD (${targetW}×${targetH})`
      };
    },
    toSVG: () => {
      const canvas = canvasRef.current;
      const w = canvas ? canvas.width / (window.devicePixelRatio || 1) : 800;
      const h = canvas ? canvas.height / (window.devicePixelRatio || 1) : 600;

      let paths = '';
      strokesRef.current.forEach(s => {
        if (!s.points || s.points.length === 0) return;
        let d = `M ${s.points[0].x} ${s.points[0].y}`;
        for (let i = 1; i < s.points.length; i++) {
          d += ` L ${s.points[i].x} ${s.points[i].y}`;
        }
        paths += `<path d="${d}" stroke="${s.color}" stroke-width="${s.width}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${s.opacity || 1}"/>\n`;
      });

      return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="${canvasBg}"/>
  ${paths}
</svg>`;
    }
  }));

  // Initial resize
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  return (
    <div
      ref={containerRef}
      className={`canvas-container grid-${gridType}`}
      style={{ backgroundColor: canvasBg }}
    >
      {/* Symmetry guide lines */}
      {symmetryMode !== 'none' && (
        <div className={`symmetry-guide symmetry-${symmetryMode}`} />
      )}

      {/* Main Drawing Canvas */}
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      {/* Particle overlay for sparkle brush */}
      <canvas
        ref={particleCanvasRef}
        className="particle-canvas"
      />
    </div>
  );
});

export default Canvas;
