import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

/**
 * Sacred Geometry — A dense, evolving geometric mandala built from thousands
 * of particles arranged in nested sacred patterns: Flower of Life, Metatron's
 * Cube, nested polygons. Connections glow and pulse with frequency data.
 * The whole structure breathes, rotates in 3D, and individual nodes orbit.
 */

const NODE_COUNT = 2000;
const CONNECTION_COUNT = 800;

class SacredGeometry implements TemplateModule {
  id = "sacred-geometry";
  name = "Sacred Geometry";
  tags = ["geometric", "spiritual"];

  private particles: THREE.Points | null = null;
  private positions: Float32Array | null = null;
  private colors: Float32Array | null = null;
  private sizes: Float32Array | null = null;
  private basePositions: Float32Array | null = null;
  private phases: Float32Array | null = null;
  private layers: Float32Array | null = null; // which layer each particle is on

  private connections: THREE.LineSegments | null = null;
  private connPositions: Float32Array | null = null;
  private connColors: Float32Array | null = null;

  private time = 0;
  private bassSmooth = 0;
  private midSmooth = 0;
  private trebleSmooth = 0;
  private ampSmooth = 0;

  private _generateSacredPoints(): { positions: Float32Array; layers: Float32Array } {
    const pos = new Float32Array(NODE_COUNT * 3);
    const lay = new Float32Array(NODE_COUNT);
    let idx = 0;

    const addPoint = (x: number, y: number, z: number, layer: number) => {
      if (idx >= NODE_COUNT) return;
      pos[idx * 3] = x;
      pos[idx * 3 + 1] = y;
      pos[idx * 3 + 2] = z;
      lay[idx] = layer;
      idx++;
    };

    // Layer 0: Center seed of life (7 circles, points along each)
    const seedRadius = 1;
    for (let c = 0; c < 7; c++) {
      const cx = c === 0 ? 0 : Math.cos((c - 1) / 6 * Math.PI * 2) * seedRadius;
      const cy = c === 0 ? 0 : Math.sin((c - 1) / 6 * Math.PI * 2) * seedRadius;
      const pts = 24;
      for (let p = 0; p < pts; p++) {
        const angle = (p / pts) * Math.PI * 2;
        addPoint(cx + Math.cos(angle) * seedRadius, cy + Math.sin(angle) * seedRadius, 0, 0);
      }
    }

    // Layer 1: Flower of Life — 12 outer circles
    for (let c = 0; c < 12; c++) {
      const angle = (c / 12) * Math.PI * 2;
      const cx = Math.cos(angle) * seedRadius * 2;
      const cy = Math.sin(angle) * seedRadius * 2;
      const pts = 18;
      for (let p = 0; p < pts; p++) {
        const a = (p / pts) * Math.PI * 2;
        addPoint(cx + Math.cos(a) * seedRadius, cy + Math.sin(a) * seedRadius, 0, 1);
      }
    }

    // Layer 2: Metatron's cube vertices + connecting paths
    const metatronR = 3;
    // 13 vertices of Metatron's cube
    addPoint(0, 0, 0, 2);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      addPoint(Math.cos(angle) * metatronR * 0.5, Math.sin(angle) * metatronR * 0.5, 0, 2);
      addPoint(Math.cos(angle) * metatronR, Math.sin(angle) * metatronR, 0, 2);
    }

    // Points along the connecting lines of Metatron's cube
    for (let i = 0; i < 6; i++) {
      for (let j = i + 1; j < 6; j++) {
        const a1 = (i / 6) * Math.PI * 2;
        const a2 = (j / 6) * Math.PI * 2;
        const segs = 8;
        for (let s = 0; s < segs; s++) {
          const t = s / segs;
          addPoint(
            Math.cos(a1) * metatronR * (1 - t) + Math.cos(a2) * metatronR * t,
            Math.sin(a1) * metatronR * (1 - t) + Math.sin(a2) * metatronR * t,
            0, 2
          );
        }
      }
    }

    // Layer 3: Outer concentric rings with varying polygon counts
    const polyOrders = [3, 4, 5, 6, 8, 12];
    for (let ring = 0; ring < polyOrders.length; ring++) {
      const r = 3.5 + ring * 0.6;
      const sides = polyOrders[ring]!;
      const ptsPerSide = 12;
      for (let s = 0; s < sides; s++) {
        for (let p = 0; p < ptsPerSide; p++) {
          const t = p / ptsPerSide;
          const a1 = (s / sides) * Math.PI * 2;
          const a2 = ((s + 1) / sides) * Math.PI * 2;
          const x = Math.cos(a1) * r * (1 - t) + Math.cos(a2) * r * t;
          const y = Math.sin(a1) * r * (1 - t) + Math.sin(a2) * r * t;
          addPoint(x, y, 0, 3);
        }
      }
    }

