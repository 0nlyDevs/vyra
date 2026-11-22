// Les sons du jeu, fabriqués dans le navigateur (Web Audio) : rien à télécharger, marche sans wifi.
// Le contexte audio ne démarre qu'après un geste de la personne, comme l'exigent les navigateurs.

type Tone = {
  frequency: number;
  to?: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  delay?: number;
};

class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambience: { stop: () => void } | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

  private ready() {
    if (typeof window === 'undefined') return null;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.7;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.7, this.context.currentTime, 0.05);
    }
  }

  private noiseBuffer(context: AudioContext) {
    if (!this.noise) {
      this.noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  private tone({ frequency, to, duration, type = 'sine', volume = 0.3, delay = 0 }: Tone) {
    const context = this.ready();
    if (!context || !this.master) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (to) oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  private burst(duration: number, filter: number, volume: number, delay = 0, q = 0.8) {
    const context = this.ready();
    if (!context || !this.master) return;
    const start = context.currentTime + delay;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer(context);
    const band = context.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = filter;
    band.Q.value = q;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(band).connect(gain).connect(this.master);
    source.start(start, Math.random());
    source.stop(start + duration + 0.05);
  }

  unlock() {
    this.ready();
  }

  step() {
    this.burst(0.09, 700 + Math.random() * 300, 0.12);
  }

  hover() {
    this.tone({ frequency: 1400, duration: 0.05, type: 'triangle', volume: 0.05 });
  }

  click() {
    this.tone({ frequency: 880, to: 1320, duration: 0.08, type: 'triangle', volume: 0.12 });
  }

  swap() {
    this.tone({ frequency: 520, to: 780, duration: 0.09, type: 'square', volume: 0.05 });
    this.burst(0.05, 3000, 0.05);
  }

  // Le tampon : un souffle, puis un coup sourd et le claquement du caoutchouc.
  stamp() {
    this.burst(0.16, 1800, 0.12, 0, 0.5);
    this.tone({ frequency: 160, to: 55, duration: 0.22, type: 'sine', volume: 0.55, delay: 0.12 });
    this.burst(0.08, 400, 0.35, 0.12);
  }

  miss() {
    this.burst(0.2, 1200, 0.1, 0, 0.4);
  }

  reveal() {
    [660, 880, 1320].forEach((frequency, index) => {
      this.tone({ frequency, duration: 0.25, type: 'triangle', volume: 0.1, delay: index * 0.05 });
    });
  }

  rate() {
    this.tone({ frequency: 740, duration: 0.1, type: 'triangle', volume: 0.12 });
  }

  success() {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      this.tone({ frequency, duration: 0.45, type: 'triangle', volume: 0.16, delay: index * 0.09 });
    });
    this.burst(0.6, 6000, 0.05, 0.3, 0.3);
  }

  fail() {
    this.tone({ frequency: 330, to: 196, duration: 0.5, type: 'sawtooth', volume: 0.07 });
    this.tone({ frequency: 247, to: 147, duration: 0.6, type: 'sine', volume: 0.12, delay: 0.1 });
  }

  // La rumeur qui se propage : une onde basse qui monte.
  spread() {
    this.tone({ frequency: 70, to: 140, duration: 1.2, type: 'sine', volume: 0.25 });
    this.burst(1.1, 300, 0.08, 0.1, 0.3);
  }

  arrive() {
    this.tone({ frequency: 988, duration: 0.12, type: 'sine', volume: 0.1 });
    this.tone({ frequency: 1318, duration: 0.18, type: 'sine', volume: 0.1, delay: 0.1 });
  }

  fanfare() {
    [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((frequency, index) => {
      this.tone({ frequency, duration: 0.35, type: 'triangle', volume: 0.15, delay: index * 0.12 });
    });
  }

  // Le marché au loin : un souffle doux et quelques notes, très bas.
  startAmbience() {
    const context = this.ready();
    if (!context || !this.master || this.ambience) return;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer(context);
    source.loop = true;
    const low = context.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 420;
    const gain = context.createGain();
    gain.gain.value = 0.045;
    source.connect(low).connect(gain).connect(this.master);
    source.start();
    const notes = [392, 440, 523.25, 587.33, 659.25];
    const timer = window.setInterval(() => {
      if (Math.random() < 0.5) return;
      const note = notes[Math.floor(Math.random() * notes.length)] ?? 440;
      this.tone({ frequency: note, duration: 1.6, type: 'sine', volume: 0.025 });
    }, 2200);
    this.ambience = {
      stop: () => {
        window.clearInterval(timer);
        source.stop();
      },
    };
  }

  stopAmbience() {
    this.ambience?.stop();
    this.ambience = null;
  }
}

export const gameAudio = new GameAudio();
