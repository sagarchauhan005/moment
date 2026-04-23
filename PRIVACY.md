# Privacy Policy — Moment New Tab

_Last updated: April 2026_

## Summary

Moment does **not** collect, transmit, or sell any personal data. Everything you enter stays on your device.

---

## Data stored locally

All data is stored exclusively in **`chrome.storage.local`** on your own device. It is never sent to any server operated by Moment.

| Data | Purpose |
|------|---------|
| Your name | Personalised greeting |
| Tasks (titles, completion status, priority) | Task inbox |
| Daily focus minutes & tasks-completed count | Stats panel |
| Settings (search engine, clock cities, font, units) | User preferences |
| Unsplash access key | Fetching wallpapers — stored locally, sent only to Unsplash |
| Linear API key | Syncing issues — stored locally, sent only to Linear |
| Asana personal access token | Syncing tasks — stored locally, sent only to Asana |
| Wallpaper cache (URL + metadata) | Avoiding repeat fetches |

---

## Network requests made by the extension

The extension contacts **only** the following third-party services, and only when you use the relevant feature:

| Service | When | Data sent |
|---------|------|-----------|
| **Unsplash** (`api.unsplash.com`, `images.unsplash.com`) | On new-tab load / manual refresh | Your Unsplash access key (if set); no personal data |
| **Asana** (`app.asana.com`) | When Asana token is configured | Your PAT; task titles you create or complete |
| **Linear** (`api.linear.app`) | When Linear API key is configured | Your API key; issue titles you create or complete |
| **Open-Meteo** (`api.open-meteo.com`) | When weather widget is visible | Your approximate GPS coordinates (lat/lon) |
| **Nominatim / OpenStreetMap** (`nominatim.openstreetmap.org`) | Same as above | Same lat/lon, to resolve city name |

No other outbound network requests are made. The extension contains no analytics, telemetry, crash reporters, or ad networks.

---

## Permissions explained

| Permission | Reason |
|-----------|--------|
| `storage` | Saving tasks, settings, and wallpaper cache to `chrome.storage.local` |
| `alarms` | Ending focus sessions at the right time; daily wallpaper refresh |
| `tabs` | Reading the active tab URL to determine if the Focus Gate should appear |
| Content script on all URLs | The Focus Gate soft-block overlay needs to run on any site you add to your block list |
| Host permissions (Asana, Linear, Open-Meteo, Nominatim, Unsplash) | Fetching data from those APIs |

---

## Geolocation

The weather widget requests your browser's geolocation (via `navigator.geolocation`) to fetch local temperature and city name. The browser will prompt for permission. Coordinates are sent directly to Open-Meteo and Nominatim — never to any Moment server. You may deny the prompt; the weather widget will simply not appear.

---

## Children's privacy

Moment does not knowingly collect any information from children under 13.

---

## Changes to this policy

Any material changes will be reflected in the `Last updated` date above and communicated via the GitHub repository.

---

## Contact

Open an issue at [github.com/sagarchauhan005/moment](https://github.com/sagarchauhan005/moment) for any privacy questions.
