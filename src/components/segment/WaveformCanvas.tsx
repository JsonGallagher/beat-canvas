"use client";

import { useRef, useEffect, useCallback } from "react";

interface WaveformCanvasProps {
  peaks: Float32Array;
  inTime: number;
  outTime: number;
  duration: number;
  currentTime: number;
  onSeek?: (time: number) => void;
}

export function WaveformCanvas({
  peaks,
  inTime,
  outTime,
  duration,
  currentTime,
  onSeek,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;

    const mid = h / 2;
    const safeDuration = Math.max(duration, 1e-3);

    ctx.clearRect(0, 0, w, h);

    const totalBins = peaks.length;
    const binsPerPixel = totalBins / Math.max(1, w);

    const inFrac = inTime / safeDuration;
    const outFrac = outTime / safeDuration;

    for (let x = 0; x < w; x++) {
      const binIndex = Math.floor(x * binsPerPixel);
      const val = peaks[binIndex] ?? 0;
      const barHeight = val * mid * 0.9;
      const frac = x / w;

      const inSelection = frac >= inFrac && frac <= outFrac;

      if (inSelection) {
        const green = Math.floor(100 + val * 155);
        ctx.fillStyle = `rgba(0, ${green}, 65, 0.9)`;
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      }

      ctx.fillRect(x, mid - barHeight, 1, barHeight * 2);
    }

    // Playhead
    const playX = (currentTime / safeDuration) * w;
    ctx.fillStyle = "#FFB000";
    ctx.fillRect(playX - 1, 0, 2, h);
  }, [peaks, inTime, outTime, duration, currentTime]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    onSeek(frac * duration);
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="h-32 w-full cursor-crosshair rounded-sm bg-black/50 shadow-[0_0_20px_rgba(0,255,65,0.1)]"
    />
  );
}
