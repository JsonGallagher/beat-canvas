import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

const RING_COUNT = 8;

class GeometricBloom implements TemplateModule {
  id = "geometric-bloom";
  name = "Geometric Bloom";
  tags = ["geometric", "minimal"];

  private rings: THREE.LineSegments[] = [];
  private time = 0;
  private ampSmooth = 0;
  private bandSmooth = [0, 0, 0];

  init(ctx: RenderContext) {
    for (let i = 0; i < RING_COUNT; i++) {
      const sides = 3 + i; // triangle → decagon
      const radius = 0.4 + i * 0.5;

      // Create a proper polygon ring
      const points: THREE.Vector3[] = [];
      for (let s = 0; s <= sides; s++) {
        const angle = (s / sides) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0
        ));
      }
      const shapeGeo = new THREE.BufferGeometry().setFromPoints(points);

      const material = new THREE.LineBasicMaterial({
        color: 0x00ff41,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });

      const ring = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.RingGeometry(radius, radius + 0.015, sides)),
        material
      );
      this.rings.push(ring);
      ctx.scene.add(ring);

      shapeGeo.dispose();
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

    const symmetry = Number(params.symmetry ?? 0.5);
    const t = this.time;

    const bands = [bass, mid, treble];
    const bandsSm = this.bandSmooth;

    for (let i = 0; i < RING_COUNT; i++) {
      const ring = this.rings[i];
      if (!ring) continue;

      const bandIdx = i % 3;
      const band = bands[bandIdx] ?? 0.5;
      const bandSm = bandsSm[bandIdx] ?? 0.5;

      // Dynamic scaling: base + frequency-reactive pulse
      const pulseScale = 1 + bandSm * 0.6 + this.ampSmooth * 0.3;
      const breathe = Math.sin(t * (1.5 + i * 0.3) + i * 0.8) * 0.08 * (1 + symmetry);
      ring.scale.setScalar(pulseScale + breathe);

      // Multi-axis rotation with symmetry control
      const baseSpeed = 0.15 + i * 0.08;
      const direction = i % 2 === 0 ? 1 : -1;
      ring.rotation.z = t * baseSpeed * direction + band * Math.sin(t * 2 + i) * 0.3;
      ring.rotation.x = Math.sin(t * (0.2 + i * 0.05)) * (0.1 + symmetry * 0.4) * direction;
      ring.rotation.y = Math.cos(t * (0.15 + i * 0.04)) * (0.05 + symmetry * 0.3);

      // Z-depth stacking (spread on bass)
      ring.position.z = Math.sin(t * 0.3 + i * 0.5) * (0.2 + this.bandSmooth[0]! * 0.8);

      // Color from palette with cycling
      const colorIndex = i % palette.length;
      const color = new THREE.Color(palette[colorIndex] ?? "#00FF41");
      const mat = ring.material as THREE.LineBasicMaterial;
      const brightness = 0.2 + bandSm * 0.8;
      mat.color.copy(color).multiplyScalar(brightness);
      mat.opacity = 0.3 + bandSm * 0.7;
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
      { id: "symmetry", label: "Symmetry", type: "slider", default: 0.5, min: 0, max: 1, step: 0.01 },
    ];
  }
}

export default new GeometricBloom();
