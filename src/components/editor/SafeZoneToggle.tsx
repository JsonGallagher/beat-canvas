"use client";

import { cn } from "@/lib/utils";

interface SafeZoneToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function SafeZoneOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-x-0 top-0 h-[10%] border-b border-dashed border-amber-p7/30 bg-amber-p7/5" />
      <div className="absolute inset-x-0 bottom-0 h-[15%] border-t border-dashed border-amber-p7/30 bg-amber-p7/5" />
      <span className="absolute left-2 top-[10%] type-caption text-amber-p7/50">UI zone</span>
      <span className="absolute bottom-[15%] left-2 type-caption text-amber-p7/50">Caption zone</span>
    </div>
  );
}

export function SafeZoneToggle({ enabled, onToggle }: SafeZoneToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "px-2 py-1 type-caption font-medium transition-all",
        enabled ? "bg-amber-p7/20 text-amber-p7" : "bg-[var(--surface-2)] text-muted-foreground"
      )}
    >
      Safe Zones
    </button>
  );
}
