// Speech Synthesis engine for AI Guesser Voice
class SpeechEngine {
  constructor() {
    this.enabled = true;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.lastSpokenText = '';
    this.lastSpokenTime = 0;
  }

  setEnabled(val) {
    this.enabled = val;
    if (!val && this.synth) {
      this.synth.cancel();
    }
  }

  isEnabled() {
    return this.enabled;
  }

  speak(text, priority = false) {
    if (!this.enabled || !this.synth) return;

    const now = Date.now();
    // Throttle duplicate phrases or frequent speech unless high priority
    if (!priority && (text === this.lastSpokenText || now - this.lastSpokenTime < 2400)) {
      return;
    }

    this.lastSpokenText = text;
    this.lastSpokenTime = now;

    try {
      this.synth.cancel(); // Stop prior sentence for snappy feedback
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.15; // slightly upbeat
      utterance.pitch = 1.1;

      // Select a natural English voice if available
      const voices = this.synth.getVoices();
      const preferredVoice = voices.find(v => (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Siri'))));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      this.synth.speak(utterance);
    } catch (e) {}
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const speech = new SpeechEngine();
