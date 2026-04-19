import { store } from "./storage";
import { todayISO } from "./time";
import type { Task } from "@/types";

export function makeTask(title: string, listId: string): Task {
  return {
    id: `t_${crypto.randomUUID()}`,
    title: title.trim(),
    completed: false,
    createdAt: Date.now(),
    source: "local",
    listId,
  };
}

export async function addTask(title: string, listId: string): Promise<Task> {
  const tasks = await store.getTasks();
  const task = makeTask(title, listId);
  await store.setTasks([task, ...tasks]);
  return task;
}

export async function toggleTask(id: string): Promise<Task | null> {
  const tasks = await store.getTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const prev = tasks[idx];
  const next: Task = prev.completed
    ? { ...prev, completed: false, completedAt: undefined }
    : { ...prev, completed: true, completedAt: Date.now() };
  tasks[idx] = next;
  await store.setTasks(tasks);
  await store.appendDailyMetric(todayISO(), {
    tasksCompleted: next.completed ? 1 : -1,
  });
  // If checking off a remote task, push completion upstream.
  if (next.completed && next.source !== "local" && next.externalId) {
    void chrome.runtime
      .sendMessage({
        type: "remote-complete",
        source: next.source,
        externalId: next.externalId,
      })
      .catch(() => null);
  }
  return next;
}

export async function deleteTask(id: string): Promise<void> {
  const tasks = await store.getTasks();
  await store.setTasks(tasks.filter((t) => t.id !== id));
}

export async function renameTask(id: string, title: string): Promise<void> {
  const tasks = await store.getTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return;
  tasks[idx] = { ...tasks[idx], title: title.trim() };
  await store.setTasks(tasks);
}

export async function patchTask(id: string, patch: Partial<Task>): Promise<void> {
  const tasks = await store.getTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return;
  tasks[idx] = { ...tasks[idx], ...patch };
  await store.setTasks(tasks);
}

export async function reorderTasks(orderedIds: string[]): Promise<void> {
  const tasks = await store.getTasks();
  const idxMap = new Map(orderedIds.map((id, i) => [id, i]));
  await store.setTasks(tasks.map((t) => idxMap.has(t.id) ? { ...t, sortOrder: idxMap.get(t.id)! } : t));
}

export function tasksForList(tasks: Task[], listId: string): Task[] {
  if (listId === "completed") return tasks.filter((t) => t.completed);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();

  if (listId === "today") {
    const today = todayISO();
    return tasks.filter((t) => {
      if (t.listId === "today" && !t.completed) return true;
      if (!t.completed && t.dueAt && todayISO(new Date(t.dueAt)) === today) return true;
      if (t.completed && t.completedAt && t.completedAt >= todayMs) return true;
      return false;
    });
  }

  return tasks.filter((t) => {
    if (t.listId !== listId) return false;
    // hide tasks completed before today — they live in the Completed view
    if (t.completed && (!t.completedAt || t.completedAt < todayMs)) return false;
    return true;
  });
}
