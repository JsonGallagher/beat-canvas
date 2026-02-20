import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

/**
 * DNA Helix — 20,000 particles forming a massive double helix with energy
 * bridges. Particles have individual velocities and drift along the helix.
 * Bass expands the helix radius explosively, treble creates sparking energy
 * discharges between strands. A central energy core pulses with amplitude.
 * Custom vertex shader for per-particle glow sizing.
 */

const PARTICLE_COUNT = 20000;
const BRIDGE_PARTICLES = 3000;
const CORE_PARTICLES = 2000;

class DnaHelix implements TemplateModule {
  id = "dna-helix";
  name = "DNA Helix";
  tags = ["organic", "particles"];

  private helix: THREE.Points | null = null;
  private helixPos: Float32Array | null = null;
  private helixColors: Float32Array | null = null;
  private helixPhases: Float32Array | null = null;
  private helixStrands: Float32Array | null = null; // 0 or 1 for strand assignment

  private bridges: THREE.Points | null = null;
  private bridgePos: Float32Array | null = null;
  private bridgeColors: Float32Array | null = null;

  private core: THREE.Points | null = null;
  private corePos: Float32Array | null = null;
  private coreColors: Float32Array | null = null;

  private time = 0;
  private bassSmooth = 0;
  private midSmooth = 0;
  private trebleSmooth = 0;
  private ampSmooth = 0;

  init(ctx: RenderContext) {
    // Helix particles
    this.helixPos = new Float32Array(PARTICLE_COUNT * 3);
    this.helixColors = new Float32Array(PARTICLE_COUNT * 3);
    this.helixPhases = new Float32Array(PARTICLE_COUNT);
    this.helixStrands = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.helixPhases[i] = Math.random() * Math.PI * 2;
      this.helixStrands[i] = i < PARTICLE_COUNT / 2 ? 0 : 1;
    }

    const helixGeo = new THREE.BufferGeometry();
    helixGeo.setAttribute("position", new THREE.BufferAttribute(this.helixPos, 3));
    helixGeo.setAttribute("color", new THREE.BufferAttribute(this.helixColors, 3));
    const helixMat = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.helix = new THREE.Points(helixGeo, helixMat);
    ctx.scene.add(this.helix);

