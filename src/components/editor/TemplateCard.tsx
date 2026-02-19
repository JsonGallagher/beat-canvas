"use client";

import { cn } from "@/lib/utils";
import type { TemplateModule } from "@/types/template";

interface TemplateCardProps {
  template: TemplateModule;
  selected: boolean;
  onSelect: (id: string) => void;
  thumbnailUrl?: string;
}

export function TemplateCard({ template, selected, onSelect, thumbnailUrl }: TemplateCardProps) {
  return (
    <button
      onClick={() => onSelect(template.id)}
      className={cn(
        "flex flex-col gap-1.5 border bg-[var(--surface-2)] p-2 text-left transition-all",
        selected
          ? "border-[var(--border-active)] glow-phosphor"
          : "border-[var(--border-base)] hover:border-[var(--border-bright)]"
      )}
    >
      <div className="relative flex aspect-[9/16] w-full items-center justify-center overflow-hidden bg-black">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={template.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="type-h2 text-muted-foreground/20">
            {template.name.charAt(0)}
          </span>
        )}
        {selected && <div className="crt-scanlines pointer-events-none absolute inset-0" />}
      </div>

      <span className="type-caption text-foreground">{template.name}</span>
    </button>
  );
}
