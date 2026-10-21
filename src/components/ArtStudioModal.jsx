import React, { useState, useEffect } from 'react';
import { X, Sparkles, Download, Wand2, Eye, Key, RefreshCw, Layers } from 'lucide-react';
import { ART_STYLES, renderMasterpiece } from '../utils/sketchToArt';
import { sound } from '../utils/audio';

export default function ArtStudioModal({
  isOpen,
  onClose,
  getCanvasElement,
  detectedCategory
}) {
  const [selectedStyle, setSelectedStyle] = useState('cyberpunk');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [masterpieceUrl, setMasterpieceUrl] = useState(null);
  const [originalDoodleUrl, setOriginalDoodleUrl] = useState(null);
  const [viewMode, setViewMode] = useState('split'); // 'split', 'masterpiece', 'original'
  const [sliderPos, setSliderPos] = useState(50);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const canvas = getCanvasElement();
      if (canvas) {
        setOriginalDoodleUrl(canvas.toDataURL('image/png'));
      }
      // Auto generate on open
      handleGenerate();
    }
  }, [isOpen]);

  const handleGenerate = async (styleId = selectedStyle) => {
    const canvas = getCanvasElement();
    if (!canvas) return;

    setIsGenerating(true);
    sound.playClick();

    try {
      // Simulate neural synthesis step for dramatic effect
      await new Promise(r => setTimeout(r, 600));

      const result = await renderMasterpiece({
        sourceCanvas: canvas,
        styleId: styleId || selectedStyle,
        promptText: prompt,
        detectedCategory: detectedCategory?.label
      });

      setMasterpieceUrl(result);
      sound.playDing();
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!masterpieceUrl) return;
    const link = document.createElement('a');
    link.download = `ai-doodle-${selectedStyle}-${Date.now()}.png`;
    link.href = masterpieceUrl;
    link.click();
    sound.playSuccess?.() || sound.playDing();
  };

  const saveApiKey = (key) => {
    setGeminiApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="art-studio-modal glass-panel modal-content-anim">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-with-badge">
            <Sparkles className="text-pink" size={24} />
            <h2>Doodle to Masterpiece AI Studio</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Studio Content Grid */}
        <div className="art-studio-layout">
          {/* Left: Preview Canvas Comparison */}
          <div className="art-preview-area">
            {isGenerating ? (
              <div className="generating-overlay">
                <div className="spinner-halo" />
                <p>AI is synthesizing colors, lighting, and textures...</p>
              </div>
            ) : masterpieceUrl ? (
              <div className="comparison-container">
                {viewMode === 'split' ? (
                  <div className="split-view-wrapper">
                    {/* Masterpiece beneath */}
                    <img src={masterpieceUrl} alt="Masterpiece" className="comparison-img" />

                    {/* Original Doodle clipped on left */}
                    <div
                      className="split-overlay-left"
                      style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
                    >
                      <img src={originalDoodleUrl} alt="Original Sketch" className="comparison-img" />
                    </div>

                    {/* Split Slider Handle */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sliderPos}
                      onChange={(e) => setSliderPos(Number(e.target.value))}
                      className="split-slider-input"
                    />
                    <div className="split-divider-line" style={{ left: `${sliderPos}%` }}>
                      <div className="split-handle-knob">⬌</div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={viewMode === 'original' ? originalDoodleUrl : masterpieceUrl}
                    alt="Artwork"
                    className="comparison-img"
                  />
                )}
              </div>
            ) : (
              <div className="empty-preview">
                <p>Select a style below to generate</p>
              </div>
            )}

            {/* View Mode Switcher */}
            <div className="view-mode-tabs">
              <button
                className={`view-tab ${viewMode === 'split' ? 'active' : ''}`}
                onClick={() => setViewMode('split')}
              >
                Split Compare
              </button>
              <button
                className={`view-tab ${viewMode === 'masterpiece' ? 'active' : ''}`}
                onClick={() => setViewMode('masterpiece')}
              >
                Masterpiece
              </button>
              <button
                className={`view-tab ${viewMode === 'original' ? 'active' : ''}`}
                onClick={() => setViewMode('original')}
              >
                Original Doodle
              </button>
            </div>
          </div>

          {/* Right: Controls & Styles */}
          <div className="art-controls-area">
            <h3>Choose Art Style</h3>
            <div className="styles-grid">
              {ART_STYLES.map(style => (
                <button
                  key={style.id}
                  className={`style-card ${selectedStyle === style.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedStyle(style.id);
                    handleGenerate(style.id);
                  }}
                >
                  <span className="style-icon">{style.icon}</span>
                  <div className="style-info">
                    <strong>{style.name}</strong>
                    <small>{style.tagline}</small>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Prompt */}
            <div className="prompt-input-group">
              <label>AI Prompt Guidance (Optional)</label>
              <input
                type="text"
                placeholder={detectedCategory ? `e.g. Glowing neon ${detectedCategory.label} in rainy Tokyo` : 'e.g. Dreamy celestial clouds and golden sun'}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>

            {/* Action Buttons */}
            <div className="modal-actions-footer">
              <button
                className="primary-glow-btn full-width"
                onClick={() => handleGenerate()}
                disabled={isGenerating}
              >
                <RefreshCw size={18} className={isGenerating ? 'spin-icon' : ''} />
                <span>{isGenerating ? 'Synthesizing...' : 'Re-Generate Style'}</span>
              </button>

              <button
                className="download-art-btn"
                onClick={handleDownload}
                disabled={!masterpieceUrl || isGenerating}
              >
                <Download size={18} />
                <span>Download High-Res PNG</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