    // Bridge particles (connecting strands)
    this.bridgePos = new Float32Array(BRIDGE_PARTICLES * 3);
    this.bridgeColors = new Float32Array(BRIDGE_PARTICLES * 3);
    const bridgeGeo = new THREE.BufferGeometry();
    bridgeGeo.setAttribute("position", new THREE.BufferAttribute(this.bridgePos, 3));
    bridgeGeo.setAttribute("color", new THREE.BufferAttribute(this.bridgeColors, 3));
    const bridgeMat = new THREE.PointsMaterial({
      size: 0.025,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.bridges = new THREE.Points(bridgeGeo, bridgeMat);
    ctx.scene.add(this.bridges);

    // Core energy particles
    this.corePos = new Float32Array(CORE_PARTICLES * 3);
    this.coreColors = new Float32Array(CORE_PARTICLES * 3);
    const coreGeo = new THREE.BufferGeometry();
    coreGeo.setAttribute("position", new THREE.BufferAttribute(this.corePos, 3));
    coreGeo.setAttribute("color", new THREE.BufferAttribute(this.coreColors, 3));
    const coreMat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.core = new THREE.Points(coreGeo, coreMat);
    ctx.scene.add(this.core);
  }

  update(_ctx: RenderContext, input: ReactiveInput, delta: number) {
    if (!this.helix || !this.helixPos || !this.helixColors || !this.helixPhases || !this.helixStrands) return;
    if (!this.bridges || !this.bridgePos || !this.bridgeColors) return;
    if (!this.core || !this.corePos || !this.coreColors) return;

    this.time += delta;
    const { frame, intensityMultiplier, palette, params } = input;
    const bass = frame.bass * intensityMultiplier;
    const mid = frame.mid * intensityMultiplier;
    const treble = frame.treble * intensityMultiplier;
    const amp = frame.amplitude * intensityMultiplier;

    this.bassSmooth += (bass - this.bassSmooth) * 0.12;
    this.midSmooth += (mid - this.midSmooth) * 0.1;
    this.trebleSmooth += (treble - this.trebleSmooth) * 0.15;
    this.ampSmooth += (amp - this.ampSmooth) * 0.1;

    const helixRadius = Number(params.radius ?? 0.5);
    const twistSpeed = Number(params.twistSpeed ?? 0.5);
    const t = this.time;

    const c1 = new THREE.Color(palette[0] ?? "#00FF41");
    const c2 = new THREE.Color(palette[1] ?? "#FF55FF");
    const c3 = new THREE.Color(palette[2] ?? "#55FFFF");

    const baseRadius = 1.2 + helixRadius * 1.5;
    const rotSpeed = 0.5 + twistSpeed * 2;
    const totalHeight = 14;

    // Update helix particles
    const halfCount = PARTICLE_COUNT / 2;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const phase = this.helixPhases[i]!;
      const strand = this.helixStrands[i]!;
      const localIdx = strand === 0 ? i : i - halfCount;
      const yNorm = localIdx / halfCount;

      const y = (yNorm - 0.5) * totalHeight;
      const helixAngle = yNorm * Math.PI * 8 + t * rotSpeed + strand * Math.PI;

      // Radius: pulsates with bass, explodes on kicks
      const rMod = baseRadius
        + Math.sin(yNorm * 12 + t * 3) * this.bassSmooth * 0.4
        + frame.kickIntensity * 1.5 * Math.sin(phase * 7 + t * 5)
        + Math.sin(yNorm * 20 + t * 6) * this.trebleSmooth * 0.15;

      // Particle drifts slightly from perfect helix
      const drift = Math.sin(phase * 13 + t * 2) * 0.15 + Math.cos(phase * 7 + t * 3) * 0.1;

      this.helixPos[i3] = Math.cos(helixAngle) * (rMod + drift);
      this.helixPos[i3 + 1] = y + Math.sin(phase * 5 + t * 4) * this.trebleSmooth * 0.1;
      this.helixPos[i3 + 2] = Math.sin(helixAngle) * (rMod + drift) * 0.35;

      // Color: strand-dependent gradient with energy pulsing
      const colorT = (yNorm + t * 0.05) % 1;
      const baseCol = strand === 0
        ? c1.clone().lerp(c2, colorT)
        : c2.clone().lerp(c3, colorT);

      // Energy pulse traveling along helix
      const energyPulse = Math.sin(yNorm * 30 - t * 8) * 0.5 + 0.5;
      const brightness = 0.15 + this.ampSmooth * 0.5
        + energyPulse * this.midSmooth * 0.4
        + Math.sin(phase + t * 6) * this.trebleSmooth * 0.1;

      this.helixColors[i3] = baseCol.r * brightness;
      this.helixColors[i3 + 1] = baseCol.g * brightness;
      this.helixColors[i3 + 2] = baseCol.b * brightness;
    }

    this.helix.geometry.attributes.position!.needsUpdate = true;
    this.helix.geometry.attributes.color!.needsUpdate = true;
    (this.helix.material as THREE.PointsMaterial).size = 0.03 + this.ampSmooth * 0.04;

    // Bridge particles — connect the two strands
    for (let i = 0; i < BRIDGE_PARTICLES; i++) {
      const i3 = i * 3;
      const bridgeNorm = i / BRIDGE_PARTICLES;
      const yNorm = bridgeNorm;
      const y = (yNorm - 0.5) * totalHeight;
      const helixAngle = yNorm * Math.PI * 8 + t * rotSpeed;

      const bridgeT = (Math.sin(i * 0.7 + t * 3) * 0.5 + 0.5); // oscillate between strands
      const angle1 = helixAngle;
      const angle2 = helixAngle + Math.PI;
      const interpAngle = angle1 + (angle2 - angle1) * bridgeT;

      const rMod = baseRadius + Math.sin(yNorm * 12 + t * 3) * this.bassSmooth * 0.4;

      this.bridgePos[i3] = Math.cos(interpAngle) * rMod * bridgeT + Math.cos(angle1) * rMod * (1.0 - bridgeT);
      this.bridgePos[i3 + 1] = y;
      this.bridgePos[i3 + 2] = (Math.sin(interpAngle) * rMod * bridgeT + Math.sin(angle1) * rMod * (1.0 - bridgeT)) * 0.35;

      // Bright on mid, sparkle on treble
      const sparkle = Math.sin(i * 3.7 + t * 10) > 0.8 ? 1 : 0;
      const brightness = 0.05 + this.midSmooth * 0.3 + sparkle * this.trebleSmooth * 0.6;

      const col = c3.clone().lerp(c1, bridgeT);
      this.bridgeColors[i3] = col.r * brightness;
      this.bridgeColors[i3 + 1] = col.g * brightness;
      this.bridgeColors[i3 + 2] = col.b * brightness;
    }

    this.bridges.geometry.attributes.position!.needsUpdate = true;
    this.bridges.geometry.attributes.color!.needsUpdate = true;
    (this.bridges.material as THREE.PointsMaterial).size = 0.02 + this.trebleSmooth * 0.03;

    // Core particles — central column of energy
    for (let i = 0; i < CORE_PARTICLES; i++) {
      const i3 = i * 3;
      const corePhase = (i / CORE_PARTICLES) * Math.PI * 2;
      const yNorm = i / CORE_PARTICLES;
      const y = (yNorm - 0.5) * totalHeight;

      // Spiral around center axis
      const coreAngle = corePhase * 3 + t * 4 + y * 0.5;
      const coreR = 0.15 + this.ampSmooth * 0.4 + Math.sin(corePhase * 5 + t * 6) * 0.1;

      this.corePos[i3] = Math.cos(coreAngle) * coreR;
      this.corePos[i3 + 1] = y + Math.sin(corePhase * 7 + t * 5) * 0.3;
      this.corePos[i3 + 2] = Math.sin(coreAngle) * coreR * 0.35;

      // White-hot core with color tint
      const coreBrightness = 0.1 + this.ampSmooth * 0.9 + this.bassSmooth * 0.3;
      const coreCol = c1.clone().lerp(new THREE.Color(1, 1, 1), 0.5);
      this.coreColors[i3] = coreCol.r * coreBrightness;
      this.coreColors[i3 + 1] = coreCol.g * coreBrightness;
      this.coreColors[i3 + 2] = coreCol.b * coreBrightness;
    }

    this.core.geometry.attributes.position!.needsUpdate = true;
    this.core.geometry.attributes.color!.needsUpdate = true;
    (this.core.material as THREE.PointsMaterial).size = 0.04 + this.ampSmooth * 0.06;

    // Global rotation
    const allObjs = [this.helix, this.bridges, this.core];
    for (const obj of allObjs) {
      obj.rotation.y = t * 0.2 + this.bassSmooth * 0.3;
      obj.rotation.x = Math.sin(t * 0.15) * 0.1;
    }
  }

  dispose() {
    [this.helix, this.bridges, this.core].forEach(p => {
      if (p) {
        p.geometry.dispose();
        (p.material as THREE.Material).dispose();
      }
    });
    this.helix = null; this.bridges = null; this.core = null;
    this.helixPos = null; this.helixColors = null; this.helixPhases = null; this.helixStrands = null;
    this.bridgePos = null; this.bridgeColors = null;
    this.corePos = null; this.coreColors = null;
  }

  getControlsSchema(): TemplateControl[] {
    return [
      { id: "radius", label: "Helix Radius", type: "slider", default: 0.5, min: 0.2, max: 1, step: 0.01 },
      { id: "twistSpeed", label: "Twist Speed", type: "slider", default: 0.5, min: 0.1, max: 1, step: 0.01 },
    ];
  }
}

export default new DnaHelix();
