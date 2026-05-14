import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface App {
  name: string;
  url: string;
  favicon: string;
}

const GOOGLE_APPS: App[] = [
  { name: "Search",    url: "https://www.google.com",                  favicon: "google.com" },
  { name: "Gmail",     url: "https://mail.google.com",                 favicon: "mail.google.com" },
  { name: "Drive",     url: "https://drive.google.com",                favicon: "drive.google.com" },
  { name: "Calendar",  url: "https://calendar.google.com",             favicon: "calendar.google.com" },
  { name: "Meet",      url: "https://meet.google.com",                 favicon: "meet.google.com" },
  { name: "Docs",      url: "https://docs.google.com",                 favicon: "docs.google.com" },
  { name: "Sheets",    url: "https://sheets.google.com",               favicon: "sheets.google.com" },
  { name: "Slides",    url: "https://slides.google.com",               favicon: "slides.google.com" },
  { name: "YouTube",   url: "https://www.youtube.com",                 favicon: "youtube.com" },
  { name: "Maps",      url: "https://maps.google.com",                 favicon: "maps.google.com" },
  { name: "Photos",    url: "https://photos.google.com",               favicon: "photos.google.com" },
  { name: "Translate", url: "https://translate.google.com",            favicon: "translate.google.com" },
  { name: "Gemini",    url: "https://gemini.google.com",               favicon: "gemini.google.com" },
  { name: "News",      url: "https://news.google.com",                 favicon: "news.google.com" },
  { name: "Keep",      url: "https://keep.google.com",                 favicon: "keep.google.com" },
  { name: "Analytics", url: "https://analytics.google.com",            favicon: "analytics.google.com" },
];

function favicon(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

export function GoogleAppsPanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    // Small delay so the opening click doesn't immediately close it
    const id = setTimeout(() => document.addEventListener("mousedown", onDown), 100);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", onDown); };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-14 left-4 z-50 w-[272px] glass rounded-2xl p-4 animate-scale-in shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <span className="text-[12px] font-medium text-white/60 tracking-wide uppercase">
          Google Apps
        </span>
        <button onClick={onClose} className="icon-btn w-6 h-6">
          <X className="w-[13px] h-[13px]" strokeWidth={1.8} />
        </button>
      </div>

      {/* Apps grid */}
      <div className="grid grid-cols-4 gap-1">
        {GOOGLE_APPS.map((app) => (
          <a
            key={app.name}
            href={app.url}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl p-2.5 hover:bg-white/10 transition group"
            title={app.name}
          >
            <img
              src={favicon(app.favicon)}
              alt={app.name}
              className="w-7 h-7 rounded-md"
              loading="lazy"
            />
            <span className="text-[10.5px] text-white/65 group-hover:text-white/90 transition text-center leading-tight truncate w-full">
              {app.name}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
