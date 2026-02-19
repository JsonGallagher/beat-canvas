"use client";

import { useState, useEffect } from "react";
import { TemplateCard } from "./TemplateCard";
import { templates } from "@/templates/registry";
import { generateThumbnail } from "@/lib/render/generateThumbnail";

interface TemplateBrowserProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function TemplateBrowser({ selectedId, onSelect }: TemplateBrowserProps) {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

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

  return (
    <div className="flex flex-col gap-3 p-4">
      <h3 className="type-h4 text-foreground">Templates</h3>
      <div className="grid grid-cols-2 gap-2">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            selected={selectedId === template.id}
            onSelect={onSelect}
            thumbnailUrl={thumbnails[template.id]}
          />
        ))}
      </div>
    </div>
  );
}
