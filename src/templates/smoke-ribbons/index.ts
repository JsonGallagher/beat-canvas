import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

/**
 * Smoke Ribbons — 8 flowing ribbons each composed of 2000 particles forming
 * volumetric smoke trails. Each ribbon follows a unique 3D Lissajous curve
 * that evolves with the music. Bass swells the ribbon width, treble adds
 * turbulent eddies, mid shifts the flow paths. Particles have individual
 * lifetimes creating a trailing vapor effect. Feedback shader adds persistence.
 */

const RIBBON_COUNT = 8;
const PARTICLES_PER_RIBBON = 2000;
const TOTAL_PARTICLES = RIBBON_COUNT * PARTICLES_PER_RIBBON;

class SmokeRibbons implements TemplateModule {
  id = "smoke-ribbons";
  name = "Smoke Ribbons";
  tags = ["organic", "ethereal"];

  private points: THREE.Points | null = null;
  private positions: Float32Array | null = null;
  private colors: Float32Array | null = null;
  private lifetimes: Float32Array | null = null;
  private ribbonIds: Float32Array | null = null;
  private seeds: Float32Array | null = null;

  private fbQuad: THREE.Mesh | null = null;
  private rtA: THREE.WebGLRenderTarget | null = null;
  private rtB: THREE.WebGLRenderTarget | null = null;
  private fbScene: THREE.Scene | null = null;
  private ortho: THREE.OrthographicCamera | null = null;
  private fbUniforms: Record<string, THREE.IUniform> = {};

  private time = 0;
  private bassSmooth = 0;
  private midSmooth = 0;
  private trebleSmooth = 0;
  private ampSmooth = 0;

  private fbVert = `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `;

