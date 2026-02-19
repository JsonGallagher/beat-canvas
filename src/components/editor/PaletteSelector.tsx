"use client";

import { cn } from "@/lib/utils";
import { PALETTES } from "@/lib/render/palettes";

interface PaletteSelectorProps {
  selected: string;
  onChange: (palette: string) => void;
}

const paletteNames: { id: string; label: string }[] = [
  { id: "phosphor", label: "Phosphor" },
  { id: "crt_warm", label: "CRT Warm" },
  { id: "ice", label: "Ice" },
  { id: "magenta_burn", label: "Magenta" },
  { id: "monochrome", label: "Mono" },
  { id: "cga_mode1", label: "CGA Mode 1" },
  { id: "cga_mode0", label: "CGA Mode 0" },
  { id: "amber", label: "Amber P7" },
  { id: "tandy", label: "Tandy" },
  { id: "ibm_cold", label: "IBM Cold" },
  { id: "sierra", label: "Sierra" },
  { id: "custom", label: "Custom" },
];

export function PaletteSelector({ selected, onChange }: PaletteSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="type-label text-cyan">Palette</h4>
      <div className="grid grid-cols-4 gap-2">
        {paletteNames.map(({ id, label }) => {
          const colors = PALETTES[id] ?? [];
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={cn(
                "flex flex-col items-center gap-1 border px-2 py-2 transition-all bg-[var(--surface-2)]",
                selected === id
                  ? "border-[var(--border-active)] glow-phosphor"
                  : "border-[var(--border-base)] hover:border-[var(--border-bright)]"
              )}
            >
              <div className="flex gap-0.5">
                {colors.slice(0, 4).map((color, i) => (
                  <div
                    key={i}
                    className="h-3 w-3"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="type-caption text-muted-foreground">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
