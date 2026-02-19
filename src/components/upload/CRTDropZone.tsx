"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/aac",
  "audio/flac",
  "audio/webm",
  "audio/mp4",
];

interface CRTDropZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function CRTDropZone({ onFileSelected, disabled }: CRTDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected, disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      disabled={disabled}
      className={cn(
        "crt-bezel relative flex h-[300px] w-[460px] flex-col items-center justify-center gap-4 overflow-hidden transition-all",
        "bg-black focus-visible:outline-none",
        isDragOver
          ? "shadow-[0_0_30px_rgba(0,255,65,0.5)]"
          : "animate-[breathe-glow_4s_ease-in-out_infinite]",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      {/* Scanline overlay */}
      <div className="crt-scanlines pointer-events-none absolute inset-0" />

      {/* Pixel grid */}
      <div className="pixel-grid pointer-events-none absolute inset-0" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        {/* Monitor icon — pixel art style */}
        <div className="flex flex-col items-center gap-2">
          <div
            className={cn(
              "text-phosphor transition-all",
              isDragOver ? "text-glow-phosphor" : "opacity-70"
            )}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              className="drop-shadow-[0_0_8px_rgba(0,255,65,0.4)]"
            >
              <rect x="10.6" y="8" width="42.6" height="32" rx="0" stroke="currentColor" strokeWidth="2" fill="none" />
              <rect x="16" y="13.3" width="32" height="21.3" rx="0" fill="currentColor" opacity="0.15" />
              <rect x="26.6" y="42.6" width="10.6" height="5.3" fill="currentColor" />
              <rect x="18.6" y="48" width="26.6" height="2.7" fill="currentColor" />
              {/* Play triangle inside screen */}
              <polygon points="28,20 28,30.6 37.3,25.3" fill="currentColor" opacity="0.6" />
            </svg>
          </div>
          {/* Static pixel waveform */}
          <div className="flex items-end gap-[3px]">
            {[4, 8, 12, 8, 4].map((h, i) => (
              <div
                key={i}
                style={{
                  width: 3,
                  height: h,
                  backgroundColor: "var(--phosphor-dim)",
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
        </div>

        <span
          className={cn(
            "type-label text-center transition-all",
            isDragOver ? "text-phosphor text-glow-phosphor" : "text-muted-foreground"
          )}
        >
          {isDragOver ? "Release to decode" : "Drop audio file or click to browse"}
        </span>

        <span className="type-caption text-muted-foreground/50">
          MP3, WAV, OGG, FLAC, AAC
        </span>
      </div>

      {/* Flash effect on drag */}
      {isDragOver && (
        <div className="pointer-events-none absolute inset-0 bg-phosphor/5" />
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileInput}
        className="hidden"
      />
    </button>
  );
}
