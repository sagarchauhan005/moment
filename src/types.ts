export type TaskSource = "local" | "linear" | "asana";

export interface QuickLink {
  id: string;
  title: string;
  url: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  dueAt?: number;
  source: TaskSource;
  externalId?: string;
  listId: string;
  priority?: "high" | "medium" | "low" | null;
  sortOrder?: number;
}

export interface TaskList {
  id: string;
  name: string;
  source: TaskSource;
  icon?: string;
}

export interface FocusSession {
  id: string;
  startedAt: number;
  endsAt: number;
  durationMin: number;
  completedAt?: number;
  cancelled?: boolean;
  sites: string[];
}

export interface DailyLog {
  // YYYY-MM-DD
  date: string;
  tasksCompleted: number;
  focusMinutes: number;
}

export interface WallpaperCache {
  url: string;
  thumbUrl: string;
  photographer: string;
  photographerUrl: string;
  location?: string;
  fetchedAt: number;
  // YYYY-MM-DD — one wallpaper per day
  forDate: string;
}

export interface UserPrefs {
  name: string;
  onboarded?: boolean;
  mainGoal?: string;
  mainGoalSetAt?: number;
  focusSites: string[];
  worldClockCities: WorldClockCity[];
  unsplashAccessKey?: string;
  linearApiKey?: string;
  linearFlowProjectId?: string;
  asanaToken?: string;
  asanaFlowProjectGid?: string;
  links: QuickLink[];
  searchEngine: "google" | "duckduckgo" | "bing";
  activeListId: string;
  units: "metric" | "imperial";
  uiFont?: string;
  taskInboxOpenedAt?: number | null;
}

export interface WorldClockCity {
  id: string;
  label: string;
  timezone: string; // IANA tz
}

export interface FocusState {
  active: boolean;
  session?: FocusSession;
}
