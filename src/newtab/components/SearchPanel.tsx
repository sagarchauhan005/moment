import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { UserPrefs } from "@/types";

const ENGINES: Record<UserPrefs["searchEngine"], { label: string; url: (q: string) => string }> = {
  google: {
    label: "Google",
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
  duckduckgo: {
    label: "DuckDuckGo",
    url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  },
  bing: {
    label: "Bing",
    url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  },
};

export function SearchPanel({
  engine,
  onClose,
}: {
  engine: UserPrefs["searchEngine"];
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    const url = ENGINES[engine].url(query);
    window.location.href = url;
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-start justify-center bg-black/40 backdrop-blur-md animate-fade-in pt-[18vh]"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="glass w-[640px] max-w-[92vw] px-4 py-3 flex items-center gap-3 animate-scale-in"
      >
        <Search className="w-[18px] h-[18px] text-white/60" strokeWidth={1.6} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${ENGINES[engine].label}…`}
          className="flex-1 bg-transparent outline-none text-white text-[16px] placeholder:text-white/40"
        />
        {q && (
          <span className="text-white/45 text-xs px-2 py-1 rounded bg-white/6 border border-white/10">
            ↵ to search
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="icon-btn w-8 h-8"
          aria-label="Close"
        >
          <X className="w-[15px] h-[15px]" strokeWidth={1.6} />
        </button>
      </form>
    </div>
  );
}
