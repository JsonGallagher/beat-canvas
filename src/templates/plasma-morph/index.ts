import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

/**
 * Plasma Morph — Multi-layered domain-warped plasma with feedback trail.
 * Uses 3 layers of warped FBM that interfere and beat against each other.
 * Bass creates shockwave ripples from center, treble adds electric arcs,
 * mid shifts the warp domains. Feedback loop creates smearing persistence.
 */
class PlasmaMorph implements TemplateModule {
  id = "plasma-morph";
  name = "Plasma Morph";
  tags = ["plasma", "psychedelic"];

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
    uniform float uComplexity;
    uniform float uSpeed;
    uniform sampler2D uFeedback;
    varying vec2 vUv;

    #define PI 3.14159265359

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
      for (int i = 0; i < 7; i++) {
        v += a * noise(p);
        p = rot * p * 2.0 + vec2(1.7, 9.2);
        a *= 0.5;
      }
      return v;
    }

    // Triple domain warp
    float warp3(vec2 p, float t) {
      vec2 q = vec2(fbm(p + t * 0.1), fbm(p + vec2(5.2, 1.3) + t * 0.08));
      vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.06), fbm(p + 4.0 * q + vec2(8.3, 2.8) + t * 0.05));
      vec2 s = vec2(fbm(p + 3.0 * r + vec2(3.1, 7.7) + t * 0.04), fbm(p + 3.0 * r + vec2(2.9, 4.1) + t * 0.03));
      return fbm(p + 4.0 * s);
    }

    void main() {
      vec2 uv = vUv * 2.0 - 1.0;
      uv.y *= 1.778;

      float t = uTime * (0.3 + uSpeed * 0.7);
      float cx = uComplexity;

      // Rotating coordinate system
      float rotAngle = t * 0.1 + uMid * 0.5;
      mat2 rot = mat2(cos(rotAngle), -sin(rotAngle), sin(rotAngle), cos(rotAngle));
      vec2 ruv = rot * uv;

      // Three interfering plasma layers
      float p1 = warp3(ruv * (1.5 + cx * 2.0), t * 0.8);
      float p2 = warp3(ruv * (2.0 + cx * 3.0) + 5.0, t * 1.2 + 10.0);
      float p3 = fbm(ruv * (4.0 + cx * 5.0) + p1 * 3.0 + t * 0.5);

      // Combine with frequency weighting
      float plasma = p1 * (0.4 + uBass * 0.3) + p2 * (0.3 + uMid * 0.3) + p3 * (0.2 + uTreble * 0.3);

      // Bass shockwave rings
      float radius = length(uv);
      float shockwave = sin(radius * (10.0 + uBass * 30.0) - t * 5.0 - uKick * 10.0);
      shockwave = smoothstep(0.7, 1.0, shockwave) * uBass * 0.6;

      // Treble electric arcs
      float arc = 0.0;
      if (uTreble > 0.2) {
        float arcAngle = atan(uv.y, uv.x);
        float arcNoise = noise(vec2(arcAngle * 5.0, t * 8.0));
        float arcLine = abs(radius - 0.5 - arcNoise * 0.8);
        arc = exp(-arcLine * 20.0) * uTreble * 0.8;
      }

      // Color mapping — rich palette blending
      vec3 col = vec3(0.0);
      float v = plasma * PI * 2.0;
      col += uColor1 * pow(sin(v) * 0.5 + 0.5, 1.5);
      col += uColor2 * pow(sin(v + PI * 0.667) * 0.5 + 0.5, 1.5);
      col += uColor3 * pow(sin(v + PI * 1.333) * 0.5 + 0.5, 1.5);

      // Shockwave adds white-hot ring
      col += vec3(shockwave);
      col += mix(uColor1, uColor3, 0.5) * shockwave * 0.5;

      // Electric arcs
      col += (uColor2 + vec3(0.5)) * arc;

      // Brightness
      col *= 0.25 + uAmp * 0.9;

      // Vignette
      float vignette = 1.0 - radius * 0.25;
      col *= max(vignette, 0.0);

      // Mix with feedback
      vec3 fb = texture2D(uFeedback, vUv).rgb;
      col = max(col, fb * (0.75 + uBass * 0.15));

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
      vec2 uv = center + (vUv - center) * (0.998 - uBass * 0.003);

      // Slight swirl
      vec2 d = uv - center;
      float angle = 0.003 + uBass * 0.005;
      uv = center + vec2(
        d.x * cos(angle) - d.y * sin(angle),
        d.x * sin(angle) + d.y * cos(angle)
      );

      vec3 col = texture2D(uTexture, uv).rgb;
      col *= uDecay;

      // Color cycling on decay
      col.r *= 0.97;
      col.g *= 0.98;
      col.b *= 0.96;

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
      uColor3: { value: new THREE.Color() }, uComplexity: { value: 0.5 },
      uSpeed: { value: 0.5 }, uFeedback: { value: this.rtA.texture },
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
      uDecay: { value: 0.93 }, uBass: { value: 0 }, uTime: { value: 0 },
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

    this.uniforms.uTime!.value = this.time;
    this.uniforms.uBass!.value = this.bassSmooth;
    this.uniforms.uMid!.value = this.midSmooth;
    this.uniforms.uTreble!.value = this.trebleSmooth;
    this.uniforms.uAmp!.value = this.ampSmooth;
    this.uniforms.uKick!.value = frame.kickIntensity;
    this.uniforms.uComplexity!.value = Number(params.complexity ?? 0.5);
    this.uniforms.uSpeed!.value = Number(params.speed ?? 0.5);
    (this.uniforms.uColor1!.value as THREE.Color).set(palette[0] ?? "#FF00FF");
    (this.uniforms.uColor2!.value as THREE.Color).set(palette[1] ?? "#00FFFF");
    (this.uniforms.uColor3!.value as THREE.Color).set(palette[2] ?? "#FFAA00");

    this.fbUniforms.uBass!.value = this.bassSmooth;
    this.fbUniforms.uTime!.value = this.time;
    this.fbUniforms.uDecay!.value = 0.90 + this.bassSmooth * 0.06;

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
      { id: "complexity", label: "Complexity", type: "slider", default: 0.5, min: 0, max: 1, step: 0.01 },
      { id: "speed", label: "Speed", type: "slider", default: 0.5, min: 0.1, max: 1, step: 0.01 },
    ];
  }
}

export default new PlasmaMorph();
