/**
 * Web Audio API based emergency sound generator (No external MP3 files needed)
 */

class SoundAlertManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private activeOscillator: OscillatorNode | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopContinuousAlert();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Play urgent dispatch siren for drivers (wail sound)
   */
  public playEmergencyDispatchAlert() {
    if (this.isMuted) return;

    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.2, ctx.currentTime);

      // Modulate frequency like a high-low siren (750Hz <-> 950Hz)
      const now = ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        osc.frequency.setValueAtTime(750, now + i * 0.4);
        osc.frequency.linearRampToValueAtTime(980, now + i * 0.4 + 0.2);
        osc.frequency.linearRampToValueAtTime(750, now + i * 0.4 + 0.4);
      }

      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.8);
    } catch (e) {
      console.warn('Audio alert could not play:', e);
    }
  }

  /**
   * Play high-urgency SOS confirmation chime for patient
   */
  public playSOSConfirmation() {
    if (this.isMuted) return;

    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Two-tone alert chime
      const tones = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      tones.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.25, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.35);
      });
    } catch (e) {
      console.warn('Audio could not play:', e);
    }
  }

  /**
   * Positive completion chime (patient admitted or trip completed)
   */
  public playSuccessChime() {
    if (this.isMuted) return;

    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const notes = [440, 554.37, 659.25]; // A4, C#5, E5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.2, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.4);
      });
    } catch (e) {
      console.warn('Audio could not play:', e);
    }
  }

  public stopContinuousAlert() {
    if (this.activeOscillator) {
      try {
        this.activeOscillator.stop();
        this.activeOscillator.disconnect();
      } catch (e) {
        // Ignore
      }
      this.activeOscillator = null;
    }
  }
}

export const soundManager = new SoundAlertManager();
