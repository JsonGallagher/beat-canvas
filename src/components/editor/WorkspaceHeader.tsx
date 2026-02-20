"use client";

import { useRouter } from "next/navigation";
import { Download, Undo2, Redo2, Keyboard, Save, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/lib/state/projectStore";
import { exportToFile, importFromFile } from "@/lib/state/projectSerializer";
import { useRef } from "react";

interface WorkspaceHeaderProps {
  filename: string;
  onExport: () => void;
  canExport: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onShowShortcuts: () => void;
}

export function WorkspaceHeader({
  filename,
  onExport,
  canExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onShowShortcuts,
}: WorkspaceHeaderProps) {
  const router = useRouter();
  const isDemo = useProjectStore((s) => s.isDemo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-4">
        <span className="font-serif text-lg font-semibold text-foreground">
          Beat Canvas
        </span>
        <span className="type-caption text-muted-foreground">
          {filename}
        </span>
        {isDemo && (
          <span className="inline-flex items-center gap-1.5 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-400">
            DEMO
            <button
              onClick={() => router.push("/")}
              className="underline opacity-70 hover:opacity-100"
            >
              Upload your own
            </button>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Undo / Redo */}
        <Button size="icon" variant="ghost" onClick={onUndo} disabled={!canUndo} title="Undo (⌘Z)" className="h-7 w-7">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onRedo} disabled={!canRedo} title="Redo (⌘⇧Z)" className="h-7 w-7">
          <Redo2 className="h-3.5 w-3.5" />
        </Button>

        {/* Save / Load */}
        <Button size="icon" variant="ghost" onClick={exportToFile} title="Save project" className="h-7 w-7">
          <Save className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          title="Open project"
          className="h-7 w-7"
        >
          <FolderOpen className="h-3.5 w-3.5" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".beatcanvas"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importFromFile(file);
            e.target.value = "";
          }}
        />

        {/* Shortcuts */}
        <Button size="icon" variant="ghost" onClick={onShowShortcuts} title="Keyboard shortcuts (?)" className="h-7 w-7">
          <Keyboard className="h-3.5 w-3.5" />
        </Button>

        {/* Export */}
        <Button size="sm" onClick={onExport} disabled={!canExport} className="ml-2">
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export
        </Button>
      </div>
    </div>
  );
}
