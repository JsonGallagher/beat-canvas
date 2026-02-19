"use client";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface IntensityControlProps {
  value: number;
  onChange: (value: number) => void;
}

export function IntensityControl({ value, onChange }: IntensityControlProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label>Intensity</Label>
        <span className="type-data text-phosphor">{value.toFixed(1)}x</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => v !== undefined && onChange(v)}
        min={0.1}
        max={3}
        step={0.1}
      />
    </div>
  );
}
