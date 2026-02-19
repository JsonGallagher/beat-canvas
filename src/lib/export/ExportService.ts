import type { ExportStage, ExportOptions, ExportResult } from "@/types/export";
import type { ReactiveFrame } from "@/types/project";
import type { TemplateModule, RenderContext, ReactiveInput } from "@/types/template";
import { ThreeRenderer } from "@/lib/render/ThreeRenderer";
import { TemplateManager } from "@/lib/render/TemplateManager";
import { OverlaySystem, type OverlayConfig } from "@/lib/render/OverlaySystem";
import { CanvasRecorder } from "./CanvasRecorder";
import { extractAudioSegment } from "./AudioSegmentExtractor";
import { transcodeToMp4 } from "./FfmpegTranscoder";

const FPS = 30;

export interface ExportProgress {
  stage: ExportStage;
  progress: number;
  message: string;
  currentFrame?: number;
  totalFrames?: number;
}

export interface ExportConfig {
  audioBuffer: AudioBuffer;
  inTime: number;
  outTime: number;
  reactiveFrames: ReactiveFrame[];
  template: TemplateModule;
  palette: string[];
  intensityMultiplier: number;
  templateParams: Record<string, unknown>;
  overlayConfig: OverlayConfig;
  options: ExportOptions;
}

export class ExportService {
  private cancelled = false;
  private recorder: CanvasRecorder | null = null;
  private exportRenderer: ThreeRenderer | null = null;

  async export(
    config: ExportConfig,
    onProgress: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    this.cancelled = false;

    const [widthStr, heightStr] = config.options.resolution.split("x");
    const width = parseInt(widthStr ?? "1080", 10);
    const height = parseInt(heightStr ?? "1920", 10);
    const clipDuration = config.outTime - config.inTime;
    const totalFrames = Math.ceil(clipDuration * FPS);

    // Stage 1: Preparing
    onProgress({ stage: "preparing", progress: 0, message: "Preparing export..." });

    if (this.cancelled) throw new Error("Export cancelled");

    // Create offscreen canvas and renderer
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    this.exportRenderer = new ThreeRenderer(canvas);
    // Set pixelRatio=1 before resize so the canvas renders at exactly the target resolution.
    // setQuality("high") would apply devicePixelRatio which inflates the buffer 2x and can
    // exceed GPU memory or produce wrong output dimensions.
    this.exportRenderer.renderer.setPixelRatio(1);
    this.exportRenderer.resize(width, height);

    // Init template
    const templateManager = new TemplateManager();
    templateManager.load(config.template, this.exportRenderer.getContext());

    // Init overlays
    const overlaySystem = new OverlaySystem();
    overlaySystem.init(this.exportRenderer.scene, this.exportRenderer.camera);
    await overlaySystem.updateText(config.overlayConfig);
    if (config.overlayConfig.coverArtUrl) {
      await overlaySystem.updateCoverArt(
        config.overlayConfig.coverArtUrl,
        config.overlayConfig.coverPosition,
        config.overlayConfig.coverScale
      );
    }

    // Extract audio
    const audioWav = extractAudioSegment(config.audioBuffer, config.inTime, config.outTime);

    if (this.cancelled) {
      this.cleanup(templateManager, overlaySystem);
      throw new Error("Export cancelled");
    }

    // Stage 2: Rendering frames
    onProgress({ stage: "rendering", progress: 0, message: "Rendering frames...", currentFrame: 0, totalFrames });

    this.recorder = new CanvasRecorder();
    const started = this.recorder.start(canvas, FPS);
    if (!started) {
      this.cleanup(templateManager, overlaySystem);
      throw new Error("MediaRecorder not supported");
    }

    // Deterministic frame rendering
    for (let f = 0; f < totalFrames; f++) {
      if (this.cancelled) {
        this.recorder.cancel();
        this.cleanup(templateManager, overlaySystem);
        throw new Error("Export cancelled");
      }

      const time = f / FPS;
      const frame = config.reactiveFrames[f] ?? { time, bass: 0, mid: 0, treble: 0, amplitude: 0, kick: false, onset: false, kickIntensity: 0 };

      const input: ReactiveInput = {
        frame,
        intensityMultiplier: config.intensityMultiplier,
        palette: config.palette,
        params: config.templateParams,
      };

      templateManager.update(this.exportRenderer.getContext(), input, 1 / FPS);
      this.exportRenderer.renderFrame();

      // Allow browser to process MediaRecorder data
      if (f % 5 === 0) {
        await new Promise((r) => setTimeout(r, 0));
        onProgress({
          stage: "rendering",
          progress: f / totalFrames,
          message: `Rendering frame ${f + 1}/${totalFrames}`,
          currentFrame: f + 1,
          totalFrames,
        });
      }
    }

    // Wait for last frames to be captured
    await new Promise((r) => setTimeout(r, 200));

    const videoBlob = await this.recorder.stop();
    this.recorder = null;

    if (this.cancelled) {
      this.cleanup(templateManager, overlaySystem);
      throw new Error("Export cancelled");
    }

    // Stage 3: Transcoding
    onProgress({ stage: "transcoding", progress: 0, message: "Muxing audio..." });

    const result = await transcodeToMp4(videoBlob, audioWav, (p) => {
      onProgress({ stage: "transcoding", progress: p, message: "Muxing audio..." });
    });

    // Cleanup
    this.cleanup(templateManager, overlaySystem);

    const extension = result.format === "mp4" ? "mp4" : "webm";
    const filename = `beat-canvas-${Date.now()}.${extension}`;

    onProgress({ stage: "done", progress: 1, message: "Export complete!" });

    return {
      blob: result.blob,
      filename,
      format: result.format,
      duration: clipDuration,
      warning: result.warning,
    };
  }

  cancel() {
    this.cancelled = true;
    this.recorder?.cancel();
  }

  private cleanup(templateManager: TemplateManager, overlaySystem: OverlaySystem) {
    templateManager.dispose();
    overlaySystem.dispose();
    if (this.exportRenderer) {
      this.exportRenderer.dispose();
      this.exportRenderer = null;
    }
  }
}
