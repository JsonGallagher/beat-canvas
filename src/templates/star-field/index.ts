import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

const LAYER_COUNT = 4;
const STARS_PER_LAYER = 2500;

class StarField implements TemplateModule {
  id = "star-field";
  name = "Star Field";
  tags = ["particles", "space"];

  private layers: THREE.Points[] = [];
  private positions: Float32Array[] = [];
  private colors: Float32Array[] = [];
  private time = 0;
  private bassSmooth = 0;
  private ampSmooth = 0;
  private burstTimer = 0;

  init(ctx: RenderContext) {
    for (let l = 0; l < LAYER_COUNT; l++) {
      const count = STARS_PER_LAYER;
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        pos[i3] = (Math.random() - 0.5) * 24;
        pos[i3 + 1] = (Math.random() - 0.5) * 35;
        pos[i3 + 2] = -l * 5 - Math.random() * 12;
        col[i3] = 1;
        col[i3 + 1] = 1;
        col[i3 + 2] = 1;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(col, 3));

      const material = new THREE.PointsMaterial({
        size: 0.025 + l * 0.012,
        vertexColors: true,
        transparent: true,
        opacity: 1 - l * 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });

      const points = new THREE.Points(geometry, material);
      this.layers.push(points);
      this.positions.push(pos);
      this.colors.push(col);
      ctx.scene.add(points);
    }
  }

  update(_ctx: RenderContext, input: ReactiveInput, delta: number) {
    this.time += delta;
    const { frame, intensityMultiplier, palette, params } = input;
    const bass = frame.bass * intensityMultiplier;
    const mid = frame.mid * intensityMultiplier;
    const treble = frame.treble * intensityMultiplier;
    const amp = frame.amplitude * intensityMultiplier;

    this.bassSmooth += (bass - this.bassSmooth) * 0.1;
    this.ampSmooth += (amp - this.ampSmooth) * 0.12;

    const warpSpeed = Number(params.warpSpeed ?? 0.5);
    const density = Number(params.density ?? 0.5);

    // Detect bass transients + onset for warp bursts
    if (frame.kick) this.burstTimer = 0.3;
    if (frame.onset) this.burstTimer = 0.5; // onset = longer warp burst
    this.burstTimer = Math.max(0, this.burstTimer - delta);
    const burstMultiplier = 1 + this.burstTimer * 8 * warpSpeed;

    const c1 = new THREE.Color(palette[0] ?? "#FFFFFF");
    const c2 = new THREE.Color(palette[1] ?? "#55FFFF");
    const t = this.time;

    for (let l = 0; l < LAYER_COUNT; l++) {
      const layer = this.layers[l];
      const pos = this.positions[l];
      const col = this.colors[l];
      if (!layer || !pos || !col) continue;

      const layerSpeed = (0.3 + l * 0.25) * (0.5 + warpSpeed) * burstMultiplier;
      const baseForward = layerSpeed * (1 + this.bassSmooth * 4) * delta * 6;

      // How many stars to show based on density
      const activeCount = Math.floor(STARS_PER_LAYER * (0.4 + density * 0.6));

      for (let i = 0; i < STARS_PER_LAYER; i++) {
        const i3 = i * 3;

        if (i >= activeCount) {
          // Hide inactive stars far away
          pos[i3 + 2] = -100;
          col[i3] = 0;
          col[i3 + 1] = 0;
          col[i3 + 2] = 0;
          continue;
        }

        // Move toward camera
        pos[i3 + 2]! += baseForward;

        // Lateral drift on mid
        pos[i3]! += Math.sin(t * 0.3 + i * 0.01 + l) * mid * 0.003;
        pos[i3 + 1]! += Math.cos(t * 0.25 + i * 0.01 + l) * mid * 0.003;

        // Shooting stars on high treble
        if (treble > 0.65 && i % 40 === Math.floor(t * 12) % 40) {
          pos[i3]! += (Math.random() - 0.5) * treble * 0.8;
          pos[i3 + 1]! += (Math.random() - 0.5) * treble * 0.8;
          pos[i3 + 2]! += treble * 2;
        }

        // Wrap stars that pass camera
        if (pos[i3 + 2]! > 5) {
          pos[i3] = (Math.random() - 0.5) * 24;
          pos[i3 + 1] = (Math.random() - 0.5) * 35;
          pos[i3 + 2] = -25 - Math.random() * 10;
        }

        // Color: closer stars tint toward palette color, far stars white
        // Onset flash: max brightness for one frame
        const onsetBright = frame.onset ? 1.0 : 0;
        const zNorm = Math.max(0, Math.min(1, (pos[i3 + 2]! + 25) / 30));
        const starColor = c1.clone().lerp(c2, zNorm * 0.5 + Math.sin(i * 0.1 + t * 0.3) * 0.2);
        const brightness = 0.4 + this.ampSmooth * 0.6 + zNorm * 0.3 + onsetBright * 0.6;
        col[i3] = starColor.r * brightness;
        col[i3 + 1] = starColor.g * brightness;
        col[i3 + 2] = starColor.b * brightness;
      }

      layer.geometry.attributes.position!.needsUpdate = true;
      layer.geometry.attributes.color!.needsUpdate = true;

      const mat = layer.material as THREE.PointsMaterial;
      // Size stretching during warp
      mat.size = (0.025 + l * 0.012) * (1 + this.ampSmooth * 0.6 + this.burstTimer * 3);
      mat.opacity = (0.5 - l * 0.1) + this.ampSmooth * 0.5;
    }
  }

  dispose() {
    for (const layer of this.layers) {
      layer.geometry.dispose();
      (layer.material as THREE.Material).dispose();
    }
    this.layers = [];
    this.positions = [];
    this.colors = [];
  }

  getControlsSchema(): TemplateControl[] {
    return [
      { id: "warpSpeed", label: "Warp Speed", type: "slider", default: 0.5, min: 0, max: 1, step: 0.01 },
      { id: "density", label: "Density", type: "slider", default: 0.7, min: 0.1, max: 1, step: 0.01 },
    ];
  }
}

export default new StarField();
