import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

/**
 * Electric Mandala — Layered GLSL mandala shader with triple domain-warped
 * FBM, configurable 3-16 fold symmetry, and feedback persistence. Each layer
 * reacts to a different frequency band. Bass creates pulsating concentric
 * energy rings, treble adds electric filigree detail, mid morphs the
 * symmetry structure. A feedback loop with chromatic zoom creates psychedelic
 * trails that spiral inward.
 */
class ElectricMandala implements TemplateModule {
  id = "electric-mandala";
  name = "Electric Mandala";
  tags = ["mandala", "psychedelic"];

  private quad: THREE.Mesh | null = null;
  private fbQuad: THREE.Mesh | null = null;
  private rtA: THREE.WebGLRenderTarget | null = null;
  private rtB: THREE.WebGLRenderTarget | null = null;
  private mainScene: THREE.Scene | null = null;
  private fbScene: THREE.Scene | null = null;
  private ortho: THREE.OrthographicCamera | null = null;
  private uniforms: Record<string, THREE.IUniform> = {};
  private fbUniforms: Record<string, THREE.IUniform> = {};
  private time = 0;
  private bassSmooth = 0;
  private midSmooth = 0;
  private trebleSmooth = 0;
  private ampSmooth = 0;

  private vertShader = `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `;

  private fragShader = `
    precision highp float;
    uniform float uTime;
    uniform float uBass;
    uniform float uMid;
    uniform float uTreble;
    uniform float uAmp;
    uniform float uKick;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform float uSymmetry;
    uniform float uZoom;
    uniform sampler2D uFeedback;
    varying vec2 vUv;

    #define PI 3.14159265359
    #define TAU 6.28318530718

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1,0)), f.x),
        mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y
      );
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
      for (int i = 0; i < 6; i++) {
        v += a * noise(p);
        p = rot * p * 2.0 + vec2(1.7, 9.2);
        a *= 0.5;
      }
      return v;
    }

    float warpFbm(vec2 p, float t) {
      vec2 q = vec2(fbm(p + t * 0.1), fbm(p + vec2(5.2, 1.3) + t * 0.08));
      vec2 r = vec2(fbm(p + 4.0 * q + t * 0.05), fbm(p + 4.0 * q + vec2(8.3, 2.8) + t * 0.04));
      return fbm(p + 4.0 * r);
    }

    // Fold space for mandala symmetry
    vec2 kaleidoscope(vec2 uv, float folds) {
      float angle = atan(uv.y, uv.x);
      float radius = length(uv);

      float foldAngle = TAU / folds;
      angle = mod(angle, foldAngle);
      angle = abs(angle - foldAngle * 0.5);

      return vec2(cos(angle), sin(angle)) * radius;
    }

    void main() {
      vec2 uv = vUv * 2.0 - 1.0;
      uv.y *= 1.778;

      float t = uTime;
      float radius = length(uv);

      // Zoom with bass
      float zoom = 1.0 + uZoom * 2.0 - uKick * 0.2;
      uv /= zoom;

      // Rotate
      float rotAngle = t * 0.15 + uBass * 0.5 + uMid * 0.3;
      mat2 rot = mat2(cos(rotAngle), -sin(rotAngle), sin(rotAngle), cos(rotAngle));
      uv = rot * uv;

      float sym = 3.0 + uSymmetry * 13.0; // 3 to 16

      // Multi-layer mandala
      // Layer 1: bass-reactive, low frequency pattern
      vec2 k1 = kaleidoscope(uv, sym);
      float f1 = warpFbm(k1 * (2.0 + uBass * 2.0), t * 0.5);

      // Layer 2: mid-reactive, medium detail
      float sym2 = sym * 2.0;
      vec2 k2 = kaleidoscope(uv * 1.5, sym2);
      float f2 = warpFbm(k2 * (3.0 + uMid * 3.0) + 5.0, t * 0.7);

      // Layer 3: treble-reactive, fine filigree
      float sym3 = sym * 3.0;
      vec2 k3 = kaleidoscope(uv * 2.5, sym3);
      float f3 = fbm(k3 * (6.0 + uTreble * 8.0) + f1 * 2.0 + t * 0.3);

      // Combine with frequency-weighted mixing
      float combined = f1 * (0.4 + uBass * 0.3) + f2 * (0.3 + uMid * 0.3) + f3 * (0.2 + uTreble * 0.4);

      // Concentric energy rings on bass
      float rings = sin(radius * (8.0 + uBass * 25.0) - t * 3.0 - uKick * 8.0);
      rings = pow(max(rings, 0.0), 3.0) * uBass * 0.8;

      // Spiral arms
      float angle = atan(uv.y, uv.x);
      float spiral = sin(angle * sym + radius * (5.0 + uMid * 12.0) - t * 2.5);
      spiral = pow(max(spiral, 0.0), 2.0) * uMid * 0.5;

      // Electric arcs on treble
      float arcNoise = noise(vec2(angle * 10.0, t * 6.0));
      float arc = exp(-abs(radius - 0.5 - arcNoise * 0.5) * 20.0) * uTreble * 0.7;

      // Color mapping
      vec3 col = vec3(0.0);
      float v = combined * TAU;
      col += uColor1 * pow(max(sin(v), 0.0), 1.5);
      col += uColor2 * pow(max(sin(v + TAU / 3.0), 0.0), 1.5);
      col += uColor3 * pow(max(sin(v + TAU * 2.0 / 3.0), 0.0), 1.5);

      // Add ring energy
      col += (uColor1 + uColor2) * 0.5 * rings;

      // Add spiral arms
      col += uColor3 * spiral;

      // Add electric arcs
      col += (uColor2 + vec3(0.3)) * arc;

      // Radial vignette with breathing
      float vignette = 1.0 - radius * (0.35 - uBass * 0.1);
      col *= max(vignette, 0.0);

      // Brightness
      col *= 0.25 + uAmp * 0.9;

      // Center glow
      float centerGlow = exp(-radius * (3.0 - uBass * 1.5)) * uAmp * 0.3;
      col += (uColor1 + uColor2 + uColor3) * 0.33 * centerGlow;

      // Feedback mix
      vec3 fb = texture2D(uFeedback, vUv).rgb;
      col = max(col, fb * (0.7 + uBass * 0.2));

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  private fbFrag = `
    precision highp float;
    uniform sampler2D uTexture;
    uniform float uDecay;
    uniform float uBass;
    uniform float uTime;
    varying vec2 vUv;

