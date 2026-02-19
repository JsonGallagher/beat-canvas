"use client";

interface FileInfoProps {
  filename: string;
  duration: number;
  fileSize: number;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileInfo({ filename, duration, fileSize }: FileInfoProps) {
  return (
    <div className="panel-inset flex items-center gap-4 px-5 py-3">
      <div className="flex flex-col gap-1">
        <span className="type-body font-medium text-foreground">{filename}</span>
        <div className="flex gap-4">
          <span className="type-data text-muted-foreground">
            <span className="type-label text-phosphor">{formatDuration(duration)}</span>
          </span>
          <span className="type-data text-muted-foreground">
            {formatFileSize(fileSize)}
          </span>
        </div>
      </div>
    </div>
  );
}
