# Moment

A beautiful, minimalist new tab experience for Chrome — a Momentum-inspired
clone with a personal twist: Linear sync, a soft-block focus mode, world clock,
and a small productivity dashboard.

## Features

- **Daily wallpaper** — a new landscape image each day from Unsplash (with a
  curated fallback set when no API key is configured).
- **Clock, date, greeting & main goal** — the calm heart of the page.
- **Task Inbox** — local tasks plus your assigned Linear issues, auto-synced
  every 15 minutes. Check/uncheck right from the new tab.
- **Focus mode** — pick 15/25/45/60/90 min. Your chosen distractions get a
  gentle "Are you sure?" overlay while the session runs. Always bypassable.
- **World clock** — live times across any cities you care about.
- **Analytics** — completed today, open today, streak, aging tasks, a 28-day
  trend chart, plus week/month/quarter comparisons vs the previous period.
- **Quote of the day** — a single calm thought, stable per day.

Everything is stored locally. The only network calls are Unsplash (your key)
and Linear (your key).

## Quick start

```bash
npm install
npm run dev
```

Then in Chrome:

1. Open `chrome://extensions`
2. Toggle **Developer mode** (top right)
3. Click **Load unpacked** → pick the `dist/` folder (after `npm run build`)
   or the `.vite/build/` dev-server folder if you're running `npm run dev`.
4. Open a new tab.

### Production build

```bash
npm run build
# load dist/ as an unpacked extension
```

## Configuration

Click the gear icon in the bottom-left of the new tab (or right-click the
extension icon → Options):

- **Your name** — greeting personalization.
- **Unsplash access key** — optional. [Create a free dev account](https://unsplash.com/developers),
  paste the access key, and Moment will pull a fresh daily landscape.
- **Linear API key** — create one at Linear → Settings → Account → API.
  Moment will sync your assigned, non-completed issues every 15 minutes.
- **Focus mode sites** — hostnames that get the soft-block screen during a
  focus session. Defaults include common distractions (twitter, reddit,
  youtube, etc.).
- **World clock cities** — add any label + IANA timezone
  (e.g. `Asia/Singapore`).

## Architecture

```
src/
  manifest.config.ts     # MV3 manifest (crxjs)
  background/            # service worker: alarms, Linear sync, focus end
  content/               # soft-block overlay injected on focus-list sites
  newtab/                # the new tab React app
    App.tsx              # layout
    components/
      Background.tsx     # wallpaper w/ LQIP blur-up
      Clock.tsx          # ticking clock
      MainGoal.tsx       # greeting + goal line
      TaskInbox.tsx      # floating tasks panel
      FocusPanel.tsx     # focus mode launcher / timer
      WorldClockPanel.tsx
      AnalyticsPanel.tsx # productivity dashboard
      StatsBar.tsx       # top-right stat strip
      TopBar.tsx         # top-left nav chips
      Quote.tsx
  options/               # settings React app
  lib/                   # storage, linear, unsplash, focus, tasks, time, quotes
  store/useMoment.ts     # React hook bound to chrome.storage.local
  types.ts
```

Data lives in `chrome.storage.local`. The `useMoment` hook subscribes to
storage changes so every panel updates reactively — edit a task in the inbox
and the analytics panel reflects it instantly.

## Notes on design

Inspired directly by the quiet confidence of Momentum: edge-to-edge photo,
generous negative space, a single clock, one question ("what is your main
goal?"), and a task inbox that hides until needed. Chrome and glassmorphism
kept subtle so the landscape always leads.

## License

MIT — do whatever you'd like.
