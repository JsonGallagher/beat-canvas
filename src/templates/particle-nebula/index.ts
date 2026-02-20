import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

const SIZE = 256; // 256*256 = 65,536 particles

class ParticleNebula implements TemplateModule {
  id = "particle-nebula";
  name = "Particle Nebula";
  tags = ["particles", "gpu", "fluid"];

  private posRT_A: THREE.WebGLRenderTarget | null = null;
  private posRT_B: THREE.WebGLRenderTarget | null = null;
  private velRT_A: THREE.WebGLRenderTarget | null = null;
  private velRT_B: THREE.WebGLRenderTarget | null = null;
  private simScene: THREE.Scene | null = null;
  private simCamera: THREE.OrthographicCamera | null = null;
  private velSimMat: THREE.ShaderMaterial | null = null;
  private posSimMat: THREE.ShaderMaterial | null = null;
  private renderMat: THREE.ShaderMaterial | null = null;
  private simQuad: THREE.Mesh | null = null;
  private points: THREE.Points | null = null;
  private time = 0;
  private bassSmooth = 0;
  private ampSmooth = 0;

  // Fullscreen quad vertex shader for sim passes
  private readonly simVert = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

  // Position initialization: random sphere placement
  private readonly posInitFrag = `
    precision highp float;
    varying vec2 vUv;
    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      float r1 = rand(vUv + vec2(0.11, 0.23));
      float r2 = rand(vUv + vec2(0.31, 0.47));
      float r3 = rand(vUv + vec2(0.53, 0.61));
      float r4 = rand(vUv + vec2(0.71, 0.83));
      float theta = r1 * 6.2831853;
      float phi = acos(2.0 * r2 - 1.0);
      float radius = pow(r3, 0.3333) * 5.0;
      gl_FragColor = vec4(
        radius * sin(phi) * cos(theta),
        radius * sin(phi) * sin(theta),
        radius * cos(phi) * 0.6,
        0.3 + r4 * 0.7
      );
    }
  `;

  // Velocity initialization: zeros with random seed in w
  private readonly velInitFrag = `
    precision highp float;
    varying vec2 vUv;
    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      gl_FragColor = vec4(0.0, 0.0, 0.0, rand(vUv + vec2(0.42, 0.58)));
    }
  `;

  // Velocity update: curl noise + attractor + kick + onset
  private readonly velFrag = `
    precision highp float;
    uniform sampler2D tPosition;
    uniform sampler2D tVelocity;
    uniform float uBass;
    uniform float uMid;
    uniform float uTreble;
    uniform float uKick;
    uniform float uOnset;
    uniform float uDelta;
    uniform float uTime;
    varying vec2 vUv;

    vec3 hash3(vec3 p) {
      p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
               dot(p, vec3(269.5, 183.3, 246.1)),
               dot(p, vec3(113.5, 271.9, 124.6)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
    }

    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      vec3 u = f * f * (3.0 - 2.0 * f);
      // Explicit named intermediates — avoids the missing-u.z bug in deep mix nesting
      float n000 = dot(hash3(i), f);
      float n100 = dot(hash3(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0));
      float n010 = dot(hash3(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0));
      float n110 = dot(hash3(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0));
      float n001 = dot(hash3(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0));
      float n101 = dot(hash3(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0));
      float n011 = dot(hash3(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0));
      float n111 = dot(hash3(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0));
      float x00 = mix(n000, n100, u.x);
      float x10 = mix(n010, n110, u.x);
      float x01 = mix(n001, n101, u.x);
      float x11 = mix(n011, n111, u.x);
      float y0  = mix(x00,  x10,  u.y);
      float y1  = mix(x01,  x11,  u.y);
      return mix(y0, y1, u.z);
    }

    vec3 curl(vec3 p) {
      float e = 0.1;
      // Sample noise at +/- epsilon on each axis
      float px = noise(p + vec3(e, 0.0, 0.0));
      float mx = noise(p - vec3(e, 0.0, 0.0));
      float py = noise(p + vec3(0.0, e, 0.0));
      float my = noise(p - vec3(0.0, e, 0.0));
      float pz = noise(p + vec3(0.0, 0.0, e));
      float mz = noise(p - vec3(0.0, 0.0, e));
      float inv2e = 1.0 / (2.0 * e);
      return vec3(
        (py - my - pz + mz) * inv2e,
        (pz - mz - px + mx) * inv2e,
        (px - mx - py + my) * inv2e
      );
    }

    void main() {
      vec4 posLife = texture2D(tPosition, vUv);
      vec4 velSeed = texture2D(tVelocity, vUv);
      vec3 pos = posLife.xyz;
      vec3 vel = velSeed.xyz;
      float seed = velSeed.w;

      float curlScale = 0.2 + uTreble * 0.4;
      float curlSpeed = 0.3 + uMid * 1.5;
      vec3 curlForce = curl(pos * curlScale + vec3(uTime * 0.05)) * curlSpeed;

      vec3 safe = pos + vec3(0.001);
      vec3 attractForce = -normalize(safe) * (0.06 + uBass * 0.5);
      vec3 kickForce = normalize(safe) * uKick * 3.0;

      vec3 onsetForce = vec3(0.0);
      if (uOnset > 0.5) {
        float r1 = fract(seed * 127.1 + 0.1);
        float r2 = fract(seed * 311.7 + 0.3);
        float r3 = fract(seed * 74.7 + 0.7);
        onsetForce = (vec3(r1, r2, r3) - 0.5) * 4.0;
      }

      vel += (curlForce + attractForce + kickForce + onsetForce) * uDelta;
      vel *= pow(0.97, uDelta * 60.0);
      gl_FragColor = vec4(vel, seed);
    }
  `;

