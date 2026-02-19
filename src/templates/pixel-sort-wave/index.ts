import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

const COLUMN_COUNT = 80;
const ROW_COUNT = 140;
const TOTAL = COLUMN_COUNT * ROW_COUNT;

class PixelSortWave implements TemplateModule {
  id = "pixel-sort-wave";
  name = "Pixel Sort Wave";
  tags = ["glitch", "wave"];

  private mesh: THREE.InstancedMesh | null = null;
  private dummy = new THREE.Object3D();
  private colorAttr: THREE.InstancedBufferAttribute | null = null;
  private baseHues: Float32Array | null = null;
  private displaceX: Float32Array | null = null;
  private time = 0;
  private ampSmooth = 0;
  private bassSmooth = 0;

  init(ctx: RenderContext) {
    const geometry = new THREE.PlaneGeometry(0.095, 0.058);
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.InstancedMesh(geometry, material, TOTAL);
    const colors = new Float32Array(TOTAL * 3);
    this.colorAttr = new THREE.InstancedBufferAttribute(colors, 3);
    this.mesh.instanceColor = this.colorAttr;

    this.baseHues = new Float32Array(TOTAL);
    this.displaceX = new Float32Array(TOTAL);
    for (let i = 0; i < TOTAL; i++) {
      this.baseHues[i] = Math.random();
      this.displaceX[i] = 0;
    }

    // Position grid
    for (let i = 0; i < TOTAL; i++) {
      const col = i % COLUMN_COUNT;
      const row = Math.floor(i / COLUMN_COUNT);
      this.dummy.position.set(
        (col - COLUMN_COUNT / 2) * 0.1,
        (row - ROW_COUNT / 2) * 0.063,
        0
      );
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    ctx.scene.add(this.mesh);
  }

  update(_ctx: RenderContext, input: ReactiveInput, delta: number) {
    if (!this.mesh || !this.colorAttr || !this.baseHues || !this.displaceX) return;

    this.time += delta;
    const { frame, intensityMultiplier, palette, params } = input;
    const amp = frame.amplitude * intensityMultiplier;
    const bass = frame.bass * intensityMultiplier;
    const mid = frame.mid * intensityMultiplier;
    const treble = frame.treble * intensityMultiplier;

    this.ampSmooth += (amp - this.ampSmooth) * 0.12;
    this.bassSmooth += (bass - this.bassSmooth) * 0.1;

    const threshold = Number(params.threshold ?? 0.5);
    const sortThreshold = 0.15 + threshold * 0.6;

    const color1 = new THREE.Color(palette[0] ?? "#00FF41");
    const color2 = new THREE.Color(palette[1] ?? "#FF55FF");
    const color3 = new THREE.Color(palette[2] ?? "#55FFFF");

    const t = this.time;

    for (let i = 0; i < TOTAL; i++) {
      const col = i % COLUMN_COUNT;
      const row = Math.floor(i / COLUMN_COUNT);
      const brightness = this.baseHues[i]!;

      // Sort wave: cascading from top, rippling outward from center
      const rowNorm = row / ROW_COUNT;
      const colNorm = col / COLUMN_COUNT;
      const centerDist = Math.abs(colNorm - 0.5) * 2;

      // Wave front travels down
      const waveFront = (Math.sin(t * 1.5 - rowNorm * 4) + 1) * 0.5;
      const shouldSort = brightness > sortThreshold * (1 - waveFront * this.ampSmooth);

      // Displacement: sorted pixels slide horizontally
      let targetDisp = 0;
      if (shouldSort) {
        const sortDir = colNorm > 0.5 ? 1 : -1;
        const sortMag = (brightness - sortThreshold) * bass * 3 * (1 - centerDist * 0.5);
        targetDisp = sortDir * sortMag + Math.sin(t * 3 + row * 0.15) * mid * 0.5;
      }

      // Treble: vertical scatter for sorted pixels
      let yOffset = 0;
      if (shouldSort && treble > 0.4) {
        yOffset = Math.sin(brightness * 50 + t * 8) * (treble - 0.4) * 0.08;
      }

      // Smooth displacement
      this.displaceX[i]! += (targetDisp - this.displaceX[i]!) * 0.12;

      this.dummy.position.set(
        (col - COLUMN_COUNT / 2) * 0.1 + this.displaceX[i]!,
        (row - ROW_COUNT / 2) * 0.063 + yOffset,
        0
      );

      // Slight Z push for sorted pixels
      if (shouldSort) {
        this.dummy.position.z = this.ampSmooth * 0.1 * brightness;
      }

      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      // Color: sorted pixels get palette gradient, unsorted stay dim
      if (shouldSort) {
        const colorT = (Math.sin(t * 0.8 + brightness * 6 + rowNorm * 2) + 1) * 0.5;
        const colorT2 = (Math.cos(t * 0.5 + colNorm * 4) + 1) * 0.5;
        const c = color1.clone().lerp(color2, colorT).lerp(color3, colorT2 * 0.3);
        const b = 0.6 + this.ampSmooth * 0.4;
        this.colorAttr.setXYZ(i, c.r * b, c.g * b, c.b * b);
      } else {
        const dimBright = 0.04 + this.ampSmooth * 0.12;
        this.colorAttr.setXYZ(i, color1.r * dimBright, color1.g * dimBright, color1.b * dimBright);
      }
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
  }

  dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }
    this.mesh = null;
    this.colorAttr = null;
    this.baseHues = null;
    this.displaceX = null;
  }

  getControlsSchema(): TemplateControl[] {
    return [
      { id: "threshold", label: "Sort Threshold", type: "slider", default: 0.45, min: 0, max: 1, step: 0.01 },
    ];
  }
}

export default new PixelSortWave();