    void main() {
      vec2 center = vec2(0.5);
      // Zoom inward slightly for spiraling trail effect
      vec2 uv = center + (vUv - center) * (0.993 + uBass * 0.005);

      // Slight rotation for spiral trails
      vec2 d = uv - center;
      float angle = 0.004 + uBass * 0.004;
      uv = center + vec2(
        d.x * cos(angle) - d.y * sin(angle),
        d.x * sin(angle) + d.y * cos(angle)
      );

      vec3 col = texture2D(uTexture, uv).rgb;

      // Chromatic decay — each channel decays differently for rainbow trails
      col.r *= uDecay * 0.98;
      col.g *= uDecay * 0.99;
      col.b *= uDecay;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  init(ctx: RenderContext) {
    const w = ctx.width;
    const h = ctx.height;

    this.rtA = new THREE.WebGLRenderTarget(w, h, { format: THREE.RGBAFormat, type: THREE.HalfFloatType });
    this.rtB = new THREE.WebGLRenderTarget(w, h, { format: THREE.RGBAFormat, type: THREE.HalfFloatType });
    this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const plane = new THREE.PlaneGeometry(2, 2);

    this.mainScene = new THREE.Scene();
    this.uniforms = {
      uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 },
      uTreble: { value: 0 }, uAmp: { value: 0 }, uKick: { value: 0 },
      uColor1: { value: new THREE.Color() }, uColor2: { value: new THREE.Color() },
      uColor3: { value: new THREE.Color() }, uSymmetry: { value: 0.5 },
      uZoom: { value: 0.5 }, uFeedback: { value: this.rtA.texture },
    };
    this.quad = new THREE.Mesh(plane, new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: this.vertShader,
      fragmentShader: this.fragShader,
    }));
    this.mainScene.add(this.quad);

    this.fbScene = new THREE.Scene();
    this.fbUniforms = {
      uTexture: { value: this.rtB.texture },
      uDecay: { value: 0.92 }, uBass: { value: 0 }, uTime: { value: 0 },
    };
    this.fbQuad = new THREE.Mesh(plane.clone(), new THREE.ShaderMaterial({
      uniforms: this.fbUniforms,
      vertexShader: this.vertShader,
      fragmentShader: this.fbFrag,
    }));
    this.fbScene.add(this.fbQuad);
  }

  update(ctx: RenderContext, input: ReactiveInput, delta: number) {
    if (!this.quad || !this.rtA || !this.rtB || !this.mainScene || !this.fbScene || !this.ortho) return;

    this.time += delta;
    const { frame, intensityMultiplier, palette, params } = input;
    const bass = frame.bass * intensityMultiplier;

    this.bassSmooth += (bass - this.bassSmooth) * 0.12;
    this.midSmooth += (frame.mid * intensityMultiplier - this.midSmooth) * 0.1;
    this.trebleSmooth += (frame.treble * intensityMultiplier - this.trebleSmooth) * 0.15;
    this.ampSmooth += (frame.amplitude * intensityMultiplier - this.ampSmooth) * 0.1;

    const bassAccel = bass - this.bassPrev;
    this.bassPrev = bass;
    if (bassAccel > 0.12) this.kickAccum = Math.min(this.kickAccum + bassAccel * 2, 1);
    this.kickAccum *= 0.88;

    this.uniforms.uTime!.value = this.time;
    this.uniforms.uBass!.value = this.bassSmooth;
    this.uniforms.uMid!.value = this.midSmooth;
    this.uniforms.uTreble!.value = this.trebleSmooth;
    this.uniforms.uAmp!.value = this.ampSmooth;
    this.uniforms.uKick!.value = this.kickAccum;
    this.uniforms.uSymmetry!.value = Number(params.symmetry ?? 0.5);
    this.uniforms.uZoom!.value = Number(params.zoom ?? 0.5);

    (this.uniforms.uColor1!.value as THREE.Color).set(palette[0] ?? "#FF00FF");
    (this.uniforms.uColor2!.value as THREE.Color).set(palette[1] ?? "#00FFFF");
    (this.uniforms.uColor3!.value as THREE.Color).set(palette[2] ?? "#FFAA00");

    this.fbUniforms.uBass!.value = this.bassSmooth;
    this.fbUniforms.uTime!.value = this.time;
    this.fbUniforms.uDecay!.value = 0.88 + this.bassSmooth * 0.08;

    const renderer = ctx.renderer;

    // Feedback pass
    this.fbUniforms.uTexture!.value = this.rtB.texture;
    renderer.setRenderTarget(this.rtA);
    renderer.render(this.fbScene, this.ortho);

    // Main pass with feedback
    this.uniforms.uFeedback!.value = this.rtA.texture;
    renderer.setRenderTarget(this.rtB);
    renderer.render(this.mainScene, this.ortho);

    // Output to screen
    renderer.setRenderTarget(null);
    this.uniforms.uFeedback!.value = this.rtB.texture;
    renderer.render(this.mainScene, this.ortho);
    ctx.scene.visible = false;
  }

  dispose() {
    this.rtA?.dispose();
    this.rtB?.dispose();
    [this.quad, this.fbQuad].forEach(q => {
      if (q) { q.geometry.dispose(); (q.material as THREE.Material).dispose(); }
    });
    this.quad = null; this.fbQuad = null;
    this.rtA = null; this.rtB = null;
    this.mainScene = null; this.fbScene = null;
  }

  getControlsSchema(): TemplateControl[] {
    return [
      { id: "symmetry", label: "Symmetry", type: "slider", default: 0.5, min: 0, max: 1, step: 0.01 },
      { id: "zoom", label: "Zoom", type: "slider", default: 0.5, min: 0, max: 1, step: 0.01 },
    ];
  }
}

export default new ElectricMandala();
