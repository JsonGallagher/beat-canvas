import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

/**
 * Fractal Tunnel — Ray-marched infinite tunnel with fractal-warped walls.
 * The camera flies through at bass-reactive speed. Walls use domain-warped
 * FBM to create organic, pulsating textures. Treble adds fine detail,
 * mid shifts the tunnel's cross-section shape. Color bands stripe the walls.
 */
class FractalTunnel implements TemplateModule {
  id = "fractal-tunnel";
  name = "Fractal Tunnel";
  tags = ["tunnel", "hypnotic"];

  private quad: THREE.Mesh | null = null;
  private uniforms: Record<string, THREE.IUniform> = {};
  private time = 0;
  private bassSmooth = 0;
  private midSmooth = 0;
  private trebleSmooth = 0;
  private ampSmooth = 0;
  private zAccum = 0;

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
    uniform float uZ;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform float uSpeed;
    uniform float uTwist;
    uniform vec2 uResolution;
    varying vec2 vUv;

    #define PI 3.14159265359
    #define MAX_STEPS 60
    #define MAX_DIST 30.0
    #define SURF_DIST 0.01

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

    // Tunnel SDF — distance from center axis with varying radius
    float tunnelSDF(vec3 p) {
      float z = p.z;

      // Tunnel path wobbles
      vec2 wobble = vec2(
        sin(z * 0.15 + uTime * 0.2) * 1.5 * uMid,
        cos(z * 0.12 + uTime * 0.15) * 1.0 * uMid
      );

      vec2 centered = p.xy - wobble;

      // Twist along z-axis
      float twistAngle = z * uTwist * 0.3 + uTime * 0.2;
      float ct = cos(twistAngle);
      float st = sin(twistAngle);
      centered = vec2(centered.x * ct - centered.y * st, centered.x * st + centered.y * ct);

      // Radius varies: polygonal cross-section morphing
      float angle = atan(centered.y, centered.x);
      float sides = 4.0 + uMid * 4.0; // 4 to 8 sides
      float polygonR = cos(PI / sides) / cos(mod(angle, 2.0 * PI / sides) - PI / sides);

      // Wall displacement with FBM
      float wallNoise = fbm(vec2(angle * 2.0, z * 0.3) + uTime * 0.1);
      wallNoise += fbm(vec2(angle * 5.0, z * 0.8) + uTime * 0.2) * uTreble * 0.5;

      float radius = 2.0 + sin(z * 0.2 + uTime * 0.3) * 0.3 + uBass * 0.5;
      radius *= polygonR;
      radius += wallNoise * 0.4 * (0.5 + uBass * 0.5);

      // Inverted: we're inside the tunnel
      return radius - length(centered);
    }

    vec3 getNormal(vec3 p) {
      float e = 0.02;
      return normalize(vec3(
        tunnelSDF(p + vec3(e,0,0)) - tunnelSDF(p - vec3(e,0,0)),
        tunnelSDF(p + vec3(0,e,0)) - tunnelSDF(p - vec3(0,e,0)),
        tunnelSDF(p + vec3(0,0,e)) - tunnelSDF(p - vec3(0,0,e))
      ));
    }

