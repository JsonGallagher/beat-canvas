"use client";

import { useRef, useEffect, useCallback } from "react";

interface MiniTimelineProps {
  peaks: Float32Array | null;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export function MiniTimeline({ peaks, currentTime, duration, onSeek }: MiniTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const mid = h / 2;

    ctx.clearRect(0, 0, w, h);

    const binsPerPixel = peaks.length / w;
    for (let x = 0; x < w; x++) {
      const binIndex = Math.floor(x * binsPerPixel);
      const val = peaks[binIndex] ?? 0;
      const barH = val * mid * 0.8;
      ctx.fillStyle = "rgba(0, 255, 65, 0.3)";
      ctx.fillRect(x, mid - barH, 1, barH * 2);
    }

    // Playhead
    const px = (currentTime / duration) * w;
    ctx.fillStyle = "#FFB000";
    ctx.fillRect(px - 1, 0, 2, h);
  }, [peaks, currentTime, duration]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    onSeek(frac * duration);
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="h-10 w-full cursor-pointer bg-[var(--surface-2)] border border-[var(--border-dim)]"
    />
  );
}
