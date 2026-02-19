import type { TemplateModule, RenderContext, ReactiveInput } from "@/types/template";
import * as THREE from "three";

export class TemplateManager {
  private current: TemplateModule | null = null;
  private sceneRef: THREE.Scene | null = null;

  load(template: TemplateModule, ctx: RenderContext) {
    this.dispose();
    // Reset state in case the previous template modified it
    ctx.scene.visible = true;
    ctx.camera.position.set(0, 0, 5);
    ctx.camera.lookAt(0, 0, 0);
    if (ctx.camera instanceof THREE.PerspectiveCamera) {
      ctx.camera.updateProjectionMatrix();
    }
    ctx.renderer.setRenderTarget(null);
    ctx.renderer.autoClear = true;
    this.sceneRef = ctx.scene;
    this.current = template;
    template.init(ctx);
  }

  update(ctx: RenderContext, input: ReactiveInput, delta: number) {
    this.current?.update(ctx, input, delta);
  }

  dispose() {
    if (this.current) {
      this.current.dispose();
      // Clear all objects the template added to the scene and restore visibility
      if (this.sceneRef) {
        this.sceneRef.visible = true;
        while (this.sceneRef.children.length > 0) {
          const child = this.sceneRef.children[0];
          if (child) this.sceneRef.remove(child);
        }
      }
      this.current = null;
    }
  }

  getCurrent() {
    return this.current;
  }
}
