import { useEffect, useState } from "react";
import { BrainCircuit, X, Play, StopCircle } from "lucide-react";
import { endFocus, startFocus } from "@/lib/focus";
import { todayISO } from "@/lib/time";
import { store } from "@/lib/storage";
import type { FocusState } from "@/types";

const PRESETS = [15, 25, 45, 60, 90];

export function FocusPanel({
  focus,
  onClose,
}: {
  focus: FocusState;
  onClose: () => void;
}) {
  const [duration, setDuration] = useState(25);
  const [remaining, setRemaining] = useState<number>(() =>
    focus.session ? Math.max(0, focus.session.endsAt - Date.now()) : 0
  );

  useEffect(() => {
    if (!focus.active || !focus.session) return;
    const iv = setInterval(() => {
      setRemaining(Math.max(0, focus.session!.endsAt - Date.now()));
    }, 1000);
    return () => clearInterval(iv);
  }, [focus.active, focus.session]);

  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);

  const startSession = async () => {
    await startFocus(duration);
  };

  const stopSession = async () => {
    await endFocus(true);
    if (focus.session) {
      const elapsedMs = Date.now() - focus.session.startedAt;
      const minutes = Math.floor(elapsedMs / 60000);
      if (minutes > 0) {
        await store.appendDailyMetric(todayISO(), { focusMinutes: minutes });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/45 backdrop-blur-sm animate-fade-in">
      <div className="glass w-[440px] p-6 relative animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 icon-btn"
          aria-label="Close"
        >
          <X className="w-[16px] h-[16px]" strokeWidth={1.6} />
        </button>

        <div className="flex items-center gap-2 text-white/95">
          <BrainCircuit className="w-[18px] h-[18px]" strokeWidth={1.5} />
          <h2 className="text-[15px] font-medium">Focus</h2>
        </div>

        {focus.active && focus.session ? (
          <div className="mt-6 text-center">
            <div className="text-white/55 text-xs uppercase tracking-widest mb-3">
              In session
            </div>
            <div
              className="text-7xl font-extralight tracking-tight tabular-nums"
              style={{ textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}
            >
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </div>
            <div className="text-white/60 text-sm mt-2">
              {focus.session.sites.length} site
              {focus.session.sites.length === 1 ? "" : "s"} softly blocked
            </div>
            <button
              onClick={stopSession}
              className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 transition"
            >
              <StopCircle className="w-[16px] h-[16px]" strokeWidth={1.5} />
              End focus
            </button>
          </div>
        ) : (
          <>
            <p className="text-white/65 text-[13.5px] leading-relaxed mt-3">
              Pick a duration. We'll soft-block distracting sites during the
              session — you can still let yourself through if you need to.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {PRESETS.map((m) => (
                <button
                  key={m}
                  onClick={() => setDuration(m)}
                  className={`px-3.5 py-2 rounded-lg border text-sm transition ${
                    duration === m
                      ? "bg-white text-neutral-900 border-transparent"
                      : "border-white/12 text-white/85 hover:bg-white/8"
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>
            <button
              onClick={startSession}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-white text-neutral-900 font-medium hover:bg-white/95 transition"
            >
              <Play className="w-[15px] h-[15px]" strokeWidth={2} />
              Start {duration}-minute focus
            </button>
            <div className="text-white/45 text-[11px] mt-4 text-center">
              Soft-block is a gentle reminder — it's always bypassable.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
