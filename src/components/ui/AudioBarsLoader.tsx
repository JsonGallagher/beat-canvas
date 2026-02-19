"use client";

import { cn } from "@/lib/utils";

interface AudioBarsLoaderProps {
  size?: "sm" | "lg";
  className?: string;
}

const BAR_COUNT = 5;
const CGA_COLORS = [
  "var(--phosphor)",
  "var(--cga-cyan)",
  "var(--cga-magenta)",
  "var(--cga-yellow)",
  "var(--phosphor)",
];

export function AudioBarsLoader({ size = "lg", className }: AudioBarsLoaderProps) {
  const isSmall = size === "sm";
  const barHeight = isSmall ? 16 : 32;
  const barWidth = isSmall ? 3 : 4;
  const gap = isSmall ? 2 : 3;

  return (
    <div
      className={cn("flex items-end", className)}
      style={{ height: barHeight, gap }}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <div
          key={i}
          className="rounded-none animate-[audio-bar_0.8s_ease-in-out_infinite]"
          style={{
            width: barWidth,
            height: barHeight,
            backgroundColor: CGA_COLORS[i],
            animationDelay: `${i * 0.12}s`,
            transformOrigin: "bottom",
            boxShadow: `0 0 6px ${CGA_COLORS[i]}`,
          }}
        />
      ))}
    </div>
  );
}
