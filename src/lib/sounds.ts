import {
  Noise, Filter, LFO, Oscillator, Gain, Panner,
  start as toneStart, getDestination,
} from "tone";
import type { ToneAudioNode } from "tone";

export interface SoundDef {
  id: string;
  name: string;
  emoji: string;
}

export const SOUNDS: SoundDef[] = [
  { id: "rain",       name: "Rainfall",    emoji: "🌧" },
  { id: "ocean",      name: "Ocean",       emoji: "🌊" },
  { id: "whitenoise", name: "White Noise", emoji: "📡" },
  { id: "brownnoise", name: "Brown Noise", emoji: "🔊" },
  { id: "forest",     name: "Forest",      emoji: "🌲" },
  { id: "binaural",   name: "Binaural",    emoji: "🎵" },
];

function gainToDb(v: number): number {
  return 20 * Math.log10(Math.max(v, 0.0001));
}

export class SoundEngine {
  private _active: string | null = null;
  private disposables: ToneAudioNode[] = [];

  get active(): string | null { return this._active; }

  async toggle(id: string, volume: number): Promise<boolean> {
    if (this._active === id) {
      this.stop();
      return false;
    }
    await this.play(id, volume);
    return true;
  }

  async play(id: string, volume: number): Promise<void> {
    this.stop();
    await toneStart();
    getDestination().volume.value = gainToDb(volume);

    switch (id) {
      case "rain":       this._buildRain();       break;
      case "ocean":      this._buildOcean();      break;
      case "forest":     this._buildForest();     break;
      case "whitenoise": this._buildWhite();      break;
      case "brownnoise": this._buildBrown();      break;
      case "binaural":   this._buildBinaural();   break;
      default:           this._buildRain();
    }
    this._active = id;
  }

  setVolume(v: number): void {
    getDestination().volume.value = gainToDb(v);
  }

  stop(): void {
    this.disposables.forEach((n) => { try { n.dispose(); } catch { /* ignore */ } });
    this.disposables = [];
    this._active = null;
  }

  private _buildRain(): void {
    const noise = new Noise({ type: "pink", volume: -6 });
    const hp = new Filter({ frequency: 400, type: "highpass" });
    const bp = new Filter({ frequency: 1800, type: "bandpass", Q: 0.8 });
    noise.connect(hp);
    hp.connect(bp);
    bp.toDestination();
    noise.start();
    this.disposables = [noise, hp, bp];
  }

  private _buildOcean(): void {
    const noise = new Noise({ type: "brown", volume: -3 });
    const filter = new Filter({ frequency: 400, type: "lowpass" });
    const lfo = new LFO({ frequency: 0.12, min: 150, max: 600 });
    noise.connect(filter);
    filter.toDestination();
    lfo.connect(filter.frequency);
    noise.start();
    lfo.start();
    this.disposables = [noise, filter, lfo];
  }

  private _buildForest(): void {
    const noise = new Noise({ type: "pink", volume: -8 });
    const hp = new Filter({ frequency: 900, type: "highpass" });
    const peak = new Filter({ frequency: 2000, type: "peaking", gain: 5 });
    noise.connect(hp);
    hp.connect(peak);
    peak.toDestination();
    noise.start();
    this.disposables = [noise, hp, peak];
  }

  private _buildWhite(): void {
    const noise = new Noise({ type: "white", volume: -12 });
    noise.toDestination();
    noise.start();
    this.disposables = [noise];
  }

  private _buildBrown(): void {
    const noise = new Noise({ type: "brown", volume: -6 });
    const lp = new Filter({ frequency: 400, type: "lowpass" });
    noise.connect(lp);
    lp.toDestination();
    noise.start();
    this.disposables = [noise, lp];
  }

  private _buildBinaural(): void {
    const leftOsc  = new Oscillator({ frequency: 200, type: "sine" });
    const rightOsc = new Oscillator({ frequency: 210, type: "sine" });
    const leftGain  = new Gain(0.2);
    const rightGain = new Gain(0.2);
    const leftPan  = new Panner(-1);
    const rightPan = new Panner(1);
    leftOsc.connect(leftGain);
    leftGain.connect(leftPan);
    leftPan.toDestination();
    rightOsc.connect(rightGain);
    rightGain.connect(rightPan);
    rightPan.toDestination();
    leftOsc.start();
    rightOsc.start();
    this.disposables = [leftOsc, rightOsc, leftGain, rightGain, leftPan, rightPan];
  }
}
