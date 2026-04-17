import { useTicker } from "@/store/useMoment";
import { formatTime } from "@/lib/time";

export function Clock() {
  const now = useTicker(1000);
  return (
    <div className="text-center select-none">
      <div
        className="font-display text-clock font-extralight tracking-tight text-white/95"
        style={{
          textShadow: "0 2px 30px rgba(0,0,0,0.35)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatTime(now, true)}
      </div>
    </div>
  );
}
