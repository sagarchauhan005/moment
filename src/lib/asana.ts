import type { Task } from "@/types";

interface AsanaTask {
  gid: string;
  name: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  due_on: string | null;
  permalink_url?: string;
}

export async function fetchMyAsanaTasks(token: string): Promise<Task[]> {
  // Step 1: resolve the default workspace for this user.
  const meRes = await fetch("https://app.asana.com/api/1.0/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meRes.ok) throw new Error(`Asana auth ${meRes.status}`);
  const me = await meRes.json();
  const workspace: string | undefined = me.data?.workspaces?.[0]?.gid;
  if (!workspace) throw new Error("No Asana workspace found");

  // Step 2: fetch assigned, incomplete tasks in that workspace.
  const url = new URL("https://app.asana.com/api/1.0/tasks");
  url.searchParams.set("assignee", "me");
  url.searchParams.set("workspace", workspace);
  url.searchParams.set("completed_since", "now"); // only incomplete
  url.searchParams.set("limit", "50");
  url.searchParams.set(
    "opt_fields",
    "name,completed,completed_at,created_at,due_on,permalink_url"
  );

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Asana ${res.status}`);
  const data = await res.json();
  const tasks = (data.data ?? []) as AsanaTask[];

  return tasks.map<Task>((t) => ({
    id: `asana:${t.gid}`,
    externalId: t.gid,
    title: t.name,
    completed: !!t.completed,
    completedAt: t.completed_at ? new Date(t.completed_at).getTime() : undefined,
    createdAt: new Date(t.created_at).getTime(),
    dueAt: t.due_on ? new Date(t.due_on + "T00:00:00").getTime() : undefined,
    source: "asana",
    listId: "asana",
  }));
}

export async function completeAsanaTask(
  token: string,
  taskGid: string
): Promise<void> {
  const res = await fetch(`https://app.asana.com/api/1.0/tasks/${taskGid}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: { completed: true } }),
  });
  if (!res.ok) throw new Error(`Asana ${res.status}`);
}
