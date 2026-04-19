import { useEffect, useState } from "react";
import { ensureDailyWallpaper } from "@/lib/unsplash";
import type { WallpaperCache } from "@/types";

export function Background({ wallpaper }: { wallpaper: WallpaperCache | null }) {
  const [current, setCurrent] = useState<WallpaperCache | null>(wallpaper);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (wallpaper) {
      setCurrent(wallpaper);
      return;
    }
    void ensureDailyWallpaper().then(setCurrent).catch(() => null);
  }, [wallpaper]);

  useEffect(() => {
    if (!current) return;
    setLoaded(false);
    const img = new Image();
    img.src = current.url;
    img.onload = () => setLoaded(true);
    img.onerror = () => setLoaded(true);
  }, [current?.url]);

  return (
    <div className="absolute inset-0 vignette">
      {current?.thumbUrl && (
        <div
          className="absolute inset-0 bg-center bg-cover transition-opacity duration-[1200ms]"
          style={{
            backgroundImage: `url(${current.thumbUrl})`,
            filter: "blur(20px)",
            transform: "scale(1.08)",
            opacity: loaded ? 0 : 1,
          }}
        />
      )}
      {current?.url && (
        <div
          className="absolute inset-0 bg-center bg-cover transition-opacity duration-[1200ms] ease-out"
          style={{
            backgroundImage: `url(${current.url})`,
            opacity: loaded ? 1 : 0,
          }}
        />
      )}
      {!current && <div className="absolute inset-0 bg-neutral-900" />}
    </div>
  );
}

export function WallpaperCredit({ wallpaper }: { wallpaper: WallpaperCache | null }) {
  if (!wallpaper) return null;
  return (
    <div
      className="text-[11.5px] text-white/75 font-medium flex items-center gap-1.5"
      style={{ textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}
    >
      <span>{wallpaper.location ?? "Unsplash"}</span>
      {wallpaper.photographer && (
        <>
          <span className="opacity-50">·</span>
          <a
            href={wallpaper.photographerUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-white/80"
          >
            {wallpaper.photographer}
          </a>
        </>
      )}
    </div>
  );
}
