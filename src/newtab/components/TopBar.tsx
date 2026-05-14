import { BrainCircuit, Clock4, BarChart3, ExternalLink, Search } from "lucide-react";
import type { PanelKey } from "../App";

export function TopBar({ onOpen }: { onOpen: (p: PanelKey) => void }) {
  const items: { key: PanelKey; label: string; Icon: typeof BrainCircuit }[] = [
    { key: "focus",      label: "Focus",  Icon: BrainCircuit },
    { key: "worldclock", label: "Clock",  Icon: Clock4 },
    { key: "analytics",  label: "Stats",  Icon: BarChart3 },
    { key: "links",      label: "Links",  Icon: ExternalLink },
    { key: "search",     label: "Search", Icon: Search },
  ];

  return (
    <div className="absolute top-4 left-4 flex gap-1 animate-fade-in z-40">
      {items.map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => onOpen(key)}
          className="nav-chip"
          title={label}
        >
          <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
