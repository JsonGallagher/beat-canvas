"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CRTDropZone } from "@/components/upload/CRTDropZone";
import { FileInfo } from "@/components/upload/FileInfo";
import { DecodeAnimation } from "@/components/upload/DecodeAnimation";
import { UploadError } from "@/components/upload/UploadError";
import { Button } from "@/components/ui/button";
import { loadAudioFile, type AudioLoadError } from "@/lib/audio/AudioLoader";
import { buildWaveformPeaks } from "@/lib/audio/WaveformBuilder";
import { useProjectStore } from "@/lib/state/projectStore";

type LoadingState = "idle" | "decoding" | "analyzing";

export default function UploadPage() {
  const router = useRouter();
  const { audioFile, audioDuration, setAudioFile, setWaveformPeaks } = useProjectStore();
  const [loading, setLoading] = useState<LoadingState>("idle");
  const [error, setError] = useState<AudioLoadError | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setLoading("decoding");

      const result = await loadAudioFile(file);
      if (!result.ok) {
        setError(result.error);
        setLoading("idle");
        return;
      }

      setAudioFile(result.result.file, result.result.buffer);
      setLoading("analyzing");

      const peaks = buildWaveformPeaks(result.result.buffer);
      setWaveformPeaks(peaks);
      setLoading("idle");
    },
    [setAudioFile, setWaveformPeaks]
  );

  const handleContinue = () => {
    router.push("/editor");
  };

  const handleRetry = () => {
    setError(null);
  };

  return (
    <div className="pixel-grid relative flex min-h-screen flex-col items-center justify-center gap-10 p-8">
      {/* Title */}
      <div className="flex flex-col items-center gap-3">
        <h1 className="type-display text-foreground text-glow-phosphor">
          Beat Canvas
        </h1>
        <p className="type-body text-muted-foreground">
          Audio-reactive video clips, in your browser
        </p>
      </div>

      {/* Main content area */}
      {loading !== "idle" ? (
        <DecodeAnimation stage={loading} />
      ) : error ? (
        <UploadError error={error} onRetry={handleRetry} />
      ) : audioFile ? (
        <div className="flex flex-col items-center gap-6">
          <FileInfo
            filename={audioFile.name}
            duration={audioDuration}
            fileSize={audioFile.size}
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "audio/*";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFile(file);
                };
                input.click();
              }}
            >
              Choose Different File
            </Button>
            <Button onClick={handleContinue}>
              Open Workspace
            </Button>
          </div>
        </div>
      ) : (
        <CRTDropZone onFileSelected={handleFile} />
      )}
    </div>
  );
}
