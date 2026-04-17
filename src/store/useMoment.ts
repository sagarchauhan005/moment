import { useEffect, useState, useCallback } from "react";
import { DEFAULT_PREFS, onStorageChange, store } from "@/lib/storage";
import type {
  DailyLog,
  FocusState,
  Task,
  TaskList,
  UserPrefs,
  WallpaperCache,
} from "@/types";
import { DEFAULT_LISTS } from "@/lib/storage";

export interface MomentState {
  prefs: UserPrefs;
  tasks: Task[];
  lists: TaskList[];
  wallpaper: WallpaperCache | null;
  focus: FocusState;
  dailyLogs: DailyLog[];
  ready: boolean;
}

const INITIAL: MomentState = {
  prefs: DEFAULT_PREFS,
  tasks: [],
  lists: DEFAULT_LISTS,
  wallpaper: null,
  focus: { active: false },
  dailyLogs: [],
  ready: false,
};

export function useMoment(): MomentState & { reload: () => Promise<void> } {
  const [state, setState] = useState<MomentState>(INITIAL);

  const reload = useCallback(async () => {
    const [prefs, tasks, lists, wallpaper, focus, dailyLogs] = await Promise.all(
      [
        store.getPrefs(),
        store.getTasks(),
        store.getLists(),
        store.getWallpaper(),
        store.getFocus(),
        store.getDailyLogs(),
      ]
    );
    setState({
      prefs,
      tasks,
      lists,
      wallpaper,
      focus,
      dailyLogs,
      ready: true,
    });
  }, []);

  useEffect(() => {
    void reload();
    const off = onStorageChange(
      ["prefs", "tasks", "lists", "wallpaper", "focus", "dailyLogs"],
      () => void reload()
    );
    return off;
  }, [reload]);

  return { ...state, reload };
}

export function useTicker(ms = 1000): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const align = 1000 - (Date.now() % 1000);
    const t1 = setTimeout(() => {
      setNow(new Date());
      const iv = setInterval(() => setNow(new Date()), ms);
      (t1 as unknown as { _iv?: ReturnType<typeof setInterval> })._iv = iv;
    }, align);
    return () => {
      clearTimeout(t1);
      const iv = (t1 as unknown as { _iv?: ReturnType<typeof setInterval> })._iv;
      if (iv) clearInterval(iv);
    };
  }, [ms]);
  return now;
}
