import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

/**
 * Mirror Shatter — Full-screen Voronoi shader that creates a fractured mirror
 * effect. Each Voronoi cell acts as a distorted mirror shard reflecting a
 * psychedelic interior scene. Bass transients shatter the cells apart (gaps
 * widen, cells rotate), then they reconverge. Treble adds chromatic
 * aberration per-cell. The cell edges glow with energy.
 */
class MirrorShatter implements TemplateModule {
  id = "mirror-shatter";
  name = "Mirror Shatter";
  tags = ["geometric", "glitch"];

  private quad: THREE.Mesh | null = null;
  private uniforms: Record<string, THREE.IUniform> = {};
  private time = 0;
  private bassSmooth = 0;
  private midSmooth = 0;
  private trebleSmooth = 0;
  private ampSmooth = 0;
  private kickAccum = 0;
  private bassPrev = 0;

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
    uniform float uShatterForce;
    uniform float uReflectivity;
    varying vec2 vUv;

    #define PI 3.14159265359
    #define CELL_COUNT 25.0

    // Hash functions
    vec2 hash2(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return fract(sin(p) * 43758.5453);
    }

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
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
      }
      return v;
    }

    // Voronoi with distance to edges
    vec3 voronoi(vec2 x) {
      vec2 n = floor(x);
      vec2 f = fract(x);

      vec2 mg, mr;
      float md = 8.0;

      // Find closest cell center
      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 o = hash2(n + g);

          // Animate cell centers
          o = 0.5 + 0.4 * sin(uTime * 0.5 + 6.2831 * o + uBass * 2.0);

          vec2 r = g + o - f;
          float d = dot(r, r);

          if (d < md) {
            md = d;
            mr = r;
            mg = g;
          }
        }
      }

      // Distance to edge
      md = 8.0;
      for (int j = -2; j <= 2; j++) {
        for (int i = -2; i <= 2; i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 o = hash2(n + g);
          o = 0.5 + 0.4 * sin(uTime * 0.5 + 6.2831 * o + uBass * 2.0);

          vec2 r = g + o - f;

          if (dot(mg - g, mg - g) > 0.00001) {
            md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
          }
        }
      }

      return vec3(md, mr);
    }

    void main() {
      vec2 uv = vUv * 2.0 - 1.0;
      uv.y *= 1.778;

      float t = uTime;

      // Scale for Voronoi grid
      float scale = 3.0 + uShatterForce * 3.0;
      vec2 vuv = uv * scale;

      vec3 vor = voronoi(vuv);
      float edgeDist = vor.x;
      vec2 cellOffset = vor.yz;

      // Cell ID for per-cell effects
      float cellId = hash(floor(vuv + cellOffset + 0.5));

      // Shatter effect: gap widens on kicks
      float gap = 0.02 + uKick * uShatterForce * 0.15;
      float edgeMask = smoothstep(gap, gap + 0.02, edgeDist);

      // Per-cell rotation on shatter
      float cellRot = uKick * (cellId - 0.5) * 2.0 * uShatterForce;
      mat2 cellRotMat = mat2(cos(cellRot), -sin(cellRot), sin(cellRot), cos(cellRot));

      // Reflected UV per cell — creates the mirror shard illusion
      vec2 cellUv = cellRotMat * (uv + cellOffset * 0.1 * (1.0 + uKick * uShatterForce));

      // Chromatic aberration per cell on treble
      float chromOffset = uTreble * 0.02 * uReflectivity;
      vec2 rUv = cellUv + chromOffset * (cellId - 0.5);
      vec2 gUv = cellUv;
      vec2 bUv = cellUv - chromOffset * (cellId - 0.5);

      // Interior psychedelic scene (what each shard "reflects")
      float scene_r = fbm(rUv * 3.0 + t * 0.3 + cellId * 5.0);
      float scene_g = fbm(gUv * 3.0 + t * 0.3 + cellId * 5.0 + 1.0);
      float scene_b = fbm(bUv * 3.0 + t * 0.3 + cellId * 5.0 + 2.0);

      // Second layer: moving patterns
      scene_r += sin(rUv.x * 5.0 + rUv.y * 3.0 + t * 2.0 + cellId * 10.0) * 0.3;
      scene_g += sin(gUv.x * 4.0 - gUv.y * 5.0 + t * 1.5 + cellId * 10.0) * 0.3;
      scene_b += cos(bUv.x * 6.0 + bUv.y * 2.0 + t * 2.5 + cellId * 10.0) * 0.3;

      // Map to palette colors
      vec3 sceneCol;
      sceneCol.r = mix(uColor1.r, uColor2.r, scene_r);
      sceneCol.g = mix(uColor2.g, uColor3.g, scene_g);
      sceneCol.b = mix(uColor3.b, uColor1.b, scene_b);

      // Fresnel-like edge brightening within each cell
      float cellFresnel = 1.0 - edgeDist * 3.0;
      cellFresnel = max(cellFresnel, 0.0);
      sceneCol += vec3(cellFresnel * uReflectivity * 0.3);

      // Brightness
      float brightness = 0.2 + uAmp * 0.8;
      sceneCol *= brightness;

      // Apply edge mask — edges glow
      vec3 edgeColor = mix(uColor1, uColor2, sin(t * 2.0 + cellId * 5.0) * 0.5 + 0.5);
      float edgeGlow = exp(-edgeDist * 15.0) * (0.5 + uAmp * 0.5 + uKick * 0.5);

      vec3 col = sceneCol * edgeMask + edgeColor * edgeGlow;

      // Flash on kick
      col += (uColor1 + uColor2 + uColor3) * 0.15 * uKick * uShatterForce;

      // Depth: cells at different Z (darken distant ones)
      float depth = 0.7 + cellId * 0.3;
      col *= depth;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  init(ctx: RenderContext) {
    this.uniforms = {
      uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 },
      uTreble: { value: 0 }, uAmp: { value: 0 }, uKick: { value: 0 },
      uColor1: { value: new THREE.Color() }, uColor2: { value: new THREE.Color() },
      uColor3: { value: new THREE.Color() }, uShatterForce: { value: 0.6 },
      uReflectivity: { value: 0.7 },
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

    this.bassSmooth += (bass - this.bassSmooth) * 0.12;
    this.midSmooth += (frame.mid * intensityMultiplier - this.midSmooth) * 0.1;
    this.trebleSmooth += (frame.treble * intensityMultiplier - this.trebleSmooth) * 0.15;
    this.ampSmooth += (frame.amplitude * intensityMultiplier - this.ampSmooth) * 0.1;

    const bassAccel = bass - this.bassPrev;
    this.bassPrev = bass;
    if (bassAccel > 0.1) this.kickAccum = Math.min(this.kickAccum + bassAccel * 3, 1);
    this.kickAccum *= 0.85;

    this.uniforms.uTime!.value = this.time;
    this.uniforms.uBass!.value = this.bassSmooth;
    this.uniforms.uMid!.value = this.midSmooth;
    this.uniforms.uTreble!.value = this.trebleSmooth;
    this.uniforms.uAmp!.value = this.ampSmooth;
    this.uniforms.uKick!.value = this.kickAccum;
    this.uniforms.uShatterForce!.value = Number(params.shatterForce ?? 0.6);
    this.uniforms.uReflectivity!.value = Number(params.reflectivity ?? 0.7);

    (this.uniforms.uColor1!.value as THREE.Color).set(palette[0] ?? "#FFFFFF");
    (this.uniforms.uColor2!.value as THREE.Color).set(palette[1] ?? "#00FFFF");
    (this.uniforms.uColor3!.value as THREE.Color).set(palette[2] ?? "#FF00FF");
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
      { id: "shatterForce", label: "Shatter Force", type: "slider", default: 0.6, min: 0.1, max: 1, step: 0.01 },
      { id: "reflectivity", label: "Reflectivity", type: "slider", default: 0.7, min: 0.1, max: 1, step: 0.01 },
    ];
  }
}

export default new MirrorShatter();
