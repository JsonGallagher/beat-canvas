"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CRTDropZone } from "@/components/upload/CRTDropZone";
import { FileInfo } from "@/components/upload/FileInfo";
import { DecodeAnimation } from "@/components/upload/DecodeAnimation";
import { UploadError } from "@/components/upload/UploadError";
import { Button } from "@/components/ui/button";
import { AudioBarsLoader } from "@/components/ui/AudioBarsLoader";
import { loadAudioFile, type AudioLoadError } from "@/lib/audio/AudioLoader";
import { buildWaveformPeaks } from "@/lib/audio/WaveformBuilder";
import { useProjectStore } from "@/lib/state/projectStore";
import { Upload, Layers, Download } from "lucide-react";

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

  const featureCallouts = [
    {
      icon: <Upload size={18} className="text-phosphor-dim" />,
      label: "Upload",
      caption: "Drop any audio\nfile to start",
    },
    {
      icon: <Layers size={18} className="text-phosphor-dim" />,
      label: "Visualize",
      caption: "Audio-reactive\ntemplates",
    },
    {
      icon: <Download size={18} className="text-phosphor-dim" />,
      label: "Export",
      caption: "MP4 or WebM\nin-browser",
    },
  ];

  return (
    <div className="pixel-grid relative flex min-h-screen flex-col items-center px-8 pt-[10vh] pb-[8vh]">
      {/* Title */}
      <div className="flex flex-col items-center gap-3">
        <h1
          className="text-foreground text-glow-phosphor"
          style={{
            fontFamily: "var(--font-vt323)",
            fontSize: "5rem",
            lineHeight: 1,
            letterSpacing: "0.05em",
          }}
        >
          Beat Canvas
        </h1>
        <p className="type-body font-semibold text-foreground/80">
          Audio-reactive video clips, in your browser
        </p>
        <div className="pt-1">
          <AudioBarsLoader />
        </div>
      </div>

      {/* Drop zone / state content — centered in remaining vertical space */}
      <div className="flex flex-1 items-center justify-center">
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
              <Button onClick={handleContinue}>Open Workspace</Button>
            </div>
          </div>
        ) : (
          <CRTDropZone onFileSelected={handleFile} />
        )}
      </div>

      {/* Feature callouts — anchored to bottom */}
      {loading === "idle" && !error && !audioFile && (
        <div className="flex gap-10">
          {featureCallouts.map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-2">
              {item.icon}
              <span className="type-label text-foreground/70">{item.label}</span>
              <span className="type-caption text-center text-muted-foreground whitespace-pre-line">
                {item.caption}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
