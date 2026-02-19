import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

const RING_COUNT = 7;

class NeonRings implements TemplateModule {
  id = "neon-rings";
  name = "Neon Rings";
  tags = ["neon", "retro"];

  private rings: THREE.Mesh[] = [];
  private time = 0;
  private bandSmooth = [0, 0, 0];
  private ampSmooth = 0;

  init(ctx: RenderContext) {
    for (let i = 0; i < RING_COUNT; i++) {
      const radius = 0.6 + i * 0.55;
      const tubeRadius = 0.02 + i * 0.005;
      const geometry = new THREE.TorusGeometry(radius, tubeRadius, 16, 80);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff41,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });

      const ring = new THREE.Mesh(geometry, material);
      this.rings.push(ring);
      ctx.scene.add(ring);
    }
  }

  update(_ctx: RenderContext, input: ReactiveInput, delta: number) {
    this.time += delta;
    const { frame, intensityMultiplier, palette, params } = input;
    const amp = frame.amplitude * intensityMultiplier;
    const bass = frame.bass * intensityMultiplier;
    const mid = frame.mid * intensityMultiplier;
    const treble = frame.treble * intensityMultiplier;

    this.ampSmooth += (amp - this.ampSmooth) * 0.12;
    this.bandSmooth[0]! += (bass - this.bandSmooth[0]!) * 0.1;
    this.bandSmooth[1]! += (mid - this.bandSmooth[1]!) * 0.1;
    this.bandSmooth[2]! += (treble - this.bandSmooth[2]!) * 0.1;

    const bloom = Number(params.bloom ?? 0.7);
    const t = this.time;
    const bands = [bass, mid, treble];
    const bandsSm = this.bandSmooth;

    for (let i = 0; i < RING_COUNT; i++) {
      const ring = this.rings[i];
      if (!ring) continue;

      const bandIdx = i % 3;
      const band = bands[bandIdx] ?? 0.5;
      const bandSm = bandsSm[bandIdx] ?? 0.5;

      // Gyroscopic rotation — each ring on different axis, different speed
      const speed1 = 0.3 + i * 0.12;
      const speed2 = 0.2 + i * 0.08;
      const dir = i % 2 === 0 ? 1 : -1;

      // Figure-8 style rotation with wobble on bass
      ring.rotation.x = Math.PI * 0.5
        + Math.sin(t * speed1 * dir) * (0.5 + bandSm * 0.5)
        + Math.sin(t * 0.7 + i) * this.bandSmooth[0]! * 0.3;
      ring.rotation.y = t * speed2 * dir
        + Math.cos(t * 0.5 + i * 0.8) * mid * 0.4;
      ring.rotation.z = Math.sin(t * (speed1 * 0.3) + i * 1.2) * 0.2;

      // Scale pulse — reactive to frequency band
      const baseScale = 1 + bandSm * 0.5 + this.ampSmooth * 0.2;
      const breathe = Math.sin(t * 2 + i * 0.9) * 0.06;
      ring.scale.setScalar(baseScale + breathe);

      // Z-depth spread on bass
      ring.position.z = Math.sin(t * 0.4 + i * 0.7) * (0.3 + this.bandSmooth[0]! * 0.5);

      // Color from palette
      const colorIndex = i % palette.length;
      const color = new THREE.Color(palette[colorIndex] ?? "#00FF41");
      const mat = ring.material as THREE.MeshBasicMaterial;
      const brightness = 0.25 + bandSm * 0.75;
      mat.color.copy(color).multiplyScalar(brightness);
      mat.opacity = (0.3 + band * 0.5) * bloom + this.ampSmooth * 0.2;
    }
  }

  dispose() {
    for (const ring of this.rings) {
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
    }
    this.rings = [];
  }

  getControlsSchema(): TemplateControl[] {
    return [
      { id: "bloom", label: "Bloom Intensity", type: "slider", default: 0.7, min: 0.1, max: 1, step: 0.01 },
    ];
  }
}

export default new NeonRings();
