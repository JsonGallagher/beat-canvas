"use client";

import { useCallback } from "react";
import { WaveformCanvas } from "@/components/segment/WaveformCanvas";
import { TrimHandles } from "@/components/segment/TrimHandles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PRESETS = [10, 15, 30] as const;

interface TrimSectionProps {
  peaks: Float32Array;
  inTime: number;
  outTime: number;
  duration: number;
  currentTime: number;
  onTrimChange: (inTime: number, outTime: number) => void;
  onSeek: (time: number) => void;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function TrimSection({
  peaks,
  inTime,
  outTime,
  duration,
  currentTime,
  onTrimChange,
  onSeek,
}: TrimSectionProps) {
  const clipDuration = outTime - inTime;

  const handlePreset = useCallback(
    (preset: number) => {
      const newOut = Math.min(inTime + preset, duration);
      onTrimChange(inTime, newOut);
    },
    [inTime, duration, onTrimChange]
  );

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="type-h4 text-foreground">Trim</h3>
        <span className="type-data text-amber-p7">{formatTime(clipDuration)}</span>
      </div>

      {/* Waveform with trim handles overlay */}
      <div className="relative">
        <WaveformCanvas
          peaks={peaks}
          inTime={inTime}
          outTime={outTime}
          duration={duration}
          currentTime={currentTime}
          onSeek={onSeek}
        />
        <TrimHandles
          inTime={inTime}
          outTime={outTime}
          duration={duration}
          onChange={onTrimChange}
        />
      </div>

      {/* Time info + presets */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3 type-data text-muted-foreground">
          <span>
            IN <span className="text-phosphor">{formatTime(inTime)}</span>
          </span>
          <span>
            OUT <span className="text-phosphor">{formatTime(outTime)}</span>
          </span>
        </div>

        <div className="flex gap-1">
          {PRESETS.map((d) => (
            <Button
              key={d}
              variant="ghost"
              size="xs"
              disabled={d > duration}
              onClick={() => handlePreset(d)}
              className={cn(
                "type-data",
                Math.abs(clipDuration - d) < 0.1 && "text-cyan"
              )}
            >
              {d}s
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
