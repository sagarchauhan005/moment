import { X, BarChart3, CheckCircle2, Clock, Flame, Archive } from "lucide-react";
import { useMemo } from "react";
import { ageInDays, todayISO } from "@/lib/time";
import type { DailyLog, Task } from "@/types";

export function AnalyticsPanel({
  tasks,
  dailyLogs,
  onClose,
}: {
  tasks: Task[];
  dailyLogs: DailyLog[];
  onClose: () => void;
}) {
  const metrics = useMemo(() => computeMetrics(tasks, dailyLogs), [tasks, dailyLogs]);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-sm animate-fade-in">
      <div className="glass w-[720px] max-w-[94vw] p-6 relative animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 icon-btn"
          aria-label="Close"
        >
          <X className="w-[16px] h-[16px]" strokeWidth={1.6} />
        </button>

        <div className="flex items-center gap-2 text-white/95">
          <BarChart3 className="w-[18px] h-[18px]" strokeWidth={1.5} />
          <h2 className="text-[15px] font-medium">Productivity</h2>
        </div>

        <div className="grid grid-cols-4 gap-3 mt-5">
          <MetricCard
            Icon={CheckCircle2}
            label="Completed today"
            value={metrics.completedToday}
          />
          <MetricCard
            Icon={Clock}
            label="Open today"
            value={metrics.openToday}
            sub={`${metrics.openTotal} total`}
          />
          <MetricCard
            Icon={Flame}
            label="Streak"
            value={`${metrics.streakDays}d`}
            sub="days with a completion"
          />
          <MetricCard
            Icon={Archive}
            label="Aging (>7d)"
            value={metrics.agingCount}
            sub="open & stale"
          />
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-white/80 text-[13px]">
              Completed — last 28 days
            </div>
            <div className="text-white/50 text-[11.5px]">
              total {metrics.last28Total}
            </div>
          </div>
          <TrendChart values={metrics.last28} />
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          <PeriodCard label="This week" value={metrics.thisWeek} prev={metrics.lastWeek} />
          <PeriodCard label="This month" value={metrics.thisMonth} prev={metrics.lastMonth} />
          <PeriodCard
            label="This quarter"
            value={metrics.thisQuarter}
            prev={metrics.lastQuarter}
          />
        </div>

        {metrics.agingList.length > 0 && (
          <div className="mt-6">
            <div className="text-white/80 text-[13px] mb-2">Stale tasks</div>
            <div className="rounded-lg border border-white/8 divide-y divide-white/6 max-h-[160px] overflow-y-auto moment-scroll">
              {metrics.agingList.slice(0, 6).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-3 py-2 text-[13px]"
                >
                  <span className="text-white/85 truncate max-w-[80%]">
                    {t.title}
                  </span>
                  <span className="text-white/45 text-[11.5px]">
                    {ageInDays(t.createdAt)}d old
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  Icon,
  label,
  value,
  sub,
}: {
  Icon: typeof CheckCircle2;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/4 p-3.5">
      <div className="flex items-center gap-1.5 text-white/55 text-[11px] uppercase tracking-wider">
        <Icon className="w-[13px] h-[13px]" strokeWidth={1.5} />
        {label}
      </div>
      <div className="text-[28px] font-extralight tracking-tight mt-1 tabular-nums">
        {value}
      </div>
      {sub && <div className="text-white/45 text-[11.5px]">{sub}</div>}
    </div>
  );
}

function PeriodCard({
  label,
  value,
  prev,
}: {
  label: string;
  value: number;
  prev: number;
}) {
  const delta = value - prev;
  const pct = prev > 0 ? Math.round((delta / prev) * 100) : null;
  const tone =
    delta > 0 ? "text-emerald-300" : delta < 0 ? "text-rose-300" : "text-white/50";
  return (
    <div className="rounded-xl border border-white/8 bg-white/4 p-3.5">
      <div className="text-white/55 text-[11px] uppercase tracking-wider">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-[24px] font-extralight tabular-nums">{value}</span>
        <span className={`text-[11.5px] ${tone}`}>
          {delta === 0 ? "—" : `${delta > 0 ? "+" : ""}${delta}`}
          {pct !== null && pct !== 0 ? ` (${pct > 0 ? "+" : ""}${pct}%)` : ""}
        </span>
      </div>
      <div className="text-white/45 text-[11.5px]">vs prior period</div>
    </div>
  );
}

function TrendChart({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-[3px] h-[72px] w-full">
      {values.map((v, i) => {
        const h = (v / max) * 100;
        return (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all"
            style={{
              height: `${Math.max(v > 0 ? 8 : 3, h)}%`,
              background:
                v > 0
                  ? "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.35))"
                  : "rgba(255,255,255,0.08)",
            }}
            title={`${v}`}
          />
        );
      })}
    </div>
  );
}

function computeMetrics(tasks: Task[], logs: DailyLog[]) {
  const now = new Date();
  const today = todayISO(now);

  const open = tasks.filter((t) => !t.completed);
  const openToday = open.filter((t) => {
    if (t.dueAt && todayISO(new Date(t.dueAt)) === today) return true;
    return t.listId === "today";
  }).length;

  const completedToday = tasks.filter(
    (t) => t.completed && t.completedAt && todayISO(new Date(t.completedAt)) === today
  ).length;

  const agingList = open
    .filter((t) => ageInDays(t.createdAt) >= 7)
    .sort((a, b) => a.createdAt - b.createdAt);

  // Build 28-day series of tasks completed
  const byDate = new Map(logs.map((l) => [l.date, l.tasksCompleted] as const));
  const last28: number[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last28.push(byDate.get(todayISO(d)) ?? 0);
  }
  const last28Total = last28.reduce((a, b) => a + b, 0);

  // Streak: consecutive days (back from today) with ≥1 completion
  let streakDays = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const v = byDate.get(todayISO(d)) ?? 0;
    if (v > 0) streakDays++;
    else if (i === 0) {
      // today can have 0 without breaking pastStreak; but streak definition
      // here is simple: break on first zero.
      break;
    } else break;
  }

  const sumRange = (startOffsetDays: number, days: number) => {
    let s = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (startOffsetDays + i));
      s += byDate.get(todayISO(d)) ?? 0;
    }
    return s;
  };

  const thisWeek = sumRange(0, 7);
  const lastWeek = sumRange(7, 7);
  const thisMonth = sumRange(0, 30);
  const lastMonth = sumRange(30, 30);
  const thisQuarter = sumRange(0, 90);
  const lastQuarter = sumRange(90, 90);

  return {
    completedToday,
    openToday,
    openTotal: open.length,
    agingCount: agingList.length,
    agingList,
    last28,
    last28Total,
    streakDays,
    thisWeek,
    lastWeek,
    thisMonth,
    lastMonth,
    thisQuarter,
    lastQuarter,
  };
}
