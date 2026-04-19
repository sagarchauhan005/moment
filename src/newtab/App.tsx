import { useEffect, useMemo, useState } from "react";
import { useMoment } from "@/store/useMoment";
import { Background, WallpaperCredit } from "./components/Background";
import { Clock } from "./components/Clock";
import { MainGoal } from "./components/MainGoal";
import { Quote } from "./components/Quote";
import { TopBar } from "./components/TopBar";
import { StatsBar } from "./components/StatsBar";
import { TaskInbox } from "./components/TaskInbox";
import { FocusMode } from "./components/FocusMode";
import { WorldClockPanel } from "./components/WorldClockPanel";
import { AnalyticsPanel } from "./components/AnalyticsPanel";
import { LinksPanel } from "./components/LinksPanel";
import { SearchPanel } from "./components/SearchPanel";
import { Onboarding } from "./components/Onboarding";
import { tasksForList } from "@/lib/tasks";
import { applyUIFont } from "@/lib/fonts";
import { Settings } from "lucide-react";

export type PanelKey =
  | "focus"
  | "worldclock"
  | "analytics"
  | "links"
  | "search"
  | null;

export function App() {
  const state = useMoment();
  const [panel, setPanel] = useState<PanelKey>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const tasksToday = useMemo(
    () => tasksForList(state.tasks, "today").filter((t) => !t.completed).length,
    [state.tasks]
  );

  useEffect(() => {
    if (state.ready && !state.prefs.onboarded) {
      setShowOnboarding(true);
    }
  }, [state.ready, state.prefs.onboarded]);

  useEffect(() => {
    if (state.ready) applyUIFont(state.prefs.uiFont);
  }, [state.ready, state.prefs.uiFont]);

  // Keyboard shortcuts: "/" or Cmd/Ctrl+K open search; Escape closes panels.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typingInField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (e.key === "Escape") {
        setPanel(null);
        return;
      }
      if (typingInField) return;
      if (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setPanel("search");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!state.ready) {
    return <div className="absolute inset-0 bg-neutral-950" />;
  }

  const focusActive = panel === "focus" || state.focus.active;

  return (
    <div className="absolute inset-0 text-white">
      <Background wallpaper={state.wallpaper} />

      {!focusActive && <TopBar onOpen={setPanel} />}
      {!focusActive && (
        <StatsBar
          dailyLogs={state.dailyLogs}
          focus={state.focus}
          tasksTodayCount={tasksToday}
        />
      )}

      {!focusActive && (
        <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto">
            <Clock />
          </div>
          <div className="pointer-events-auto">
            <MainGoal prefs={state.prefs} />
          </div>
        </div>
      )}

      {!focusActive && (
        <div className="absolute bottom-5 left-6 flex items-center gap-3 z-20">
          <button
            onClick={() => chrome.runtime.openOptionsPage?.()}
            className="icon-btn"
            title="Settings"
          >
            <Settings className="w-[16px] h-[16px]" strokeWidth={1.5} />
          </button>
          <WallpaperCredit wallpaper={state.wallpaper} />
        </div>
      )}

      {!focusActive && (
        <div className="absolute bottom-5 left-0 right-0 flex justify-center z-10 pointer-events-none">
          <div className="pointer-events-auto">
            <Quote />
          </div>
        </div>
      )}

      {!focusActive && (
        <TaskInbox
          tasks={state.tasks}
          prefs={state.prefs}
          onExpand={() => setPanel("analytics")}
        />
      )}

      {(panel === "focus" || state.focus.active) && (
        <FocusMode focus={state.focus} onClose={() => setPanel(null)} />
      )}
      {panel === "worldclock" && (
        <WorldClockPanel
          cities={state.prefs.worldClockCities}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === "analytics" && (
        <AnalyticsPanel
          tasks={state.tasks}
          dailyLogs={state.dailyLogs}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === "links" && (
        <LinksPanel
          links={state.prefs.links}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === "search" && (
        <SearchPanel
          engine={state.prefs.searchEngine}
          onClose={() => setPanel(null)}
        />
      )}

      {showOnboarding && (
        <Onboarding onDone={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
