import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import type { RenderContext } from "@/types/template";
import { qualityTiers } from "./qualityTiers";

export class ThreeRenderer {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  private width = 0;
  private height = 0;
  private contextLost = false;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  onContextLost?: () => void;
  onContextRestored?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 9 / 16, 0.1, 1000);
    this.camera.position.z = 5;

    // WebGL context loss handling
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.contextLost = true;
      this.onContextLost?.();
    });

    canvas.addEventListener("webglcontextrestored", () => {
      this.contextLost = false;
      this.onContextRestored?.();
    });
  }

  isContextLost() {
    return this.contextLost;
  }

  setQuality(tier: "low" | "medium" | "high") {
    const config = qualityTiers[tier];
    this.renderer.setPixelRatio(Math.min(config.pixelRatio, window.devicePixelRatio));
  }

  private initBloom(width: number, height: number) {
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
      this.bloomPass = null;
    }
    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 1.2, 0.5, 0.15);
    composer.addPass(bloom);
    this.bloomPass = bloom;
    this.composer = composer;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.initBloom(width, height);
  }

  getContext(): RenderContext {
    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      width: this.width,
      height: this.height,
    };
  }

  renderFrame() {
    if (this.contextLost) return;
    // Templates that manage their own multi-pass rendering set scene.visible = false
    // to signal that they already rendered to the screen. Skip the default render
    // so we don't clear their output with an empty scene.
    if (!this.scene.visible) return;
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    this.composer?.dispose();
    this.composer = null;
    this.bloomPass = null;
    this.renderer.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments || obj instanceof THREE.Line || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          (obj.material as THREE.Material).dispose();
        }
      }
    });
  }
}
