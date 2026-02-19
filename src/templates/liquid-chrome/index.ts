import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

/**
 * Liquid Chrome — Ray-marched metaballs with iridescent environment mapping.
 * Multiple blobs orbit, merge, and split reactively. Bass makes them explode
 * apart then reconverge. Treble adds surface ripples. The whole thing has
 * a chromatic, oily sheen that shifts with the music.
 */
class LiquidChrome implements TemplateModule {
  id = "liquid-chrome";
  name = "Liquid Chrome";
  tags = ["organic", "psychedelic"];

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
    uniform float uMorphIntensity;
    uniform float uFlowSpeed;
    uniform vec2 uResolution;
    varying vec2 vUv;

    #define PI 3.14159265359
    #define MAX_STEPS 80
    #define MAX_DIST 20.0
    #define SURF_DIST 0.002

    // Smooth minimum for metaball blending
    float smin(float a, float b, float k) {
      float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
      return mix(b, a, h) - k * h * (1.0 - h);
    }

    float hash(vec3 p) {
      p = fract(p * vec3(123.34, 456.21, 789.56));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y * p.z);
    }

    float noise3d(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float n = mix(
        mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      return n;
    }

    // Scene SDF: multiple metaballs
    float sceneSDF(vec3 p) {
      float t = uTime * (0.3 + uFlowSpeed * 0.7);
      float morph = uMorphIntensity;

      // 5 orbiting blobs
      float d = 1e10;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float angle = fi * 1.2566 + t * (0.5 + fi * 0.1); // 2PI/5 spacing
        float r = 1.2 + sin(t * 0.3 + fi * 2.0) * 0.5 + uKick * 1.5;

        vec3 blobPos = vec3(
          cos(angle) * r,
          sin(angle * 0.7 + t * 0.4) * r * 0.8,
          sin(angle) * r * 0.3
        );

        float blobSize = 0.6 + sin(t * 0.8 + fi * 1.5) * 0.15 + uBass * 0.3;

        // Surface displacement for treble detail
        float disp = 0.0;
        if (uTreble > 0.1) {
          vec3 np = (p - blobPos) * (3.0 + uTreble * 5.0);
          disp = (noise3d(np + t * 2.0) - 0.5) * uTreble * 0.2 * morph;
        }

        float blob = length(p - blobPos) - blobSize + disp;
        d = smin(d, blob, 0.5 + uBass * 0.3);
      }

      // Central blob that breathes
      float centerSize = 0.8 + uBass * 0.5 + sin(t) * 0.1;
      float centerDisp = (noise3d(p * 4.0 + t) - 0.5) * uMid * 0.15 * morph;
      float center = length(p) - centerSize + centerDisp;
      d = smin(d, center, 0.6);

      return d;
    }

    // Normal estimation
    vec3 getNormal(vec3 p) {
      float e = 0.005;
      return normalize(vec3(
        sceneSDF(p + vec3(e,0,0)) - sceneSDF(p - vec3(e,0,0)),
        sceneSDF(p + vec3(0,e,0)) - sceneSDF(p - vec3(0,e,0)),
        sceneSDF(p + vec3(0,0,e)) - sceneSDF(p - vec3(0,0,e))
      ));
    }

    // Iridescent color from view angle
    vec3 iridescence(float cosTheta, float t) {
      // Thin-film interference approximation
      float x = cosTheta;
      vec3 col;
      col.r = 0.5 + 0.5 * cos(PI * 2.0 * (x * 1.0 + t * 0.1 + 0.0));
      col.g = 0.5 + 0.5 * cos(PI * 2.0 * (x * 1.0 + t * 0.1 + 0.33));
      col.b = 0.5 + 0.5 * cos(PI * 2.0 * (x * 1.0 + t * 0.1 + 0.67));
      return col;
    }

    void main() {
      vec2 uv = (vUv * 2.0 - 1.0);
      uv.x *= uResolution.x / uResolution.y;

      // Camera setup
      float camDist = 4.5 - uBass * 0.5;
      float camAngle = uTime * 0.15 + uMid * 0.3;
      vec3 ro = vec3(cos(camAngle) * camDist, sin(uTime * 0.1) * 1.0, sin(camAngle) * camDist);
      vec3 target = vec3(0.0, 0.0, 0.0);
      vec3 fwd = normalize(target - ro);
      vec3 right = normalize(cross(vec3(0,1,0), fwd));
      vec3 up = cross(fwd, right);
      vec3 rd = normalize(fwd + uv.x * right + uv.y * up);

      // Ray march
      float t = 0.0;
      float d;
      vec3 p;
      bool hit = false;

      for (int i = 0; i < MAX_STEPS; i++) {
        p = ro + rd * t;
        d = sceneSDF(p);
        if (d < SURF_DIST) { hit = true; break; }
        if (t > MAX_DIST) break;
        t += d * 0.8;
      }

      vec3 col = vec3(0.0);

      if (hit) {
        vec3 n = getNormal(p);
        vec3 viewDir = normalize(ro - p);

        // Fresnel
        float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);

        // Iridescent reflection
        vec3 reflDir = reflect(-viewDir, n);
        vec3 irid = iridescence(dot(n, viewDir), uTime);

        // Environment fake — gradient based on reflection direction
        vec3 envColor = mix(uColor1, uColor2, reflDir.y * 0.5 + 0.5);
        envColor = mix(envColor, uColor3, reflDir.x * 0.5 + 0.5);

        // Specular highlights
        vec3 lightDir = normalize(vec3(1.0, 2.0, 1.5));
        float spec = pow(max(dot(reflDir, lightDir), 0.0), 32.0);
        float spec2 = pow(max(dot(reflDir, normalize(vec3(-1.0, 1.0, -0.5))), 0.0), 16.0);

        // Compose
        col = mix(envColor * 0.3, irid, fresnel * 0.7);
        col += spec * vec3(1.0) * 0.8;
        col += spec2 * uColor1 * 0.4;

        // AO approximation
        float ao = 1.0 - smoothstep(0.0, 2.0, t * 0.1);
        col *= ao;

        // Rim glow
        col += (uColor1 + uColor2) * 0.3 * pow(fresnel, 2.0) * uAmp;
      } else {
        // Background: subtle radial gradient
        float bgGrad = length(uv) * 0.3;
        col = mix(uColor1 * 0.03, vec3(0.0), bgGrad);
      }

      // Bloom approximation — add glow around edges
      col *= 0.4 + uAmp * 0.8;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  init(ctx: RenderContext) {
    const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
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
      uMorphIntensity: { value: 0.6 },
      uFlowSpeed: { value: 0.5 },
      uResolution: { value: new THREE.Vector2(ctx.width, ctx.height) },
    };

    const geo = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: this.vertShader,
      fragmentShader: this.fragShader,
    }));
    ctx.scene.add(this.quad);

    // Override camera
    ctx.camera.position.set(0, 0, 1);
    ctx.camera.lookAt(0, 0, 0);
  }

  update(ctx: RenderContext, input: ReactiveInput, delta: number) {
    if (!this.quad) return;
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

    const bassAccel = bass - this.bassPrev;
    this.bassPrev = bass;
    if (bassAccel > 0.12) this.kickAccum = Math.min(this.kickAccum + bassAccel * 2.5, 1);
    this.kickAccum *= 0.88;

    this.uniforms.uTime!.value = this.time;
    this.uniforms.uBass!.value = this.bassSmooth;
    this.uniforms.uMid!.value = this.midSmooth;
    this.uniforms.uTreble!.value = this.trebleSmooth;
    this.uniforms.uAmp!.value = this.ampSmooth;
    this.uniforms.uKick!.value = this.kickAccum;
    this.uniforms.uMorphIntensity!.value = Number(params.morphIntensity ?? 0.6);
    this.uniforms.uFlowSpeed!.value = Number(params.flowSpeed ?? 0.5);

    (this.uniforms.uColor1!.value as THREE.Color).set(palette[0] ?? "#FF00FF");
    (this.uniforms.uColor2!.value as THREE.Color).set(palette[1] ?? "#00FFFF");
    (this.uniforms.uColor3!.value as THREE.Color).set(palette[2] ?? "#FFAA00");
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
      { id: "morphIntensity", label: "Morph Intensity", type: "slider", default: 0.6, min: 0.1, max: 1, step: 0.01 },
      { id: "flowSpeed", label: "Flow Speed", type: "slider", default: 0.5, min: 0.1, max: 1, step: 0.01 },
    ];
  }
}

export default new LiquidChrome();
