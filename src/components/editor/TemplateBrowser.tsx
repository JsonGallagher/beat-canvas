"use client";

import { useState, useEffect } from "react";
import { TemplateCard } from "./TemplateCard";
import { templates, TEMPLATE_CATEGORIES, CATEGORY_LABELS } from "@/templates/registry";
import { generateThumbnail } from "@/lib/render/generateThumbnail";
import { useTemplateFavorites } from "@/hooks/useTemplateFavorites";
import { cn } from "@/lib/utils";

interface TemplateBrowserProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const CATEGORIES = ["all", ...Object.keys(CATEGORY_LABELS)] as const;

export function TemplateBrowser({ selectedId, onSelect }: TemplateBrowserProps) {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [activeCategory, setActiveCategory] = useState("all");
  const { favorites, toggleFavorite, addRecent } = useTemplateFavorites();

  useEffect(() => {
    let cancelled = false;

    async function generate() {
      for (const template of templates) {
        if (cancelled) break;
        try {
          const url = await generateThumbnail(template);
          if (!cancelled) {
            setThumbnails((prev) => ({ ...prev, [template.id]: url }));
          }
        } catch {
          // Skip — placeholder letter will show
        }
      }
    }

    generate();
    return () => { cancelled = true; };
  }, []);

  const handleSelect = (id: string) => {
    addRecent(id);
    onSelect(id);
  };

  const filteredTemplates = templates.filter(
    (t) => activeCategory === "all" || TEMPLATE_CATEGORIES[t.id] === activeCategory
  );

  const favoriteTemplates = templates.filter((t) => favorites.has(t.id));

  return (
    <div className="flex flex-col gap-3 p-4">
      <h3 className="type-h4 text-foreground">Templates</h3>

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-mono transition-colors",
              activeCategory === cat
                ? "bg-[var(--border-active)] text-background"
                : "border border-[var(--border-base)] text-muted-foreground hover:border-[var(--border-bright)] hover:text-foreground"
            )}
          >
            {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Favorites section */}
      {favoriteTemplates.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="type-caption text-muted-foreground">Favorites</span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {favoriteTemplates.map((template) => (
              <div key={template.id} className="w-16 shrink-0">
                <TemplateCard
                  template={template}
                  selected={selectedId === template.id}
                  onSelect={handleSelect}
                  thumbnailUrl={thumbnails[template.id]}
                  isFavorite={favorites.has(template.id)}
                  onToggleFavorite={toggleFavorite}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-2 gap-2">
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            selected={selectedId === template.id}
            onSelect={handleSelect}
            thumbnailUrl={thumbnails[template.id]}
            isFavorite={favorites.has(template.id)}
            onToggleFavorite={toggleFavorite}
          />
        ))}
      </div>
    </div>
  );
}
