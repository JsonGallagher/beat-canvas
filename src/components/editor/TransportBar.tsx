"use client";

import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MiniTimeline } from "./MiniTimeline";
import { SafeZoneToggle } from "./SafeZoneToggle";

interface TransportBarProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  peaks: Float32Array | null;
  showSafeZones: boolean;
  onToggle: () => void;
  onSeek: (time: number) => void;
  onSafeZoneToggle: () => void;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function TransportBar({
  isPlaying,
  currentTime,
  duration,
  peaks,
  showSafeZones,
  onToggle,
  onSeek,
  onSafeZoneToggle,
}: TransportBarProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggle}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 text-phosphor" />
        ) : (
          <Play className="h-4 w-4 text-phosphor" />
        )}
      </Button>

      <span className="min-w-[60px] type-data">
        <span className="text-amber-p7">{formatTime(currentTime)}</span>
        <span className="text-muted-foreground"> / {formatTime(duration)}</span>
      </span>

      <div className="flex-1">
        <MiniTimeline
          peaks={peaks}
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
        />
      </div>

      <SafeZoneToggle
        enabled={showSafeZones}
        onToggle={onSafeZoneToggle}
      />
    </div>
  );
}
