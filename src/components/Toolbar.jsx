import React, { useState } from 'react';
import {
  Zap,
  PenTool,
  Sparkles,
  Highlighter,
  Feather,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Play,
  Download,
  Grid,
  Volume2,
  VolumeX,
  Sliders,
  ChevronDown,
  Layers,
  Palette
} from 'lucide-react';
import { sound } from '../utils/audio';

const COLOR_SWATCHES = [
  '#00f3ff', // Electric Cyan
  '#a855f7', // Neon Violet
  '#ec4899', // Hot Pink
  '#3b82f6', // Bright Blue
  '#10b981', // Emerald Mint
  '#f59e0b', // Amber Glow
  '#ef4444', // Coral Red
  '#ffffff', // Pure White
  '#facc15', // Neon Yellow
  '#06b6d4', // Ocean Aqua
  '#8b5cf6', // Indigo
  '#f43f5e', // Rose
  '#14b8a6', // Teal
  '#fb923c', // Sunset Orange
  '#94a3b8', // Silver
  '#0f172a'  // Obsidian Ink
];

const BRUSHES = [
  { id: 'neon', label: 'Neon Glow', icon: Zap },
  { id: 'pen', label: 'Smooth Ink', icon: PenTool },
  { id: 'sparkle', label: 'Stardust', icon: Sparkles },
  { id: 'rainbow', label: 'Rainbow', icon: Palette },
  { id: 'marker', label: 'Highlighter', icon: Highlighter },
  { id: 'calligraphy', label: 'Chisel', icon: Feather },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
];

const SYMMETRY_OPTIONS = [
  { id: 'none', label: 'Normal' },
  { id: 'vertical', label: 'Mirror X' },
  { id: 'horizontal', label: 'Mirror Y' },
  { id: 'quad', label: '4-Way' },
  { id: 'mandala', label: '8-Way Mandala' },
];

