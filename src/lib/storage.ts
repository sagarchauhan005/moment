import type {
  DailyLog,
  FocusState,
  Task,
  TaskList,
  UserPrefs,
  WallpaperCache,
} from "@/types";

// Top-level keys kept flat so chrome.storage.onChanged listeners can target them.
export const KEYS = {
  prefs: "prefs",
  tasks: "tasks",
  lists: "lists",
  wallpaper: "wallpaper",
  focus: "focus",
  dailyLogs: "dailyLogs",
  focusSessions: "focusSessions",
} as const;

export const DEFAULT_PREFS: UserPrefs = {
  name: "",
  focusSites: [
    "twitter.com",
    "x.com",
    "instagram.com",
    "facebook.com",
    "reddit.com",
    "youtube.com",
    "tiktok.com",
    "linkedin.com",
  ],
  worldClockCities: [
    { id: "sf", label: "San Francisco", timezone: "America/Los_Angeles" },
    { id: "ny", label: "New York", timezone: "America/New_York" },
    { id: "ldn", label: "London", timezone: "Europe/London" },
    { id: "tok", label: "Tokyo", timezone: "Asia/Tokyo" },
  ],
  links: [
    { id: "l1", title: "Gmail", url: "https://mail.google.com" },
    { id: "l2", title: "Calendar", url: "https://calendar.google.com" },
    { id: "l3", title: "GitHub", url: "https://github.com" },
    { id: "l4", title: "Linear", url: "https://linear.app" },
  ],
  searchEngine: "google",
  activeListId: "inbox",
  units: "metric",
};

export const DEFAULT_LISTS: TaskList[] = [
  { id: "inbox", name: "Task Inbox", source: "local" },
  { id: "today", name: "Today", source: "local" },
];

type StoreShape = {
  [KEYS.prefs]: UserPrefs;
  [KEYS.tasks]: Task[];
  [KEYS.lists]: TaskList[];
  [KEYS.wallpaper]: WallpaperCache | null;
  [KEYS.focus]: FocusState;
  [KEYS.dailyLogs]: DailyLog[];
};

type StoreKey = keyof StoreShape;

async function get<K extends StoreKey>(
  key: K,
  fallback: StoreShape[K]
): Promise<StoreShape[K]> {
  const result = await chrome.storage.local.get(key);
  const value = result[key];
  return (value ?? fallback) as StoreShape[K];
}

async function set<K extends StoreKey>(
  key: K,
  value: StoreShape[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export const store = {
  async getPrefs(): Promise<UserPrefs> {
    const prefs = await get(KEYS.prefs, DEFAULT_PREFS);
    return { ...DEFAULT_PREFS, ...prefs };
  },
  async setPrefs(prefs: UserPrefs): Promise<void> {
    await set(KEYS.prefs, prefs);
  },
  async patchPrefs(partial: Partial<UserPrefs>): Promise<UserPrefs> {
    const prev = await store.getPrefs();
    const next = { ...prev, ...partial };
    await set(KEYS.prefs, next);
    return next;
  },

  async getTasks(): Promise<Task[]> {
    return get(KEYS.tasks, []);
  },
  async setTasks(tasks: Task[]): Promise<void> {
    await set(KEYS.tasks, tasks);
  },

  async getLists(): Promise<TaskList[]> {
    const lists = await get(KEYS.lists, DEFAULT_LISTS);
    if (!lists.length) return DEFAULT_LISTS;
    return lists;
  },
  async setLists(lists: TaskList[]): Promise<void> {
    await set(KEYS.lists, lists);
  },

  async getWallpaper(): Promise<WallpaperCache | null> {
    return get(KEYS.wallpaper, null);
  },
  async setWallpaper(w: WallpaperCache | null): Promise<void> {
    await set(KEYS.wallpaper, w);
  },

  async getFocus(): Promise<FocusState> {
    return get(KEYS.focus, { active: false });
  },
  async setFocus(f: FocusState): Promise<void> {
    await set(KEYS.focus, f);
  },

  async getDailyLogs(): Promise<DailyLog[]> {
    return get(KEYS.dailyLogs, []);
  },
  async setDailyLogs(logs: DailyLog[]): Promise<void> {
    await set(KEYS.dailyLogs, logs);
  },
  async appendDailyMetric(
    date: string,
    patch: Partial<Omit<DailyLog, "date">>
  ): Promise<void> {
    const logs = await store.getDailyLogs();
    const idx = logs.findIndex((l) => l.date === date);
    if (idx === -1) {
      logs.push({
        date,
        tasksCompleted: patch.tasksCompleted ?? 0,
        focusMinutes: patch.focusMinutes ?? 0,
      });
    } else {
      logs[idx] = {
        ...logs[idx],
        tasksCompleted: logs[idx].tasksCompleted + (patch.tasksCompleted ?? 0),
        focusMinutes: logs[idx].focusMinutes + (patch.focusMinutes ?? 0),
      };
    }
    await store.setDailyLogs(logs);
  },
};

export function onStorageChange(
  keys: StoreKey[],
  handler: () => void
): () => void {
  const listener = (
    changes: { [k: string]: chrome.storage.StorageChange },
    area: chrome.storage.AreaName
  ) => {
    if (area !== "local") return;
    if (keys.some((k) => k in changes)) handler();
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
