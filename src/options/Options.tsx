import { useEffect, useState, type ReactNode } from "react";
import { Check, Plus, X, RefreshCw } from "lucide-react";
import { store } from "@/lib/storage";
import { normalizeSite } from "@/lib/focus";
import type { UserPrefs, WorldClockCity } from "@/types";

export function Options() {
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [siteDraft, setSiteDraft] = useState("");
  const [cityDraft, setCityDraft] = useState({ label: "", tz: "" });
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    void store.getPrefs().then(setPrefs);
  }, []);

  if (!prefs) return null;

  const save = async (patch: Partial<UserPrefs>) => {
    const next = await store.patchPrefs(patch);
    setPrefs(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const addSite = async () => {
    const s = normalizeSite(siteDraft);
    if (!s) return;
    if (prefs.focusSites.includes(s)) return;
    await save({ focusSites: [...prefs.focusSites, s] });
    setSiteDraft("");
  };

  const removeSite = async (site: string) => {
    await save({ focusSites: prefs.focusSites.filter((s) => s !== site) });
  };

  const addCity = async () => {
    const label = cityDraft.label.trim();
    const tz = cityDraft.tz.trim();
    if (!label || !tz) return;
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: tz });
    } catch {
      alert(`"${tz}" is not a valid IANA time zone.`);
      return;
    }
    const city: WorldClockCity = {
      id: `c_${Date.now()}`,
      label,
      timezone: tz,
    };
    await save({ worldClockCities: [...prefs.worldClockCities, city] });
    setCityDraft({ label: "", tz: "" });
  };

  const removeCity = async (id: string) => {
    await save({
      worldClockCities: prefs.worldClockCities.filter((c) => c.id !== id),
    });
  };

  const triggerSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await chrome.runtime.sendMessage({ type: "remote-sync-now" });
      if (res?.ok) {
        const s = res.summary as {
          linear?: number;
          trello?: number;
          asana?: number;
          errors: string[];
        };
        const parts: string[] = [];
        if (s.linear !== undefined) parts.push(`Linear: ${s.linear}`);
        if (s.trello !== undefined) parts.push(`Trello: ${s.trello}`);
        if (s.asana !== undefined) parts.push(`Asana: ${s.asana}`);
        setSyncMsg(
          parts.length
            ? `Synced — ${parts.join(", ")}${s.errors.length ? ` · ${s.errors.join("; ")}` : ""}`
            : "No integrations configured yet."
        );
      } else setSyncMsg(res?.error ?? "Sync failed.");
    } catch (e) {
      setSyncMsg((e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-14 px-6">
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">
            Moment
          </div>
          <h1 className="text-2xl font-light tracking-tight mt-1">Settings</h1>
        </div>
        {saved && (
          <div className="flex items-center gap-1.5 text-emerald-300 text-[12px]">
            <Check className="w-[14px] h-[14px]" strokeWidth={2} />
            Saved
          </div>
        )}
      </div>

      <div className="space-y-5">
        <Section title="You">
          <label className="field-label">Your name</label>
          <input
            className="input"
            value={prefs.name}
            placeholder="How should we greet you?"
            onChange={(e) => setPrefs({ ...prefs, name: e.target.value })}
            onBlur={() => save({ name: prefs.name })}
          />
        </Section>

        <Section title="Wallpaper">
          <label className="field-label">Unsplash access key (optional)</label>
          <input
            className="input"
            type="password"
            value={prefs.unsplashAccessKey ?? ""}
            placeholder="Paste key to pull a fresh daily photo from Unsplash"
            onChange={(e) =>
              setPrefs({ ...prefs, unsplashAccessKey: e.target.value })
            }
            onBlur={() => save({ unsplashAccessKey: prefs.unsplashAccessKey })}
          />
          <p className="text-xs text-white/45 mt-2 leading-relaxed">
            Moment bundles a small curated fallback set if no key is set. A free
            Unsplash developer key gives you a new daily landscape.{" "}
            <a
              className="underline hover:text-white/80"
              href="https://unsplash.com/developers"
              target="_blank"
              rel="noreferrer"
            >
              Get one here
            </a>
            .
          </p>
        </Section>

        <Section title="Task integrations">
          <label className="field-label">Linear personal API key</label>
          <input
            className="input"
            type="password"
            value={prefs.linearApiKey ?? ""}
            placeholder="lin_api_..."
            onChange={(e) =>
              setPrefs({ ...prefs, linearApiKey: e.target.value })
            }
            onBlur={() => save({ linearApiKey: prefs.linearApiKey })}
          />
          <p className="text-xs text-white/45 mt-2">
            Linear → Settings → Account → API. Your assigned issues appear as a
            list in the task inbox.
          </p>

          <div className="h-px bg-white/8 my-5" />

          <label className="field-label">Trello API key</label>
          <input
            className="input"
            type="password"
            value={prefs.trelloApiKey ?? ""}
            placeholder="API key"
            onChange={(e) =>
              setPrefs({ ...prefs, trelloApiKey: e.target.value })
            }
            onBlur={() => save({ trelloApiKey: prefs.trelloApiKey })}
          />
          <label className="field-label mt-3">Trello token</label>
          <input
            className="input"
            type="password"
            value={prefs.trelloToken ?? ""}
            placeholder="OAuth token"
            onChange={(e) =>
              setPrefs({ ...prefs, trelloToken: e.target.value })
            }
            onBlur={() => save({ trelloToken: prefs.trelloToken })}
          />
          <p className="text-xs text-white/45 mt-2">
            Get both from{" "}
            <a
              className="underline hover:text-white/80"
              href="https://trello.com/power-ups/admin"
              target="_blank"
              rel="noreferrer"
            >
              trello.com/power-ups/admin
            </a>
            . Your open cards sync into Moment.
          </p>

          <div className="h-px bg-white/8 my-5" />

          <label className="field-label">Asana personal access token</label>
          <input
            className="input"
            type="password"
            value={prefs.asanaToken ?? ""}
            placeholder="PAT..."
            onChange={(e) => setPrefs({ ...prefs, asanaToken: e.target.value })}
            onBlur={() => save({ asanaToken: prefs.asanaToken })}
          />
          <p className="text-xs text-white/45 mt-2">
            Asana → My settings → Apps → Developer apps → Personal access
            tokens. Your assigned incomplete tasks sync in.
          </p>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="btn disabled:opacity-40"
            >
              <RefreshCw
                className={`w-[14px] h-[14px] ${syncing ? "animate-spin" : ""}`}
                strokeWidth={1.8}
              />
              {syncing ? "Syncing…" : "Sync now"}
            </button>
            {syncMsg && (
              <span className="text-[12px] text-white/55">{syncMsg}</span>
            )}
          </div>
        </Section>

        <Section title="Search">
          <label className="field-label">Default search engine</label>
          <div className="flex gap-2">
            {(["google", "duckduckgo", "bing"] as const).map((e) => (
              <button
                key={e}
                onClick={() => save({ searchEngine: e })}
                className={`btn ${prefs.searchEngine === e ? "primary" : ""}`}
              >
                {e === "duckduckgo" ? "DuckDuckGo" : e[0].toUpperCase() + e.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-white/45 mt-3">
            On the new tab, press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[11px]">/</kbd>{" "}
            or <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[11px]">⌘K</kbd> to open search.
          </p>
        </Section>

        <Section title="Focus mode">
          <label className="field-label">Sites to soft-block</label>
          <div className="flex flex-wrap gap-2">
            {prefs.focusSites.map((s) => (
              <span key={s} className="pill">
                {s}
                <button onClick={() => removeSite(s)} aria-label={`Remove ${s}`}>
                  <X className="w-[10px] h-[10px]" strokeWidth={2} />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="input"
              placeholder="e.g. twitter.com"
              value={siteDraft}
              onChange={(e) => setSiteDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addSite();
              }}
            />
            <button className="btn primary" onClick={addSite}>
              <Plus className="w-[14px] h-[14px]" strokeWidth={2} />
              Add
            </button>
          </div>
          <p className="text-xs text-white/45 mt-3 leading-relaxed">
            During a focus session, visiting one of these shows a gentle
            "Are you sure?" screen. You can always let yourself through — it's
            a nudge, not a lock.
          </p>
        </Section>

        <Section title="World clock">
          <div className="flex flex-col divide-y divide-white/6 border border-white/8 rounded-lg overflow-hidden">
            {prefs.worldClockCities.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-[14px]">{c.label}</div>
                  <div className="text-[11.5px] text-white/45">{c.timezone}</div>
                </div>
                <button
                  onClick={() => removeCity(c.id)}
                  className="text-white/45 hover:text-white/90"
                >
                  <X className="w-[14px] h-[14px]" strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
            <input
              className="input"
              placeholder="City label"
              value={cityDraft.label}
              onChange={(e) =>
                setCityDraft({ ...cityDraft, label: e.target.value })
              }
            />
            <input
              className="input"
              placeholder="IANA zone (e.g. Asia/Singapore)"
              value={cityDraft.tz}
              onChange={(e) =>
                setCityDraft({ ...cityDraft, tz: e.target.value })
              }
            />
            <button className="btn primary" onClick={addCity}>
              <Plus className="w-[14px] h-[14px]" strokeWidth={2} />
              Add
            </button>
          </div>
        </Section>

        <p className="text-[11.5px] text-white/35 pt-2">
          All data is stored locally in your browser. Nothing is sent anywhere
          except when syncing Linear with your own key.
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="card">
      <h2 className="text-[15px] font-medium mb-4">{title}</h2>
      {children}
    </div>
  );
}
