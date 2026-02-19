"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MAX_CLIP_DURATION = 30;

interface TrimHandlesProps {
  inTime: number;
  outTime: number;
  duration: number;
  onChange: (inTime: number, outTime: number) => void;
}

export function TrimHandles({ inTime, outTime, duration, onChange }: TrimHandlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingCenter, setIsDraggingCenter] = useState(false);

  const getTimeFromX = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return 0;
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return frac * duration;
    },
    [duration]
  );

  const startDrag = useCallback(
    (handle: "in" | "out") => (e: React.PointerEvent) => {
      e.preventDefault();
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const t = getTimeFromX(ev.clientX);
        if (handle === "in") {
          const newIn = Math.max(0, Math.min(t, outTime - 0.1));
          const clampedIn =
            outTime - newIn > MAX_CLIP_DURATION ? outTime - MAX_CLIP_DURATION : newIn;
          onChange(Math.max(0, clampedIn), outTime);
        } else {
          const newOut = Math.min(duration, Math.max(t, inTime + 0.1));
          const clampedOut =
            newOut - inTime > MAX_CLIP_DURATION ? inTime + MAX_CLIP_DURATION : newOut;
          onChange(inTime, Math.min(duration, clampedOut));
        }
      };

      const onUp = () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
    },
    [inTime, outTime, duration, onChange, getTimeFromX]
  );

  const startCenterDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);

      const initialClientX = e.clientX;
      const initialIn = inTime;
      const selectionWidth = outTime - inTime;
      setIsDraggingCenter(true);

      const onMove = (ev: PointerEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const timeDelta = ((ev.clientX - initialClientX) / rect.width) * duration;
        let newIn = initialIn + timeDelta;
        let newOut = newIn + selectionWidth;

        // Clamp to bounds
        if (newIn < 0) {
          newIn = 0;
          newOut = selectionWidth;
        }
        if (newOut > duration) {
          newOut = duration;
          newIn = duration - selectionWidth;
        }

        onChange(newIn, newOut);
      };

      const onUp = () => {
        setIsDraggingCenter(false);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
    },
    [inTime, outTime, duration, onChange]
  );

  const inPct = (inTime / duration) * 100;
  const outPct = (outTime / duration) * 100;

  return (
    <div ref={containerRef} className="relative h-32 w-full">
      {/* Selected region highlight — draggable center */}
      <div
        onPointerDown={startCenterDrag}
        className={cn(
          "absolute inset-y-0 border-y-2 border-phosphor/40 bg-[rgba(0,255,65,0.08)]",
          isDraggingCenter ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{ left: `${inPct}%`, width: `${outPct - inPct}%` }}
      />

      {/* IN handle */}
      <div
        onPointerDown={startDrag("in")}
        className={cn(
          "absolute inset-y-0 z-10 flex w-3 cursor-col-resize items-center justify-center",
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
          "absolute inset-y-0 z-10 flex w-3 cursor-col-resize items-center justify-center",
          "bg-phosphor/80 shadow-[0_0_8px_rgba(0,255,65,0.4)] hover:bg-phosphor hover:shadow-[0_0_12px_rgba(0,255,65,0.6)]"
        )}
        style={{ left: `calc(${outPct}% - 6px)` }}
      >
        <div className="h-8 w-0.5 rounded-full bg-black" />
      </div>
    </div>
  );
}
