export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatTime(d: Date, use24h = false): string {
  if (use24h) {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad(h12)}:${pad(d.getMinutes())}`;
}

export function formatTimeInZone(tz: string, use24h = false): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: !use24h,
    timeZone: tz,
  }).format(new Date());
  return parts;
}

export function dayGreeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function ageInDays(createdAt: number, now = Date.now()): number {
  return Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
}
