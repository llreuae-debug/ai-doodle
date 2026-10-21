import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw, FastForward, Film } from 'lucide-react';
import { sound } from '../utils/audio';

export default function ReplayModal({ isOpen, onClose, strokes, canvasBg = '#0d0f17' }) {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(2);
  const [currentStrokeIdx, setCurrentStrokeIdx] = useState(0);
  const [currentPointIdx, setCurrentPointIdx] = useState(0);

  const animRef = useRef(null);
  const stateRef = useRef({ strokeIdx: 0, pointIdx: 0, isPlaying: true });

  useEffect(() => {
    stateRef.current.isPlaying = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!isOpen || !strokes || strokes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = 640 * dpr;
    canvas.height = 480 * dpr;
    canvas.style.width = '640px';
    canvas.style.height = '480px';
    ctx.scale(dpr, dpr);

    // Reset playback state
    stateRef.current = { strokeIdx: 0, pointIdx: 0, isPlaying: true };
    setCurrentStrokeIdx(0);
    setCurrentPointIdx(0);
    setIsPlaying(true);

    const clearCanvas = () => {
      ctx.fillStyle = canvasBg;
      ctx.fillRect(0, 0, 640, 480);
    };

    clearCanvas();

    // Playback loop
    let lastTime = performance.now();
    const frameInterval = 16; // 60fps base

    const renderLoop = (time) => {
      if (stateRef.current.isPlaying) {
        // Step forward by speed
        const steps = speed;
        for (let s = 0; s < steps; s++) {
          const { strokeIdx, pointIdx } = stateRef.current;
          if (strokeIdx >= strokes.length) {
            setIsPlaying(false);
            stateRef.current.isPlaying = false;
            break;
          }

          const stroke = strokes[strokeIdx];
          if (!stroke || !stroke.points || stroke.points.length === 0) {
            stateRef.current.strokeIdx++;
            stateRef.current.pointIdx = 0;
            continue;
          }

          ctx.save();
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          if (stroke.brush === 'neon') {
            ctx.shadowColor = stroke.color;
            ctx.shadowBlur = stroke.width * 2;
          }

          if (pointIdx === 0) {
            ctx.beginPath();
            ctx.arc(stroke.points[0].x * (640 / 800), stroke.points[0].y * (480 / 600), stroke.width / 2, 0, Math.PI * 2);
            ctx.fillStyle = stroke.color;
            ctx.fill();
            sound.playDrawStroke();
          } else if (pointIdx < stroke.points.length) {
            const p0 = stroke.points[pointIdx - 1];
            const p1 = stroke.points[pointIdx];
            ctx.beginPath();
            ctx.moveTo(p0.x * (640 / 800), p0.y * (480 / 600));
            ctx.lineTo(p1.x * (640 / 800), p1.y * (480 / 600));
            ctx.stroke();
          }

          ctx.restore();

          // Advance indices
          if (pointIdx + 1 < stroke.points.length) {
            stateRef.current.pointIdx++;
          } else {
            stateRef.current.strokeIdx++;
            stateRef.current.pointIdx = 0;
          }
        }

        setCurrentStrokeIdx(stateRef.current.strokeIdx);
      }

      animRef.current = requestAnimationFrame(renderLoop);
    };

    animRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isOpen, strokes, speed, canvasBg]);

  const restart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, 640, 480);
    stateRef.current = { strokeIdx: 0, pointIdx: 0, isPlaying: true };
    setCurrentStrokeIdx(0);
    setIsPlaying(true);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="replay-modal glass-panel modal-content-anim">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-with-badge">
            <Film className="text-cyan" size={22} />
            <h2>Timelapse Doodle Replay</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Video Player Canvas */}
        <div className="replay-viewport">
          <canvas ref={canvasRef} className="replay-canvas" />
        </div>

        {/* Player Controls Bar */}
        <div className="replay-controls-bar">
          <div className="playback-buttons">
            <button
              className="ctrl-btn play-toggle"
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button className="ctrl-btn" onClick={restart} title="Restart Replay">
              <RotateCcw size={18} />
            </button>
          </div>

          {/* Stroke Progress */}
          <div className="replay-progress-info">
            <span>Strokes: {Math.min(currentStrokeIdx + 1, strokes.length)} / {strokes.length}</span>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${strokes.length ? (currentStrokeIdx / strokes.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Speed Selector */}
          <div className="speed-pills-row">
            {[1, 2, 4, 8].map(spd => (
              <button
                key={spd}
                className={`speed-pill ${speed === spd ? 'active' : ''}`}
                onClick={() => setSpeed(spd)}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
