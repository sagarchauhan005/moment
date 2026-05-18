const ENDPOINT = "https://api.linear.app/graphql";

async function gql(apiKey: string, query: string, variables?: Record<string, unknown>) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Linear ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? "Linear error");
  return json;
}

/** Minimal shape returned by fetchFlowIssues */
export interface LinearRemoteIssue {
  id: string;
  title: string;
  /** true when the issue's state type is "completed" or "cancelled" */
  completed: boolean;
  /** ISO-8601 string, e.g. "2024-05-01T10:00:00.000Z" */
  updatedAt: string;
}

/**
 * Fetch all issues in the given Linear project that are not cancelled,
 * plus recently completed ones (last 7 days).
 */
export async function fetchFlowIssues(
  apiKey: string,
  projectId: string
): Promise<LinearRemoteIssue[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const res = await gql(apiKey, `
    query FetchFlowIssues($projectId: String!, $updatedAfter: DateTime!) {
      project(id: $projectId) {
        issues(
          first: 200
          filter: {
            or: [
              { state: { type: { nin: ["cancelled"] } } }
              { updatedAt: { gte: $updatedAfter } }
            ]
          }
        ) {
          nodes {
            id
            title
            updatedAt
            state { type }
          }
        }
      }
    }
  `, { projectId, updatedAfter: sevenDaysAgo });

  const nodes = res.data?.project?.issues?.nodes ?? [];
  return (nodes as { id: string; title: string; updatedAt: string; state: { type: string } }[])
    .map((n) => ({
      id: n.id,
      title: n.title,
      updatedAt: n.updatedAt,
      completed: n.state.type === "completed" || n.state.type === "cancelled",
    }));
}

export async function ensureFlowProject(apiKey: string): Promise<{ projectId: string; teamId: string }> {
  // Check for existing "Flow" project
  const findRes = await gql(apiKey, `
    query {
      projects(filter: { name: { eq: "Flow" } }, first: 1) {
        nodes { id teams { nodes { id } } }
      }
    }
  `);
  const existing = findRes.data?.projects?.nodes?.[0];
  if (existing) {
    return { projectId: existing.id as string, teamId: existing.teams.nodes[0]?.id as string };
  }

  // Get first team the viewer belongs to
  const teamRes = await gql(apiKey, `
    query {
      viewer {
        teamMemberships(first: 1) { nodes { team { id } } }
      }
    }
  `);
  const teamId: string | undefined =
    teamRes.data?.viewer?.teamMemberships?.nodes?.[0]?.team?.id;
  if (!teamId) throw new Error("No Linear team found");

  // Create "Flow" project
  const createRes = await gql(apiKey, `
    mutation CreateFlow($name: String!, $teamId: String!) {
      projectCreate(input: { name: $name, teamIds: [$teamId], state: "started", color: "#6366f1" }) {
        success
        project { id }
      }
    }
  `, { name: "Flow", teamId });
  const projectId: string = createRes.data?.projectCreate?.project?.id;
  if (!projectId) throw new Error("Failed to create Linear Flow project");
  return { projectId, teamId };
}

export async function createLinearFlowIssue(
  apiKey: string,
  projectId: string,
  teamId: string,
  title: string
): Promise<string> {
  const res = await gql(apiKey, `
    mutation CreateIssue($title: String!, $projectId: String!, $teamId: String!) {
      issueCreate(input: { title: $title, projectId: $projectId, teamId: $teamId }) {
        success
        issue { id }
      }
    }
  `, { title, projectId, teamId });
  const id: string = res.data?.issueCreate?.issue?.id;
  if (!id) throw new Error("Failed to create Linear issue");
  return id;
}

export async function deleteLinearIssue(apiKey: string, issueId: string): Promise<void> {
  await gql(apiKey, `
    mutation DeleteIssue($issueId: String!) {
      issueDelete(id: $issueId) { success }
    }
  `, { issueId });
}

export async function renameLinearIssue(apiKey: string, issueId: string, title: string): Promise<void> {
  await gql(apiKey, `
    mutation RenameIssue($issueId: String!, $title: String!) {
      issueUpdate(id: $issueId, input: { title: $title }) { success }
    }
  `, { issueId, title });
}

export async function completeLinearIssue(apiKey: string, issueId: string): Promise<void> {
  const stateRes = await gql(apiKey, `
    query IssueWithStates($id: String!) {
      issue(id: $id) {
        team {
          states(filter: { type: { eq: "completed" } }) {
            nodes { id }
          }
        }
      }
    }
  `, { id: issueId });
  const doneId: string | undefined =
    stateRes.data?.issue?.team?.states?.nodes?.[0]?.id;
  if (!doneId) throw new Error("No completed state found for team");

  await gql(apiKey, `
    mutation Complete($issueId: String!, $stateId: String!) {
      issueUpdate(id: $issueId, input: { stateId: $stateId }) { success }
    }
  `, { issueId, stateId: doneId });
}
