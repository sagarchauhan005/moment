import { useEffect, useState } from "react";
import {
  X,
  Pause,
  Play,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { endFocus, startFocus } from "@/lib/focus";
import { todayISO } from "@/lib/time";
import { store } from "@/lib/storage";
import {
  DEFAULT_AMBIENT_SOUND_ID,
  SoundEngine,
  SOUNDS,
} from "@/lib/sounds";
import type { FocusState } from "@/types";

const PRESETS = [15, 25, 45, 60, 90];

const AFFIRMATIONS = [
  "I'm honoring what's important with undivided attention.",
  "Deep work creates the most value.",
  "Every minute of focus compounds.",
  "I choose presence over distraction.",
  "This work matters. I'm giving it my best.",
  "Clarity comes from doing, not thinking about doing.",
  "One task at a time, done with care.",
];

// Module-level singleton — survives re-renders
const engine = new SoundEngine();

const RING_R = 195;
const RING_CIRC = 2 * Math.PI * RING_R;

export function FocusMode({
  focus,
  onClose,
}: {
  focus: FocusState;
  onClose: () => void;
}) {
  const [duration, setDuration] = useState(25);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [remaining, setRemaining] = useState<number>(() =>
    focus.session ? Math.max(0, focus.session.endsAt - Date.now()) : duration * 60_000
  );
  const [breakRemaining, setBreakRemaining] = useState(5 * 60_000);
  const [breakRunning, setBreakRunning] = useState(false);
  const [intention, setIntention] = useState("");
  const [soundOpen, setSoundOpen] = useState(false);
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.65);
  const [paused, setPaused] = useState(false);
  const [affirmIdx, setAffirmIdx] = useState(0);
  const [focusedMins, setFocusedMins] = useState(0);

  // Live countdown for focus session
  useEffect(() => {
    if (!focus.active || !focus.session || paused) return;
    const iv = setInterval(() => {
      setRemaining(Math.max(0, focus.session!.endsAt - Date.now()));
    }, 500);
    return () => clearInterval(iv);
  }, [focus.active, focus.session, paused]);

  // Live elapsed mins for top-right stat
  useEffect(() => {
    if (!focus.session) return;
    const update = () =>
      setFocusedMins(Math.floor((Date.now() - focus.session!.startedAt) / 60_000));
    update();
    const iv = setInterval(update, 30_000);
    return () => clearInterval(iv);
  }, [focus.session]);

  // Break countdown
  useEffect(() => {
    if (!breakRunning) return;
    const iv = setInterval(
      () => setBreakRemaining((v) => Math.max(0, v - 1000)),
      1000
    );
    return () => clearInterval(iv);
  }, [breakRunning]);

  // Rotate affirmation every 30 s
  useEffect(() => {
    const iv = setInterval(
      () => setAffirmIdx((i) => (i + 1) % AFFIRMATIONS.length),
      30_000
    );
    return () => clearInterval(iv);
  }, []);

  // If FocusMode opens during an already-active session (e.g. user re-opens it),
  // resume the default ambient sound automatically.
  useEffect(() => {
    if (focus.active && focus.session && !engine.active) {
      void engine.play(DEFAULT_AMBIENT_SOUND_ID, volume)
        .then(() => setActiveSound(DEFAULT_AMBIENT_SOUND_ID))
        .catch(() => setActiveSound(null));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop sounds on unmount
  useEffect(() => () => engine.stop(), []);

  const toggleSound = async (id: string) => {
    try {
      const on = await engine.toggle(id, volume);
      setActiveSound(on ? id : null);
    } catch {
      setActiveSound(null);
    }
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    engine.setVolume(v);
  };

  const handleStart = async () => {
    // engine.play() must be called synchronously within the click gesture —
    // awaiting startFocus first would consume the user-gesture token and block autoplay.
    void engine.play(DEFAULT_AMBIENT_SOUND_ID, volume)
      .then(() => setActiveSound(DEFAULT_AMBIENT_SOUND_ID))
      .catch(() => setActiveSound(null));
    await startFocus(duration);
  };

  const handleStop = async () => {
    engine.stop();
    setActiveSound(null);
    if (focus.session) {
      const mins = Math.floor((Date.now() - focus.session.startedAt) / 60_000);
      if (mins > 0)
        await store.appendDailyMetric(todayISO(), { focusMinutes: mins });
    }
    await endFocus(true);
    onClose();
  };

  const switchMode = (m: "focus" | "break") => {
    setMode(m);
    if (m === "break") {
      setBreakRemaining(5 * 60_000);
      setBreakRunning(true);
    } else {
      setBreakRunning(false);
    }
  };

  // Ring maths
  const displayMs =
    mode === "break" ? breakRemaining : remaining;
  const totalMs =
    mode === "break"
      ? 5 * 60_000
      : focus.session
      ? focus.session.durationMin * 60_000
      : duration * 60_000;
  const progress = Math.max(0, Math.min(1, displayMs / totalMs));
  const dashOffset = RING_CIRC * (1 - progress);

  const mm = String(Math.floor(displayMs / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((displayMs % 60_000) / 1000)).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Dimmed blurred bg */}
      <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-sm" />

      {/* ── Top bar (must stack above full-screen center layer or inset-0 steals hits) ── */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-7 pt-6 z-30">
        {/* Left: sound + volume (volume always visible during a session) */}
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setSoundOpen((v) => !v)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-medium transition shrink-0 ${
              activeSound
                ? "bg-white/15 text-white"
                : "text-white/60 hover:bg-white/10 hover:text-white/80"
            }`}
          >
            {activeSound ? (
              <Volume2 className="w-[15px] h-[15px]" strokeWidth={1.8} />
            ) : (
              <VolumeX className="w-[15px] h-[15px]" strokeWidth={1.8} />
            )}
            {activeSound
              ? SOUNDS.find((s) => s.id === activeSound)?.name
              : "Sounds"}
          </button>
          {focus.active && focus.session && (
            <div className="flex items-center gap-2 min-w-0 max-w-[min(100vw-8rem,220px)]">
              <VolumeX
                className="w-[14px] h-[14px] text-white/40 shrink-0"
                strokeWidth={1.8}
                aria-hidden
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                onInput={(e) =>
                  handleVolumeChange(Number((e.target as HTMLInputElement).value))
                }
                className="flex-1 min-w-0 h-2 sm:h-1.5 accent-white cursor-pointer touch-pan-x"
                aria-label="Ambient volume"
              />
              <Volume2
                className="w-[14px] h-[14px] text-white/40 shrink-0"
                strokeWidth={1.8}
                aria-hidden
              />
            </div>
          )}
        </div>

        {/* Right: stat + close */}
        <div className="flex items-center gap-5">
          {focus.session && (
            <div className="text-right">
              <div className="text-[20px] font-semibold text-white/95 leading-none">
                {focusedMins}m
              </div>
              <div className="text-[11px] text-white/50 mt-1 tracking-wide">
                Focused Today
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="icon-btn w-9 h-9 text-white/50 hover:text-white/90"
          >
            <X className="w-[17px] h-[17px]" strokeWidth={1.6} />
          </button>
        </div>
      </div>

      {/* ── Center: pointer-events-none so top bar stays clickable; inner restores hits ── */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        {focus.active && focus.session ? (
          <div className="flex flex-col items-center pointer-events-auto">
            {/* Focus / Break tabs */}
            <div className="flex gap-8 mb-10">
              {(["focus", "break"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`text-[12.5px] font-semibold tracking-[0.18em] uppercase transition ${
                    mode === m
                      ? "text-white"
                      : "text-white/30 hover:text-white/60"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Ring */}
            <div
              className="relative flex items-center justify-center"
              style={{ width: 460, height: 460 }}
            >
              <svg
                className="absolute inset-0"
                width="460"
                height="460"
                viewBox="0 0 460 460"
              >
                <circle
                  cx="230"
                  cy="230"
                  r={RING_R}
                  fill="none"
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="3"
                />
                <circle
                  cx="230"
                  cy="230"
                  r={RING_R}
                  fill="none"
                  stroke="rgba(255,255,255,0.82)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 230 230)"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>

              {/* Inner */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div
                  className="tabular-nums font-extralight"
                  style={{
                    fontSize: 90,
                    letterSpacing: "-0.045em",
                    lineHeight: 1,
                    textShadow: "0 2px 40px rgba(0,0,0,0.25)",
                  }}
                >
                  {mm}:{ss}
                </div>

                <input
                  className="mt-5 text-center bg-transparent border-none outline-none text-white/60 text-[16px] font-light w-64 placeholder:text-white/30"
                  style={{ caretColor: "rgba(255,255,255,0.65)" }}
                  placeholder="I will focus on…"
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                />

                <div className="flex items-center gap-3 mt-8">
                  <button
                    onClick={() => setPaused((v) => !v)}
                    className="w-12 h-12 rounded-full bg-white/14 hover:bg-white/22 flex items-center justify-center transition"
                  >
                    {paused ? (
                      <Play className="w-[17px] h-[17px] ml-0.5" strokeWidth={2} />
                    ) : (
                      <Pause className="w-[17px] h-[17px]" strokeWidth={2} />
                    )}
                  </button>
                  <button
                    onClick={handleStop}
                    className="w-12 h-12 rounded-full bg-white/7 hover:bg-white/14 flex items-center justify-center transition"
                    title="End session"
                  >
                    <Square className="w-[15px] h-[15px]" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Pre-session picker */
          <div className="flex flex-col items-center gap-8 pointer-events-auto">
            <div className="text-[22px] font-light text-white/90 tracking-tight">
              Start a focus session
            </div>
            <div className="flex gap-3">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setDuration(p)}
                  className={`w-[68px] h-[68px] rounded-2xl border text-[15px] font-medium transition ${
                    duration === p
                      ? "bg-white text-neutral-900 border-transparent"
                      : "border-white/12 text-white/85 hover:bg-white/8"
                  }`}
                >
                  {p}m
                </button>
              ))}
            </div>
            <input
              className="text-center bg-transparent outline-none text-white/65 text-[16px] font-light w-72 placeholder:text-white/35 pb-2"
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.18)",
                caretColor: "rgba(255,255,255,0.7)",
              }}
              placeholder="I will focus on…"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
            />
            <button
              onClick={handleStart}
              className="px-10 py-3.5 rounded-full bg-white text-neutral-900 font-semibold text-[15px] hover:bg-white/90 transition"
            >
              Begin {duration}-min focus
            </button>
          </div>
        )}
      </div>

      {/* ── Affirmation ── */}
      {focus.active && (
        <div
          className="absolute bottom-8 left-0 right-0 z-20 flex justify-center pointer-events-none"
          style={{ textShadow: "0 1px 10px rgba(0,0,0,0.5)" }}
        >
          <p className="text-white/45 text-[13px] italic font-light">
            "{AFFIRMATIONS[affirmIdx]}"
          </p>
        </div>
      )}

      {/* ── Sounds panel ── */}
      {soundOpen && (
        <SoundsPanel
          active={activeSound}
          volume={volume}
          onToggle={toggleSound}
          onVolume={handleVolumeChange}
          onClose={() => setSoundOpen(false)}
        />
      )}
    </div>
  );
}

