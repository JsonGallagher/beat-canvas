import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

/**
 * Cosmic Jellyfish — 3 bioluminescent jellyfish composed of thousands of
 * particles. Each has a dome of particles that contracts/expands on bass,
 * trailing tentacles made of particle chains with realistic physics-like
 * wave propagation. Inner bioluminescent glow pulses. Treble creates
 * electric discharge effects between tentacles.
 */

const BELL_PARTICLES = 3000;
const TENTACLES_PER_JELLY = 16;
const TENTACLE_SEGMENTS = 50;
const JELLY_COUNT = 3;
const GLOW_PARTICLES = 1500;

interface JellyState {
  bellPositions: Float32Array;
  bellColors: Float32Array;
  bellPoints: THREE.Points;
  tentPositions: Float32Array;
  tentColors: Float32Array;
  tentPoints: THREE.Points;
  glowPositions: Float32Array;
  glowColors: Float32Array;
  glowPoints: THREE.Points;
  centerY: number;
  centerX: number;
  phase: number;
  bobSpeed: number;
}

class CosmicJellyfish implements TemplateModule {
  id = "cosmic-jellyfish";
  name = "Cosmic Jellyfish";
  tags = ["organic", "bioluminescent"];

  private jellies: JellyState[] = [];
  private time = 0;
  private bassSmooth = 0;
  private midSmooth = 0;
  private trebleSmooth = 0;
  private ampSmooth = 0;
  private kickAccum = 0;
  private bassPrev = 0;

