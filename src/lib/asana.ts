const BASE = "https://app.asana.com/api/1.0";

async function asanaThrow(res: Response, path: string): Promise<never> {
  let detail = "";
  try {
    const body = await res.json();
    detail = body?.errors?.[0]?.message ?? JSON.stringify(body);
  } catch { /* ignore parse errors */ }
  throw new Error(`Asana ${res.status} ${path}${detail ? `: ${detail}` : ""}`);
}

async function asanaGet(token: string, path: string, params?: Record<string, string>) {
  const url = new URL(`${BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) await asanaThrow(res, path);
  return res.json();
}

async function asanaPost(token: string, path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ data: body }),
  });
  if (!res.ok) await asanaThrow(res, path);
  return res.json();
}

async function asanaPut(token: string, path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ data: body }),
  });
  if (!res.ok) await asanaThrow(res, path);
}

async function asanaDelete(token: string, path: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) await asanaThrow(res, path);
}

/** Shape returned by fetchMyAssignedTasks — minimal fields for 2-way sync */
export interface AsanaRemoteTask {
  gid: string;
  name: string;
  completed: boolean;
  /** ISO-8601 string from Asana, e.g. "2024-05-01T10:00:00.000Z" */
  modified_at: string;
}

/**
 * Fetch ALL incomplete tasks assigned to the current user across every Asana
 * project, plus tasks completed in the last 7 days (so completions from any
 * device are reflected locally).
 *
 * We do NOT scope to a single "Flow" project — the goal is to surface every
 * task the user owns in Asana, regardless of which project it lives in.
 */
export async function fetchMyAssignedTasks(token: string): Promise<AsanaRemoteTask[]> {
  const workspace = await getWorkspace(token);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Incomplete tasks assigned to me
  const incompleteRes = await asanaGet(token, "/tasks", {
    assignee: "me",
    workspace,
    opt_fields: "gid,name,completed,modified_at",
    completed_since: "now", // Asana: return tasks not yet completed
    limit: "100",
  });

  // Tasks completed in the last 7 days assigned to me (so we can mark them done locally)
  const completedRes = await asanaGet(token, "/tasks", {
    assignee: "me",
    workspace,
    opt_fields: "gid,name,completed,modified_at",
    completed_since: sevenDaysAgo,
    limit: "100",
  });

  // De-duplicate by gid (the two calls can overlap on the boundary)
  const all = new Map<string, AsanaRemoteTask>();
  for (const t of [...(incompleteRes.data ?? []), ...(completedRes.data ?? [])]) {
    all.set(t.gid, t as AsanaRemoteTask);
  }
  return Array.from(all.values());
}

/** @deprecated Use fetchMyAssignedTasks — kept for backwards-compat until callers are updated */
export async function fetchFlowTasks(
  token: string,
  _projectGid: string
): Promise<AsanaRemoteTask[]> {
  return fetchMyAssignedTasks(token);
}

export async function testAsanaToken(token: string): Promise<{ name: string; email: string }> {
  const me = await asanaGet(token, "/users/me", { opt_fields: "name,email" });
  return { name: me.data?.name ?? "Unknown", email: me.data?.email ?? "" };
}

async function getWorkspace(token: string): Promise<string> {
  const me = await asanaGet(token, "/users/me", { opt_fields: "workspaces.gid" });
  const gid: string | undefined = me.data?.workspaces?.[0]?.gid;
  if (!gid) throw new Error("No Asana workspace found");
  return gid;
}

export async function ensureFlowProject(token: string): Promise<string> {
  const workspace = await getWorkspace(token);

  // Search for existing project named "Flow"
  const list = await asanaGet(token, `/workspaces/${workspace}/projects`, {
    opt_fields: "gid,name",
    limit: "100",
  });
  const existing = (list.data as { gid: string; name: string }[]).find(
    (p) => p.name === "Flow"
  );
  if (existing) return existing.gid;

  // Create it
  const created = await asanaPost(token, "/projects", {
    name: "Flow",
    workspace,
    color: "light-purple",
    default_view: "list",
  });
  return created.data.gid as string;
}

export async function createAsanaFlowTask(
  token: string,
  projectGid: string,
  title: string
): Promise<string> {
  const res = await asanaPost(token, "/tasks", {
    name: title,
    projects: [projectGid],
    assignee: "me",
  });
  return res.data.gid as string;
}

export async function completeAsanaTask(token: string, taskGid: string): Promise<void> {
  await asanaPut(token, `/tasks/${taskGid}`, { completed: true });
}

export async function deleteAsanaTask(token: string, taskGid: string): Promise<void> {
  await asanaDelete(token, `/tasks/${taskGid}`);
}

export async function renameAsanaTask(token: string, taskGid: string, name: string): Promise<void> {
  await asanaPut(token, `/tasks/${taskGid}`, { name });
}
