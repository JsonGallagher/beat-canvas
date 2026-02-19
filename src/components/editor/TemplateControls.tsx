"use client";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { TemplateControl } from "@/types/template";

interface TemplateControlsProps {
  controls: TemplateControl[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}

export function TemplateControls({
  controls,
  values,
  onChange,
}: TemplateControlsProps) {
  const setValue = (id: string, value: unknown) => {
    onChange({ ...values, [id]: value });
  };

  if (controls.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h4 className="type-label text-cyan">Template Controls</h4>

      {controls.map((control) => (
        <div key={control.id} className="flex flex-col gap-1.5">
          <Label>{control.label}</Label>

          {control.type === "slider" && (
            <Slider
              value={[Number(values[control.id] ?? control.default)]}
              onValueChange={([v]) => v !== undefined && setValue(control.id, v)}
              min={control.min ?? 0}
              max={control.max ?? 1}
              step={control.step ?? 0.01}
            />
          )}

          {control.type === "select" && control.options && (
            <Select
              value={String(values[control.id] ?? control.default)}
              onValueChange={(v) => setValue(control.id, v)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {control.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {control.type === "toggle" && (
            <Switch
              checked={Boolean(values[control.id] ?? control.default)}
              onCheckedChange={(v) => setValue(control.id, v)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
