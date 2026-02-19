import type * as THREE from "three";
import type { ReactiveFrame } from "./project";

export interface RenderContext {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  width: number;
  height: number;
}

export interface TemplateControl {
  id: string;
  label: string;
  type: "slider" | "select" | "toggle";
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string }[];
}

export interface ReactiveInput {
  frame: ReactiveFrame;
  intensityMultiplier: number;
  palette: string[];
  params: Record<string, unknown>;
}

export interface TemplateModule {
  id: string;
  name: string;
  tags: string[];
  thumbnail?: string;

  init(ctx: RenderContext): void;
  update(ctx: RenderContext, input: ReactiveInput, delta: number): void;
  dispose(): void;
  getControlsSchema(): TemplateControl[];
}
