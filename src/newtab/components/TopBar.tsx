import { useState } from "react";
import { BrainCircuit, Clock4, BarChart3, ExternalLink, Search, Grid3x3 } from "lucide-react";
import type { PanelKey } from "../App";
import { GoogleAppsPanel } from "./GoogleAppsPanel";

export function TopBar({ onOpen }: { onOpen: (p: PanelKey) => void }) {
  const [showApps, setShowApps] = useState(false);

  const items: { key: PanelKey; label: string; Icon: typeof BrainCircuit }[] = [
    { key: "focus",      label: "Focus",  Icon: BrainCircuit },
    { key: "worldclock", label: "Clock",  Icon: Clock4 },
    { key: "analytics",  label: "Stats",  Icon: BarChart3 },
    { key: "links",      label: "Links",  Icon: ExternalLink },
    { key: "search",     label: "Search", Icon: Search },
  ];

  return (
    <div className="absolute top-4 left-4 flex gap-1 animate-fade-in z-40">
      {/* Google Apps waffle */}
      <button
        onClick={() => setShowApps((v) => !v)}
        className={`nav-chip ${showApps ? "bg-white/20" : ""}`}
        title="Google Apps"
      >
        <Grid3x3 className="w-[18px] h-[18px]" strokeWidth={1.5} />
        <span>Apps</span>
      </button>

      {/* Divider */}
      <div className="w-px bg-white/15 mx-0.5 self-stretch my-1" />

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

      {/* Dropdown panel — rendered in-tree so it's positioned relative to the bar */}
      {showApps && <GoogleAppsPanel onClose={() => setShowApps(false)} />}
    </div>
  );
}
