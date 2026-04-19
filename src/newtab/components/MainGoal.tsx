import { useEffect, useRef, useState } from "react";
import { dayGreeting, todayISO } from "@/lib/time";
import { store } from "@/lib/storage";
import type { UserPrefs } from "@/types";
import { Check } from "lucide-react";

export function MainGoal({ prefs }: { prefs: UserPrefs }) {
  const [draft, setDraft] = useState(prefs.mainGoal ?? "");
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const goalIsForToday =
    prefs.mainGoalSetAt && todayISO(new Date(prefs.mainGoalSetAt)) === todayISO();
  const hasGoal = !!prefs.mainGoal && goalIsForToday;

  useEffect(() => {
    setDraft(hasGoal ? prefs.mainGoal ?? "" : "");
  }, [hasGoal, prefs.mainGoal]);

  const greeting = `${dayGreeting()}, ${prefs.name || "friend"}.`;

  const commit = async (value: string) => {
    const v = value.trim();
    if (!v) return;
    await store.patchPrefs({ mainGoal: v, mainGoalSetAt: Date.now() });
    setEditing(false);
  };

  const clear = async () => {
    await store.patchPrefs({ mainGoal: undefined, mainGoalSetAt: undefined });
    setDraft("");
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="flex flex-col items-center text-center mt-10 animate-fade-up">
      <h1
        className="text-4xl sm:text-5xl font-medium tracking-tight text-white"
        style={{
          textShadow: "0 2px 30px rgba(0,0,0,0.45)",
          letterSpacing: "-0.03em",
        }}
      >
        {greeting}
      </h1>
      <div className="mt-10 w-full max-w-xl">
        {hasGoal && !editing ? (
          <button
            onClick={clear}
            className="group relative mx-auto inline-flex items-center gap-3.5 text-white"
            title="Change goal"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.45)" }}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-white/60 group-hover:border-white transition-colors">
              <Check className="h-3.5 w-3.5 opacity-0 group-hover:opacity-90" />
            </span>
            <span
              className="text-2xl font-semibold tracking-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              {prefs.mainGoal}
            </span>
          </button>
        ) : (
          <>
            <div
              className="text-xl font-normal text-white/90"
              style={{ textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}
            >
              What is your main goal for today?
            </div>
            <div className="mt-5 mx-auto w-full max-w-[520px] relative">
              <input
                ref={inputRef}
                className="goal-input"
                value={draft}
                placeholder=""
                autoFocus={editing}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void commit(draft);
                  if (e.key === "Escape") {
                    setDraft(prefs.mainGoal ?? "");
                    setEditing(false);
                  }
                }}
                onBlur={() => draft && void commit(draft)}
              />
              <div className="h-px bg-white/40 w-full" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
