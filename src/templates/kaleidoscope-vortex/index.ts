import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

/**
 * Kaleidoscope Vortex — Full-screen shader with domain-warped kaleidoscopic
 * fractal patterns. Uses FBM noise folded through angular symmetry, with
 * zoom pulses on bass, rotation on mid, and detail emergence on treble.
 * A feedback render target creates persistent trails that smear and evolve.
 */
class KaleidoscopeVortex implements TemplateModule {
  id = "kaleidoscope-vortex";
  name = "Kaleidoscope Vortex";
  tags = ["psychedelic", "kaleidoscope"];

  private quad: THREE.Mesh | null = null;
  private feedbackQuad: THREE.Mesh | null = null;
  private rtA: THREE.WebGLRenderTarget | null = null;
  private rtB: THREE.WebGLRenderTarget | null = null;
  private mainScene: THREE.Scene | null = null;
  private fbScene: THREE.Scene | null = null;
  private orthoCamera: THREE.OrthographicCamera | null = null;
  private uniforms: Record<string, THREE.IUniform> = {};
  private fbUniforms: Record<string, THREE.IUniform> = {};
  private time = 0;
  private bassSmooth = 0;
  private midSmooth = 0;
  private trebleSmooth = 0;
  private ampSmooth = 0;

  private vertShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
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
    uniform float uFolds;
    uniform float uZoom;
    uniform sampler2D uFeedback;
    varying vec2 vUv;

    #define PI 3.14159265359
    #define TAU 6.28318530718

    // Hash for pseudo-random
    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    // Smooth noise
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    // Fractal Brownian Motion — 6 octaves
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

