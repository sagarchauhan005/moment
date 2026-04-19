# Moment — A Beautiful New Tab

A minimalist, Momentum-inspired Chrome extension that replaces your new tab with a calm, productive workspace.

![Moment preview](screenshots/preview.png)

---

## Features

### Core
- **Daily wallpaper** — fresh landscape from Unsplash each day, with a curated built-in fallback set
- **Clock, greeting & main goal** — the calm centre of every new tab
- **Ambient sounds** — rain, ocean, forest, white noise, brown noise, binaural beats during focus sessions

### Tasks
- **Task Inbox** — Inbox, Today, and Completed lists with drag-to-reorder
- **Priority levels** — High / Medium / Low with colour-coded dots; priority sort overrides manual order
- **Right-click context menu** — move tasks between lists, set priority, push to external tools, delete
- **Asana sync** — local tasks push to Asana automatically; completing a task marks it complete upstream
- **Linear sync** — assigned Linear issues appear in your inbox; completing them closes the issue
- **Auto-archive** — tasks completed today stay visible with strikethrough; after midnight they move to Completed automatically
- **4-hour panel memory** — the task panel remembers whether you opened it and stays open for 4 hours, then quietly hides itself

### Focus mode
- Configurable 15 / 25 / 45 / 60 / 90 min sessions with circular progress ring
- Soft-block overlay on chosen sites — a nudge, never a lock
- Ambient sound selection with volume control

### Other
- **World clock** — live times for any IANA timezone
- **Analytics dashboard** — tasks completed, focus minutes, streaks, 28-day trend chart
- **Quick links** — pinned shortcuts in the top bar
- **Search** — Google / DuckDuckGo / Bing, triggered with `/` or `⌘K`
- **Font picker** — any Google Font, applied instantly across the page

---

## Quick start

```bash
git clone https://github.com/sagarchauhan005/moment.git
cd moment
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `dist/` folder
4. Open a new tab

For hot-reload development:

```bash
npm run dev
# load dist/ as an unpacked extension — it hot-reloads on save
```

---

## Configuration

Open the settings page via the gear icon (bottom-left of any new tab):

| Setting | Description |
|---|---|
| **Your name** | Greeting personalisation |
| **UI font** | Any Google Font family — applied instantly |
| **Unsplash access key** | Optional. Get one at [unsplash.com/developers](https://unsplash.com/developers) |
| **Linear API key** | Linear → Settings → Account → API |
| **Asana personal access token** | Asana → My settings → Apps → Personal access tokens |
| **Focus sites** | Hostnames soft-blocked during focus sessions |
| **World clock cities** | Label + IANA timezone (e.g. `Asia/Singapore`) |
| **Search engine** | Google, DuckDuckGo, or Bing |

---

## Architecture

```
src/
  background/            # MV3 service worker — alarms, remote sync, focus end
  content/               # focus-gate content script (soft-block overlay)
  newtab/                # new tab React app
    App.tsx
    components/
      Background.tsx     # wallpaper with blur-up LQIP
      Clock.tsx
      FocusMode.tsx      # focus timer overlay + sounds
      MainGoal.tsx
      Quote.tsx
      StatsBar.tsx
      TaskInbox.tsx      # floating task panel (drag, priority, sync)
      TopBar.tsx
      WorldClockPanel.tsx
      AnalyticsPanel.tsx
    styles.css
  options/               # settings page React app
  lib/
    asana.ts             # Asana REST API client
    focus.ts             # focus session helpers
    fonts.ts             # Google Fonts loader
    linear.ts            # Linear GraphQL client
    quotes.ts
    sounds.ts            # Tone.js ambient engine
    storage.ts           # chrome.storage.local wrapper
    tasks.ts             # task CRUD + list filtering
    time.ts
    unsplash.ts
  types.ts
```

State lives entirely in `chrome.storage.local`. The `useMoment` hook subscribes to `onChanged` events so every panel updates reactively without a separate state management library.

---

## Privacy & Security

- **All data is stored locally** in `chrome.storage.local`
- The only outbound network calls are:
  - Unsplash CDN — daily wallpaper fetch (your key, optional)
  - Asana REST API — only when you add your PAT in Settings
  - Linear GraphQL API — only when you add your API key in Settings
  - Weather — current conditions via Open-Meteo (no API key required, no account)
- No telemetry, no analytics, no tracking

---

## Contributing

Pull requests welcome. Please open an issue first for non-trivial changes.

```bash
npm run dev    # dev build with HMR
npm run build  # production build → dist/
```

---

## License

MIT — do whatever you'd like.
