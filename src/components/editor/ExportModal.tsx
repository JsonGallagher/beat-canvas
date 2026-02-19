"use client";

import { useCallback, useState } from "react";
import { Download, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportProgressView } from "./ExportProgress";
import { useExport } from "@/hooks/useExport";
import { useProjectStore } from "@/lib/state/projectStore";
import { getTemplate } from "@/templates/registry";
import { getPalette } from "@/lib/render/palettes";
import type { ExportOptions } from "@/types/export";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

export function ExportModal({ open, onClose }: ExportModalProps) {
  const [resolution, setResolution] = useState<ExportOptions["resolution"]>("1080x1920");
  const [format, setFormat] = useState<ExportOptions["format"]>("mp4");

  const {
    audioBuffer,
    clip,
    reactiveFrames,
    selectedTemplateId,
    palette,
    intensityMultiplier,
    templateParams,
    overlay,
  } = useProjectStore();

  const exportState = useExport();

  const handleExport = useCallback(() => {
    if (!audioBuffer || !clip || !selectedTemplateId) return;

    const template = getTemplate(selectedTemplateId);
    if (!template) return;

    exportState.startExport({
      audioBuffer,
      inTime: clip.inTime,
      outTime: clip.outTime,
      reactiveFrames,
      template,
      palette: getPalette(palette),
      intensityMultiplier,
      templateParams,
      overlayConfig: {
        title: overlay.title,
        artist: overlay.artist,
        textPosition: overlay.textPosition,
        textSize: overlay.textSize,
        textShadow: overlay.textShadow,
        coverArtUrl: overlay.coverArtUrl,
        coverPosition: overlay.coverPosition,
        coverScale: overlay.coverScale,
      },
      options: { resolution, format },
    });
  }, [
    audioBuffer,
    clip,
    reactiveFrames,
    selectedTemplateId,
    palette,
    intensityMultiplier,
    templateParams,
    overlay,
    resolution,
    format,
    exportState,
  ]);

  const handleClose = () => {
    if (exportState.stage !== "idle" && exportState.stage !== "done" && exportState.stage !== "error") {
      return;
    }
    exportState.reset();
    onClose();
  };

  const isExporting = exportState.stage !== "idle" && exportState.stage !== "done" && exportState.stage !== "error";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Export Video</DialogTitle>
        </DialogHeader>

        {exportState.stage === "idle" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Resolution</Label>
              <Select value={resolution} onValueChange={(v) => setResolution(v as ExportOptions["resolution"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1080x1920">1080 x 1920 (Full HD)</SelectItem>
                  <SelectItem value="720x1280">720 x 1280 (HD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ExportOptions["format"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp4">MP4 (recommended)</SelectItem>
                  <SelectItem value="webm">WebM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Start Export
            </Button>
          </div>
        )}

        {isExporting && (
          <div className="flex flex-col gap-4">
            <ExportProgressView
              stage={exportState.stage}
              progress={exportState.progress}
              message={exportState.message}
              currentFrame={exportState.currentFrame}
              totalFrames={exportState.totalFrames}
            />
            <Button variant="outline" onClick={exportState.cancel}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}

        {exportState.stage === "done" && exportState.result && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-phosphor p-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="crt-glow type-body font-medium">Export complete!</span>
            </div>

            {exportState.result.warning && (
              <div className="panel-inset flex items-center gap-2 px-3 py-2 type-caption text-amber">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {exportState.result.warning}
              </div>
            )}

            <p className="type-caption text-muted-foreground">
              {exportState.result.filename} · {(exportState.result.blob.size / (1024 * 1024)).toFixed(1)} MB
            </p>

            <Button onClick={exportState.download}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        )}

        {exportState.stage === "error" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-magenta">
              <AlertCircle className="h-5 w-5" />
              <span className="type-body">{exportState.error}</span>
            </div>
            <Button variant="outline" onClick={exportState.reset}>
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
