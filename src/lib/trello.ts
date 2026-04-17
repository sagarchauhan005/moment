import type { Task } from "@/types";

interface TrelloCard {
  id: string;
  name: string;
  url: string;
  due: string | null;
  dueComplete: boolean;
  dateLastActivity: string;
  closed: boolean;
  idBoard: string;
}

export async function fetchMyTrelloCards(
  apiKey: string,
  token: string
): Promise<Task[]> {
  const url = new URL("https://api.trello.com/1/members/me/cards");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("token", token);
  url.searchParams.set("filter", "open");
  url.searchParams.set(
    "fields",
    "name,url,due,dueComplete,dateLastActivity,closed,idBoard"
  );

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Trello ${res.status}`);
  const cards = (await res.json()) as TrelloCard[];

  return cards
    .filter((c) => !c.closed)
    .map<Task>((c) => ({
      id: `trello:${c.id}`,
      externalId: c.id,
      title: c.name,
      completed: !!c.dueComplete,
      completedAt: c.dueComplete ? new Date(c.dateLastActivity).getTime() : undefined,
      createdAt: new Date(c.dateLastActivity).getTime(),
      dueAt: c.due ? new Date(c.due).getTime() : undefined,
      source: "trello",
      listId: "trello",
    }));
}

export async function completeTrelloCard(
  apiKey: string,
  token: string,
  cardId: string
): Promise<void> {
  const url = new URL(`https://api.trello.com/1/cards/${cardId}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("token", token);
  url.searchParams.set("dueComplete", "true");
  const res = await fetch(url.toString(), { method: "PUT" });
  if (!res.ok) throw new Error(`Trello ${res.status}`);
}
