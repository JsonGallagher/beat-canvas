"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import type { OverlaySettings } from "@/types/project";

interface OverlayControlsProps {
  overlay: OverlaySettings;
  onChange: (updates: Partial<OverlaySettings>) => void;
}

export function OverlayControls({ overlay, onChange }: OverlayControlsProps) {
  const handleCoverUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      onChange({ coverArt: file, coverArtUrl: url });
    },
    [onChange]
  );

  return (
    <div className="flex flex-col gap-4">
      <h4 className="type-label text-cyan">Text Overlay</h4>

      <div className="flex flex-col gap-1.5">
        <Label>Title</Label>
        <Input
          value={overlay.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Track title"
          className="h-8"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Artist</Label>
        <Input
          value={overlay.artist}
          onChange={(e) => onChange({ artist: e.target.value })}
          placeholder="Artist name"
          className="h-8"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Position</Label>
        <Select
          value={overlay.textPosition}
          onValueChange={(v) => onChange({ textPosition: v as "top" | "center" | "bottom" })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="top">Top</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="bottom">Bottom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Size</Label>
        <Select
          value={overlay.textSize}
          onValueChange={(v) => onChange({ textSize: v as "small" | "medium" | "large" })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label>Text Shadow</Label>
        <Switch
          checked={overlay.textShadow}
          onCheckedChange={(v) => onChange({ textShadow: v })}
        />
      </div>

      {/* Cover Art */}
      <h4 className="type-label text-cyan mt-2">Cover Art</h4>

      {overlay.coverArtUrl ? (
        <div className="flex items-center gap-2">
          <img
            src={overlay.coverArtUrl}
            alt="Cover"
            className="h-12 w-12 object-cover"
          />
          <Button
            variant="outline"
            size="xs"
            onClick={() => onChange({ coverArt: null, coverArtUrl: null })}
          >
            Remove
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="relative" asChild>
          <label>
            <Upload className="mr-1.5 h-3 w-3" />
            Upload Cover
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleCoverUpload}
            />
          </label>
        </Button>
      )}

      {overlay.coverArtUrl && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label>Cover Position</Label>
            <Select
              value={overlay.coverPosition}
              onValueChange={(v) => onChange({ coverPosition: v as "center" | "corner" })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="corner">Corner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Cover Scale</Label>
            <Slider
              value={[overlay.coverScale]}
              onValueChange={([v]) => v !== undefined && onChange({ coverScale: v })}
              min={0.1}
              max={1}
              step={0.05}
            />
          </div>
        </>
      )}
    </div>
  );
}