export default function Toolbar({
  activeColor,
  setActiveColor,
  brushType,
  setBrushType,
  brushSize,
  setBrushSize,
  brushOpacity,
  setBrushOpacity,
  symmetryMode,
  setSymmetryMode,
  gridType,
  setGridType,
  onUndo,
  onRedo,
  onClear,
  onOpenReplay,
  onExport,
  isMuted,
  setIsMuted
}) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showBrushSettings, setShowBrushSettings] = useState(false);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
    if (!next) sound.playClick();
  };

  return (
    <aside className="studio-toolbar glass-panel" aria-label="Drawing Tools">
      {/* Top Brush Selection */}
      <div className="tool-section brushes-group">
        {BRUSHES.map(b => {
          const Icon = b.icon;
          const isActive = brushType === b.id;
          return (
            <button
              key={b.id}
              className={`tool-btn ${isActive ? 'active' : ''}`}
              title={b.label}
              onClick={() => {
                setBrushType(b.id);
                sound.playClick();
              }}
            >
              <Icon size={19} />
              <span className="tooltip">{b.label}</span>
            </button>
          );
        })}
      </div>

      <div className="tool-divider" />

      {/* Color Swatches & Picker */}
      <div className="tool-section colors-group">
        <div className="swatches-grid">
          {COLOR_SWATCHES.slice(0, 8).map(c => (
            <button
              key={c}
              className={`swatch-btn ${activeColor.toLowerCase() === c.toLowerCase() ? 'active' : ''}`}
              style={{ backgroundColor: c, boxShadow: `0 0 10px ${c}55` }}
              title={c}
              onClick={() => {
                setActiveColor(c);
                if (brushType === 'eraser') setBrushType('neon');
                sound.playClick();
              }}
            />
          ))}
        </div>

        {/* Custom Hex Color Trigger */}
        <div className="custom-color-wrapper">
          <input
            type="color"
            value={activeColor}
            onChange={(e) => setActiveColor(e.target.value)}
            className="hidden-color-input"
            id="native-color"
          />
          <label
            htmlFor="native-color"
            className="tool-btn custom-color-btn"
            title="Custom Color"
            style={{ borderColor: activeColor }}
          >
            <span className="color-indicator-dot" style={{ backgroundColor: activeColor }} />
          </label>
        </div>
      </div>

      <div className="tool-divider" />

      {/* Size & Opacity Popover Button */}
      <div className="tool-section slider-section">
        <button
          className={`tool-btn ${showBrushSettings ? 'active' : ''}`}
          onClick={() => setShowBrushSettings(!showBrushSettings)}
          title="Stroke Properties (Size & Opacity)"
        >
          <Sliders size={18} />
          <span className="tooltip">Stroke Properties</span>
        </button>

        {showBrushSettings && (
          <div className="popover-panel glass-panel brush-sliders-popover">
            <div className="slider-row">
              <label>Size: <span>{brushSize}px</span></label>
              <input
                type="range"
                min="2"
                max="50"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
              />
            </div>
            <div className="slider-row">
              <label>Opacity: <span>{Math.round(brushOpacity * 100)}%</span></label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={brushOpacity}
                onChange={(e) => setBrushOpacity(Number(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>

      {/* Symmetry Select */}
      <div className="tool-section symmetry-section">
        <div className="symmetry-dropdown-wrapper">
          <select
            value={symmetryMode}
            onChange={(e) => {
              setSymmetryMode(e.target.value);
              sound.playClick();
            }}
            className="symmetry-select"
            title="Symmetry Mirror Mode"
          >
            {SYMMETRY_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Switch */}
      <div className="tool-section">
        <button
          className={`tool-btn ${gridType !== 'none' ? 'active-soft' : ''}`}
          title={`Canvas Grid: ${gridType}`}
          onClick={() => {
            const types = ['dots', 'squares', 'none'];
            const nextIdx = (types.indexOf(gridType) + 1) % types.length;
            setGridType(types[nextIdx]);
            sound.playClick();
          }}
        >
          <Grid size={18} />
          <span className="tooltip">Grid: {gridType}</span>
        </button>
      </div>

      <div className="tool-divider" />

      {/* History Actions: Undo / Redo / Clear */}
      <div className="tool-section history-group">
        <button className="tool-btn" onClick={onUndo} title="Undo (Ctrl+Z)">
          <Undo2 size={18} />
          <span className="tooltip">Undo</span>
        </button>
        <button className="tool-btn" onClick={onRedo} title="Redo (Ctrl+Y)">
          <Redo2 size={18} />
          <span className="tooltip">Redo</span>
        </button>
        <button className="tool-btn danger-hover" onClick={onClear} title="Clear Canvas">
          <Trash2 size={18} />
          <span className="tooltip">Clear</span>
        </button>
      </div>

      <div className="tool-divider" />

      {/* Replay & Export */}
      <div className="tool-section export-group">
        <button className="tool-btn replay-btn" onClick={onOpenReplay} title="Timelapse Stroke Replay">
          <Play size={18} />
          <span className="tooltip">Timelapse Replay</span>
        </button>

        <div className="export-dropdown-wrapper">
          <button
            className={`tool-btn ${showExportMenu ? 'active' : ''}`}
            onClick={() => setShowExportMenu(!showExportMenu)}
            title="Export Artwork"
          >
            <Download size={18} />
            <span className="tooltip">Export</span>
          </button>

          {showExportMenu && (
            <div className="popover-panel glass-panel export-menu-popover">
              <button
                className="export-menu-item"
                onClick={() => {
                  onExport('png');
                  setShowExportMenu(false);
                }}
              >
                🖼️ Save as PNG
              </button>
              <button
                className="export-menu-item"
                onClick={() => {
                  onExport('transparent-png');
                  setShowExportMenu(false);
                }}
              >
                ✨ Transparent PNG
              </button>
              <button
                className="export-menu-item"
                onClick={() => {
                  onExport('svg');
                  setShowExportMenu(false);
                }}
              >
                📐 Vector SVG
              </button>
            </div>
          )}
        </div>

        {/* Audio Mute Toggle */}
        <button
          className={`tool-btn ${isMuted ? 'muted' : ''}`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          <span className="tooltip">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>
      </div>
    </aside>
  );
}
