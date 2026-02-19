import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

const GRID_SIZE = 16;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;

class GlitchGrid implements TemplateModule {
  id = "glitch-grid";
  name = "Glitch Grid";
  tags = ["glitch", "digital"];

  private mesh: THREE.InstancedMesh | null = null;
  private dummy = new THREE.Object3D();
  private colorAttr: THREE.InstancedBufferAttribute | null = null;
  private time = 0;
  private glitchSeeds: Float32Array | null = null;
  private zOffsets: Float32Array | null = null;
  private bassSmooth = 0;
  private prevBass = 0;

  init(ctx: RenderContext) {
    const geometry = new THREE.BoxGeometry(0.28, 0.28, 0.28);
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.InstancedMesh(geometry, material, CELL_COUNT);
    const colors = new Float32Array(CELL_COUNT * 3);
    this.colorAttr = new THREE.InstancedBufferAttribute(colors, 3);
    this.mesh.instanceColor = this.colorAttr;

    this.glitchSeeds = new Float32Array(CELL_COUNT);
    this.zOffsets = new Float32Array(CELL_COUNT);
    for (let i = 0; i < CELL_COUNT; i++) {
      this.glitchSeeds[i] = Math.random();
      this.zOffsets[i] = 0;
    }

    // Initial grid layout
    for (let i = 0; i < CELL_COUNT; i++) {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      this.dummy.position.set(
        (col - GRID_SIZE / 2 + 0.5) * 0.38,
        (row - GRID_SIZE / 2 + 0.5) * 0.55,
        0
      );
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    ctx.scene.add(this.mesh);
  }

  update(_ctx: RenderContext, input: ReactiveInput, delta: number) {
    if (!this.mesh || !this.colorAttr || !this.glitchSeeds || !this.zOffsets) return;

    this.time += delta;
    const { frame, intensityMultiplier, palette, params } = input;
    const bass = frame.bass * intensityMultiplier;
    const mid = frame.mid * intensityMultiplier;
    const treble = frame.treble * intensityMultiplier;
    const amp = frame.amplitude * intensityMultiplier;

    this.bassSmooth += (bass - this.bassSmooth) * 0.15;
    const glitchAmount = Number(params.glitchAmount ?? 0.5);

    // Detect bass transients
    const bassHit = bass - this.prevBass > 0.15;
    this.prevBass = bass;

    const color1 = new THREE.Color(palette[0] ?? "#00FF41");
    const color2 = new THREE.Color(palette[1] ?? "#FF55FF");
    const color3 = new THREE.Color(palette[2] ?? "#55FFFF");

    const t = this.time;

    for (let i = 0; i < CELL_COUNT; i++) {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      const seed = this.glitchSeeds[i]!;

      // Base position
      let x = (col - GRID_SIZE / 2 + 0.5) * 0.38;
      let y = (row - GRID_SIZE / 2 + 0.5) * 0.55;

      // Row shift glitch on bass — alternating rows
      const rowGlitch = Math.sin(t * 4 + row * 1.7) * this.bassSmooth * glitchAmount * 0.8;
      if (row % 2 === 0) x += rowGlitch;

      // Column scatter on treble
      if (treble > 0.5 && seed > 0.7 * (1 - glitchAmount)) {
        x += Math.sin(seed * 100 + t * 12) * treble * 0.15 * glitchAmount;
        y += Math.cos(seed * 73 + t * 15) * treble * 0.1 * glitchAmount;
      }

      // Z-depth explosion on bass hits
      const targetZ = bassHit && seed > 0.5
        ? (seed - 0.5) * 2 * bass * glitchAmount
        : 0;
      this.zOffsets[i]! += (targetZ - this.zOffsets[i]!) * 0.1;
      const z = this.zOffsets[i]!;

      this.dummy.position.set(x, y, z);

      // Scale: base + pulse on amplitude, random pop on treble
      let scale = 0.6 + amp * 0.6;
      if (treble > 0.6 && seed > 0.8) {
        scale *= 1 + (treble - 0.6) * 3 * glitchAmount;
      }
      this.dummy.scale.setScalar(scale);

      // Multi-axis rotation glitch
      this.dummy.rotation.set(
        treble * Math.sin(t * 5 + seed * 50) * 0.6 * glitchAmount,
        mid * Math.cos(t * 4 + seed * 30) * 0.4 * glitchAmount,
        Math.sin(t * 3 + row * 0.3 + col * 0.2) * this.bassSmooth * 0.8 * glitchAmount
      );

      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      // Color: RGB channel split effect
      const colorPhase = (Math.sin(t * 2 + col * 0.4 + row * 0.3 + seed * 5) + 1) * 0.5;
      const colorPhase2 = (Math.sin(t * 1.5 + seed * 10) + 1) * 0.5;
      const c = color1.clone().lerp(color2, colorPhase).lerp(color3, colorPhase2 * 0.4);

      // Brightness pulse
      const brightness = 0.15 + amp * 0.85 + Math.sin(t * 6 + i * 0.5) * treble * 0.1;

      // Glitch color: occasional random bright flash
      if (treble > 0.7 && seed > 0.9 * (1 - glitchAmount)) {
        this.colorAttr.setXYZ(i, 1, 1, 1); // white flash
      } else {
        this.colorAttr.setXYZ(i, c.r * brightness, c.g * brightness, c.b * brightness);
      }
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    this.colorAttr.needsUpdate = true;

    // Subtle whole-mesh rotation
    this.mesh.rotation.z = Math.sin(t * 0.2) * 0.05;
    this.mesh.rotation.x = Math.sin(t * 0.15) * 0.03;
  }

  dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }
    this.mesh = null;
    this.colorAttr = null;
    this.glitchSeeds = null;
    this.zOffsets = null;
  }

  getControlsSchema(): TemplateControl[] {
    return [
      { id: "glitchAmount", label: "Glitch Amount", type: "slider", default: 0.6, min: 0, max: 1, step: 0.01 },
    ];
  }
}

export default new GlitchGrid();
