"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TemplateModule } from "@/types/template";

interface TemplateCardProps {
  template: TemplateModule;
  selected: boolean;
  onSelect: (id: string) => void;
  thumbnailUrl?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export function TemplateCard({
  template,
  selected,
  onSelect,
  thumbnailUrl,
  isFavorite,
  onToggleFavorite,
}: TemplateCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(template.id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(template.id); } }}
      className={cn(
        "group flex cursor-pointer flex-col gap-1.5 border bg-[var(--surface-2)] p-2 text-left transition-all",
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
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(template.id);
            }}
            className={cn(
              "absolute right-1 top-1 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100",
              isFavorite && "opacity-100"
            )}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={cn(
                "h-3 w-3",
                isFavorite ? "fill-rose-500 text-rose-500" : "text-white/70"
              )}
            />
          </button>
        )}
      </div>

      <span className="type-caption text-foreground">{template.name}</span>
    </div>
  );
}
