import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

/**
 * Aurora Cascade — Full-screen shader simulating volumetric aurora borealis
 * curtains. Uses layered FBM noise with domain warping to create undulating
 * light curtains. Bass creates deep swells, mid drives horizontal drift,
 * treble adds fine shimmer. Multiple color bands shift through the palette.
 * A vertical gradient fades the aurora from top, with ground-level fog.
 */
class AuroraCascade implements TemplateModule {
  id = "aurora-cascade";
  name = "Aurora Cascade";
  tags = ["aurora", "atmospheric"];

  private quad: THREE.Mesh | null = null;
  private uniforms: Record<string, THREE.IUniform> = {};
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
    uniform float uWaveSpeed;
    uniform float uIntensity;
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

    float fbm(vec2 p, int octaves) {
      float v = 0.0;
      float a = 0.5;
      mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
      for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        v += a * noise(p);
        p = rot * p * 2.0 + vec2(1.7, 9.2);
        a *= 0.5;
      }
      return v;
    }

    // Aurora curtain function
    float auroraCurtain(vec2 uv, float offset, float t, float speed) {
      // Horizontal wave
      float wave = fbm(vec2(uv.x * 2.0 + offset + t * speed * 0.3, t * speed * 0.1), 5);

      // Vertical structure — aurora has a characteristic bottom edge
      float curtainShape = uv.y + wave * 0.4 + uBass * 0.2;

      // Sharp bottom edge, soft top fade
      float bottomEdge = smoothstep(-0.1, 0.15, curtainShape);
      float topFade = smoothstep(1.2, 0.3, curtainShape);

      // Fine vertical streaks
      float streaks = noise(vec2(uv.x * 30.0 + offset * 5.0, uv.y * 3.0 + t * speed));
      streaks = pow(streaks, 2.0) * 0.5 + 0.5;

      // Undulation — the characteristic ripple of aurora
      float ripple = sin(uv.x * (8.0 + uMid * 10.0) + t * speed * 2.0 + offset * 3.0);
      ripple = ripple * 0.5 + 0.5;
      ripple = mix(0.5, ripple, 0.4 + uTreble * 0.4);

      return bottomEdge * topFade * streaks * ripple;
    }

    void main() {
      vec2 uv = vUv;
      uv.y = 1.0 - uv.y; // flip so aurora is at top

      float t = uTime;
      float speed = 0.3 + uWaveSpeed * 1.5;
      float intensity = uIntensity;

      // Dark sky background with stars
      vec3 sky = vec3(0.01, 0.005, 0.02);

      // Stars
      float stars = 0.0;
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 starUv = uv * (100.0 + fi * 50.0);
        float star = hash(floor(starUv));
        star = step(0.997, star);
        float twinkle = sin(hash(floor(starUv) + 0.5) * 100.0 + t * (2.0 + fi)) * 0.5 + 0.5;
        stars += star * twinkle * (0.3 + uTreble * 0.3);
      }
      sky += vec3(stars * 0.8, stars * 0.9, stars);

      // Layer multiple aurora curtains
      vec3 aurora = vec3(0.0);

      // Curtain 1 — primary, green-ish
      float c1 = auroraCurtain(uv, 0.0, t, speed);
      c1 *= 0.6 + uAmp * 0.6;
      vec3 col1 = mix(uColor1, uColor2, uv.y + sin(uv.x * 3.0 + t * 0.5) * 0.3);
      aurora += col1 * c1 * intensity;

      // Curtain 2 — offset, different color
      float c2 = auroraCurtain(uv + vec2(0.3, 0.05), 2.5, t, speed * 0.8);
      c2 *= 0.4 + uBass * 0.5;
      vec3 col2 = mix(uColor2, uColor3, uv.y);
      aurora += col2 * c2 * intensity * 0.7;

      // Curtain 3 — subtle background layer
      float c3 = auroraCurtain(uv + vec2(-0.2, 0.1), 5.0, t, speed * 0.6);
      c3 *= 0.3 + uMid * 0.4;
      vec3 col3 = mix(uColor3, uColor1, uv.y);
      aurora += col3 * c3 * intensity * 0.5;

      // Curtain 4 — high frequency detail on treble
      float c4 = auroraCurtain(uv + vec2(0.1, -0.05), 8.0, t, speed * 1.5);
      c4 *= uTreble * 0.6;
      aurora += uColor1 * c4 * intensity * 0.4;

      // Bass pulse — brightens everything and adds bottom glow
      float bassPulse = uKick * 0.3;
      aurora *= 1.0 + bassPulse;

      // Ground fog / horizon glow
      float horizon = smoothstep(0.95, 0.75, uv.y);
      vec3 horizonColor = mix(uColor1, uColor2, sin(t * 0.3) * 0.5 + 0.5) * 0.15;
      aurora += horizonColor * horizon * (0.5 + uBass * 0.5);

      // Combine
      vec3 col = sky + aurora;

      // Subtle chromatic fringing at bright areas
      float totalBright = dot(aurora, vec3(0.333));
      col.r += totalBright * 0.03;
      col.b += totalBright * 0.02;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  init(ctx: RenderContext) {
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
      uWaveSpeed: { value: 0.5 },
      uIntensity: { value: 0.6 },
    };

    const geo = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: this.vertShader,
      fragmentShader: this.fragShader,
    }));
    ctx.scene.add(this.quad);
    ctx.camera.position.set(0, 0, 1);
    ctx.camera.lookAt(0, 0, 0);
  }

  update(_ctx: RenderContext, input: ReactiveInput, delta: number) {
    if (!this.quad) return;
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

    this.uniforms.uTime!.value = this.time;
    this.uniforms.uBass!.value = this.bassSmooth;
    this.uniforms.uMid!.value = this.midSmooth;
    this.uniforms.uTreble!.value = this.trebleSmooth;
    this.uniforms.uAmp!.value = this.ampSmooth;
    this.uniforms.uKick!.value = frame.kickIntensity;
    this.uniforms.uWaveSpeed!.value = Number(params.waveSpeed ?? 0.5);
    this.uniforms.uIntensity!.value = Number(params.intensity ?? 0.6);

    (this.uniforms.uColor1!.value as THREE.Color).set(palette[0] ?? "#00FF88");
    (this.uniforms.uColor2!.value as THREE.Color).set(palette[1] ?? "#FF00FF");
    (this.uniforms.uColor3!.value as THREE.Color).set(palette[2] ?? "#00AAFF");
  }

  dispose() {
    if (this.quad) {
      this.quad.geometry.dispose();
      (this.quad.material as THREE.Material).dispose();
    }
    this.quad = null;
  }

  getControlsSchema(): TemplateControl[] {
    return [
      { id: "waveSpeed", label: "Wave Speed", type: "slider", default: 0.5, min: 0.1, max: 1, step: 0.01 },
      { id: "intensity", label: "Intensity", type: "slider", default: 0.6, min: 0.1, max: 1, step: 0.01 },
    ];
  }
}

export default new AuroraCascade();
