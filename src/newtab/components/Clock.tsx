import { useTicker } from "@/store/useMoment";
import { formatTime } from "@/lib/time";

export function Clock() {
  const now = useTicker(1000);
  return (
    <div className="text-center select-none">
      <div
        className="font-display text-clock font-semibold tracking-tight text-white"
        style={{
          textShadow: "0 2px 30px rgba(0,0,0,0.45)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.05em",
        }}
      >
        {formatTime(now, true)}
      </div>
    </div>
  );
}