  // Position update: Euler integration + respawn
  private readonly posFrag = `
    precision highp float;
    uniform sampler2D tPosition;
    uniform sampler2D tVelocity;
    uniform float uDelta;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 posLife = texture2D(tPosition, vUv);
      vec3 vel = texture2D(tVelocity, vUv).xyz;
      vec3 pos = posLife.xyz;
      float life = posLife.w;

      pos += vel * uDelta;
      life -= uDelta * 0.12;

      if (length(pos) > 8.0 || life <= 0.0) {
        float r1 = rand(vUv + pos.xy * 0.001 + vec2(0.11));
        float r2 = rand(vUv + pos.yz * 0.001 + vec2(0.23));
        float r3 = rand(vUv + pos.zx * 0.001 + vec2(0.37));
        float theta = r1 * 6.2831853;
        float phi = acos(2.0 * r2 - 1.0);
        float radius = r3 * 4.0;
        pos = vec3(
          radius * sin(phi) * cos(theta),
          radius * sin(phi) * sin(theta),
          radius * cos(phi) * 0.6
        );
        life = 0.3 + rand(vUv + vec2(0.47)) * 0.7;
      }

      gl_FragColor = vec4(pos, life);
    }
  `;

  // Point render vertex: samples position texture via particle index
  private readonly renderVert = `
    attribute float aParticleIndex;
    uniform sampler2D tPositions;
    uniform float uBass;
    uniform float uSize;
    varying float vLife;

    void main() {
      float idx = aParticleIndex;
      float u = (mod(idx, 256.0) + 0.5) / 256.0;
      float v = (floor(idx / 256.0) + 0.5) / 256.0;
      vec4 posLife = texture2D(tPositions, vec2(u, v));
      vLife = posLife.w;
      vec4 mvPos = modelViewMatrix * vec4(posLife.xyz, 1.0);
      gl_Position = projectionMatrix * mvPos;
      gl_PointSize = max(1.5, (2.0 + uBass * 5.0) * uSize * 250.0 / -mvPos.z);
    }
  `;

  // Point render fragment: soft circle + additive color
  private readonly renderFrag = `
    precision highp float;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform float uTreble;
    varying float vLife;

    void main() {
      float dist = length(gl_PointCoord - 0.5);
      if (dist > 0.5) discard;
      float life = clamp(vLife, 0.0, 1.0);
      float alpha = (0.5 - dist) * 2.0 * life;
      vec3 col = mix(uColor1, uColor2, life) + uColor3 * uTreble * 0.3;
      gl_FragColor = vec4(col, alpha);
    }
  `;

