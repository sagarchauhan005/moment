import type { Task } from "@/types";

const ENDPOINT = "https://api.linear.app/graphql";

interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  completedAt: string | null;
  createdAt: string;
  dueDate: string | null;
  state: { name: string; type: string };
}

export async function fetchMyLinearIssues(apiKey: string): Promise<Task[]> {
  const query = `
    query MyIssues {
      viewer {
        assignedIssues(
          first: 50,
          filter: { state: { type: { nin: ["completed", "canceled"] } } }
        ) {
          nodes {
            id
            identifier
            title
            completedAt
            createdAt
            dueDate
            state { name type }
          }
        }
      }
    }
  `;
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Linear ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? "Linear error");
  const nodes: LinearIssue[] =
    json.data?.viewer?.assignedIssues?.nodes ?? [];

  return nodes.map<Task>((n) => ({
    id: `linear:${n.id}`,
    externalId: n.id,
    title: `${n.identifier} · ${n.title}`,
    completed: !!n.completedAt,
    completedAt: n.completedAt ? new Date(n.completedAt).getTime() : undefined,
    createdAt: new Date(n.createdAt).getTime(),
    dueAt: n.dueDate ? new Date(n.dueDate).getTime() : undefined,
    source: "linear",
    listId: "linear",
  }));
}

export async function completeLinearIssue(
  apiKey: string,
  issueId: string
): Promise<void> {
  const stateQ = `
    query IssueWithStates($id: String!) {
      issue(id: $id) {
        team {
          states(filter: { type: { eq: "completed" } }) {
            nodes { id name type }
          }
        }
      }
    }
  `;
  const stateRes = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query: stateQ, variables: { id: issueId } }),
  });
  const stateJson = await stateRes.json();
  const doneId: string | undefined =
    stateJson.data?.issue?.team?.states?.nodes?.[0]?.id;
  if (!doneId) throw new Error("No completed state found for team");

  const mutation = `
    mutation Complete($issueId: String!, $stateId: String!) {
      issueUpdate(id: $issueId, input: { stateId: $stateId }) { success }
    }
  `;
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query: mutation,
      variables: { issueId, stateId: doneId },
    }),
  });
  if (!res.ok) throw new Error(`Linear ${res.status}`);
}
