import type { TemplateModule } from "@/types/template";

import particleStorm from "./particle-storm";
import glitchGrid from "./glitch-grid";
import filamentPulse from "./filament-pulse";
import particleNebula from "./particle-nebula";
import pixelSortWave from "./pixel-sort-wave";
import quantumLattice from "./quantum-lattice";
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
  particleNebula,
  pixelSortWave,
  quantumLattice,
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

export const TEMPLATE_CATEGORIES: Record<string, string> = {
  "particle-storm": "particles",
  "star-field": "particles",
  "filament-pulse": "particles",
  "smoke-ribbons": "particles",
  "cosmic-jellyfish": "particles",
  "particle-nebula": "particles",
  "quantum-lattice": "geometric",
  "sacred-geometry": "geometric",
  "electric-mandala": "geometric",
  "dna-helix": "geometric",
  "glitch-grid": "glitch",
  "mirror-shatter": "glitch",
  "pixel-sort-wave": "glitch",
  "aurora-cascade": "organic",
  "waveform-terrain": "organic",
  "liquid-chrome": "organic",
  "plasma-morph": "organic",
  "kaleidoscope-vortex": "ambient",
  "fractal-tunnel": "ambient",
};

export const CATEGORY_LABELS: Record<string, string> = {
  particles: "Particles",
  geometric: "Geometric",
  glitch: "Glitch",
  organic: "Organic",
  ambient: "Ambient",
};
