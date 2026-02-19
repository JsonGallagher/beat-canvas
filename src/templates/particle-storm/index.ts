import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

const PARTICLE_COUNT = 12000;

class ParticleStorm implements TemplateModule {
  id = "particle-storm";
  name = "Particle Storm";
  tags = ["particles", "energy"];

  private points: THREE.Points | null = null;
  private positions: Float32Array | null = null;
  private velocities: Float32Array | null = null;
  private colors: Float32Array | null = null;
  private sizes: Float32Array | null = null;
  private phases: Float32Array | null = null;
  private time = 0;
  private bassSmooth = 0;
  private ampSmooth = 0;

  init(ctx: RenderContext) {
    const count = PARTICLE_COUNT;
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Spawn in a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * 5;
      this.positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      this.positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 1.6; // stretch for 9:16
      this.positions[i3 + 2] = r * Math.cos(phi) * 0.5;

      this.velocities[i3] = 0;
      this.velocities[i3 + 1] = 0;
      this.velocities[i3 + 2] = 0;

      this.phases[i] = Math.random() * Math.PI * 2;
      this.sizes[i] = 0.5 + Math.random() * 1.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(this.sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geometry, material);
    ctx.scene.add(this.points);
  }

  update(_ctx: RenderContext, input: ReactiveInput, delta: number) {
    if (!this.points || !this.positions || !this.velocities || !this.colors || !this.sizes || !this.phases) return;

    this.time += delta;
    const { frame, intensityMultiplier, palette, params } = input;
    const bass = frame.bass * intensityMultiplier;
    const mid = frame.mid * intensityMultiplier;
    const treble = frame.treble * intensityMultiplier;
    const amp = frame.amplitude * intensityMultiplier;

    // Smooth values for fluid motion
    this.bassSmooth += (bass - this.bassSmooth) * 0.15;
    this.ampSmooth += (amp - this.ampSmooth) * 0.12;

    const spread = Number(params.spread ?? 0.5);
    const turbulence = Number(params.turbulence ?? 0.5);
    const fieldRadius = 3 + spread * 6;
    const noiseScale = 0.3 + turbulence * 0.7;

    // Parse palette colors
    const c1 = new THREE.Color(palette[0] ?? "#00FF41");
    const c2 = new THREE.Color(palette[1] ?? "#FF55FF");
    const c3 = new THREE.Color(palette[2] ?? "#55FFFF");

    const count = PARTICLE_COUNT;
    const t = this.time;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = this.phases[i]!;

      let px = this.positions[i3]!;
      let py = this.positions[i3 + 1]!;
      let pz = this.positions[i3 + 2]!;

      // Curl-noise-inspired velocity field
      const nx = Math.sin(py * noiseScale + t * 0.7) * Math.cos(pz * noiseScale * 0.5 + t * 0.3);
      const ny = Math.sin(pz * noiseScale + t * 0.5) * Math.cos(px * noiseScale * 0.5 + t * 0.4);
      const nz = Math.sin(px * noiseScale * 0.7 + t * 0.6) * Math.cos(py * noiseScale * 0.3);

      // Vortex pull toward center
      const dist = Math.sqrt(px * px + py * py + pz * pz) + 0.01;
      const pullStrength = 0.005 + mid * 0.02;
      const vortexStrength = 0.01 + this.bassSmooth * 0.05;

      this.velocities[i3]! += nx * 0.008 + (-px / dist) * pullStrength + (-py / dist) * vortexStrength;
      this.velocities[i3 + 1]! += ny * 0.008 + (-py / dist) * pullStrength + (px / dist) * vortexStrength;
      this.velocities[i3 + 2]! += nz * 0.004;

      // Bass explosion: radial burst
      if (bass > 0.6) {
        const burstForce = (bass - 0.6) * 0.15;
        this.velocities[i3]! += (px / dist) * burstForce;
        this.velocities[i3 + 1]! += (py / dist) * burstForce;
        this.velocities[i3 + 2]! += (pz / (dist + 0.1)) * burstForce * 0.3;
      }

      // Treble shimmer: random jitter
      if (treble > 0.4) {
        const jit = (treble - 0.4) * 0.02;
        this.velocities[i3]! += (Math.sin(phase * 137.5 + t * 20) - 0.5) * jit;
        this.velocities[i3 + 1]! += (Math.cos(phase * 89.3 + t * 23) - 0.5) * jit;
      }

      // Apply velocity
      const speed = 0.8 + this.ampSmooth * 2;
      px += this.velocities[i3]! * speed;
      py += this.velocities[i3 + 1]! * speed;
      pz += this.velocities[i3 + 2]! * speed;

      // Soft boundary — respawn when too far
      if (dist > fieldRadius) {
        const respawnAngle = Math.random() * Math.PI * 2;
        const respawnR = Math.random() * 1.5;
        px = Math.cos(respawnAngle) * respawnR;
        py = Math.sin(respawnAngle) * respawnR * 1.6;
        pz = (Math.random() - 0.5) * 1;
        this.velocities[i3] = 0;
        this.velocities[i3 + 1] = 0;
        this.velocities[i3 + 2] = 0;
      }

      this.positions[i3] = px;
      this.positions[i3 + 1] = py;
      this.positions[i3 + 2] = pz;

      // Damping
      this.velocities[i3]! *= 0.96;
      this.velocities[i3 + 1]! *= 0.96;
      this.velocities[i3 + 2]! *= 0.96;

      // Multi-color based on distance + phase
      const colorT = (Math.sin(phase * 3 + dist * 0.5 + t * 0.4) + 1) * 0.5;
      const colorT2 = (Math.sin(phase * 7 + t * 0.6) + 1) * 0.5;
      const mixed = c1.clone().lerp(c2, colorT).lerp(c3, colorT2 * 0.3);
      const brightness = 0.2 + this.ampSmooth * 0.8 + Math.sin(phase + t * 3) * treble * 0.15;
      this.colors[i3] = mixed.r * brightness;
      this.colors[i3 + 1] = mixed.g * brightness;
      this.colors[i3 + 2] = mixed.b * brightness;

      // Per-particle size variation
      this.sizes[i] = (0.3 + Math.sin(phase + t * 2) * 0.15) * (1 + this.ampSmooth * 1.5);
    }

    this.points.geometry.attributes.position!.needsUpdate = true;
    this.points.geometry.attributes.color!.needsUpdate = true;

    const mat = this.points.material as THREE.PointsMaterial;
    mat.size = 0.04 + this.ampSmooth * 0.1;
    mat.opacity = 0.5 + this.ampSmooth * 0.5;

    // Slow rotation of entire system
    this.points.rotation.z = t * 0.05 + this.bassSmooth * 0.2;
    this.points.rotation.y = Math.sin(t * 0.15) * 0.15;
  }

  dispose() {
    if (this.points) {
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
    }
    this.positions = null;
    this.velocities = null;
    this.colors = null;
    this.sizes = null;
    this.phases = null;
    this.points = null;
  }

  getControlsSchema(): TemplateControl[] {
    return [
      { id: "spread", label: "Spread", type: "slider", default: 0.5, min: 0, max: 1, step: 0.01 },
      { id: "turbulence", label: "Turbulence", type: "slider", default: 0.5, min: 0, max: 1, step: 0.01 },
    ];
  }
}

export default new ParticleStorm();
