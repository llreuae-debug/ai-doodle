import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { X, Play, RotateCcw, Trophy, Sparkles, Clock, Flame, CheckCircle2 } from 'lucide-react';
import { CATEGORIES } from '../utils/aiClassifier';
import { sound } from '../utils/audio';
import { speech } from '../utils/speech';

export default function GameModeModal({
  isOpen,
  onClose,
  currentPrediction,
  onClearCanvas,
  strokesCount
}) {
  const [gameState, setGameState] = useState('lobby'); // 'lobby', 'playing', 'won', 'lost', 'summary'
  const [targetCategory, setTargetCategory] = useState(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(1);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('ai_doodle_highscore') || '0', 10);
  });

  const timerRef = useRef(null);

  // Pick a fresh random target category
  const pickNewTarget = () => {
    const pool = CATEGORIES.slice(0, 25);
    const random = pool[Math.floor(Math.random() * pool.length)];
    setTargetCategory(random);
    setTimeLeft(20);
  };

  // Start round
  const startRound = () => {
    onClearCanvas();
    pickNewTarget();
    setGameState('playing');
    sound.playClick();
  };

  // Listen to game timer
  useEffect(() => {
    if (gameState !== 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up!
          clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        // Play tick sound
        sound.playTick(prev <= 5);
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Check if current prediction matches target
  useEffect(() => {
    if (gameState !== 'playing' || !targetCategory || !currentPrediction) return;

    if (currentPrediction.id === targetCategory.id && currentPrediction.confidence > 55) {
      handleRoundWin();
    }
  }, [currentPrediction, gameState, targetCategory]);

  // Handle Win
  const handleRoundWin = () => {
    clearInterval(timerRef.current);
    sound.playFanfare();
    speech.speak(`Awesome! I recognized the ${targetCategory.label}!`, true);

    // Confetti effect
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    const earned = Math.round(timeLeft * 60 + (streak + 1) * 100);
    const newScore = score + earned;
    const newStreak = streak + 1;
    setScore(newScore);
    setStreak(newStreak);

    if (newScore > highScore) {
      setHighScore(newScore);
      localStorage.setItem('ai_doodle_highscore', newScore.toString());
    }

    setGameState('won');
  };

  // Handle Time Up
  const handleTimeUp = () => {
    sound.playDing();
    speech.speak(`Time is up! That was a valiant effort.`, true);
    setStreak(0);
    setGameState('lost');
  };

  const nextRound = () => {
    setRound(r => r + 1);
    startRound();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="game-modal glass-panel modal-content-anim">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-with-badge">
            <Trophy className="text-amber" size={24} />
            <h2>Quick Draw Challenge</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="game-stats-row">
          <div className="game-stat">
            <span className="stat-label">Score</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="game-stat">
            <span className="stat-label">Streak</span>
            <span className="stat-value text-pink">
              <Flame size={18} className="inline-icon" /> {streak}x
            </span>
          </div>
          <div className="game-stat">
            <span className="stat-label">Best</span>
            <span className="stat-value text-amber">{highScore}</span>
          </div>
        </div>

        {/* Game State Body */}
        <div className="game-body">
          {gameState === 'lobby' && (
            <div className="game-card lobby-card">
              <div className="lobby-icon-hero">🎨 ⚡ ⏱️</div>
              <h3>Draw Against the AI Clock!</h3>
              <p>
                You have <strong>20 seconds</strong> to doodle the requested prompt.
                Our neural net will guess as you draw strokes!
              </p>
              <button className="primary-glow-btn play-start-btn" onClick={startRound}>
                <Play size={20} />
                <span>Start Challenge</span>
              </button>
            </div>
          )}

          {gameState === 'playing' && (
            <div className="game-card playing-card">
              <div className="timer-badge-row">
                <div className={`countdown-clock ${timeLeft <= 5 ? 'urgent' : ''}`}>
                  <Clock size={20} />
                  <span>{timeLeft}s</span>
                </div>
                <span className="round-badge">Round #{round}</span>
              </div>

              <div className="target-prompt-box">
                <span className="target-sub">Draw this:</span>
                <div className="target-main">
                  <span className="target-emoji">{targetCategory?.emoji}</span>
                  <h1 className="target-word">{targetCategory?.label}</h1>
                </div>
                <div className="target-hints">
                  💡 Hint: {targetCategory?.hints?.join(' • ')}
                </div>
              </div>

              {/* Live AI detection during game */}
              <div className="live-game-ai-status">
                <span>AI Current Guess:</span>
                <span className="live-guess-tag">
                  {currentPrediction ? `${currentPrediction.emoji} ${currentPrediction.label} (${currentPrediction.confidence}%)` : 'Thinking...'}
                </span>
              </div>
            </div>
          )}

          {gameState === 'won' && (
            <div className="game-card victory-card">
              <div className="victory-icon">🎉</div>
              <h2 className="victory-title">AI Guessed It!</h2>
              <p className="victory-detail">
                Recognized <strong>{targetCategory?.label}</strong> with {timeLeft} seconds left on the clock!
              </p>
              <div className="reward-box">
                <span>+{Math.round(timeLeft * 60 + streak * 100)} Points</span>
              </div>
              <button className="primary-glow-btn" onClick={nextRound}>
                <span>Next Round →</span>
              </button>
            </div>
          )}

          {gameState === 'lost' && (
            <div className="game-card defeat-card">
              <div className="defeat-icon">⏳</div>
              <h2>Time's Up!</h2>
              <p>The prompt was <strong>{targetCategory?.label}</strong>.</p>
              <div className="defeat-actions">
                <button className="modal-secondary-btn" onClick={startRound}>
                  <RotateCcw size={18} />
                  <span>Try Again</span>
                </button>
                <button className="primary-glow-btn" onClick={nextRound}>
                  <span>Next Challenge</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
