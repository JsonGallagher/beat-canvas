"use client";

import { useCallback, useRef, useState } from "react";
import { ExportService, type ExportProgress, type ExportConfig } from "@/lib/export/ExportService";
import type { ExportStage, ExportResult } from "@/types/export";

interface ExportState {
  stage: ExportStage;
  progress: number;
  message: string;
  currentFrame?: number;
  totalFrames?: number;
  result: ExportResult | null;
  error: string | null;
}

export function useExport() {
  const [state, setState] = useState<ExportState>({
    stage: "idle",
    progress: 0,
    message: "",
    result: null,
    error: null,
  });

  const serviceRef = useRef<ExportService | null>(null);

  const startExport = useCallback(async (config: ExportConfig) => {
    setState({ stage: "preparing", progress: 0, message: "Preparing...", result: null, error: null });

    const service = new ExportService();
    serviceRef.current = service;

    try {
      const result = await service.export(config, (progress: ExportProgress) => {
        setState((prev) => ({
          ...prev,
          stage: progress.stage,
          progress: progress.progress,
          message: progress.message,
          currentFrame: progress.currentFrame,
          totalFrames: progress.totalFrames,
        }));
      });

      setState({
        stage: "done",
        progress: 1,
        message: "Export complete!",
        result,
        error: null,
        currentFrame: undefined,
        totalFrames: undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      if (message !== "Export cancelled") {
        setState((prev) => ({
          ...prev,
          stage: "error",
          message,
          error: message,
        }));
      } else {
        setState({
          stage: "idle",
          progress: 0,
          message: "",
          result: null,
          error: null,
        });
      }
    } finally {
      serviceRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    serviceRef.current?.cancel();
  }, []);

  const download = useCallback(() => {
    if (!state.result) return;
    const url = URL.createObjectURL(state.result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = state.result.filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.result]);

  const reset = useCallback(() => {
    setState({ stage: "idle", progress: 0, message: "", result: null, error: null });
  }, []);

  return { ...state, startExport, cancel, download, reset };
}
