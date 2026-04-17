import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { store } from "@/lib/storage";

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [step]);

  const finish = async () => {
    await store.patchPrefs({
      name: name.trim() || "friend",
      onboarded: true,
    });
    onDone();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-xl animate-fade-in">
      <div className="w-[480px] max-w-[92vw] text-center px-8 animate-fade-up">
        {step === 0 && (
          <>
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/45 mb-4">
              Welcome to Moment
            </div>
            <h1 className="text-5xl font-extralight tracking-tight text-white/95 leading-[1.05]">
              Let&rsquo;s make this tab
              <br />
              your own.
            </h1>
            <p className="mt-6 text-white/65 text-[15px] leading-relaxed">
              A calm home screen with one question a day — and a gentle system
              for tasks, focus, and a little beauty.
            </p>
            <button
              onClick={() => setStep(1)}
              className="mt-10 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-neutral-900 font-medium hover:bg-white/95 transition"
            >
              Begin
              <ArrowRight className="w-[16px] h-[16px]" strokeWidth={2} />
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/45 mb-4">
              Your name
            </div>
            <h1 className="text-3xl font-light tracking-tight text-white/95">
              What should we call you?
            </h1>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setStep(2);
              }}
              placeholder="Your first name"
              className="mt-8 w-full bg-transparent border-b border-white/30 text-center text-2xl font-light py-2 outline-none focus:border-white/70 transition text-white"
            />
            <button
              onClick={() => setStep(2)}
              className="mt-10 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-neutral-900 font-medium hover:bg-white/95 transition disabled:opacity-40"
              disabled={!name.trim()}
            >
              Continue
              <ArrowRight className="w-[16px] h-[16px]" strokeWidth={2} />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/45 mb-4">
              You&rsquo;re set
            </div>
            <h1 className="text-4xl font-extralight tracking-tight text-white/95 leading-tight">
              Hello, {name.trim() || "friend"}.
            </h1>
            <p className="mt-6 text-white/65 text-[15px] leading-relaxed">
              Your new tab is ready. When you&rsquo;re ready, connect Linear,
              Trello, or Asana from Settings — and build a focus practice from
              the <span className="text-white/85">Focus</span> button above.
            </p>
            <button
              onClick={finish}
              className="mt-10 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-neutral-900 font-medium hover:bg-white/95 transition"
            >
              Open Moment
              <ArrowRight className="w-[16px] h-[16px]" strokeWidth={2} />
            </button>
            <div className="mt-6">
              <button
                onClick={() => chrome.runtime.openOptionsPage?.()}
                className="text-white/55 hover:text-white/85 text-[12.5px] underline underline-offset-4"
              >
                Or open Settings first
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
