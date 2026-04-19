// Curated Google Fonts grouped by style. User can pick from this list
// or paste any Google Font family name in the "custom" input.
export const FONT_GROUPS: { label: string; fonts: string[] }[] = [
  {
    label: "Sans Serif",
    fonts: [
      "Pretendard",
      "Inter",
      "Manrope",
      "DM Sans",
      "Plus Jakarta Sans",
      "Work Sans",
      "Space Grotesk",
      "Figtree",
      "Geist",
      "Outfit",
      "Nunito",
      "Poppins",
      "Montserrat",
      "Roboto",
      "Open Sans",
      "Lato",
      "IBM Plex Sans",
    ],
  },
  {
    label: "Serif",
    fonts: [
      "Fraunces",
      "Playfair Display",
      "Cormorant Garamond",
      "Lora",
      "Merriweather",
      "EB Garamond",
      "DM Serif Display",
      "Source Serif 4",
      "Libre Baskerville",
    ],
  },
  {
    label: "Display",
    fonts: [
      "Bricolage Grotesque",
      "Instrument Serif",
      "Unbounded",
      "Syne",
      "Tenor Sans",
    ],
  },
  {
    label: "Mono",
    fonts: ["JetBrains Mono", "Geist Mono", "IBM Plex Mono", "Space Mono"],
  },
];

export const DEFAULT_UI_FONT = "Pretendard";

const loaded = new Set<string>();

// Fonts that aren't on Google Fonts — we load them from their own CDN.
const CUSTOM_FONT_SOURCES: Record<string, string> = {
  Pretendard:
    "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css",
};

// Some custom-hosted fonts declare @font-face with a different family name than
// the one we expose in the UI. Map the UI name → the real CSS family name.
const FAMILY_ALIASES: Record<string, string> = {
  Pretendard: "Pretendard Variable",
};

export function loadGoogleFont(family: string): void {
  if (!family) return;
  const key = family.trim();
  if (!key || loaded.has(key)) return;
  loaded.add(key);
  const id = `gf-${key.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href =
    CUSTOM_FONT_SOURCES[key] ??
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      key
    ).replace(/%20/g, "+")}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

export function applyUIFont(family: string | undefined): void {
  const f = (family || DEFAULT_UI_FONT).trim();
  loadGoogleFont(f);
  const cssFamily = FAMILY_ALIASES[f] ?? f;
  document.documentElement.style.setProperty(
    "--moment-font",
    `"${cssFamily}", ui-sans-serif, system-ui, sans-serif`
  );
}
