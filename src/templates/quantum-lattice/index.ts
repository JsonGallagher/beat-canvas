import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

const PARTICLE_COUNT = 3000;
const NEIGHBORS = 6;
const RADIUS = 2.5;

class QuantumLattice implements TemplateModule {
  id = "quantum-lattice";
  name = "Quantum Lattice";
  tags = ["geometric", "network", "energy"];

  private positions: Float32Array = new Float32Array(0);
  private basePositions: Float32Array = new Float32Array(0);
  private pointColors: Float32Array = new Float32Array(0);
  private edges: Int32Array = new Int32Array(0);
  private edgeWeights: Float32Array = new Float32Array(0);
  private linePositions: Float32Array = new Float32Array(0);
  private lineColors: Float32Array = new Float32Array(0);
  private points: THREE.Points | null = null;
  private lines: THREE.LineSegments | null = null;
  private time = 0;
  private bassSmooth = 0;
  private ampSmooth = 0;
  private kickFlash = 0;
  private wavePhase = 0;
  private onsetRotDir = 1;
  private rotAngle = 0;

  init(ctx: RenderContext) {
    // Fibonacci sphere distribution for uniform coverage
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const pos = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * i;
      pos[i * 3] = r * Math.cos(theta) * RADIUS;
      pos[i * 3 + 1] = y * RADIUS;
      pos[i * 3 + 2] = r * Math.sin(theta) * RADIUS;
    }

    this.basePositions = new Float32Array(pos);
    this.positions = new Float32Array(pos);
    this.pointColors = new Float32Array(PARTICLE_COUNT * 3);

    // Pre-bake 6-nearest-neighbor edges (one-time O(n²) in init)
    const edgePairs: number[] = [];
    const edgeAdded = new Set<number>();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = pos[i * 3]!;
      const iy = pos[i * 3 + 1]!;
      const iz = pos[i * 3 + 2]!;

      // Maintain a max-heap of size NEIGHBORS for nearest neighbors
      const knn: Array<[number, number]> = []; // [dist², j]

      for (let j = 0; j < PARTICLE_COUNT; j++) {
        if (j === i) continue;
        const dx = pos[j * 3]! - ix;
        const dy = pos[j * 3 + 1]! - iy;
        const dz = pos[j * 3 + 2]! - iz;
        const d2 = dx * dx + dy * dy + dz * dz;

        if (knn.length < NEIGHBORS) {
          knn.push([d2, j]);
          if (knn.length === NEIGHBORS) {
            knn.sort((a, b) => b[0]! - a[0]!); // max at front
          }
        } else if (d2 < knn[0]![0]!) {
          knn[0] = [d2, j];
          knn.sort((a, b) => b[0]! - a[0]!);
        }
      }