    // Layer 4: Scattered orbital particles filling gaps
    while (idx < NODE_COUNT) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.5 + Math.random() * 6;
      addPoint(Math.cos(angle) * r, Math.sin(angle) * r, (Math.random() - 0.5) * 0.5, 4);
    }

    return { positions: pos, layers: lay };
  }

  private _generateConnections(): Float32Array {
    // Connect nearby particles — builds the sacred grid
    const pos = this.basePositions!;
    const conns = new Float32Array(CONNECTION_COUNT * 6); // 2 endpoints * 3 components
    let ci = 0;

    for (let i = 0; i < NODE_COUNT && ci < CONNECTION_COUNT; i += 3) {
      const ax = pos[i * 3]!;
      const ay = pos[i * 3 + 1]!;
      const az = pos[i * 3 + 2]!;

      // Find closest neighbor not too far
      let bestJ = -1;
      let bestDist = 1.5;
      for (let j = i + 1; j < Math.min(i + 30, NODE_COUNT); j++) {
        const dx = pos[j * 3]! - ax;
        const dy = pos[j * 3 + 1]! - ay;
        const dz = pos[j * 3 + 2]! - az;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < bestDist && d > 0.1) {
          bestDist = d;
          bestJ = j;
        }
      }

      if (bestJ >= 0) {
        const idx = ci * 6;
        conns[idx] = ax;
        conns[idx + 1] = ay;
        conns[idx + 2] = az;
        conns[idx + 3] = pos[bestJ * 3]!;
        conns[idx + 4] = pos[bestJ * 3 + 1]!;
        conns[idx + 5] = pos[bestJ * 3 + 2]!;
        ci++;
      }
    }

    return conns;
  }

  init(ctx: RenderContext) {
    const { positions, layers } = this._generateSacredPoints();
    this.basePositions = new Float32Array(positions);
    this.layers = layers;
    this.positions = positions;
    this.colors = new Float32Array(NODE_COUNT * 3);
    this.sizes = new Float32Array(NODE_COUNT);
    this.phases = new Float32Array(NODE_COUNT);
    for (let i = 0; i < NODE_COUNT; i++) this.phases[i] = Math.random() * Math.PI * 2;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(this.sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geo, mat);
    ctx.scene.add(this.particles);

    // Connections
    this.connPositions = this._generateConnections();
    this.connColors = new Float32Array(CONNECTION_COUNT * 6);

    const connGeo = new THREE.BufferGeometry();
    connGeo.setAttribute("position", new THREE.BufferAttribute(this.connPositions, 3));
    connGeo.setAttribute("color", new THREE.BufferAttribute(this.connColors, 3));

    const connMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.connections = new THREE.LineSegments(connGeo, connMat);
    ctx.scene.add(this.connections);
  }

  update(_ctx: RenderContext, input: ReactiveInput, delta: number) {
    if (!this.particles || !this.positions || !this.basePositions || !this.colors || !this.sizes || !this.phases || !this.layers) return;
    if (!this.connections || !this.connPositions || !this.connColors) return;

    this.time += delta;
    const { frame, intensityMultiplier, palette, params } = input;
    const bass = frame.bass * intensityMultiplier;
    const mid = frame.mid * intensityMultiplier;
    const treble = frame.treble * intensityMultiplier;
    const amp = frame.amplitude * intensityMultiplier;

    this.bassSmooth += (bass - this.bassSmooth) * 0.1;
    this.midSmooth += (mid - this.midSmooth) * 0.12;
    this.trebleSmooth += (treble - this.trebleSmooth) * 0.15;
    this.ampSmooth += (amp - this.ampSmooth) * 0.1;

    const bassAccel = bass - this.bassPrev;
    this.bassPrev = bass;
    if (bassAccel > 0.12) this.kickAccum = Math.min(this.kickAccum + bassAccel * 2, 1);
    this.kickAccum *= 0.92;

    const evolve = Number(params.evolve ?? 0.5);
    const glow = Number(params.glow ?? 0.7);
    const t = this.time;

    const c1 = new THREE.Color(palette[0] ?? "#00FF41");
    const c2 = new THREE.Color(palette[1] ?? "#FF55FF");
    const c3 = new THREE.Color(palette[2] ?? "#55FFFF");

    for (let i = 0; i < NODE_COUNT; i++) {
      const i3 = i * 3;
      const bx = this.basePositions[i3]!;
      const by = this.basePositions[i3 + 1]!;
      const bz = this.basePositions[i3 + 2]!;
      const layer = this.layers[i]!;
      const phase = this.phases[i]!;

      const dist = Math.sqrt(bx * bx + by * by);
      const angle = Math.atan2(by, bx);

      // Layer-specific animations
      let dx = 0, dy = 0, dz = 0;

      if (layer === 0) {
        // Seed breathes with bass
        const breathe = 1 + this.bassSmooth * 0.4;
        dx = bx * (breathe - 1);
        dy = by * (breathe - 1);
        dz = Math.sin(phase + t * 3) * this.bassSmooth * 0.2;
      } else if (layer === 1) {
        // Flower orbits with mid
        const orbit = t * 0.2 * evolve;
        const newAngle = angle + orbit;
        dx = Math.cos(newAngle) * dist - bx + Math.sin(phase + t * 2) * this.midSmooth * 0.15;
        dy = Math.sin(newAngle) * dist - by + Math.cos(phase + t * 1.5) * this.midSmooth * 0.15;
        dz = Math.sin(phase * 2 + t * 2.5) * this.midSmooth * 0.3;
      } else if (layer === 2) {
        // Metatron's cube rotates in 3D
        const rx = t * 0.15;
        const cosR = Math.cos(rx);
        const sinR = Math.sin(rx);
        const newZ = by * sinR + bz * cosR;
        dx = 0;
        dy = by * cosR - bz * sinR - by;
        dz = newZ - bz + this.trebleSmooth * Math.sin(phase + t * 4) * 0.2;
      } else if (layer === 3) {
        // Outer rings pulse outward on kicks
        const expansion = 1 + this.kickAccum * 0.5 + this.ampSmooth * 0.1;
        dx = bx * (expansion - 1);
        dy = by * (expansion - 1);
        dz = Math.sin(angle * 6 + t * 3) * this.trebleSmooth * 0.15;
      } else {
        // Scattered particles orbit freely
        const orbitR = dist + Math.sin(phase + t * 0.5) * 0.5;
        const orbitAngle = angle + t * 0.3 * (0.5 + evolve);
        dx = Math.cos(orbitAngle) * orbitR - bx;
        dy = Math.sin(orbitAngle) * orbitR - by;
        dz = Math.sin(phase + t * 1.5) * 0.8 + this.bassSmooth * Math.sin(phase * 3 + t * 2) * 0.5;
      }

      this.positions[i3] = bx + dx;
      this.positions[i3 + 1] = by + dy;
      this.positions[i3 + 2] = bz + dz;

      // Color by layer + frequency + distance
      const colorT = (layer * 0.2 + dist * 0.1 + t * 0.08 * evolve) % 1;
      const col = colorT < 0.33
        ? c1.clone().lerp(c2, colorT / 0.33)
        : colorT < 0.66
          ? c2.clone().lerp(c3, (colorT - 0.33) / 0.33)
          : c3.clone().lerp(c1, (colorT - 0.66) / 0.34);

      const bandVal = layer % 3 === 0 ? this.bassSmooth : layer % 3 === 1 ? this.midSmooth : this.trebleSmooth;
      const brightness = (0.15 + bandVal * 0.7 + this.ampSmooth * 0.3) * glow;
      this.colors[i3] = col.r * brightness;
      this.colors[i3 + 1] = col.g * brightness;
      this.colors[i3 + 2] = col.b * brightness;

      this.sizes[i] = 0.5 + bandVal * 2 + Math.sin(phase + t * 4) * this.trebleSmooth * 0.5;
    }

    this.particles.geometry.attributes.position!.needsUpdate = true;
    this.particles.geometry.attributes.color!.needsUpdate = true;

    const mat = this.particles.material as THREE.PointsMaterial;
    mat.size = 0.04 + this.ampSmooth * 0.06;

    // Update connection colors (pulse energy through lines)
    for (let c = 0; c < CONNECTION_COUNT; c++) {
      const c6 = c * 6;
      const pulse = Math.sin(c * 0.3 + t * 4) * 0.5 + 0.5;
      const brightness = (0.05 + this.ampSmooth * 0.3 + pulse * this.midSmooth * 0.4) * glow;

      const colorT = (c / CONNECTION_COUNT + t * 0.1) % 1;
      const col = c1.clone().lerp(c2, colorT);

      this.connColors[c6] = col.r * brightness;
      this.connColors[c6 + 1] = col.g * brightness;
      this.connColors[c6 + 2] = col.b * brightness;
      this.connColors[c6 + 3] = col.r * brightness * 0.5;
      this.connColors[c6 + 4] = col.g * brightness * 0.5;
      this.connColors[c6 + 5] = col.b * brightness * 0.5;
    }

    this.connections.geometry.attributes.color!.needsUpdate = true;
    const connMat = this.connections.material as THREE.LineBasicMaterial;
    connMat.opacity = 0.15 + this.ampSmooth * 0.4;

    // Global rotation
    const group = [this.particles, this.connections];
    for (const obj of group) {
      obj.rotation.z = t * 0.03 + this.bassSmooth * 0.1;
      obj.rotation.x = Math.sin(t * 0.1) * 0.15 + this.midSmooth * 0.1;
    }
  }

  dispose() {
    if (this.particles) {
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }
    if (this.connections) {
      this.connections.geometry.dispose();
      (this.connections.material as THREE.Material).dispose();
    }
    this.particles = null;
    this.connections = null;
    this.positions = null;
    this.colors = null;
    this.sizes = null;
    this.basePositions = null;
    this.phases = null;
    this.layers = null;
    this.connPositions = null;
    this.connColors = null;
  }

  getControlsSchema(): TemplateControl[] {
    return [
      { id: "evolve", label: "Evolution", type: "slider", default: 0.5, min: 0, max: 1, step: 0.01 },
      { id: "glow", label: "Glow", type: "slider", default: 0.7, min: 0.1, max: 1, step: 0.01 },
    ];
  }
}

export default new SacredGeometry();