    void main() {
      vec2 uv = (vUv * 2.0 - 1.0);
      uv.x *= uResolution.x / uResolution.y;

      // Camera flying through tunnel
      vec3 ro = vec3(0.0, 0.0, uZ);
      vec3 rd = normalize(vec3(uv * 0.8, 1.0));

      // Slight camera wobble
      float wobbleT = uTime * 0.5;
      rd.x += sin(wobbleT) * 0.05 * uMid;
      rd.y += cos(wobbleT * 0.7) * 0.05 * uMid;
      rd = normalize(rd);

      float t = 0.0;
      float d;
      vec3 p;
      bool hit = false;

      for (int i = 0; i < MAX_STEPS; i++) {
        p = ro + rd * t;
        d = tunnelSDF(p);
        if (d < SURF_DIST) { hit = true; break; }
        if (t > MAX_DIST) break;
        t += max(d * 0.5, 0.02); // careful stepping for interior
      }

      vec3 col = vec3(0.0);

      if (hit) {
        vec3 n = getNormal(p);

        // Distance fog color
        float fogAmount = 1.0 - exp(-t * 0.08);

        // Wall color based on z-position (creates streaming bands)
        float zBand = fract(p.z * 0.2 + uTime * 0.5);
        vec3 wallColor = mix(uColor1, uColor2, smoothstep(0.0, 0.5, zBand));
        wallColor = mix(wallColor, uColor3, smoothstep(0.5, 1.0, zBand));

        // Angle-based color variation
        float angle = atan(n.y, n.x);
        wallColor *= 0.7 + 0.3 * sin(angle * 3.0 + uTime * 2.0 + p.z * 0.5);

        // Lighting
        vec3 lightDir = normalize(vec3(sin(uTime * 0.5), cos(uTime * 0.3), 1.0));
        float diffuse = max(dot(n, lightDir), 0.0) * 0.5 + 0.5;

        // Specular
        vec3 viewDir = normalize(ro - p);
        vec3 reflDir = reflect(-lightDir, n);
        float spec = pow(max(dot(viewDir, reflDir), 0.0), 16.0) * uTreble;

        col = wallColor * diffuse * (0.3 + uAmp * 0.7);
        col += vec3(spec) * 0.3;

        // Edge glow — bright lines at surface intersections
        float edgeGlow = 1.0 - smoothstep(0.0, 0.05, abs(d));
        col += (uColor1 + uColor2) * 0.5 * edgeGlow * 0.5;

        // Fog
        vec3 fogColor = mix(uColor1, uColor3, 0.5) * 0.1;
        col = mix(col, fogColor, fogAmount);
      } else {
        // Tunnel interior glow at distance
        float glow = exp(-t * 0.05);
        col = mix(uColor1, uColor2, 0.5) * glow * 0.15 * uAmp;
      }

      // Bass flash
      col += (uColor1 + uColor2 + uColor3) * 0.1 * uKick;

      // Vignette
      float vignette = 1.0 - length(vUv * 2.0 - 1.0) * 0.5;
      col *= vignette;

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
      uZ: { value: 0 },
      uColor1: { value: new THREE.Color() },
      uColor2: { value: new THREE.Color() },
      uColor3: { value: new THREE.Color() },
      uSpeed: { value: 0.5 },
      uTwist: { value: 0.5 },
      uResolution: { value: new THREE.Vector2(ctx.width, ctx.height) },
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

    this.bassSmooth += (bass - this.bassSmooth) * 0.12;
    this.midSmooth += (mid - this.midSmooth) * 0.1;
    this.trebleSmooth += (treble - this.trebleSmooth) * 0.15;
    this.ampSmooth += (amp - this.ampSmooth) * 0.1;

    const speed = Number(params.speed ?? 0.5);
    this.zAccum += delta * (2 + speed * 6) * (1 + this.bassSmooth * 3);

    this.uniforms.uTime!.value = this.time;
    this.uniforms.uBass!.value = this.bassSmooth;
    this.uniforms.uMid!.value = this.midSmooth;
    this.uniforms.uTreble!.value = this.trebleSmooth;
    this.uniforms.uAmp!.value = this.ampSmooth;
    this.uniforms.uKick!.value = frame.kickIntensity;
    this.uniforms.uZ!.value = this.zAccum;
    this.uniforms.uSpeed!.value = speed;
    this.uniforms.uTwist!.value = Number(params.twist ?? 0.5);

    (this.uniforms.uColor1!.value as THREE.Color).set(palette[0] ?? "#00FFFF");
    (this.uniforms.uColor2!.value as THREE.Color).set(palette[1] ?? "#FF00FF");
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
      { id: "speed", label: "Zoom Speed", type: "slider", default: 0.5, min: 0.1, max: 1, step: 0.01 },
      { id: "twist", label: "Twist", type: "slider", default: 0.5, min: 0, max: 1, step: 0.01 },
    ];
  }
}

export default new FractalTunnel();