  private fbFrag = `
    precision highp float;
    uniform sampler2D uTexture;
    uniform float uDecay;
    varying vec2 vUv;
    void main() {
      vec2 center = vec2(0.5);
      vec2 uv = center + (vUv - center) * 0.999;
      vec3 col = texture2D(uTexture, uv).rgb * uDecay;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  init(ctx: RenderContext) {
    this.positions = new Float32Array(TOTAL_PARTICLES * 3);
    this.colors = new Float32Array(TOTAL_PARTICLES * 3);
    this.lifetimes = new Float32Array(TOTAL_PARTICLES);
    this.ribbonIds = new Float32Array(TOTAL_PARTICLES);
    this.seeds = new Float32Array(TOTAL_PARTICLES);

    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      this.lifetimes[i] = Math.random();
      this.ribbonIds[i] = Math.floor(i / PARTICLES_PER_RIBBON);
      this.seeds[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geo, mat);
    ctx.scene.add(this.points);

    // Feedback for trails
    const w = ctx.width;
    const h = ctx.height;
    this.rtA = new THREE.WebGLRenderTarget(w, h, { format: THREE.RGBAFormat, type: THREE.HalfFloatType });
    this.rtB = new THREE.WebGLRenderTarget(w, h, { format: THREE.RGBAFormat, type: THREE.HalfFloatType });
    this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.fbScene = new THREE.Scene();
    this.fbUniforms = {
      uTexture: { value: this.rtA.texture },
      uDecay: { value: 0.95 },
    };
    this.fbQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: this.fbUniforms,
        vertexShader: this.fbVert,
        fragmentShader: this.fbFrag,
      })
    );
    this.fbScene.add(this.fbQuad);
  }

  update(ctx: RenderContext, input: ReactiveInput, delta: number) {
    if (!this.points || !this.positions || !this.colors || !this.lifetimes || !this.ribbonIds || !this.seeds) return;
    if (!this.rtA || !this.rtB || !this.fbScene || !this.ortho) return;

    // Restore visibility — previous frame hid it to prevent double-render
    ctx.scene.visible = true;

    this.time += delta;
    const { frame, intensityMultiplier, palette, params } = input;
    const bass = frame.bass * intensityMultiplier;
    const mid = frame.mid * intensityMultiplier;
    const treble = frame.treble * intensityMultiplier;
    const amp = frame.amplitude * intensityMultiplier;

    this.bassSmooth += (bass - this.bassSmooth) * 0.08;
    this.midSmooth += (mid - this.midSmooth) * 0.1;
    this.trebleSmooth += (treble - this.trebleSmooth) * 0.12;
    this.ampSmooth += (amp - this.ampSmooth) * 0.1;

    const bassAccel = bass - this.bassPrev;
    this.bassPrev = bass;
    if (bassAccel > 0.1) this.kickAccum = Math.min(this.kickAccum + bassAccel * 2, 1);
    this.kickAccum *= 0.92;

    const turbulence = Number(params.turbulence ?? 0.5);
    const density = Number(params.fadeLength ?? 0.7);
    const t = this.time;

    const c1 = new THREE.Color(palette[0] ?? "#FF00FF");
    const c2 = new THREE.Color(palette[1] ?? "#00FFFF");
    const c3 = new THREE.Color(palette[2] ?? "#FFAA00");

    // Ribbon path parameters
    const ribbonParams = [
      { ax: 1.3, ay: 2, az: 0.4, fx: 1, fy: 0.7, fz: 0.5, px: 0, py: 0.5, pz: 1 },
      { ax: 1.5, ay: 1.8, az: 0.3, fx: 0.8, fy: 1.1, fz: 0.4, px: 1.5, py: 0, pz: 2 },
      { ax: 1.1, ay: 2.5, az: 0.5, fx: 1.2, fy: 0.6, fz: 0.7, px: 3, py: 1, pz: 0.5 },
      { ax: 1.7, ay: 1.5, az: 0.35, fx: 0.9, fy: 0.8, fz: 0.6, px: 4.5, py: 2, pz: 3 },
      { ax: 1.4, ay: 2.2, az: 0.45, fx: 1.1, fy: 0.5, fz: 0.8, px: 0.5, py: 3, pz: 1.5 },
      { ax: 1.6, ay: 1.7, az: 0.3, fx: 0.7, fy: 1.0, fz: 0.5, px: 2, py: 1.5, pz: 2.5 },
      { ax: 1.2, ay: 2.3, az: 0.4, fx: 1.3, fy: 0.9, fz: 0.6, px: 3.5, py: 0.5, pz: 0 },
      { ax: 1.8, ay: 1.6, az: 0.5, fx: 0.6, fy: 1.2, fz: 0.4, px: 5, py: 2.5, pz: 1 },
    ];

    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      const i3 = i * 3;
      const rid = this.ribbonIds[i]!;
      const seed = this.seeds[i]!;
      let life = this.lifetimes[i]!;

      // Advance lifetime
      life += delta * (0.3 + density * 0.7);
      if (life > 1) life -= 1;
      this.lifetimes[i] = life;

      const rp = ribbonParams[rid]!;
      const speed = 0.3 + this.ampSmooth * 0.5;

      // Position along ribbon path (Lissajous)
      const pathT = life * Math.PI * 4 + t * speed * rp.fx;
      const baseX = Math.sin(pathT * rp.fx + rp.px + t * 0.1) * rp.ax * (1 + this.midSmooth * 0.3);
      const baseY = Math.sin(pathT * rp.fy + rp.py + t * 0.08) * rp.ay * (1 + this.bassSmooth * 0.2);
      const baseZ = Math.cos(pathT * rp.fz + rp.pz) * rp.az;

      // Per-particle offset from ribbon center (creates width)
      const widthMult = 0.1 + this.bassSmooth * 0.3 + this.kickAccum * 0.4;
      const offsetX = Math.sin(seed * 17 + t * 3 + life * 10) * widthMult;
      const offsetY = Math.cos(seed * 23 + t * 2.5 + life * 8) * widthMult;

      // Turbulence on treble
      const turbX = Math.sin(life * 30 + seed * 13 + t * 8) * turbulence * this.trebleSmooth * 0.3;
      const turbY = Math.cos(life * 25 + seed * 17 + t * 7) * turbulence * this.trebleSmooth * 0.25;

      this.positions[i3] = baseX + offsetX + turbX;
      this.positions[i3 + 1] = baseY + offsetY + turbY;
      this.positions[i3 + 2] = baseZ;

      // Color: per-ribbon with lifetime fade
      const colorPhase = (rid / RIBBON_COUNT + t * 0.05) % 1;
      const col = colorPhase < 0.33
        ? c1.clone().lerp(c2, colorPhase / 0.33)
        : colorPhase < 0.66
          ? c2.clone().lerp(c3, (colorPhase - 0.33) / 0.33)
          : c3.clone().lerp(c1, (colorPhase - 0.66) / 0.34);

      // Lifetime fade: bright at birth, fading at death
      const lifeFade = Math.sin(life * Math.PI); // 0 at start/end, 1 in middle
      const brightness = lifeFade * (0.1 + this.ampSmooth * 0.6)
        + Math.sin(seed * 7 + t * 5) * this.trebleSmooth * 0.1 * lifeFade;

      this.colors[i3] = col.r * brightness;
      this.colors[i3 + 1] = col.g * brightness;
      this.colors[i3 + 2] = col.b * brightness;
    }

    this.points.geometry.attributes.position!.needsUpdate = true;
    this.points.geometry.attributes.color!.needsUpdate = true;
    (this.points.material as THREE.PointsMaterial).size = 0.025 + this.ampSmooth * 0.025;
    (this.points.material as THREE.PointsMaterial).opacity = 0.3 + this.ampSmooth * 0.4;

    // Slow global rotation
    this.points.rotation.y = t * 0.08;
    this.points.rotation.x = Math.sin(t * 0.12) * 0.1;

    // Feedback pass for trails (correct ping-pong — no feedback loop)
    const decayValue = 0.92 + this.bassSmooth * 0.05;
    this.fbUniforms.uDecay!.value = decayValue;

    const renderer = ctx.renderer;

    // Step 1: Fade rtB (previous composite) into rtA.
    //         Read = rtB.texture, Write = rtA → no feedback loop.
    this.fbUniforms.uTexture!.value = this.rtB!.texture;
    renderer.setRenderTarget(this.rtA);
    renderer.render(this.fbScene!, this.ortho!);

    // Step 2: Render current particles ON TOP of the faded trails in rtA.
    //         autoClear=false so the faded trails are preserved.
    renderer.autoClear = false;
    renderer.render(ctx.scene, ctx.camera);
    renderer.autoClear = true;

    // Step 3: Blit the composite (rtA) to the screen without extra decay.
    renderer.setRenderTarget(null);
    this.fbUniforms.uTexture!.value = this.rtA!.texture;
    this.fbUniforms.uDecay!.value = 1.0;
    renderer.render(this.fbScene!, this.ortho!);
    this.fbUniforms.uDecay!.value = decayValue;

    // Hide scene so ThreeRenderer.renderFrame() doesn't double-render particles
    ctx.scene.visible = false;

    // Step 4: Swap buffers — rtA becomes "previous" for next frame's decay pass.
    const tmp = this.rtA!;
    this.rtA = this.rtB!;
    this.rtB = tmp;
  }

  dispose() {
    if (this.points) {
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
    }
    this.rtA?.dispose();
    this.rtB?.dispose();
    if (this.fbQuad) {
      this.fbQuad.geometry.dispose();
      (this.fbQuad.material as THREE.Material).dispose();
    }
    this.points = null;
    this.positions = null;
    this.colors = null;
    this.lifetimes = null;
    this.ribbonIds = null;
    this.seeds = null;
    this.rtA = null; this.rtB = null;
    this.fbQuad = null; this.fbScene = null;
  }

  getControlsSchema(): TemplateControl[] {
    return [
      { id: "turbulence", label: "Turbulence", type: "slider", default: 0.5, min: 0, max: 1, step: 0.01 },
      { id: "fadeLength", label: "Density", type: "slider", default: 0.7, min: 0.2, max: 1, step: 0.01 },
    ];
  }
}

export default new SmokeRibbons();
