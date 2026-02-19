"use client";

import { SafeZoneOverlay } from "./SafeZoneToggle";

interface PreviewCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  showSafeZones: boolean;
}

export function PreviewCanvas({ canvasRef, showSafeZones }: PreviewCanvasProps) {
  return (
    <div className="glow-phosphor relative aspect-[9/16] w-full max-w-[360px] overflow-hidden border border-[var(--border-active)]">
      <canvas ref={canvasRef} className="h-full w-full" />
      {showSafeZones && <SafeZoneOverlay />}
      <div className="crt-vignette pointer-events-none absolute inset-0" />
    </div>
  );
}
