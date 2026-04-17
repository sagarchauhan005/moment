import { useState } from "react";
import { X, ExternalLink, Plus, Trash2 } from "lucide-react";
import { store } from "@/lib/storage";
import type { QuickLink } from "@/types";

export function LinksPanel({
  links,
  onClose,
}: {
  links: QuickLink[];
  onClose: () => void;
}) {
  const [draftTitle, setDraftTitle] = useState("");
  const [draftUrl, setDraftUrl] = useState("");

  const add = async () => {
    const url = draftUrl.trim();
    if (!url) return;
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    let host = normalized;
    try {
      host = new URL(normalized).hostname;
    } catch {
      /* ignore */
    }
    const newLink: QuickLink = {
      id: `l_${Date.now()}`,
      title: draftTitle.trim() || host,
      url: normalized,
    };
    await store.patchPrefs({ links: [...links, newLink] });
    setDraftTitle("");
    setDraftUrl("");
  };

  const remove = async (id: string) => {
    await store.patchPrefs({ links: links.filter((l) => l.id !== id) });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/45 backdrop-blur-sm animate-fade-in">
      <div className="glass w-[540px] max-w-[92vw] p-6 relative animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 icon-btn"
          aria-label="Close"
        >
          <X className="w-[16px] h-[16px]" strokeWidth={1.6} />
        </button>
        <div className="flex items-center gap-2 text-white/95">
          <ExternalLink className="w-[18px] h-[18px]" strokeWidth={1.5} />
          <h2 className="text-[15px] font-medium">Quick links</h2>
        </div>

        <div className="grid grid-cols-4 gap-2.5 mt-5">
          {links.map((l) => (
            <a
              key={l.id}
              href={l.url}
              className="group relative flex flex-col items-center justify-center rounded-xl border border-white/8 bg-white/4 hover:bg-white/8 transition p-3 aspect-square"
              title={l.url}
            >
              <img
                src={faviconFor(l.url)}
                alt=""
                className="w-7 h-7 rounded"
                loading="lazy"
              />
              <div className="text-[11.5px] text-white/85 mt-2 text-center truncate w-full">
                {l.title}
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  void remove(l.id);
                }}
                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition text-white/60 hover:text-white/95"
                title="Remove"
              >
                <Trash2 className="w-[12px] h-[12px]" strokeWidth={1.6} />
              </button>
            </a>
          ))}
          {links.length === 0 && (
            <div className="col-span-4 text-white/50 text-sm text-center py-6">
              No links yet. Add your first below.
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <input
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-white/25 placeholder:text-white/35"
            placeholder="Label (optional)"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
          />
          <input
            className="flex-[1.6] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-white/25 placeholder:text-white/35"
            placeholder="github.com/you"
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
            }}
          />
          <button
            onClick={add}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-neutral-900 text-sm font-medium hover:bg-white/95"
          >
            <Plus className="w-[13px] h-[13px]" strokeWidth={2} />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function faviconFor(url: string): string {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return "";
  }
}
