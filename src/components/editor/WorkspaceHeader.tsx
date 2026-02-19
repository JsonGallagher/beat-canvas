"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkspaceHeaderProps {
  filename: string;
  onExport: () => void;
  canExport: boolean;
}

export function WorkspaceHeader({ filename, onExport, canExport }: WorkspaceHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-4">
        <span className="font-serif text-lg font-semibold text-foreground">
          Beat Canvas
        </span>
        <span className="type-caption text-muted-foreground">
          {filename}
        </span>
      </div>

      <Button
        size="sm"
        onClick={onExport}
        disabled={!canExport}
      >
        <Download className="mr-1.5 h-3.5 w-3.5" />
        Export
      </Button>
    </div>
  );
}
