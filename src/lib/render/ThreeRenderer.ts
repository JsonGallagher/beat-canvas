import * as THREE from "three";
import type { RenderContext } from "@/types/template";
import { qualityTiers } from "./qualityTiers";

export class ThreeRenderer {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  private width = 0;
  private height = 0;
  private contextLost = false;
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

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
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
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
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
