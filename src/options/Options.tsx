import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Check,
  Plus,
  X,
  RefreshCw,
  User,
  Image as ImageIcon,
  Link2,
  Brain,
  Globe2,
  Search as SearchIcon,
  Type,
  Info,
} from "lucide-react";
import { store } from "@/lib/storage";
import { normalizeSite } from "@/lib/focus";
import { FONT_GROUPS, applyUIFont, loadGoogleFont } from "@/lib/fonts";
import { testAsanaToken } from "@/lib/asana";
import type { UserPrefs, WorldClockCity } from "@/types";

type SectionId =
  | "you"
  | "appearance"
  | "wallpaper"
  | "integrations"
  | "search"
  | "focus"
  | "worldclock"
  | "about";

const NAV: { id: SectionId; label: string; Icon: typeof User }[] = [
  { id: "you", label: "You", Icon: User },
  { id: "appearance", label: "Appearance", Icon: Type },
  { id: "wallpaper", label: "Wallpaper", Icon: ImageIcon },
  { id: "integrations", label: "Task integrations", Icon: Link2 },
  { id: "search", label: "Search", Icon: SearchIcon },
  { id: "focus", label: "Focus mode", Icon: Brain },
  { id: "worldclock", label: "World clock", Icon: Globe2 },
  { id: "about", label: "About", Icon: Info },
];