function SoundsPanel({
  active,
  volume,
  onToggle,
  onVolume,
  onClose,
}: {
  active: string | null;
  volume: number;
  onToggle: (id: string) => void;
  onVolume: (v: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-20 left-7 z-40 w-[320px] animate-scale-in glass p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13.5px] font-medium">Ambient sounds</span>
        <button onClick={onClose} className="icon-btn w-6 h-6">
          <X className="w-[13px] h-[13px]" strokeWidth={1.8} />
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3 mb-4">
        <VolumeX className="w-[14px] h-[14px] text-white/40 shrink-0" strokeWidth={1.8} />
        <input
          type="range"
          min="0"
          max="1"
          step="0.02"
          value={volume}
          onChange={(e) => onVolume(Number(e.target.value))}
          className="flex-1 h-1 accent-white cursor-pointer"
        />
        <Volume2 className="w-[14px] h-[14px] text-white/40 shrink-0" strokeWidth={1.8} />
      </div>

      {/* Grid — only bundled sounds are selectable for now */}
      <div className="grid grid-cols-3 gap-2">
        {SOUNDS.map((s) => {
          const available = s.id === DEFAULT_AMBIENT_SOUND_ID;
          return (
            <button
              key={s.id}
              type="button"
              disabled={!available}
              title={available ? undefined : "Coming soon"}
              onClick={() => available && onToggle(s.id)}
              className={`relative overflow-hidden p-3 rounded-xl text-center transition-all ${
                !available
                  ? "cursor-not-allowed border border-white/[0.06]"
                  : active === s.id
                    ? "bg-white/18 border border-white/30 scale-[1.03]"
                    : "bg-white/[0.04] border border-white/8 hover:bg-white/10"
              }`}
            >
              <div
                className={`text-[22px] mb-1 ${!available ? "opacity-45" : ""}`}
              >
                {s.emoji}
              </div>
              <div
                className={`text-[11px] font-medium ${!available ? "text-white/40" : "text-white/75"}`}
              >
                {s.name}
              </div>
              {!available && (
                <span
                  className="pointer-events-none absolute inset-0 rounded-[inherit] bg-white/[0.14]"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
