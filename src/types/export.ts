export interface ExportOptions {
  resolution: "1080x1920" | "720x1280";
  format: "mp4" | "webm";
}

export type ExportStage = "idle" | "preparing" | "rendering" | "transcoding" | "done" | "error";

export interface ExportResult {
  blob: Blob;
  filename: string;
  format: string;
  duration: number;
  warning?: string;
}
