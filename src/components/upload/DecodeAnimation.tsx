"use client";

import { AudioBarsLoader } from "@/components/ui/AudioBarsLoader";

interface DecodeAnimationProps {
  stage: "decoding" | "analyzing";
}

export function DecodeAnimation({ stage }: DecodeAnimationProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <AudioBarsLoader />
      <div className="flex flex-col items-center gap-1">
        <span className="type-body text-foreground">
          {stage === "decoding" ? "Decoding audio" : "Analyzing waveform"}
        </span>
        <span className="cursor type-caption text-phosphor" />
      </div>
    </div>
  );
}
