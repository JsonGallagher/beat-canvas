"use client";

import { Progress } from "@/components/ui/progress";
import type { ExportStage } from "@/types/export";

interface ExportProgressProps {
  stage: ExportStage;
  progress: number;
  message: string;
  currentFrame?: number;
  totalFrames?: number;
}

export function ExportProgressView({
  stage,
  progress,
  message,
  currentFrame,
  totalFrames,
}: ExportProgressProps) {
  const pct = Math.round(progress * 100);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="type-body text-foreground">{message}</span>
        <span className="type-data text-cyan">{pct}%</span>
      </div>

      <Progress value={pct} />

      {stage === "rendering" && currentFrame !== undefined && totalFrames !== undefined && (
        <p className="text-center type-caption text-muted-foreground">
          Frame <span className="text-amber">{currentFrame}</span> of {totalFrames}
        </p>
      )}

      <div className="flex justify-center">
        <span className="panel-inset px-3 py-1 type-caption text-muted-foreground capitalize">
          {stage}
        </span>
      </div>
    </div>
  );
}
