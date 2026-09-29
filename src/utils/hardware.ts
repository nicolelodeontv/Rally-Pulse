/**
 * Hardware integrations: Web Audio synthesizer buzzer, Haptic vibration, and Screen Wake Lock.
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Loud gym buzzer sound (dual-oscillator square/saw wave burst)
   */
  playBuzzer() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(146.83, now); // D3

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(155.56, now); // D#3 - slight detune creates raspy horn buzzer

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.25);
      osc2.stop(now + 1.25);
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  /**
   * High-pitch sports whistle for round start/resume
   */
  playWhistle() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(2800, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn('Audio whistle error:', e);
    }
  }

  /**
   * Pleasant chime when match winner is recorded
   */
  playChime() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.18, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.45);
      });
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }
}

export const audioSynth = new AudioSynthesizer();

/**
 * Physical phone vibration helper
 */
export function triggerVibration(pattern: number[] = [200, 100, 200]) {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.debug('Vibration not supported or blocked:', e);
    }
  }
}

/**
 * Screen Wake Lock Manager to keep phone display awake during active sessions
 */
class WakeLockManager {
  private sentinel: any = null;
  private isRequested = false;

  async requestWakeLock(): Promise<boolean> {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      this.sentinel = await (navigator as any).wakeLock.request('screen');
      this.isRequested = true;

      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
      });

      // Re-acquire on tab visibility return
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      return true;
    } catch (err) {
      console.debug('Wake Lock request failed:', err);
      return false;
    }
  }

  private handleVisibilityChange = async () => {
    if (this.isRequested && document.visibilityState === 'visible' && !this.sentinel) {
      await this.requestWakeLock();
    }
  };

  releaseWakeLock() {
    this.isRequested = false;
    if (this.sentinel) {
      this.sentinel.release().catch(() => {});
      this.sentinel = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  isActive(): boolean {
    return !!this.sentinel;
  }
}

export const wakeLockManager = new WakeLockManager();
