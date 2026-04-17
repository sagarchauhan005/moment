export type TaskSource = "local" | "linear" | "trello" | "asana";

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
  trelloApiKey?: string;
  trelloToken?: string;
  asanaToken?: string;
  links: QuickLink[];
  searchEngine: "google" | "duckduckgo" | "bing";
  activeListId: string;
  units: "metric" | "imperial";
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
