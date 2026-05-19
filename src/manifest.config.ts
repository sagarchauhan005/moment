import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Moment — A beautiful new tab",
  description:
    "A minimalist new tab experience with tasks, focus mode, world clock, and daily inspiration.",
  version: "0.1.7",
  chrome_url_overrides: {
    newtab: "src/newtab/index.html",
  },
  action: {
    default_title: "Moment settings",
  },
  options_ui: {
    page: "src/options/index.html",
    open_in_tab: true,
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/focus-gate.ts"],
      run_at: "document_start",
      all_frames: false,
    },
  ],
  permissions: ["storage", "alarms", "search"],
  host_permissions: [
    // Asana REST API
    "https://app.asana.com/*",
    // Linear GraphQL API
    "https://api.linear.app/*",
    // Weather (no key required)
    "https://api.open-meteo.com/*",
    // Reverse geocoding for weather city name
    "https://nominatim.openstreetmap.org/*",
    // Unsplash wallpapers
    "https://api.unsplash.com/*",
    "https://images.unsplash.com/*",
  ],
  icons: {
    "16": "src/assets/icon-16.png",
    "48": "src/assets/icon-48.png",
    "128": "src/assets/icon-128.png",
  },
  web_accessible_resources: [
    {
      matches: ["<all_urls>"],
      resources: ["assets/*.mp3", "sounds/*.mp3"],
    },
  ],
});
