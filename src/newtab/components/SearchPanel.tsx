import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface Props {
  onClose: () => void;
}

/**
 * Search panel that delegates to the user's browser-default search engine
 * via the Chrome Search API (chrome.search.query). This keeps Moment
 * compliant with the CWS single-purpose policy — we never override or
 * replace the user's chosen search provider.
 */
export function SearchPanel({ onClose }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    // Use Chrome Search API — always respects the user's default search engine.
    chrome.search.query({ text: q, disposition: "CURRENT_TAB" });
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(18px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl animate-fade-in">
        <form onSubmit={handleSubmit} className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
            style={{ width: 18, height: 18 }}
            strokeWidth={1.5}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the web…"
            className="w-full bg-white/10 border border-white/15 rounded-2xl pl-11 pr-12 py-4 text-white text-[17px] placeholder:text-white/35 outline-none focus:border-white/35 focus:bg-white/[0.13] transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition"
            >
              <X style={{ width: 16, height: 16 }} strokeWidth={1.8} />
            </button>
          )}
        </form>
        <p className="mt-3 text-center text-[12px] text-white/30">
          Uses your browser's default search engine · <kbd className="opacity-60">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