  init(ctx: RenderContext) {
    const jellyPositions = [
      { x: 0, y: 1.5, phase: 0, bobSpeed: 0.7 },
      { x: -2.5, y: -1, phase: 1.5, bobSpeed: 0.5 },
      { x: 2.2, y: -2, phase: 3, bobSpeed: 0.6 },
    ];

    for (let j = 0; j < JELLY_COUNT; j++) {
      const jp = jellyPositions[j]!;

      // Bell particles
      const bellPos = new Float32Array(BELL_PARTICLES * 3);
      const bellCol = new Float32Array(BELL_PARTICLES * 3);
      const bellGeo = new THREE.BufferGeometry();
      bellGeo.setAttribute("position", new THREE.BufferAttribute(bellPos, 3));
      bellGeo.setAttribute("color", new THREE.BufferAttribute(bellCol, 3));
      const bellMat = new THREE.PointsMaterial({
        size: 0.035,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const bellPoints = new THREE.Points(bellGeo, bellMat);
      ctx.scene.add(bellPoints);

      // Tentacle particles
      const tentCount = TENTACLES_PER_JELLY * TENTACLE_SEGMENTS;
      const tentPos = new Float32Array(tentCount * 3);
      const tentCol = new Float32Array(tentCount * 3);
      const tentGeo = new THREE.BufferGeometry();
      tentGeo.setAttribute("position", new THREE.BufferAttribute(tentPos, 3));
      tentGeo.setAttribute("color", new THREE.BufferAttribute(tentCol, 3));
      const tentMat = new THREE.PointsMaterial({
        size: 0.025,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const tentPoints = new THREE.Points(tentGeo, tentMat);
      ctx.scene.add(tentPoints);

      // Inner glow particles
      const glowPos = new Float32Array(GLOW_PARTICLES * 3);
      const glowCol = new Float32Array(GLOW_PARTICLES * 3);
      const glowGeo = new THREE.BufferGeometry();
      glowGeo.setAttribute("position", new THREE.BufferAttribute(glowPos, 3));
      glowGeo.setAttribute("color", new THREE.BufferAttribute(glowCol, 3));
      const glowMat = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const glowPoints = new THREE.Points(glowGeo, glowMat);
      ctx.scene.add(glowPoints);

      this.jellies.push({
        bellPositions: bellPos, bellColors: bellCol, bellPoints,
        tentPositions: tentPos, tentColors: tentCol, tentPoints,
        glowPositions: glowPos, glowColors: glowCol, glowPoints,
        centerY: jp.y, centerX: jp.x, phase: jp.phase, bobSpeed: jp.bobSpeed,
      });
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
    this.midSmooth += (mid - this.midSmooth) * 0.12;
    this.trebleSmooth += (treble - this.trebleSmooth) * 0.15;
    this.ampSmooth += (amp - this.ampSmooth) * 0.1;

    const bassAccel = bass - this.bassPrev;
    this.bassPrev = bass;
    if (bassAccel > 0.1) this.kickAccum = Math.min(this.kickAccum + bassAccel * 2.5, 1);
    this.kickAccum *= 0.9;

    const pulseDepth = Number(params.pulseDepth ?? 0.6);
    const flowSpeed = Number(params.flowSpeed ?? 0.5);
    const t = this.time;

    const c1 = new THREE.Color(palette[0] ?? "#FF00FF");
    const c2 = new THREE.Color(palette[1] ?? "#00FFFF");
    const c3 = new THREE.Color(palette[2] ?? "#FFAA00");

    for (let j = 0; j < JELLY_COUNT; j++) {
      const jelly = this.jellies[j]!;
      const scale = j === 0 ? 1 : 0.6 + j * 0.1; // Main jelly is bigger

      // Bob position
      const bobY = jelly.centerY + Math.sin(t * jelly.bobSpeed + jelly.phase) * 0.5;
      const bobX = jelly.centerX + Math.sin(t * 0.3 + jelly.phase * 2) * 0.3;

      // Bell contraction cycle synced to bass
      const contraction = 1 - this.bassSmooth * pulseDepth * 0.35 - this.kickAccum * 0.2;
      const bellRadius = 1.5 * scale * contraction;
      const bellHeight = 1.0 * scale;

      // Update bell particles — hemisphere with density
      for (let i = 0; i < BELL_PARTICLES; i++) {
        const i3 = i * 3;
        const u = (i % 60) / 60; // around
        const v = Math.floor(i / 60) / (BELL_PARTICLES / 60); // up

        const theta = u * Math.PI * 2 + Math.sin(v * 5 + t * 3) * 0.05;
        const phi = v * Math.PI * 0.5;

        // Bell shape — parabaloid with rim
        const r = bellRadius * Math.sin(phi) * (1 + Math.sin(theta * 4 + t * 2) * this.trebleSmooth * 0.1);
        const y = bellHeight * Math.cos(phi);

        // Surface ripples
        const ripple = Math.sin(theta * 8 + v * 12 + t * 5) * this.trebleSmooth * 0.05 * scale;

        jelly.bellPositions[i3] = bobX + Math.cos(theta) * (r + ripple);
        jelly.bellPositions[i3 + 1] = bobY + y;
        jelly.bellPositions[i3 + 2] = Math.sin(theta) * (r + ripple) * 0.35;

        // Bioluminescent color: shifts with contraction
        const colorPhase = (v + theta / (Math.PI * 2) + t * 0.1 + j * 0.3) % 1;
        const col = colorPhase < 0.5
          ? c1.clone().lerp(c2, colorPhase * 2)
          : c2.clone().lerp(c3, (colorPhase - 0.5) * 2);

        const brightness = (0.1 + this.ampSmooth * 0.5 + Math.sin(v * 10 + t * 4) * 0.1) * (1 - v * 0.3);
        jelly.bellColors[i3] = col.r * brightness;
        jelly.bellColors[i3 + 1] = col.g * brightness;
        jelly.bellColors[i3 + 2] = col.b * brightness;
      }

      jelly.bellPoints.geometry.attributes.position!.needsUpdate = true;
      jelly.bellPoints.geometry.attributes.color!.needsUpdate = true;
      (jelly.bellPoints.material as THREE.PointsMaterial).size = (0.025 + this.ampSmooth * 0.02) * scale;

      // Update tentacles — wave propagation from bell attachment point
      for (let ti = 0; ti < TENTACLES_PER_JELLY; ti++) {
        const baseAngle = (ti / TENTACLES_PER_JELLY) * Math.PI * 2;
        const attachR = bellRadius * 0.9;
        const attachX = bobX + Math.cos(baseAngle) * attachR;
        const attachZ = Math.sin(baseAngle) * attachR * 0.35;
        const attachY = bobY - bellHeight * 0.1;

        for (let s = 0; s < TENTACLE_SEGMENTS; s++) {
          const idx = (ti * TENTACLE_SEGMENTS + s) * 3;
          const segNorm = s / TENTACLE_SEGMENTS;
          const speed = 0.5 + flowSpeed * 2;

          // Cascading wave from top to bottom (propagation delay)
          const waveDelay = segNorm * 2;
          const wave1 = Math.sin(segNorm * 5 + t * speed * 2 - waveDelay + ti * 0.7) * (0.2 + this.midSmooth * 0.6);
          const wave2 = Math.cos(segNorm * 8 + t * speed * 1.5 - waveDelay * 1.3 + ti * 1.2) * this.trebleSmooth * 0.4;

          // Bass makes tentacles flare outward dramatically
          const flare = segNorm * segNorm * (this.bassSmooth * 1.2 + this.kickAccum * 2) * scale;

          // Gravity pull + organic droop
          const droop = segNorm * segNorm * 3 * scale;

          const tentX = attachX + wave1 * segNorm * scale + Math.cos(baseAngle) * flare;
          const tentY = attachY - droop + Math.sin(segNorm * 4 + t * speed) * 0.15 * scale;
          const tentZ = attachZ + wave2 * segNorm * scale + Math.sin(baseAngle) * flare * 0.35;

          jelly.tentPositions[idx] = tentX;
          jelly.tentPositions[idx + 1] = tentY;
          jelly.tentPositions[idx + 2] = tentZ;

          // Tentacle color — fades toward tips, sparks on treble
          const spark = Math.sin(s * 3.7 + ti * 2.1 + t * 12) > 0.92 ? 1 : 0;
          const tentBright = (0.05 + this.ampSmooth * 0.3) * (1 - segNorm * 0.7)
            + spark * this.trebleSmooth * 0.8;

          const tentCol = c2.clone().lerp(c3, segNorm + Math.sin(t * 0.3 + j) * 0.3);
          jelly.tentColors[idx] = tentCol.r * tentBright;
          jelly.tentColors[idx + 1] = tentCol.g * tentBright;
          jelly.tentColors[idx + 2] = tentCol.b * tentBright;
        }
      }

      jelly.tentPoints.geometry.attributes.position!.needsUpdate = true;
      jelly.tentPoints.geometry.attributes.color!.needsUpdate = true;

      // Inner glow — particles swirling inside the bell
      for (let i = 0; i < GLOW_PARTICLES; i++) {
        const i3 = i * 3;
        const glowPhase = (i / GLOW_PARTICLES) * Math.PI * 2;
        const glowR = (Math.random() * 0.3 + 0.1 + Math.sin(glowPhase * 3 + t * 4) * 0.2) * bellRadius * 0.6;
        const glowAngle = glowPhase + t * 2 + Math.sin(i * 0.1 + t) * 0.5;

        jelly.glowPositions[i3] = bobX + Math.cos(glowAngle) * glowR;
        jelly.glowPositions[i3 + 1] = bobY + Math.sin(glowPhase * 5 + t * 3) * bellHeight * 0.3;
        jelly.glowPositions[i3 + 2] = Math.sin(glowAngle) * glowR * 0.35;

        const glowBright = (0.1 + this.ampSmooth * 0.8) * (0.5 + Math.sin(i * 0.7 + t * 5) * 0.5);
        const glowCol = c1.clone().lerp(c2, Math.sin(glowPhase + t * 0.5) * 0.5 + 0.5);
        jelly.glowColors[i3] = glowCol.r * glowBright;
        jelly.glowColors[i3 + 1] = glowCol.g * glowBright;
        jelly.glowColors[i3 + 2] = glowCol.b * glowBright;
      }

      jelly.glowPoints.geometry.attributes.position!.needsUpdate = true;
      jelly.glowPoints.geometry.attributes.color!.needsUpdate = true;
      (jelly.glowPoints.material as THREE.PointsMaterial).size = (0.04 + this.ampSmooth * 0.04) * scale;
    }
  }

  dispose() {
    for (const jelly of this.jellies) {
      [jelly.bellPoints, jelly.tentPoints, jelly.glowPoints].forEach(p => {
        p.geometry.dispose();
        (p.material as THREE.Material).dispose();
      });
    }
    this.jellies = [];
  }

  getControlsSchema(): TemplateControl[] {
    return [
      { id: "pulseDepth", label: "Pulse Depth", type: "slider", default: 0.6, min: 0.1, max: 1, step: 0.01 },
      { id: "flowSpeed", label: "Flow Speed", type: "slider", default: 0.5, min: 0.1, max: 1, step: 0.01 },
    ];
  }
}

export default new CosmicJellyfish();
