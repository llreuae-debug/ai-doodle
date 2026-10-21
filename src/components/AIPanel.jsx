import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  Volume2,
  VolumeX,
  Trophy,
  BrainCircuit,
  Maximize2,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { speech } from '../utils/speech';

export default function AIPanel({
  classification,
  onAutocomplete,
  onOpenArtStudio,
  onOpenGame,
  smartShape,
  setSmartShape,
  hasStrokes
}) {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showAllPredictions, setShowAllPredictions] = useState(false);

  const topGuess = classification?.topGuess;
  const predictions = classification?.predictions || [];
  const speechPhrase = classification?.speechPhrase || "Draw anything, and I'll guess in real time!";

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    speech.setEnabled(next);
  };

  return (
    <div className="ai-status-panel glass-panel">
      {/* Primary Neural Detection Area */}
      <div className="ai-primary-card">
        <div className="ai-card-header">
          <div className="ai-badge">
            <BrainCircuit size={16} className="pulse-icon text-cyan" />
            <span>AI Guesser</span>
          </div>

          <button
            className={`voice-toggle-btn ${voiceEnabled ? 'active' : ''}`}
            onClick={toggleVoice}
            title={voiceEnabled ? 'Voice Commentary On' : 'Voice Commentary Off'}
          >
            {voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>Voice {voiceEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <div className="ai-guess-display">
          {topGuess ? (
            <div className="detected-item">
              <span className="guess-emoji">{topGuess.emoji}</span>
              <div className="guess-meta">
                <div className="guess-title-row">
                  <h3 className="guess-label">{topGuess.label}</h3>
                  <span className="confidence-pill">{topGuess.confidence}% Match</span>
                </div>
                {/* Confidence Bar */}
                <div className="confidence-track">
                  <div
                    className="confidence-fill"
                    style={{ width: `${topGuess.confidence}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="awaiting-doodle">
              <span className="pulsing-dot" />
              <p>Ready for your masterpiece...</p>
            </div>
          )}
        </div>

        {/* AI Commentary Bubble */}
        <div className="ai-speech-bubble">
          <p>"{speechPhrase}"</p>
        </div>

        {/* Top 5 Alternate Predictions */}
        {predictions.length > 1 && (
          <div className="predictions-chips-row">
            {predictions.slice(1, 4).map((p) => (
              <div key={p.id} className="alt-guess-chip" title={`${p.label} (${p.confidence}%)`}>
                <span>{p.emoji}</span>
                <span className="alt-label">{p.label}</span>
                <span className="alt-pct">{p.confidence}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Superpowers Action Bar */}
      <div className="ai-actions-bar">
        {/* Magic Autocomplete Button */}
        <button
          className="ai-action-btn btn-autocomplete"
          onClick={onAutocomplete}
          disabled={!hasStrokes}
          title="Intelligently embellish and finish your sketch"
        >
          <Sparkles size={16} className="btn-icon" />
          <span>AI Autocomplete</span>
        </button>

        {/* Smart Shape Toggle */}
        <button
          className={`ai-action-btn btn-smart-shape ${smartShape ? 'active' : ''}`}
          onClick={() => setSmartShape(!smartShape)}
          title="Automatically straighten wobbly lines and geometric circles"
        >
          <Wand2 size={16} className="btn-icon" />
          <span>Smart Shapes: {smartShape ? 'ON' : 'OFF'}</span>
        </button>

        {/* Transform to Art */}
        <button
          className="ai-action-btn btn-masterpiece"
          onClick={onOpenArtStudio}
          disabled={!hasStrokes}
          title="Transform your doodle into Cyberpunk, Ghibli, 3D Clay, or Watercolor art"
        >
          <span className="gradient-text">🎨 Masterpiece AI</span>
        </button>

        {/* Speed Draw Challenge Game */}
        <button
          className="ai-action-btn btn-game"
          onClick={onOpenGame}
          title="Play 20-second Speed Doodle against the AI"
        >
          <Trophy size={16} className="btn-icon text-amber" />
          <span>Quick Draw Game</span>
        </button>
      </div>
    </div>
  );
}
