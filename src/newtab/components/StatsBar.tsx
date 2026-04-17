import { Calendar, Target, Sunrise } from "lucide-react";
import { todayISO } from "@/lib/time";
import type { DailyLog, FocusState } from "@/types";

export function StatsBar({
  dailyLogs,
  focus,
  tasksTodayCount,
}: {
  dailyLogs: DailyLog[];
  focus: FocusState;
  tasksTodayCount: number;
}) {
  const today = todayISO();
  const todayLog = dailyLogs.find((l) => l.date === today);
  const focusedMinutes = todayLog?.focusMinutes ?? 0;

  const focusTimeLeft =
    focus.active && focus.session
      ? Math.max(0, Math.ceil((focus.session.endsAt - Date.now()) / 60000))
      : null;

  return (
    <div className="absolute top-5 right-6 flex gap-7 animate-fade-in">
      <Stat
        Icon={Target}
        label="Focused Today"
        value={`${focusedMinutes}m`}
        sub={focusTimeLeft !== null ? `${focusTimeLeft}m left` : undefined}
      />
      <Stat
        Icon={Calendar}
        label="Today's Tasks"
        value={`${tasksTodayCount}`}
      />
      <Stat Icon={Sunrise} label="New Delhi" value="26°" />
    </div>
  );
}

function Stat({
  Icon,
  label,
  value,
  sub,
}: {
  Icon: typeof Target;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="stat">
      <div className="stat-top">
        <Icon className="w-[15px] h-[15px] opacity-80" strokeWidth={1.5} />
        <span>{value}</span>
        {sub && <span className="text-white/50 text-[11px]">· {sub}</span>}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