    // Domain warping
    float warpedFbm(vec2 p, float t) {
      vec2 q = vec2(
        fbm(p + vec2(0.0, 0.0) + t * 0.15),
        fbm(p + vec2(5.2, 1.3) + t * 0.12)
      );
      vec2 r = vec2(
        fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.1),
        fbm(p + 4.0 * q + vec2(8.3, 2.8) + t * 0.08)
      );
      return fbm(p + 4.0 * r);
    }

    void main() {
      vec2 uv = vUv * 2.0 - 1.0;
      uv.y *= 1.778;

      // Zoom reacts to bass kicks
      float zoom = 1.0 + uZoom * 1.5 - uKick * 0.3;
      uv /= zoom;

      // Convert to polar
      float radius = length(uv);
      float angle = atan(uv.y, uv.x);

      // Kaleidoscopic fold
      float folds = 3.0 + uFolds * 12.0;
      float foldAngle = TAU / folds;
      angle = mod(angle, foldAngle);
      angle = abs(angle - foldAngle * 0.5);

      // Back to cartesian in folded space
      vec2 folded = vec2(cos(angle), sin(angle)) * radius;

      // Rotate folded space with mid
      float rot = uTime * 0.3 + uMid * 1.5;
      mat2 m = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
      folded = m * folded;

      // Multi-scale domain-warped patterns
      float t = uTime;
      float f1 = warpedFbm(folded * (2.0 + uBass * 3.0), t * 0.8);
      float f2 = warpedFbm(folded * (4.0 + uTreble * 5.0) + 3.0, t * 1.2);
      float f3 = fbm(folded * (8.0 + uTreble * 8.0) + f1 * 2.0 + t * 0.5);

      // Combine layers
      float pattern = f1 * 0.5 + f2 * 0.3 + f3 * 0.2 * (0.5 + uTreble);

      // Radial energy pulse on bass
      float pulse = sin(radius * (6.0 + uBass * 20.0) - t * 3.0 - uKick * 5.0);
      pulse = smoothstep(0.0, 0.1, pulse) * uBass * 0.4;

      // Spiral arms
      float spiral = sin(angle * folds + radius * (5.0 + uMid * 10.0) - t * 2.0);
      spiral = smoothstep(0.3, 0.7, spiral) * 0.3;

      // Color mapping with 3 palette colors
      vec3 col = vec3(0.0);
      col += uColor1 * smoothstep(-0.2, 0.8, sin(pattern * PI * 2.0));
      col += uColor2 * smoothstep(-0.2, 0.8, sin(pattern * PI * 2.0 + PI * 0.667));
      col += uColor3 * smoothstep(-0.2, 0.8, sin(pattern * PI * 2.0 + PI * 1.333));

      col += (uColor1 + uColor2) * 0.5 * pulse;
      col += uColor3 * spiral;

      // Vignette with bass breathing
      float vignette = 1.0 - radius * (0.4 - uBass * 0.15);
      vignette = clamp(vignette, 0.0, 1.0);
      col *= vignette;

      // Brightness
      col *= 0.3 + uAmp * 0.9;

      // Mix with feedback for trails
      vec3 fb = texture2D(uFeedback, vUv).rgb;
      col = max(col, fb * (0.7 + uBass * 0.2));

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  // Feedback shader — slight zoom + fade + color shift
  private fbFrag = `
    precision highp float;
    uniform sampler2D uTexture;
    uniform float uDecay;
    uniform float uBass;
    uniform float uTime;
    varying vec2 vUv;

    void main() {
      // Zoom toward center for trail effect
      vec2 uv = vUv;
      vec2 center = vec2(0.5);
      uv = center + (uv - center) * (0.995 + uBass * 0.003);

      // Slight rotation
      float angle = 0.002 + uBass * 0.003;
      vec2 d = uv - center;
      uv = center + vec2(
        d.x * cos(angle) - d.y * sin(angle),
        d.x * sin(angle) + d.y * cos(angle)
      );

      vec3 col = texture2D(uTexture, uv).rgb;

      // Color shift over time
      col.r *= 0.96;
      col.g *= 0.97;
      col.b *= 0.98;

      col *= uDecay;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  init(ctx: RenderContext) {
    const w = ctx.width;
    const h = ctx.height;

    this.rtA = new THREE.WebGLRenderTarget(w, h, { format: THREE.RGBAFormat, type: THREE.HalfFloatType });
    this.rtB = new THREE.WebGLRenderTarget(w, h, { format: THREE.RGBAFormat, type: THREE.HalfFloatType });

    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const plane = new THREE.PlaneGeometry(2, 2);

    // Main kaleidoscope scene
    this.mainScene = new THREE.Scene();
    this.uniforms = {
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uAmp: { value: 0 },
      uKick: { value: 0 },
      uColor1: { value: new THREE.Color() },
      uColor2: { value: new THREE.Color() },
      uColor3: { value: new THREE.Color() },
      uFolds: { value: 0.5 },
      uZoom: { value: 0.5 },
      uFeedback: { value: this.rtA.texture },
    };
    this.quad = new THREE.Mesh(plane, new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: this.vertShader,
      fragmentShader: this.fragShader,
    }));
    this.mainScene.add(this.quad);

    // Feedback scene
    this.fbScene = new THREE.Scene();
    this.fbUniforms = {
      uTexture: { value: this.rtB.texture },
      uDecay: { value: 0.92 },
      uBass: { value: 0 },
      uTime: { value: 0 },
    };
    this.feedbackQuad = new THREE.Mesh(plane.clone(), new THREE.ShaderMaterial({
      uniforms: this.fbUniforms,
      vertexShader: this.vertShader,
      fragmentShader: this.fbFrag,
    }));
    this.fbScene.add(this.feedbackQuad);
  }

  update(ctx: RenderContext, input: ReactiveInput, delta: number) {
    if (!this.quad || !this.rtA || !this.rtB || !this.mainScene || !this.fbScene || !this.orthoCamera) return;

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

    // Kick detection
    const bassAccel = bass - this.bassPrev;
    this.bassPrev = bass;
    if (bassAccel > 0.15) this.kickAccum = Math.min(this.kickAccum + bassAccel * 2, 1);
    this.kickAccum *= 0.9;

    // Update uniforms
    this.uniforms.uTime!.value = this.time;
    this.uniforms.uBass!.value = this.bassSmooth;
    this.uniforms.uMid!.value = this.midSmooth;
    this.uniforms.uTreble!.value = this.trebleSmooth;
    this.uniforms.uAmp!.value = this.ampSmooth;
    this.uniforms.uKick!.value = this.kickAccum;
    this.uniforms.uFolds!.value = Number(params.complexity ?? 0.5);
    this.uniforms.uZoom!.value = Number(params.rotationSpeed ?? 0.5);

    (this.uniforms.uColor1!.value as THREE.Color).set(palette[0] ?? "#FF00FF");
    (this.uniforms.uColor2!.value as THREE.Color).set(palette[1] ?? "#00FFFF");
    (this.uniforms.uColor3!.value as THREE.Color).set(palette[2] ?? "#FFAA00");

    this.fbUniforms.uBass!.value = this.bassSmooth;
    this.fbUniforms.uTime!.value = this.time;
    this.fbUniforms.uDecay!.value = 0.88 + this.bassSmooth * 0.08;

    const renderer = ctx.renderer;

    // Step 1: Render feedback (decay previous frame from rtB into rtA)
    this.fbUniforms.uTexture!.value = this.rtB.texture;
    renderer.setRenderTarget(this.rtA);
    renderer.render(this.fbScene, this.orthoCamera);

    // Step 2: Render main pattern using rtA as feedback, into rtB
    this.uniforms.uFeedback!.value = this.rtA.texture;
    renderer.setRenderTarget(this.rtB);
    renderer.render(this.mainScene, this.orthoCamera);

    // Step 3: Copy rtB to screen
    renderer.setRenderTarget(null);
    // Reuse main scene to blit
    this.uniforms.uFeedback!.value = this.rtB.texture;

    // Actually just render the main scene to screen with the feedback mixed in
    renderer.render(this.mainScene, this.orthoCamera);

    // Clear the user's scene so it doesn't double-render
    ctx.scene.visible = false;
  }

  dispose() {
    this.rtA?.dispose();
    this.rtB?.dispose();
    if (this.quad) {
      this.quad.geometry.dispose();
      (this.quad.material as THREE.Material).dispose();
    }
    if (this.feedbackQuad) {
      this.feedbackQuad.geometry.dispose();
      (this.feedbackQuad.material as THREE.Material).dispose();
    }
    this.quad = null;
    this.feedbackQuad = null;
    this.rtA = null;
    this.rtB = null;
    this.mainScene = null;
    this.fbScene = null;
  }

  getControlsSchema(): TemplateControl[] {
    return [
      { id: "complexity", label: "Fold Symmetry", type: "slider", default: 0.5, min: 0, max: 1, step: 0.01 },
      { id: "rotationSpeed", label: "Zoom Depth", type: "slider", default: 0.5, min: 0, max: 1, step: 0.01 },
    ];
  }
}

export default new KaleidoscopeVortex();
