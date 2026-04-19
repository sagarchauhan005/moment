import { store } from "./storage";
import { todayISO } from "./time";
import type { WallpaperCache } from "@/types";

// Curated, evocative landscape collection — Momentum-style.
const COLLECTION_ID = "1053828";

// Fallbacks used if Unsplash isn't configured or the request fails.
// These are Unsplash Source URLs (no API key) — kept as a graceful default.
const FALLBACK_POOL: Omit<WallpaperCache, "fetchedAt" | "forDate">[] = [
  {
    url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=2400&q=85&fm=jpg",
    thumbUrl:
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=40&q=20&blur=50",
    photographer: "Samuel Ferrara",
    photographerUrl: "https://unsplash.com/@samferrara",
    location: "Dolomites, Italy",
  },
  {
    url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2400&q=85&fm=jpg",
    thumbUrl:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=40&q=20&blur=50",
    photographer: "Jonatan Pie",
    photographerUrl: "https://unsplash.com/@r3dmax",
    location: "Iceland",
  },
  {
    url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=2400&q=85&fm=jpg",
    thumbUrl:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=40&q=20&blur=50",
    photographer: "Luca Bravo",
    photographerUrl: "https://unsplash.com/@lucabravo",
    location: "Hallstatt, Austria",
  },
  {
    url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=2400&q=85&fm=jpg",
    thumbUrl:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=40&q=20&blur=50",
    photographer: "Dawid Zawiła",
    photographerUrl: "https://unsplash.com/@davealmine",
    location: "Grasslands",
  },
  {
    url: "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=2400&q=85&fm=jpg",
    thumbUrl:
      "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=40&q=20&blur=50",
    photographer: "Joshua Earle",
    photographerUrl: "https://unsplash.com/@joshuaearle",
    location: "Patagonia",
  },
  {
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=2400&q=85&fm=jpg",
    thumbUrl:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=40&q=20&blur=50",
    photographer: "Pietro De Grandi",
    photographerUrl: "https://unsplash.com/@peterdegrandi",
    location: "Italian Alps",
  },
  {
    url: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=2400&q=85&fm=jpg",
    thumbUrl:
      "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=40&q=20&blur=50",
    photographer: "Kalen Emsley",
    photographerUrl: "https://unsplash.com/@kalenemsley",
    location: "Banff, Canada",
  },
];

export async function ensureDailyWallpaper(): Promise<WallpaperCache> {
  const cached = await store.getWallpaper();
  const today = todayISO();
  if (cached && cached.forDate === today) return cached;

  const prefs = await store.getPrefs();
  let next: WallpaperCache | null = null;

  if (prefs.unsplashAccessKey) {
    next = await fetchFromUnsplash(prefs.unsplashAccessKey, today).catch(
      () => null
    );
  }
  if (!next) next = pickFallback(today);

  await store.setWallpaper(next);
  return next;
}

async function fetchFromUnsplash(
  accessKey: string,
  forDate: string
): Promise<WallpaperCache> {
  const url = `https://api.unsplash.com/photos/random?collections=${COLLECTION_ID}&orientation=landscape&content_filter=high`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });
  if (!res.ok) throw new Error(`Unsplash ${res.status}`);
  const data = await res.json();
  return {
    url: `${data.urls.raw}&w=2400&q=85&fm=jpg`,
    thumbUrl: `${data.urls.raw}&w=40&q=20&blur=50`,
    photographer: data.user?.name ?? "Unknown",
    photographerUrl: data.user?.links?.html ?? "https://unsplash.com",
    location: data.location?.title,
    fetchedAt: Date.now(),
    forDate,
  };
}

function pickFallback(forDate: string): WallpaperCache {
  // Hash date string → stable per-day pick.
  let h = 0;
  for (let i = 0; i < forDate.length; i++) h = (h * 31 + forDate.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % FALLBACK_POOL.length;
  return {
    ...FALLBACK_POOL[idx],
    fetchedAt: Date.now(),
    forDate,
  };
}

function pickRandomFallback(forDate: string, excludeUrl?: string): WallpaperCache {
  let pool = FALLBACK_POOL;
  if (excludeUrl) {
    const filtered = FALLBACK_POOL.filter((p) => p.url !== excludeUrl);
    if (filtered.length) pool = filtered;
  }
  const idx = Math.floor(Math.random() * pool.length);
  return {
    ...pool[idx],
    fetchedAt: Date.now(),
    forDate,
  };
}

/** Fetches a new random wallpaper (API if configured, else curated pool) and persists it for today. */
export async function refreshWallpaper(excludeImageUrl?: string): Promise<WallpaperCache> {
  const prefs = await store.getPrefs();
  const today = todayISO();
  let next: WallpaperCache | null = null;

  if (prefs.unsplashAccessKey) {
    next = await fetchFromUnsplash(prefs.unsplashAccessKey, today).catch(() => null);
  }
  if (!next) {
    next = pickRandomFallback(today, excludeImageUrl);
  }
  await store.setWallpaper(next);
  return next;
}
