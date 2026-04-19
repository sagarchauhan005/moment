import { quoteForToday } from "@/lib/quotes";

export function Quote() {
  const q = quoteForToday();
  return (
    <div
      className="text-center text-white/85 text-sm font-normal max-w-2xl px-6"
      style={{ textShadow: "0 1px 10px rgba(0,0,0,0.5)" }}
    >
      <span className="italic">&ldquo;{q.text}&rdquo;</span>
      {q.author && <span className="opacity-70"> — {q.author}</span>}
    </div>
  );
}
