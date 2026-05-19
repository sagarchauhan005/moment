import { store } from "@/lib/storage";
import { endFocus } from "@/lib/focus";
import { ensureDailyWallpaper } from "@/lib/unsplash";
import {
  completeLinearIssue,
  createLinearFlowIssue,
  deleteLinearIssue,
  ensureFlowProject as ensureLinearFlowProject,
  fetchFlowIssues,
  renameLinearIssue,
} from "@/lib/linear";
import {
  completeAsanaTask,
  createAsanaFlowTask,
  deleteAsanaTask,
  ensureFlowProject as ensureAsanaFlowProject,
  fetchFlowTasks,
  renameAsanaTask,
} from "@/lib/asana";
import type { Task, TaskSource } from "@/types";

// --- Lifecycle --------------------------------------------------------

// Clicking the toolbar icon opens the options/settings page.
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDailyWallpaper().catch(() => null);
  await chrome.alarms.create("daily-rollover", { periodInMinutes: 60 });
  await chrome.alarms.create("remote-sync", { periodInMinutes: 15 });
  // Trigger sync immediately on install/update so pulled tasks appear right away
  await syncAllRemote().catch(() => null);
});

chrome.runtime.onStartup?.addListener(async () => {
  await ensureDailyWallpaper().catch(() => null);
  await syncAllRemote().catch(() => null);
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

  if (type === "remote-delete") {
    (async () => {
      const { source, externalId } = msg as { source: TaskSource; externalId: string };
      try {
        const prefs = await store.getPrefs();
        if (source === "linear" && prefs.linearApiKey) {
          await deleteLinearIssue(prefs.linearApiKey, externalId);
        } else if (source === "asana" && prefs.asanaToken) {
          await deleteAsanaTask(prefs.asanaToken, externalId);
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: (e as Error).message });
      }
    })();
    return true;
  }

  if (type === "remote-rename") {
    (async () => {
      const { source, externalId, title } = msg as {
        source: TaskSource;
        externalId: string;
        title: string;
      };
      try {
        const prefs = await store.getPrefs();
        if (source === "linear" && prefs.linearApiKey) {
          await renameLinearIssue(prefs.linearApiKey, externalId, title);
        } else if (source === "asana" && prefs.asanaToken) {
          await renameAsanaTask(prefs.asanaToken, externalId, title);
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: (e as Error).message });
      }
    })();
    return true;
  }

  // Diagnostic: raw state snapshot without modifying anything.
  if (type === "remote-diagnose") {
    (async () => {
      try {
        const prefs = await store.getPrefs();
        const tasks = await store.getTasks();
        const syncMeta = await store.getSyncMeta();
        const result: Record<string, unknown> = {
          asanaConfigured: !!prefs.asanaToken,
          asanaProjectGid: prefs.asanaFlowProjectGid ?? null,
          linearConfigured: !!prefs.linearApiKey,
          linearProjectId: prefs.linearFlowProjectId ?? null,
          localTaskCount: tasks.length,
          localAsanaTaskCount: tasks.filter((t) => t.source === "asana").length,
          localLinearTaskCount: tasks.filter((t) => t.source === "linear").length,
          lastSyncAt: syncMeta?.lastSyncAt
            ? new Date(syncMeta.lastSyncAt).toISOString()
            : null,
          lastSyncError: syncMeta?.lastError ?? null,
        };

        // Try fetching from Asana
        if (prefs.asanaToken && prefs.asanaFlowProjectGid) {
          try {
            const remote = await fetchFlowTasks(prefs.asanaToken, prefs.asanaFlowProjectGid);
            result.asanaRemoteTaskCount = remote.length;
            result.asanaSampleTasks = remote.slice(0, 5).map((t) => ({
              gid: t.gid,
              name: t.name,
              completed: t.completed,
            }));
          } catch (e) {
            result.asanaFetchError = (e as Error).message;
          }
        }

        sendResponse({ ok: true, result });
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
  pulled: number;
  errors: string[];
}

async function syncAllRemote(): Promise<SyncSummary> {
  const prefs = await store.getPrefs();
  const summary: SyncSummary = { pushed: 0, pulled: 0, errors: [] };
  const syncStartedAt = Date.now();

  // ── 1. Ensure Flow projects exist in connected tools on first sync ──────

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

  // ── 1b. One-time migration: fix tasks imported with listId:"flow" ──────────
  //   v0.1.6 imported remote tasks into the "flow" list instead of "inbox".
  //   Migrate them now so they appear in Task Inbox.
  {
    const allTasks = await store.getTasks();
    const migrated = allTasks.map((t) =>
      (t.source === "asana" || t.source === "linear") && t.listId === "flow"
        ? { ...t, listId: "inbox" as const }
        : t
    );
    const needsMigration = migrated.some((t, i) => t.listId !== allTasks[i].listId);
    if (needsMigration) await store.setTasks(migrated);
  }

  // ── 2. PULL: fetch remote tasks and reconcile with local storage ────────

  let tasks = await store.getTasks();
  const prevSyncAt = (await store.getSyncMeta())?.lastSyncAt ?? 0;

  // Helper: parse an ISO date string → epoch ms (0 if invalid)
  const toMs = (iso: string | undefined): number => {
    if (!iso) return 0;
    const ms = Date.parse(iso);
    return isNaN(ms) ? 0 : ms;
  };

  // ── 2a. Pull from Asana ──────────────────────────────────────────────────
  //   Scoped to the connected Flow project (by stored GID).
  //   Any task added to that project from any device / tool will be pulled.
  if (prefs.asanaToken && prefs.asanaFlowProjectGid) {
    try {
      const remote = await fetchFlowTasks(prefs.asanaToken, prefs.asanaFlowProjectGid);
      const remoteIds = new Set(remote.map((r) => r.gid));

      for (const remoteTask of remote) {
        // Skip tasks with no meaningful title
        if (!remoteTask.name?.trim()) continue;

        const remoteMs = toMs(remoteTask.modified_at);
        const localIdx = tasks.findIndex(
          (t) => t.externalId === remoteTask.gid && t.source === "asana"
        );

        if (localIdx === -1) {
          // New task on Asana not seen locally → import into Task Inbox
          const newTask: Task = {
            id: `t_${crypto.randomUUID()}`,
            title: remoteTask.name.trim(),
            completed: remoteTask.completed,
            completedAt: remoteTask.completed ? remoteMs : undefined,
            createdAt: remoteMs || Date.now(),
            updatedAt: remoteMs || Date.now(),
            source: "asana",
            externalId: remoteTask.gid,
            // Land in Task Inbox so the user sees it immediately
            listId: "inbox",
          };
          tasks = [newTask, ...tasks];
          summary.pulled++;
        } else {
          // Task exists locally — apply Last-Write-Wins
          const local = tasks[localIdx];
          const localMs = local.updatedAt ?? local.createdAt;
          let changed = false;

          if (remoteMs > localMs) {
            // Remote is newer — apply remote changes
            let patch: Partial<Task> = { updatedAt: remoteMs };
            if (local.title !== remoteTask.name.trim()) {
              patch = { ...patch, title: remoteTask.name.trim() };
              changed = true;
            }
            if (!local.completed && remoteTask.completed) {
              patch = { ...patch, completed: true, completedAt: remoteMs };
              changed = true;
            } else if (local.completed && !remoteTask.completed) {
              patch = { ...patch, completed: false, completedAt: undefined };
              changed = true;
            }
            if (changed) {
              tasks[localIdx] = { ...local, ...patch };
              summary.pulled++;
            }
          }
          // else: local is newer — keep local; push will propagate it next cycle
        }
      }

      // Remote deletion: remove local Asana tasks no longer on the remote.
      // Safety guard: only run if remote returned > 0 tasks — an empty response
      // could be a transient API or network issue, not a real "all deleted" state.
      if (remote.length > 0) {
        tasks = tasks.filter((t) => {
          if (t.source !== "asana" || !t.externalId) return true;
          if (remoteIds.has(t.externalId)) return true;
          const localMs = t.updatedAt ?? t.createdAt;
          return localMs > prevSyncAt; // locally modified → keep (will re-push)
        });
      }
    } catch (e) {
      summary.errors.push(`Asana pull: ${(e as Error).message}`);
    }
  }

  // ── 2b. Pull from Linear ─────────────────────────────────────────────────
  if (prefs.linearApiKey && prefs.linearFlowProjectId) {
    try {
      const [projectId] = prefs.linearFlowProjectId.split("|");
      const remote = await fetchFlowIssues(prefs.linearApiKey, projectId);
      const remoteIds = new Set(remote.map((r) => r.id));

      for (const remoteIssue of remote) {
        const remoteMs = toMs(remoteIssue.updatedAt);
        const localIdx = tasks.findIndex(
          (t) => t.externalId === remoteIssue.id && t.source === "linear"
        );

        if (localIdx === -1) {
          // New issue on Linear not in local store → import into Task Inbox
          const newTask: Task = {
            id: `t_${crypto.randomUUID()}`,
            title: remoteIssue.title,
            completed: remoteIssue.completed,
            completedAt: remoteIssue.completed ? remoteMs : undefined,
            createdAt: remoteMs || Date.now(),
            updatedAt: remoteMs || Date.now(),
            source: "linear",
            externalId: remoteIssue.id,
            listId: "inbox",
          };
          tasks = [newTask, ...tasks];
          summary.pulled++;
        } else {
          const local = tasks[localIdx];
          const localMs = local.updatedAt ?? local.createdAt;
          let changed = false;

          if (remoteMs > localMs) {
            let patch: Partial<Task> = { updatedAt: remoteMs };
            if (local.title !== remoteIssue.title) {
              patch = { ...patch, title: remoteIssue.title };
              changed = true;
            }
            if (!local.completed && remoteIssue.completed) {
              patch = { ...patch, completed: true, completedAt: remoteMs };
              changed = true;
            } else if (local.completed && !remoteIssue.completed) {
              patch = { ...patch, completed: false, completedAt: undefined };
              changed = true;
            }
            if (changed) {
              tasks[localIdx] = { ...local, ...patch };
              summary.pulled++;
            }
          }
        }
      }

      // Remote deletion — guarded against empty remote (transient API issue)
      if (remote.length > 0) {
        tasks = tasks.filter((t) => {
          if (t.source !== "linear" || !t.externalId) return true;
          if (remoteIds.has(t.externalId)) return true;
          const localMs = t.updatedAt ?? t.createdAt;
          return localMs > prevSyncAt;
        });
      }
    } catch (e) {
      summary.errors.push(`Linear pull: ${(e as Error).message}`);
    }
  }

  // ── 3. PUSH: local tasks without externalId → create on remote ──────────

  const unsynced = tasks.filter(
    (t) => t.source === "local" && !t.externalId && !t.completed
  );

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
        const idx = tasks.findIndex((t2) => t2.id === task.id);
        if (idx !== -1) tasks[idx] = { ...tasks[idx], externalId, source };
        summary.pushed++;
      }
    } catch (e) {
      summary.errors.push(`Push "${task.title}": ${(e as Error).message}`);
    }
  }

  // ── 4. Persist updated task list + sync metadata ─────────────────────────

  await store.setTasks(tasks);
  await store.setSyncMeta({
    lastSyncAt: syncStartedAt,
    lastPulled: summary.pulled,
    lastPushed: summary.pushed,
    lastError: summary.errors.length ? summary.errors.join("; ") : undefined,
  });

  return summary;
}
