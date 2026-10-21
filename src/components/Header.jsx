import React, { useState } from 'react';
import {
  Sparkles,
  Sun,
  Moon,
  HelpCircle,
  Maximize,
  Minimize,
  Flame,
  X
} from 'lucide-react';
import { sound } from '../utils/audio';

export default function Header({
  isDark,
  setIsDark,
  strokesCount,
  onReset
}) {
  const [showHelp, setShowHelp] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <header className="app-header glass-panel">
      {/* Brand & Logo */}
      <div className="brand-group" onClick={onReset} style={{ cursor: 'pointer' }}>
        <div className="brand-logo-icon">
          <svg viewBox="0 0 32 32" width="28" height="28">
            <path
              d="M6 24 C 9 10, 13 8, 17 8 C 22 8, 24 14, 22 18 C 20 22, 12 22, 14 16 C 16 11, 23 12, 26 21"
              fill="none"
              stroke="url(#brandGrad)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f3ff" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="brand-text">
          <h1 className="brand-name">
            <span className="ai-prefix">Ai</span> Doodle
          </h1>
          <span className="brand-subtitle">Next-Gen Creative Neural Studio</span>
        </div>
      </div>

      {/* Middle Status Pill */}
      <div className="header-meta-pill">
        <span className="pulse-indicator" />
        <span className="meta-text">{strokesCount} {strokesCount === 1 ? 'stroke' : 'strokes'} drawn</span>
      </div>

      {/* Right Utility Buttons */}
      <div className="header-actions">
        {/* Fullscreen Button */}
        <button
          className="header-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
        </button>

        {/* Theme Toggle Button */}
        <button
          className="header-btn"
          onClick={() => {
            setIsDark(!isDark);
            sound.playClick();
          }}
          title={isDark ? 'Switch to Paper Light' : 'Switch to Cyber Dark'}
        >
          {isDark ? <Sun size={17} className="text-amber" /> : <Moon size={17} />}
        </button>

        {/* Keyboard Shortcuts & Help */}
        <button
          className="header-btn"
          onClick={() => setShowHelp(true)}
          title="Shortcuts & Info"
        >
          <HelpCircle size={17} />
        </button>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="modal-backdrop">
          <div className="help-modal glass-panel modal-content-anim">
            <div className="modal-header">
              <h3>🎨 Ai Doodle Guide & Shortcuts</h3>
              <button className="modal-close-btn" onClick={() => setShowHelp(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="help-body">
              <div className="shortcuts-table">
                <div className="shortcut-row">
                  <kbd>Ctrl/Cmd</kbd> + <kbd>Z</kbd>
                  <span>Undo previous stroke</span>
                </div>
                <div className="shortcut-row">
                  <kbd>Ctrl/Cmd</kbd> + <kbd>Y</kbd>
                  <span>Redo stroke</span>
                </div>
                <div className="shortcut-row">
                  <kbd>B</kbd>
                  <span>Switch to Neon Glow brush</span>
                </div>
                <div className="shortcut-row">
                  <kbd>P</kbd>
                  <span>Switch to Smooth Ink Pen</span>
                </div>
                <div className="shortcut-row">
                  <kbd>E</kbd>
                  <span>Switch to Eraser</span>
                </div>
                <div className="shortcut-row">
                  <kbd>C</kbd>
                  <span>Clear entire canvas</span>
                </div>
              </div>

              <div className="help-features-list">
                <h4>✨ Intelligent Features:</h4>
                <ul>
                  <li><strong>Real-time AI Guesser:</strong> Analyzes curvature, closed loops, and symmetry to guess your doodle as you draw!</li>
                  <li><strong>Voice Commentary:</strong> Talks and reacts in real-time like Google Quick, Draw.</li>
                  <li><strong>AI Autocomplete:</strong> Adds matching vector flourishes (sunglasses on suns, fire on rockets, whiskers on cats).</li>
                  <li><strong>Masterpiece AI:</strong> Transforms your sketch into Cyberpunk, Ghibli, 3D Clay, or Watercolor art.</li>
                  <li><strong>Quick Draw Game:</strong> Race against a 20-second timer to test your sketching skills!</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
