import { ThreeRenderer } from "./ThreeRenderer";
import { TemplateManager } from "./TemplateManager";
import { getPalette } from "./palettes";
import type { TemplateModule } from "@/types/template";
import type { ReactiveFrame } from "@/types/project";

const THUMB_WIDTH = 180;
const THUMB_HEIGHT = 320;

const SYNTHETIC_FRAME: ReactiveFrame = {
  time: 0,
  bass: 0.6,
  mid: 0.5,
  treble: 0.4,
  amplitude: 0.7,
};

// Shared canvas + renderer reused for every thumbnail — keeps WebGL context count at 1.
let sharedCanvas: HTMLCanvasElement | null = null;
let sharedRenderer: ThreeRenderer | null = null;

function getSharedRenderer(): { canvas: HTMLCanvasElement; renderer: ThreeRenderer } {
  if (!sharedCanvas || !sharedRenderer) {
    sharedCanvas = document.createElement("canvas");
    sharedCanvas.width = THUMB_WIDTH;
    sharedCanvas.height = THUMB_HEIGHT;
    sharedRenderer = new ThreeRenderer(sharedCanvas);
    sharedRenderer.setQuality("low");
    sharedRenderer.resize(THUMB_WIDTH, THUMB_HEIGHT);
  }
  return { canvas: sharedCanvas, renderer: sharedRenderer };
}

export async function generateThumbnail(template: TemplateModule): Promise<string> {
  const { canvas, renderer } = getSharedRenderer();

  // Create a *fresh* instance from the template's class so thumbnail generation
  // never touches the live singleton used by the editor.
  const Constructor = Object.getPrototypeOf(template).constructor as new () => TemplateModule;
  const freshInstance = new Constructor();

  const manager = new TemplateManager();
  manager.load(freshInstance, renderer.getContext());

  const paletteColors = getPalette("phosphor");
  const input = {
    frame: SYNTHETIC_FRAME,
    intensityMultiplier: 1,
    palette: paletteColors,
    params: {},
  };

  // Advance a few frames so templates that build up over time have something visible
  for (let i = 0; i < 5; i++) {
    manager.update(renderer.getContext(), input, 1 / 30);
  }
  renderer.renderFrame();

  const dataUrl = canvas.toDataURL("image/png");

  manager.dispose();

  // Reset any state the template may have left behind
  renderer.scene.visible = true;
  renderer.renderer.setRenderTarget(null);
  renderer.renderer.autoClear = true;
  renderer.camera.position.set(0, 0, 5);
  renderer.camera.lookAt(0, 0, 0);
  renderer.camera.updateProjectionMatrix();

  return dataUrl;
}