      for (const [, j] of knn) {
        const lo = Math.min(i, j);
        const hi = Math.max(i, j);
        const key = lo * PARTICLE_COUNT + hi;
        if (!edgeAdded.has(key)) {
          edgeAdded.add(key);
          edgePairs.push(lo, hi);
        }
      }
    }

    this.edges = new Int32Array(edgePairs);
    const edgeCount = edgePairs.length / 2;

    // Edge weights: distance from north pole (top of sphere) normalized 0–1
    this.edgeWeights = new Float32Array(edgeCount);
    for (let e = 0; e < edgeCount; e++) {
      const i = edgePairs[e * 2]!;
      const j = edgePairs[e * 2 + 1]!;
      const avgY = (this.basePositions[i * 3 + 1]! + this.basePositions[j * 3 + 1]!) * 0.5;
      this.edgeWeights[e] = (RADIUS - avgY) / (2 * RADIUS); // 0 = top, 1 = bottom
    }

    this.linePositions = new Float32Array(edgeCount * 6);
    this.lineColors = new Float32Array(edgeCount * 6);

    // Points geometry
    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    pointGeo.setAttribute("color", new THREE.BufferAttribute(this.pointColors, 3));

    this.points = new THREE.Points(pointGeo, new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }));
    ctx.scene.add(this.points);

    // Line segments geometry
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(this.linePositions, 3));
    lineGeo.setAttribute("color", new THREE.BufferAttribute(this.lineColors, 3));

    this.lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    ctx.scene.add(this.lines);
  }

  update(_ctx: RenderContext, input: ReactiveInput, delta: number) {
    if (!this.points || !this.lines) return;

    this.time += delta;
    const { frame, intensityMultiplier, palette, params } = input;
    const bass = frame.bass * intensityMultiplier;
    const mid = frame.mid * intensityMultiplier;
    const treble = frame.treble * intensityMultiplier;
    const amp = frame.amplitude * intensityMultiplier;

    this.bassSmooth += (bass - this.bassSmooth) * 0.1;
    this.ampSmooth += (amp - this.ampSmooth) * 0.12;

    // Kick flash + wave
    if (frame.kick) {
      this.kickFlash = 1.0;
      this.wavePhase = 0;
    }
    this.kickFlash *= 0.85;
    const waveSpeed = Number(params.waveSpeed ?? 0.5);
    this.wavePhase += delta * waveSpeed * 6;

    // Onset: snap rotation direction
    if (frame.onset) this.onsetRotDir *= -1;

    // Y-axis rotation
    const rotSpeed = (0.3 + mid * 1.5) * this.onsetRotDir;
    this.rotAngle += rotSpeed * delta;
    const sinRot = Math.sin(this.rotAngle);
    const cosRot = Math.cos(this.rotAngle);

    const nodeSize = Number(params.nodeSize ?? 0.5);
    const density = Number(params.density ?? 1.0);
    const scaleFactor = 1 + this.bassSmooth * 0.4;

    const c1 = new THREE.Color(palette[0] ?? "#00FF41");
    const c2 = new THREE.Color(palette[1] ?? "#FF55FF");
    const c3 = new THREE.Color(palette[2] ?? "#55FFFF");

    // Update particle positions + colors
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const bx = this.basePositions[i3]!;
      const by = this.basePositions[i3 + 1]!;
      const bz = this.basePositions[i3 + 2]!;

      // Radial scale (bass breathe)
      let px = bx * scaleFactor;
      let py = by * scaleFactor;
      let pz = bz * scaleFactor;

      // Kick outward spike
      const bd = Math.sqrt(bx * bx + by * by + bz * bz) + 0.001;
      px += (bx / bd) * this.kickFlash * 0.5;
      py += (by / bd) * this.kickFlash * 0.5;
      pz += (bz / bd) * this.kickFlash * 0.5;

      // Y-axis rotation
      const rx = px * cosRot - pz * sinRot;
      const rz = px * sinRot + pz * cosRot;

      this.positions[i3] = rx;
      this.positions[i3 + 1] = py;
      this.positions[i3 + 2] = rz;

      // Color by height
      const colorT = (by / RADIUS + 1) * 0.5; // 0–1
      const col = c1.clone().lerp(c2, colorT);
      const brightness = 0.2 + this.bassSmooth * 0.5 + this.ampSmooth * 0.3;
      this.pointColors[i3] = col.r * brightness;
      this.pointColors[i3 + 1] = col.g * brightness;
      this.pointColors[i3 + 2] = col.b * brightness;
    }

    // Update edge positions + colors
    const edgeCount = this.edges.length / 2;
    const drawCount = Math.floor(edgeCount * density);

    for (let e = 0; e < edgeCount; e++) {
      const i = this.edges[e * 2]!;
      const j = this.edges[e * 2 + 1]!;
      const e6 = e * 6;

      // Line vertex positions from current particle positions
      this.linePositions[e6] = this.positions[i * 3]!;
      this.linePositions[e6 + 1] = this.positions[i * 3 + 1]!;
      this.linePositions[e6 + 2] = this.positions[i * 3 + 2]!;
      this.linePositions[e6 + 3] = this.positions[j * 3]!;
      this.linePositions[e6 + 4] = this.positions[j * 3 + 1]!;
      this.linePositions[e6 + 5] = this.positions[j * 3 + 2]!;

      if (e < drawCount) {
        const w = this.edgeWeights[e]!; // 0=top, 1=bottom
        // Wave brightness propagating from north pole on kick
        const waveBrightness = Math.sin(this.wavePhase - w * 8) * 0.5 + 0.5;
        const trebleFlicker = 0.15 + treble * Math.abs(Math.sin(e * 1.3 + this.time * 8)) * 0.5;
        const b = trebleFlicker + waveBrightness * this.kickFlash * 0.5 + this.ampSmooth * 0.2;
        const col = c1.clone().lerp(c2, w).lerp(c3, trebleFlicker * 0.4);
        this.lineColors[e6] = col.r * b;
        this.lineColors[e6 + 1] = col.g * b;
        this.lineColors[e6 + 2] = col.b * b;
        this.lineColors[e6 + 3] = col.r * b * 0.5;
        this.lineColors[e6 + 4] = col.g * b * 0.5;
        this.lineColors[e6 + 5] = col.b * b * 0.5;
      } else {
        // Hide edges beyond density limit
        this.lineColors[e6] = 0; this.lineColors[e6 + 1] = 0; this.lineColors[e6 + 2] = 0;
        this.lineColors[e6 + 3] = 0; this.lineColors[e6 + 4] = 0; this.lineColors[e6 + 5] = 0;
      }
    }

    this.points.geometry.attributes.position!.needsUpdate = true;
    this.points.geometry.attributes.color!.needsUpdate = true;
    this.lines.geometry.attributes.position!.needsUpdate = true;
    this.lines.geometry.attributes.color!.needsUpdate = true;

    const pMat = this.points.material as THREE.PointsMaterial;
    pMat.size = (0.03 + nodeSize * 0.05) * (1 + this.kickFlash * 0.5);
  }

  dispose() {
    if (this.points) {
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
    }
    if (this.lines) {
      this.lines.geometry.dispose();
      (this.lines.material as THREE.Material).dispose();
    }
    this.points = null;
    this.lines = null;
  }

  getControlsSchema(): TemplateControl[] {
    return [
      { id: "density", label: "Edge Density", type: "slider", default: 1.0, min: 0.1, max: 1, step: 0.01 },
      { id: "waveSpeed", label: "Wave Speed", type: "slider", default: 0.5, min: 0.1, max: 1, step: 0.01 },
      { id: "nodeSize", label: "Node Size", type: "slider", default: 0.5, min: 0.1, max: 1, step: 0.01 },
    ];
  }
}

export default new QuantumLattice();
