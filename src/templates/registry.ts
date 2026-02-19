import type { TemplateModule } from "@/types/template";

import particleStorm from "./particle-storm";
import glitchGrid from "./glitch-grid";
import filamentPulse from "./filament-pulse";
import geometricBloom from "./geometric-bloom";
import pixelSortWave from "./pixel-sort-wave";
import neonRings from "./neon-rings";
import starField from "./star-field";
import waveformTerrain from "./waveform-terrain";
import kaleidoscopeVortex from "./kaleidoscope-vortex";
import liquidChrome from "./liquid-chrome";
import sacredGeometry from "./sacred-geometry";
import auroraCascade from "./aurora-cascade";
import fractalTunnel from "./fractal-tunnel";
import plasmaMorph from "./plasma-morph";
import dnaHelix from "./dna-helix";
import cosmicJellyfish from "./cosmic-jellyfish";
import mirrorShatter from "./mirror-shatter";
import smokeRibbons from "./smoke-ribbons";
import electricMandala from "./electric-mandala";

export const templates: TemplateModule[] = [
  particleStorm,
  glitchGrid,
  filamentPulse,
  geometricBloom,
  pixelSortWave,
  neonRings,
  starField,
  waveformTerrain,
  kaleidoscopeVortex,
  liquidChrome,
  sacredGeometry,
  auroraCascade,
  fractalTunnel,
  plasmaMorph,
  dnaHelix,
  cosmicJellyfish,
  mirrorShatter,
  smokeRibbons,
  electricMandala,
];

export function getTemplate(id: string): TemplateModule | undefined {
  return templates.find((t) => t.id === id);
}

export const allTags = Array.from(new Set(templates.flatMap((t) => t.tags))).sort();