  init(ctx: RenderContext) {
    const renderer = ctx.renderer;
    const rtOpts = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    };

    this.posRT_A = new THREE.WebGLRenderTarget(SIZE, SIZE, rtOpts);
    this.posRT_B = new THREE.WebGLRenderTarget(SIZE, SIZE, rtOpts);
    this.velRT_A = new THREE.WebGLRenderTarget(SIZE, SIZE, rtOpts);
    this.velRT_B = new THREE.WebGLRenderTarget(SIZE, SIZE, rtOpts);

    this.simScene = new THREE.Scene();
    this.simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeo = new THREE.PlaneGeometry(2, 2);

    // Initialize position RT with random sphere positions
    const posInitMat = new THREE.ShaderMaterial({
      vertexShader: this.simVert,
      fragmentShader: this.posInitFrag,
    });
    this.simQuad = new THREE.Mesh(quadGeo, posInitMat);
    this.simScene.add(this.simQuad);

    renderer.setRenderTarget(this.posRT_A);
    renderer.render(this.simScene, this.simCamera);
    posInitMat.dispose();

    // Initialize velocity RT: zeros + random seed
    const velInitMat = new THREE.ShaderMaterial({
      vertexShader: this.simVert,
      fragmentShader: this.velInitFrag,
    });
    this.simQuad.material = velInitMat;
    renderer.setRenderTarget(this.velRT_A);
    renderer.render(this.simScene, this.simCamera);
    velInitMat.dispose();

    renderer.setRenderTarget(null);

    // Velocity sim material
    this.velSimMat = new THREE.ShaderMaterial({
      vertexShader: this.simVert,
      fragmentShader: this.velFrag,
      uniforms: {
        tPosition: { value: null },
        tVelocity: { value: null },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uTreble: { value: 0 },
        uKick: { value: 0 },
        uOnset: { value: 0 },
        uDelta: { value: 0.016 },
        uTime: { value: 0 },
      },
    });

    // Position sim material
    this.posSimMat = new THREE.ShaderMaterial({
      vertexShader: this.simVert,
      fragmentShader: this.posFrag,
      uniforms: {
        tPosition: { value: null },
        tVelocity: { value: null },
        uDelta: { value: 0.016 },
      },
    });

    // Points geometry: per-particle index attribute
    const totalParticles = SIZE * SIZE;
    const indices = new Float32Array(totalParticles);
    for (let i = 0; i < totalParticles; i++) indices[i] = i;

    const dummyPos = new Float32Array(totalParticles * 3); // needed for BufferGeometry
    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute("position", new THREE.BufferAttribute(dummyPos, 3));
    pointsGeo.setAttribute("aParticleIndex", new THREE.BufferAttribute(indices, 1));

