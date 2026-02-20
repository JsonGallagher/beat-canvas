"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MAX_CLIP_DURATION = 30;
const MIN_CLIP_SPAN = 0.1;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

interface TrimHandlesProps {
  inTime: number;
  outTime: number;
  duration: number;
  onChange: (inTime: number, outTime: number) => void;
}

export function TrimHandles({ inTime, outTime, duration, onChange }: TrimHandlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingCenter, setIsDraggingCenter] = useState(false);

  const safeDuration = Math.max(0, duration);
  const safeIn = clamp(inTime, 0, safeDuration);
  const safeOut = clamp(outTime, safeIn, safeDuration);
  const selectionWidth = safeOut - safeIn;

  const getTimeFromX = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0 || safeDuration <= 0) return 0;
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return frac * safeDuration;
    },
    [safeDuration]
  );

  const startDrag = useCallback(
    (handle: "in" | "out") => (e: React.PointerEvent) => {
      e.preventDefault();
      if (safeDuration <= 0) return;

      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const t = getTimeFromX(ev.clientX);
        if (handle === "in") {
          const newIn = clamp(t, 0, safeOut - MIN_CLIP_SPAN);
          const clampedIn = Math.max(newIn, safeOut - MAX_CLIP_DURATION);
          onChange(clampedIn, safeOut);
        } else {
          const newOut = clamp(t, safeIn + MIN_CLIP_SPAN, safeDuration);
          const clampedOut = Math.min(newOut, safeIn + MAX_CLIP_DURATION);
          onChange(safeIn, clampedOut);
        }
      };

      const cleanup = () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", cleanup);
        el.removeEventListener("pointercancel", cleanup);
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", cleanup);
      el.addEventListener("pointercancel", cleanup);
    },
    [safeDuration, safeIn, safeOut, onChange, getTimeFromX]
  );

  const startCenterDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (safeDuration <= 0 || selectionWidth <= 0) return;

      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);

      const initialClientX = e.clientX;
      const initialIn = safeIn;
      setIsDraggingCenter(true);

      const onMove = (ev: PointerEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0) return;

        const timeDelta = ((ev.clientX - initialClientX) / rect.width) * safeDuration;
        const maxIn = Math.max(0, safeDuration - selectionWidth);
        const newIn = clamp(initialIn + timeDelta, 0, maxIn);
        const newOut = newIn + selectionWidth;

        onChange(newIn, newOut);
      };

      const cleanup = () => {
        setIsDraggingCenter(false);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", cleanup);
        el.removeEventListener("pointercancel", cleanup);
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", cleanup);
      el.addEventListener("pointercancel", cleanup);
    },
    [safeDuration, safeIn, selectionWidth, onChange]
  );

  const normalizedDuration = Math.max(safeDuration, 1e-3);
  const inPct = (safeIn / normalizedDuration) * 100;
  const outPct = (safeOut / normalizedDuration) * 100;

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-hidden rounded-sm">
      {/* Selected region highlight — draggable center */}
      <div
        onPointerDown={startCenterDrag}
        className={cn(
          "pointer-events-auto absolute inset-y-0 touch-none border-y-2 border-phosphor/40 bg-[rgba(0,255,65,0.08)]",
          isDraggingCenter ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{ left: `${inPct}%`, width: `${outPct - inPct}%` }}
      />

      {/* IN handle */}
      <div
        onPointerDown={startDrag("in")}
        className={cn(
          "pointer-events-auto absolute inset-y-0 z-10 flex w-3 touch-none cursor-col-resize items-center justify-center",
          "bg-phosphor/80 shadow-[0_0_8px_rgba(0,255,65,0.4)] hover:bg-phosphor hover:shadow-[0_0_12px_rgba(0,255,65,0.6)]"
        )}
        style={{ left: `calc(${inPct}% - 6px)` }}
      >
        <div className="h-8 w-0.5 rounded-full bg-black" />
      </div>

      {/* OUT handle */}
      <div
        onPointerDown={startDrag("out")}
        className={cn(
          "pointer-events-auto absolute inset-y-0 z-10 flex w-3 touch-none cursor-col-resize items-center justify-center",
          "bg-phosphor/80 shadow-[0_0_8px_rgba(0,255,65,0.4)] hover:bg-phosphor hover:shadow-[0_0_12px_rgba(0,255,65,0.6)]"
        )}
        style={{ left: `calc(${outPct}% - 6px)` }}
      >
        <div className="h-8 w-0.5 rounded-full bg-black" />
      </div>
    </div>
  );
}