export function Options() {
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [siteDraft, setSiteDraft] = useState("");
  const [cityDraft, setCityDraft] = useState({ label: "", tz: "" });
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [testingAsana, setTestingAsana] = useState(false);
  const [asanaTestMsg, setAsanaTestMsg] = useState<string | null>(null);
  const [active, setActive] = useState<SectionId>("you");

  useEffect(() => {
    void store.getPrefs().then((p) => {
      setPrefs(p);
      applyUIFont(p.uiFont);
    });
  }, []);

  // Scroll-spy: highlight nav item whose section is most visible.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target.id as SectionId | undefined;
        if (top) setActive(top);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    NAV.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [prefs]);

  if (!prefs) return null;

  const save = async (patch: Partial<UserPrefs>) => {
    const next = await store.patchPrefs(patch);
    setPrefs(next);
    if (patch.uiFont !== undefined) applyUIFont(next.uiFont);
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

  const testAsanaConn = async () => {
    const token = prefs?.asanaToken?.trim();
    if (!token) { setAsanaTestMsg("No token saved."); return; }
    setTestingAsana(true);
    setAsanaTestMsg(null);
    try {
      const { name, email } = await testAsanaToken(token);
      setAsanaTestMsg(`Connected as ${name}${email ? ` (${email})` : ""}`);
    } catch (e) {
      setAsanaTestMsg((e as Error).message);
    } finally {
      setTestingAsana(false);
    }
  };

  const triggerSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await chrome.runtime.sendMessage({ type: "remote-sync-now" });
      if (res?.ok) {
        const s = res.summary as { pushed: number; errors: string[] };
        const msg = s.pushed > 0
          ? `Pushed ${s.pushed} task${s.pushed !== 1 ? "s" : ""} to Flow`
          : "All tasks already synced.";
        setSyncMsg(
          s.errors.length ? `${msg} · ${s.errors.join("; ")}` : msg
        );
      } else setSyncMsg(res?.error ?? "Sync failed.");
    } catch (e) {
      setSyncMsg((e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const jumpTo = (id: SectionId) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-10">
        <aside className="md:sticky md:top-10 h-max">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">
            Moment
          </div>
          <h1 className="text-2xl font-light tracking-tight mt-1 mb-6">
            Settings
          </h1>
          <nav className="flex flex-col gap-0.5">
            {NAV.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => jumpTo(id)}
                className={`nav-link ${active === id ? "active" : ""}`}
              >
                <Icon className="w-[14px] h-[14px]" strokeWidth={1.7} />
                {label}
              </button>
            ))}
          </nav>
          {saved && (
            <div className="mt-6 flex items-center gap-1.5 text-emerald-300 text-[12px]">
              <Check className="w-[14px] h-[14px]" strokeWidth={2} />
              Saved
            </div>
          )}
        </aside>

        <main className="space-y-5 pb-24">
          <Section id="you" title="You">
            <label className="field-label">Your name</label>
            <input
              className="input"
              value={prefs.name}
              placeholder="How should we greet you?"
              onChange={(e) => setPrefs({ ...prefs, name: e.target.value })}
              onBlur={() => save({ name: prefs.name })}
            />
          </Section>

          <Section id="appearance" title="Appearance">
            <FontPicker
              value={prefs.uiFont ?? "Pretendard"}
              onChange={(family) => save({ uiFont: family })}
            />
          </Section>

          <Section id="wallpaper" title="Wallpaper">
            <label className="field-label">
              Unsplash access key (optional)
            </label>
            <input
              className="input"
              type="password"
              value={prefs.unsplashAccessKey ?? ""}
              placeholder="Access Key from your Unsplash app"
              onChange={(e) =>
                setPrefs({ ...prefs, unsplashAccessKey: e.target.value })
              }
              onBlur={() =>
                save({ unsplashAccessKey: prefs.unsplashAccessKey })
              }
            />
            <p className="text-xs text-white/45 mt-2 leading-relaxed">
              Only the <b className="text-white/70">Access Key</b> is needed —
              the Secret Key is for server-side OAuth and isn't used here.
              Create an app at{" "}
              <a
                className="underline hover:text-white/80"
                href="https://unsplash.com/oauth/applications"
                target="_blank"
                rel="noreferrer"
              >
                unsplash.com/oauth/applications
              </a>
              , then copy its Access Key from the app settings. Moment bundles
              a small curated fallback set if no key is set.
            </p>
          </Section>

          <Section id="integrations" title="Task integrations">
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
              Linear → Settings → Account → API. Your assigned issues appear as
              a list in the task inbox.
            </p>

            <div className="h-px bg-white/8 my-5" />

            <label className="field-label">Asana personal access token</label>
            <input
              className="input"
              type="password"
              value={prefs.asanaToken ?? ""}
              placeholder="PAT..."
              onChange={(e) =>
                setPrefs({ ...prefs, asanaToken: e.target.value })
              }
              onBlur={() => save({ asanaToken: prefs.asanaToken })}
            />
            <p className="text-xs text-white/45 mt-2">
              Asana → My settings → Apps → Developer apps → Personal access
              tokens. Your assigned incomplete tasks sync in.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={testAsanaConn}
                disabled={testingAsana}
                className="btn disabled:opacity-40"
              >
                <Check
                  className={`w-[14px] h-[14px] ${testingAsana ? "animate-pulse" : ""}`}
                  strokeWidth={1.8}
                />
                {testingAsana ? "Testing…" : "Test connection"}
              </button>
              {asanaTestMsg && (
                <span className="text-[12px] text-white/55">{asanaTestMsg}</span>
              )}
            </div>

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

          <Section id="search" title="Search">
            <label className="field-label">Default search engine</label>
            <div className="flex gap-2">
              {(["google", "duckduckgo", "bing"] as const).map((e) => (
                <button
                  key={e}
                  onClick={() => save({ searchEngine: e })}
                  className={`btn ${prefs.searchEngine === e ? "primary" : ""}`}
                >
                  {e === "duckduckgo"
                    ? "DuckDuckGo"
                    : e[0].toUpperCase() + e.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/45 mt-3">
              On the new tab, press{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[11px]">
                /
              </kbd>{" "}
              or{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[11px]">
                ⌘K
              </kbd>{" "}
              to open search.
            </p>
          </Section>

          <Section id="focus" title="Focus mode">
            <label className="field-label">Sites to soft-block</label>
            <div className="flex flex-wrap gap-2">
              {prefs.focusSites.map((s) => (
                <span key={s} className="pill">
                  {s}
                  <button
                    onClick={() => removeSite(s)}
                    aria-label={`Remove ${s}`}
                  >
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
              During a focus session, visiting one of these shows a gentle "Are
              you sure?" screen. You can always let yourself through — it's a
              nudge, not a lock.
            </p>
          </Section>

          <Section id="worldclock" title="World clock">
            <div className="flex flex-col divide-y divide-white/6 border border-white/8 rounded-lg overflow-hidden">
              {prefs.worldClockCities.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <div className="text-[14px]">{c.label}</div>
                    <div className="text-[11.5px] text-white/45">
                      {c.timezone}
                    </div>
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

          <Section id="about" title="About">
            <p className="text-[12.5px] text-white/55 leading-relaxed">
              All data is stored locally in your browser. Nothing is sent
              anywhere except when syncing Linear or Asana with your
              own API keys, or when fetching the daily Unsplash wallpaper.
            </p>
          </Section>
        </main>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: SectionId;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="card scroll-mt-10">
      <h2 className="text-[15px] font-medium mb-4">{title}</h2>
      {children}
    </section>
  );
}

function FontPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (family: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState(value);

  useEffect(() => {
    setCustom(value);
  }, [value]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FONT_GROUPS;
    return FONT_GROUPS.map((g) => ({
      ...g,
      fonts: g.fonts.filter((f) => f.toLowerCase().includes(q)),
    })).filter((g) => g.fonts.length);
  }, [query]);

  // Preload fonts being shown so user sees actual typography.
  useEffect(() => {
    filteredGroups.forEach((g) => g.fonts.forEach(loadGoogleFont));
  }, [filteredGroups]);

  return (
    <>
      <label className="field-label">UI font</label>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Search fonts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[420px] overflow-y-auto moment-scroll pr-1">
          {filteredGroups.flatMap((g) =>
            g.fonts.map((f) => (
              <button
                key={f}
                onClick={() => onChange(f)}
                className={`text-left p-3 rounded-lg border transition ${
                  value === f
                    ? "bg-white/10 border-white/40"
                    : "bg-white/[0.03] border-white/10 hover:border-white/25"
                }`}
              >
                <div
                  style={{ fontFamily: `"${f}", sans-serif` }}
                  className="text-[18px] leading-tight truncate"
                >
                  {f}
                </div>
                <div className="text-[11px] text-white/40 mt-1">{g.label}</div>
              </button>
            ))
          )}
          {!filteredGroups.length && (
            <div className="col-span-full text-xs text-white/45 py-4">
              No matches. Paste any Google Font name below.
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Any Google Font name (e.g. Caveat)"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && custom.trim()) onChange(custom.trim());
            }}
          />
          <button
            className="btn primary"
            onClick={() => custom.trim() && onChange(custom.trim())}
          >
            Apply
          </button>
        </div>
        <p className="text-xs text-white/45 leading-relaxed">
          Any family from{" "}
          <a
            className="underline hover:text-white/80"
            href="https://fonts.google.com"
            target="_blank"
            rel="noreferrer"
          >
            fonts.google.com
          </a>{" "}
          works — type the exact family name. Changes apply instantly across
          the new tab and this settings page.
        </p>
      </div>
    </>
  );
}
