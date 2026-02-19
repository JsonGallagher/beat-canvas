import * as THREE from "three";

export interface OverlayConfig {
  title: string;
  artist: string;
  textPosition: "top" | "center" | "bottom";
  textSize: "small" | "medium" | "large";
  textShadow: boolean;
  coverArtUrl: string | null;
  coverPosition: "center" | "corner";
  coverScale: number;
}

const TEXT_SIZE_MAP = { small: 36, medium: 48, large: 64 };
const TEXT_PLANE_Z = 3;

export class OverlaySystem {
  private textMesh: THREE.Mesh | null = null;
  private coverMesh: THREE.Mesh | null = null;
  private textCanvas: HTMLCanvasElement;
  private textTexture: THREE.CanvasTexture | null = null;
  private coverTexture: THREE.Texture | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;

  constructor() {
    this.textCanvas = document.createElement("canvas");
    this.textCanvas.width = 1080;
    this.textCanvas.height = 1920;
  }

  init(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
  }

  /** Compute plane dimensions that exactly fill the viewport at the given z */
  private getViewSizeAtZ(z: number): { width: number; height: number } {
    if (!this.camera) return { width: 1, height: 1 };
    const dist = this.camera.position.z - z;
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const height = 2 * dist * Math.tan(vFov / 2);
    const width = height * this.camera.aspect;
    return { width, height };
  }

  async updateText(config: OverlayConfig) {
    if (!this.scene) return;

    // Wait for fonts to load
    await document.fonts.ready;

    const canvas = this.textCanvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = 2;
    canvas.width = 540 * scale;
    canvas.height = 960 * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!config.title && !config.artist) {
      this.removeTextMesh();
      return;
    }

    const fontSize = TEXT_SIZE_MAP[config.textSize] * scale;
    const artistFontSize = fontSize * 0.6;

    ctx.textAlign = "center";

    // Position — keep text inside safe zones (top 10%, bottom 15%)
    let y: number;
    if (config.textPosition === "top") y = canvas.height * 0.18;
    else if (config.textPosition === "center") y = canvas.height * 0.48;
    else y = canvas.height * 0.75;

    // Title
    if (config.title) {
      ctx.font = `700 ${fontSize}px "Playfair Display", serif`;
      if (config.textShadow) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 12 * scale;
        ctx.shadowOffsetY = 3 * scale;
      }
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(config.title, canvas.width / 2, y, canvas.width * 0.9);
      ctx.shadowBlur = 0;
    }

    // Artist
    if (config.artist) {
      ctx.font = `400 ${artistFontSize}px "IBM Plex Mono", monospace`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      if (config.textShadow) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 8 * scale;
      }
      ctx.fillText(config.artist, canvas.width / 2, y + fontSize * 0.8, canvas.width * 0.9);
      ctx.shadowBlur = 0;
    }

    // Create or update texture
    if (!this.textTexture) {
      this.textTexture = new THREE.CanvasTexture(canvas);
      this.textTexture.needsUpdate = true;
    } else {
      this.textTexture.needsUpdate = true;
    }

    // Size the plane to fill the camera viewport at TEXT_PLANE_Z
    const { width: planeW, height: planeH } = this.getViewSizeAtZ(TEXT_PLANE_Z);

    // Create or update mesh
    if (!this.textMesh) {
      const geometry = new THREE.PlaneGeometry(planeW, planeH);
      const material = new THREE.MeshBasicMaterial({
        map: this.textTexture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      this.textMesh = new THREE.Mesh(geometry, material);
      this.textMesh.renderOrder = 100;
      this.textMesh.position.z = TEXT_PLANE_Z;
      this.scene.add(this.textMesh);
    } else {
      // Update geometry if camera aspect changed
      this.textMesh.geometry.dispose();
      this.textMesh.geometry = new THREE.PlaneGeometry(planeW, planeH);
    }
  }

  async updateCoverArt(url: string | null, position: "center" | "corner", scale: number) {
    if (!this.scene) return;

    if (!url) {
      this.removeCoverMesh();
      return;
    }

    // Load image
    const loader = new THREE.TextureLoader();
    try {
      const texture = await loader.loadAsync(url);

      if (this.coverTexture) this.coverTexture.dispose();
      this.coverTexture = texture;

      const { width: vpW, height: vpH } = this.getViewSizeAtZ(2.9);
      const size = scale * Math.min(vpW, vpH) * 0.4;

      if (!this.coverMesh) {
        const geometry = new THREE.PlaneGeometry(size, size);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          depthTest: false,
          depthWrite: false,
        });
        this.coverMesh = new THREE.Mesh(geometry, material);
        this.coverMesh.renderOrder = 99;
        this.coverMesh.position.z = 2.9;
        this.scene.add(this.coverMesh);
      } else {
        (this.coverMesh.material as THREE.MeshBasicMaterial).map = texture;
        this.coverMesh.geometry.dispose();
        this.coverMesh.geometry = new THREE.PlaneGeometry(size, size);
      }

      if (position === "corner") {
        this.coverMesh.position.set(vpW * 0.35, vpH * 0.35, 2.9);
      } else {
        this.coverMesh.position.set(0, 0, 2.9);
      }
    } catch {
      // Failed to load cover art
    }
  }

  private removeTextMesh() {
    if (this.textMesh && this.scene) {
      this.scene.remove(this.textMesh);
      this.textMesh.geometry.dispose();
      (this.textMesh.material as THREE.Material).dispose();
      this.textMesh = null;
    }
    if (this.textTexture) {
      this.textTexture.dispose();
      this.textTexture = null;
    }
  }

  private removeCoverMesh() {
    if (this.coverMesh && this.scene) {
      this.scene.remove(this.coverMesh);
      this.coverMesh.geometry.dispose();
      (this.coverMesh.material as THREE.Material).dispose();
      this.coverMesh = null;
    }
    if (this.coverTexture) {
      this.coverTexture.dispose();
      this.coverTexture = null;
    }
  }

  dispose() {
    this.removeTextMesh();
    this.removeCoverMesh();
    this.scene = null;
    this.camera = null;
  }
}
