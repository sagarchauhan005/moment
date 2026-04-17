import { store } from "@/lib/storage";
import { endFocus } from "@/lib/focus";
import { ensureDailyWallpaper } from "@/lib/unsplash";
import { completeLinearIssue, fetchMyLinearIssues } from "@/lib/linear";
import { completeTrelloCard, fetchMyTrelloCards } from "@/lib/trello";
import { completeAsanaTask, fetchMyAsanaTasks } from "@/lib/asana";
import type { Task, TaskList, TaskSource } from "@/types";

// --- Lifecycle --------------------------------------------------------

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDailyWallpaper().catch(() => null);
  await chrome.alarms.create("daily-rollover", { periodInMinutes: 60 });
  await chrome.alarms.create("remote-sync", { periodInMinutes: 15 });
});

chrome.runtime.onStartup?.addListener(async () => {
  await ensureDailyWallpaper().catch(() => null);
});

// --- Alarms -----------------------------------------------------------

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "focus-end") {
    await endFocus(false);
    return;
  }
  if (alarm.name === "daily-rollover") {
    await ensureDailyWallpaper().catch(() => null);
    return;
  }
  if (alarm.name === "remote-sync") {
    await syncAllRemote().catch(() => null);
  }
});

// --- Message bus ------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return false;
  const type = (msg as { type?: string }).type;

  if (type === "focus-check") {
    (async () => {
      const focus = await store.getFocus();
      const prefs = await store.getPrefs();
      sendResponse({
        active:
          !!focus.active &&
          !!focus.session &&
          focus.session.endsAt > Date.now(),
        endsAt: focus.session?.endsAt,
        sites: prefs.focusSites,
      });
    })();
    return true;
  }

  if (type === "remote-sync-now") {
    (async () => {
      try {
        const summary = await syncAllRemote();
        sendResponse({ ok: true, summary });
      } catch (e) {
        sendResponse({ ok: false, error: (e as Error).message });
      }
    })();
    return true;
  }

  if (type === "remote-complete") {
    (async () => {
      const { source, externalId } = msg as {
        source: TaskSource;
        externalId: string;
      };
      try {
        const prefs = await store.getPrefs();
        if (source === "linear" && prefs.linearApiKey) {
          await completeLinearIssue(prefs.linearApiKey, externalId);
        } else if (
          source === "trello" &&
          prefs.trelloApiKey &&
          prefs.trelloToken
        ) {
          await completeTrelloCard(
            prefs.trelloApiKey,
            prefs.trelloToken,
            externalId
          );
        } else if (source === "asana" && prefs.asanaToken) {
          await completeAsanaTask(prefs.asanaToken, externalId);
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: (e as Error).message });
      }
    })();
    return true;
  }

  return false;
});

// --- Sync --------------------------------------------------------------

interface SyncSummary {
  linear?: number;
  trello?: number;
  asana?: number;
  errors: string[];
}

async function syncAllRemote(): Promise<SyncSummary> {
  const prefs = await store.getPrefs();
  const summary: SyncSummary = { errors: [] };

  const fetches: Promise<{ source: TaskSource; tasks: Task[] }>[] = [];

  if (prefs.linearApiKey) {
    fetches.push(
      fetchMyLinearIssues(prefs.linearApiKey)
        .then((tasks) => ({ source: "linear" as const, tasks }))
        .catch((e) => {
          summary.errors.push(`Linear: ${(e as Error).message}`);
          return { source: "linear" as const, tasks: [] };
        })
    );
  }
  if (prefs.trelloApiKey && prefs.trelloToken) {
    fetches.push(
      fetchMyTrelloCards(prefs.trelloApiKey, prefs.trelloToken)
        .then((tasks) => ({ source: "trello" as const, tasks }))
        .catch((e) => {
          summary.errors.push(`Trello: ${(e as Error).message}`);
          return { source: "trello" as const, tasks: [] };
        })
    );
  }
  if (prefs.asanaToken) {
    fetches.push(
      fetchMyAsanaTasks(prefs.asanaToken)
        .then((tasks) => ({ source: "asana" as const, tasks }))
        .catch((e) => {
          summary.errors.push(`Asana: ${(e as Error).message}`);
          return { source: "asana" as const, tasks: [] };
        })
    );
  }

  if (fetches.length === 0) return summary;

  const results = await Promise.all(fetches);
  const existing = await store.getTasks();
  const local = existing.filter((t) => t.source === "local");

  // For each remote source we refetched, replace that source's tasks entirely
  // but preserve local-only "completed" toggles via merge on id.
  const existingById = new Map(existing.map((t) => [t.id, t]));
  const syncedSources = new Set(results.map((r) => r.source));
  const preserved = existing.filter(
    (t) => t.source !== "local" && !syncedSources.has(t.source)
  );

  const merged: Task[] = [...local, ...preserved];
  for (const { source, tasks } of results) {
    if (source !== "local") summary[source] = tasks.length;
    for (const t of tasks) {
      const prev = existingById.get(t.id);
      merged.push(prev ? { ...t, completed: t.completed || prev.completed } : t);
    }
  }

  await store.setTasks(merged);

  // Ensure source lists exist.
  const lists = await store.getLists();
  const byId = new Map(lists.map((l) => [l.id, l]));
  const additions: TaskList[] = [];
  if (syncedSources.has("linear") && !byId.has("linear")) {
    additions.push({ id: "linear", name: "Linear", source: "linear" });
  }
  if (syncedSources.has("trello") && !byId.has("trello")) {
    additions.push({ id: "trello", name: "Trello", source: "trello" });
  }
  if (syncedSources.has("asana") && !byId.has("asana")) {
    additions.push({ id: "asana", name: "Asana", source: "asana" });
  }
  if (additions.length) {
    await store.setLists([...lists, ...additions]);
  }

  return summary;
}
