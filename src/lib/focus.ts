import { store } from "./storage";
import type { FocusSession } from "@/types";

export function normalizeSite(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

export function hostnameMatches(hostname: string, sites: string[]): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return sites.some((s) => {
    const site = normalizeSite(s);
    return host === site || host.endsWith(`.${site}`);
  });
}

export async function startFocus(durationMin: number): Promise<FocusSession> {
  const prefs = await store.getPrefs();
  const now = Date.now();
  const session: FocusSession = {
    id: `focus_${now}`,
    startedAt: now,
    endsAt: now + durationMin * 60_000,
    durationMin,
    sites: [...prefs.focusSites],
  };
  await store.setFocus({ active: true, session });
  await chrome.alarms.create("focus-end", { when: session.endsAt });
  return session;
}

export async function endFocus(cancelled = false): Promise<void> {
  const state = await store.getFocus();
  await chrome.alarms.clear("focus-end");
  if (!state.session) {
    await store.setFocus({ active: false });
    return;
  }
  const now = Date.now();
  const session: FocusSession = {
    ...state.session,
    completedAt: now,
    cancelled,
  };
  await store.setFocus({ active: false, session });
}
