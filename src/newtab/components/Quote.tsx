import { quoteForToday } from "@/lib/quotes";

export function Quote() {
  const q = quoteForToday();
  return (
    <div className="text-center text-white/75 text-sm font-light max-w-2xl px-6">
      <span className="italic">&ldquo;{q.text}&rdquo;</span>
      {q.author && <span className="opacity-60"> — {q.author}</span>}
    </div>
  );
}