    this.renderMat = new THREE.ShaderMaterial({
      vertexShader: this.renderVert,
      fragmentShader: this.renderFrag,
      uniforms: {
        tPositions: { value: this.posRT_A.texture },
        uBass: { value: 0 },
        uSize: { value: 1.0 },
        uColor1: { value: new THREE.Color(0x00ff41) },
        uColor2: { value: new THREE.Color(0xff55ff) },
        uColor3: { value: new THREE.Color(0x55ffff) },
        uTreble: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(pointsGeo, this.renderMat);
    this.points.frustumCulled = false;
    ctx.scene.add(this.points);
  }

  update(ctx: RenderContext, input: ReactiveInput, delta: number) {
    if (!this.posRT_A || !this.posRT_B || !this.velRT_A || !this.velRT_B) return;
    if (!this.simScene || !this.simCamera || !this.simQuad) return;
    if (!this.velSimMat || !this.posSimMat || !this.renderMat) return;

    this.time += delta;
    const { frame, intensityMultiplier, palette, params } = input;
    const bass = frame.bass * intensityMultiplier;
    const mid = frame.mid * intensityMultiplier;
    const treble = frame.treble * intensityMultiplier;
    const amp = frame.amplitude * intensityMultiplier;

    this.bassSmooth += (bass - this.bassSmooth) * 0.1;
    this.ampSmooth += (amp - this.ampSmooth) * 0.1;

    const speed = THREE.MathUtils.clamp(Number(params.speed ?? 0.5), 0, 1);
    const curls = THREE.MathUtils.clamp(Number(params.curls ?? 0.5), 0, 1);
    const kick = frame.kickIntensity > 0.1 ? frame.kickIntensity : 0;
    const onset = frame.onset ? 1.0 : 0.0;
    const particleSize = THREE.MathUtils.clamp(Number(params.particleSize ?? 0.5), 0.1, 1);
    const simSpeed = 0.25 + speed * 1.5;
    const curlAmount = 0.25 + curls * 1.5;
    const clampedDelta = Math.min(delta, 0.05);
    const renderer = ctx.renderer;

    // Velocity update pass
    this.velSimMat.uniforms.tPosition!.value = this.posRT_A.texture;
    this.velSimMat.uniforms.tVelocity!.value = this.velRT_A.texture;
    this.velSimMat.uniforms.uBass!.value = bass;
    this.velSimMat.uniforms.uMid!.value = mid;
    this.velSimMat.uniforms.uTreble!.value = treble * curlAmount;
    this.velSimMat.uniforms.uKick!.value = kick;
    this.velSimMat.uniforms.uOnset!.value = onset;
    this.velSimMat.uniforms.uDelta!.value = clampedDelta * simSpeed;
    this.velSimMat.uniforms.uTime!.value = this.time;
    this.simQuad.material = this.velSimMat;
    renderer.setRenderTarget(this.velRT_B);
    renderer.render(this.simScene, this.simCamera);

    // Position update pass
    this.posSimMat.uniforms.tPosition!.value = this.posRT_A.texture;
    this.posSimMat.uniforms.tVelocity!.value = this.velRT_B.texture;
    this.posSimMat.uniforms.uDelta!.value = clampedDelta * simSpeed;
    this.simQuad.material = this.posSimMat;
    renderer.setRenderTarget(this.posRT_B);
    renderer.render(this.simScene, this.simCamera);
    renderer.setRenderTarget(null);

    // Update render material with new positions
    this.renderMat.uniforms.tPositions!.value = this.posRT_B.texture;
    this.renderMat.uniforms.uBass!.value = this.bassSmooth;
    this.renderMat.uniforms.uSize!.value = 0.5 + particleSize;
    this.renderMat.uniforms.uTreble!.value = treble;
    this.renderMat.uniforms.uColor1!.value = new THREE.Color(palette[0] ?? "#00FF41");
    this.renderMat.uniforms.uColor2!.value = new THREE.Color(palette[1] ?? "#FF55FF");
    this.renderMat.uniforms.uColor3!.value = new THREE.Color(palette[2] ?? "#55FFFF");

    // Ping-pong swap
    [this.posRT_A, this.posRT_B] = [this.posRT_B, this.posRT_A];
    [this.velRT_A, this.velRT_B] = [this.velRT_B, this.velRT_A];
  }

  dispose() {
    this.posRT_A?.dispose();
    this.posRT_B?.dispose();
    this.velRT_A?.dispose();
    this.velRT_B?.dispose();
    this.velSimMat?.dispose();
    this.posSimMat?.dispose();
    this.renderMat?.dispose();
    if (this.simQuad) {
      this.simQuad.geometry.dispose();
    }
    if (this.points) {
      this.points.geometry.dispose();
    }
    this.posRT_A = null;
    this.posRT_B = null;
    this.velRT_A = null;
    this.velRT_B = null;
    this.velSimMat = null;
    this.posSimMat = null;
    this.renderMat = null;
    this.simQuad = null;
    this.simScene = null;
    this.points = null;
  }

  getControlsSchema(): TemplateControl[] {
    return [
      { id: "speed", label: "Speed", type: "slider", default: 0.5, min: 0, max: 1, step: 0.01 },
      { id: "particleSize", label: "Particle Size", type: "slider", default: 0.5, min: 0.1, max: 1, step: 0.01 },
      { id: "curls", label: "Turbulence", type: "slider", default: 0.5, min: 0, max: 1, step: 0.01 },
    ];
  }
}

export default new ParticleNebula();
