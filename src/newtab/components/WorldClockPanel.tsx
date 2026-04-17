import { X, Clock4 } from "lucide-react";
import { formatTimeInZone } from "@/lib/time";
import { useTicker } from "@/store/useMoment";
import type { WorldClockCity } from "@/types";

export function WorldClockPanel({
  cities,
  onClose,
}: {
  cities: WorldClockCity[];
  onClose: () => void;
}) {
  useTicker(30_000);
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/45 backdrop-blur-sm animate-fade-in">
      <div className="glass w-[440px] p-6 relative animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 icon-btn"
          aria-label="Close"
        >
          <X className="w-[16px] h-[16px]" strokeWidth={1.6} />
        </button>
        <div className="flex items-center gap-2 text-white/95">
          <Clock4 className="w-[18px] h-[18px]" strokeWidth={1.5} />
          <h2 className="text-[15px] font-medium">World clock</h2>
        </div>

        <div className="mt-5 divide-y divide-white/8">
          {cities.length === 0 && (
            <div className="py-6 text-white/50 text-sm text-center">
              No cities yet. Add some from settings.
            </div>
          )}
          {cities.map((c) => {
            const time = formatTimeInZone(c.timezone, true);
            const date = new Intl.DateTimeFormat(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              timeZone: c.timezone,
            }).format(new Date());
            return (
              <div
                key={c.id}
                className="flex items-center justify-between py-3.5"
              >
                <div>
                  <div className="text-white/95 text-[14.5px] font-medium">
                    {c.label}
                  </div>
                  <div className="text-white/50 text-[11.5px] mt-0.5">
                    {c.timezone.replace(/_/g, " ")} · {date}
                  </div>
                </div>
                <div className="text-3xl font-extralight tabular-nums tracking-tight text-white/95">
                  {time}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => chrome.runtime.openOptionsPage?.()}
          className="mt-5 block w-full text-center text-white/55 text-[12px] hover:text-white/85"
        >
          Manage cities →
        </button>
      </div>
    </div>
  );
}
