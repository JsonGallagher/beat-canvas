import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

const MAX_BRANCHES = 16;
const POINTS_PER_BRANCH = 80;

class FilamentPulse implements TemplateModule {
  id = "filament-pulse";
  name = "Filament Pulse";
  tags = ["organic", "glow"];

  private lines: THREE.Line[] = [];
  private lineColors: Float32Array[] = [];
  private core: THREE.Mesh | null = null;
  private outerGlow: THREE.Mesh | null = null;
  private time = 0;
  private ampSmooth = 0;
  private bassSmooth = 0;

  init(ctx: RenderContext) {
    // Create max branches — we'll hide unused ones via opacity
    for (let b = 0; b < MAX_BRANCHES; b++) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(POINTS_PER_BRANCH * 3);
      const colors = new Float32Array(POINTS_PER_BRANCH * 3);
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        linewidth: 1,
      });

      const line = new THREE.Line(geometry, material);
      this.lines.push(line);
      this.lineColors.push(colors);
      ctx.scene.add(line);
    }

    // Central pulsing core
    const coreGeo = new THREE.SphereGeometry(0.2, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00ff41,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    ctx.scene.add(this.core);

    // Outer glow halo
    const glowGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00ff41,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    this.outerGlow = new THREE.Mesh(glowGeo, glowMat);
    ctx.scene.add(this.outerGlow);
  }

  update(ctx: RenderContext, input: ReactiveInput, delta: number) {
    this.time += delta;
    const { frame, intensityMultiplier, palette, params } = input;
    const bass = frame.bass * intensityMultiplier;
    const mid = frame.mid * intensityMultiplier;
    const treble = frame.treble * intensityMultiplier;
    const amp = frame.amplitude * intensityMultiplier;

    this.ampSmooth += (amp - this.ampSmooth) * 0.12;
    this.bassSmooth += (bass - this.bassSmooth) * 0.1;

    const branchCount = Math.round(Number(params.branches ?? 8));
    const complexity = Number(params.complexity ?? 0.5);
    const t = this.time;

    const c1 = new THREE.Color(palette[0] ?? "#00FF41");
    const c2 = new THREE.Color(palette[1] ?? "#FF55FF");
    const c3 = new THREE.Color(palette[2] ?? "#55FFFF");

    for (let b = 0; b < MAX_BRANCHES; b++) {
      const line = this.lines[b];
      const colors = this.lineColors[b];
      if (!line || !colors) continue;

      const mat = line.material as THREE.LineBasicMaterial;
      if (b >= branchCount) {
        mat.opacity = 0;
        continue;
      }

      const positions = line.geometry.attributes.position as THREE.BufferAttribute;
      const angle = (b / branchCount) * Math.PI * 2;
      const branchPhase = b * 1.618; // golden ratio spacing

      for (let p = 0; p < POINTS_PER_BRANCH; p++) {
        const frac = p / POINTS_PER_BRANCH;
        const radius = frac * (3 + this.bassSmooth * 2);

        // Multi-frequency oscillation based on complexity
        const wave1 = Math.sin(t * 2 + frac * (6 + complexity * 8) + branchPhase) * (bass * 0.6 + 0.15);
        const wave2 = Math.cos(t * 3.3 + frac * (4 + complexity * 12) + branchPhase * 2) * (mid * 0.4);
        const wave3 = Math.sin(t * 5.7 + frac * (10 + complexity * 6) + branchPhase * 3) * (treble * 0.2) * frac;

        // Organic undulation
        const undulate = Math.sin(t * 1.5 + frac * 3 + b * 0.7) * 0.15 * (1 + complexity);

        const totalAngle = angle + wave1 + wave2 + undulate;
        const x = Math.cos(totalAngle) * radius + wave3;
        const y = Math.sin(totalAngle) * radius + wave3;
        const z = Math.sin(t * 0.8 + frac * 5 + branchPhase) * (0.3 + complexity * 0.5) * (1 + this.ampSmooth);

        positions.setXYZ(p, x, y, z);

        // Per-vertex color gradient along branch
        const colorFrac = frac;
        const mixed = c1.clone().lerp(c2, colorFrac).lerp(c3, Math.sin(t + frac * 3 + b) * 0.5 + 0.5);
        const vertBrightness = (1 - frac * 0.6) * (0.3 + this.ampSmooth * 0.7);
        colors[p * 3] = mixed.r * vertBrightness;
        colors[p * 3 + 1] = mixed.g * vertBrightness;
        colors[p * 3 + 2] = mixed.b * vertBrightness;
      }

      positions.needsUpdate = true;
      line.geometry.attributes.color!.needsUpdate = true;
      mat.opacity = 0.3 + this.ampSmooth * 0.7;
    }

    // Core pulse
    if (this.core) {
      const coreScale = 0.4 + this.ampSmooth * 2 + Math.sin(t * 4) * 0.1;
      this.core.scale.setScalar(coreScale);
      (this.core.material as THREE.MeshBasicMaterial).color.copy(c1);
      (this.core.material as THREE.MeshBasicMaterial).opacity = 0.4 + this.ampSmooth * 0.6;
    }

    // Outer glow breathe
    if (this.outerGlow) {
      const glowScale = 1 + this.ampSmooth * 3 + this.bassSmooth * 1.5;
      this.outerGlow.scale.setScalar(glowScale);
      (this.outerGlow.material as THREE.MeshBasicMaterial).color.copy(c1);
      (this.outerGlow.material as THREE.MeshBasicMaterial).opacity = 0.06 + this.ampSmooth * 0.12;
    }
  }

  dispose() {
    for (const line of this.lines) {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    if (this.core) {
      this.core.geometry.dispose();
      (this.core.material as THREE.Material).dispose();
    }
    if (this.outerGlow) {
      this.outerGlow.geometry.dispose();
      (this.outerGlow.material as THREE.Material).dispose();
    }
    this.lines = [];
    this.lineColors = [];
    this.core = null;
    this.outerGlow = null;
  }

  getControlsSchema(): TemplateControl[] {
    return [
      { id: "branches", label: "Branch Count", type: "slider", default: 8, min: 3, max: 16, step: 1 },
      { id: "complexity", label: "Complexity", type: "slider", default: 0.5, min: 0, max: 1, step: 0.01 },
    ];
  }
}

export default new FilamentPulse();
