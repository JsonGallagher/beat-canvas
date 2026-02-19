"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AudioLoadError } from "@/lib/audio/AudioLoader";

const errorMessages: Record<AudioLoadError, string> = {
  UNSUPPORTED_FORMAT: "This file format isn't supported. Try MP3, WAV, or M4A.",
  DECODE_FAILURE: "Couldn't decode this audio file. It may be corrupted.",
  FILE_TOO_LARGE: "File is too large. Maximum size is 50MB.",
};

interface UploadErrorProps {
  error: AudioLoadError;
  onRetry: () => void;
}

export function UploadError({ error, onRetry }: UploadErrorProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-none border border-[var(--cga-red)]/50 bg-[var(--surface-1)] px-6 py-4 glow-red">
      <AlertCircle className="h-6 w-6 text-cga-red" />
      <p className="text-sm text-cga-red">{errorMessages[error]}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try Again
      </Button>
    </div>
  );
}
