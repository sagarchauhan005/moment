import { store } from "@/lib/storage";
import { endFocus } from "@/lib/focus";
import { ensureDailyWallpaper } from "@/lib/unsplash";
import {
  completeLinearIssue,
  createLinearFlowIssue,
  ensureFlowProject as ensureLinearFlowProject,
} from "@/lib/linear";
import {
  completeAsanaTask,
  createAsanaFlowTask,
  ensureFlowProject as ensureAsanaFlowProject,
} from "@/lib/asana";
import type { TaskSource } from "@/types";

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

  // Push a locally-created Flow task to connected external tools.
  if (type === "push-flow-task") {
    (async () => {
      const { taskId, title } = msg as { taskId: string; title: string };
      try {
        const prefs = await store.getPrefs();
        let externalId: string | undefined;
        let source: TaskSource | undefined;

        if (prefs.asanaToken && prefs.asanaFlowProjectGid) {
          externalId = await createAsanaFlowTask(
            prefs.asanaToken,
            prefs.asanaFlowProjectGid,
            title
          );
          source = "asana";
        } else if (prefs.linearApiKey && prefs.linearFlowProjectId) {
          // Retrieve team id from project (stored alongside projectId as "pid|tid")
          const [projectId, teamId] = prefs.linearFlowProjectId.split("|");
          externalId = await createLinearFlowIssue(
            prefs.linearApiKey,
            projectId,
            teamId,
            title
          );
          source = "linear";
        }

        if (externalId && source) {
          // Update the local task with its external reference.
          const tasks = await store.getTasks();
          const idx = tasks.findIndex((t) => t.id === taskId);
          if (idx !== -1) {
            tasks[idx] = { ...tasks[idx], externalId, source };
            await store.setTasks(tasks);
          }
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
  pushed: number;
  errors: string[];
}

async function syncAllRemote(): Promise<SyncSummary> {
  const prefs = await store.getPrefs();
  const summary: SyncSummary = { pushed: 0, errors: [] };

  // Ensure Flow projects exist in connected tools on first sync.
  if (prefs.asanaToken && !prefs.asanaFlowProjectGid) {
    try {
      const gid = await ensureAsanaFlowProject(prefs.asanaToken);
      await store.patchPrefs({ asanaFlowProjectGid: gid });
      prefs.asanaFlowProjectGid = gid;
    } catch (e) {
      summary.errors.push(`Asana setup: ${(e as Error).message}`);
    }
  }

  if (prefs.linearApiKey && !prefs.linearFlowProjectId) {
    try {
      const { projectId, teamId } = await ensureLinearFlowProject(prefs.linearApiKey);
      await store.patchPrefs({ linearFlowProjectId: `${projectId}|${teamId}` });
      prefs.linearFlowProjectId = `${projectId}|${teamId}`;
    } catch (e) {
      summary.errors.push(`Linear setup: ${(e as Error).message}`);
    }
  }

  // Push any local tasks that haven't been synced to an external tool yet.
  const tasks = await store.getTasks();
  const unsynced = tasks.filter(
    (t) => t.source === "local" && !t.externalId && !t.completed
  );

  if (unsynced.length === 0) return summary;

  const updated = [...tasks];
  for (const task of unsynced) {
    try {
      let externalId: string | undefined;
      let source: TaskSource | undefined;

      if (prefs.asanaToken && prefs.asanaFlowProjectGid) {
        externalId = await createAsanaFlowTask(
          prefs.asanaToken,
          prefs.asanaFlowProjectGid,
          task.title
        );
        source = "asana";
      } else if (prefs.linearApiKey && prefs.linearFlowProjectId) {
        const [projectId, teamId] = prefs.linearFlowProjectId.split("|");
        externalId = await createLinearFlowIssue(
          prefs.linearApiKey,
          projectId,
          teamId,
          task.title
        );
        source = "linear";
      }

      if (externalId && source) {
        const idx = updated.findIndex((t) => t.id === task.id);
        if (idx !== -1) updated[idx] = { ...updated[idx], externalId, source };
        summary.pushed++;
      }
    } catch (e) {
      summary.errors.push(`Push "${task.title}": ${(e as Error).message}`);
    }
  }

  if (summary.pushed > 0) await store.setTasks(updated);
  return summary;
}
