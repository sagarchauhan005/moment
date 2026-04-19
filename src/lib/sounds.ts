import rainAssetUrl from "@/assets/sounds/rain.mp3?url";

export interface SoundDef {
  id: string;
  name: string;
  emoji: string;
}

/** Bundled default — used when starting a focus session (same click gesture as `audio.play()`). */
export const DEFAULT_AMBIENT_SOUND_ID = "rain";

export const SOUNDS: SoundDef[] = [
  { id: "rain",       name: "Rainfall",    emoji: "🌧" },
  { id: "ocean",      name: "Ocean",       emoji: "🌊" },
  { id: "whitenoise", name: "White Noise", emoji: "📡" },
  { id: "brownnoise", name: "Brown Noise", emoji: "🔊" },
  { id: "forest",     name: "Forest",      emoji: "🌲" },
  { id: "binaural",   name: "Binaural",    emoji: "🎵" },
];

const FILE_NAMES: Record<string, string> = {
  rain:       "rain.mp3",
  ocean:      "ocean.mp3",
  whitenoise: "white-noise.mp3",
  brownnoise: "brown-noise.mp3",
  forest:     "forest.mp3",
  binaural:   "binaural.mp3",
};

/** Vite-bundled sounds — dev uses http(s) URLs so audio loads even when SW fetch proxy does not apply to <audio>. */
const BUNDLED: Record<string, string> = {
  rain: rainAssetUrl,
};

/**
 * Resolves a Vite asset URL for the extension new tab (chrome-extension://) or dev server (http://localhost).
 */
function toPlayableUrl(viteResolved: string): string {
  if (viteResolved.startsWith("http://") || viteResolved.startsWith("https://")) {
    return viteResolved;
  }
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(viteResolved.replace(/^\//, ""));
  }
  return viteResolved;
}

function soundUrl(id: string): string {
  const bundled = BUNDLED[id];
  if (bundled) return toPlayableUrl(bundled);

  const file = FILE_NAMES[id] ?? `${id}.mp3`;
  const path = `sounds/${file}`;
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(path);
  }
  return `/${path}`;
}

const FADE_STEPS = 20;
const FADE_MS    = 600; // total fade duration

export class SoundEngine {
  private _audio: HTMLAudioElement | null = null;
  private _active: string | null = null;
  private _fadeTimer: ReturnType<typeof setInterval> | null = null;

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
    this._stop();
    const audio = new Audio(soundUrl(id));
    audio.loop = true;
    audio.volume = 0;
    this._audio = audio;
    this._active = id;

    const onError = (): void => {
      audio.removeEventListener("error", onError);
      this._stop();
    };
    audio.addEventListener("error", onError, { once: true });

    try {
      await audio.play();
    } catch (e) {
      this._stop();
      throw e;
    }

    audio.removeEventListener("error", onError);
    this._fadeTo(volume);
  }

  setVolume(v: number): void {
    this._clearFade();
    if (this._audio) this._audio.volume = Math.max(0, Math.min(1, v));
  }

  stop(): void {
    this._fadeTo(0, () => this._stop());
  }

  private _stop(): void {
    this._clearFade();
    if (this._audio) {
      this._audio.pause();
      this._audio.src = "";
      this._audio = null;
    }
    this._active = null;
  }

  private _clearFade(): void {
    if (this._fadeTimer !== null) {
      clearInterval(this._fadeTimer);
      this._fadeTimer = null;
    }
  }

  private _fadeTo(target: number, onDone?: () => void): void {
    this._clearFade();
    const audio = this._audio;
    if (!audio) { onDone?.(); return; }
    const start = audio.volume;
    const delta = (target - start) / FADE_STEPS;
    let step = 0;
    this._fadeTimer = setInterval(() => {
      step++;
      audio.volume = Math.max(0, Math.min(1, start + delta * step));
      if (step >= FADE_STEPS) {
        this._clearFade();
        onDone?.();
      }
    }, FADE_MS / FADE_STEPS);
  }
}
