"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WorkspaceLayout } from "@/components/editor/WorkspaceLayout";
import { WorkspaceHeader } from "@/components/editor/WorkspaceHeader";
import { TrimSection } from "@/components/editor/TrimSection";
import { TemplateBrowser } from "@/components/editor/TemplateBrowser";
import { PreviewCanvas } from "@/components/editor/PreviewCanvas";
import { TemplateControls } from "@/components/editor/TemplateControls";
import { PaletteSelector } from "@/components/editor/PaletteSelector";
import { OverlayControls } from "@/components/editor/OverlayControls";
import { IntensityControl } from "@/components/editor/IntensityControl";
import { TransportBar } from "@/components/editor/TransportBar";
import { ExportModal } from "@/components/editor/ExportModal";
import { Separator } from "@/components/ui/separator";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { useThreeCanvas } from "@/hooks/useThreeCanvas";
import { useAnimationLoop } from "@/hooks/useAnimationLoop";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { useProjectStore } from "@/lib/state/projectStore";
import { TemplateManager } from "@/lib/render/TemplateManager";
import { OverlaySystem } from "@/lib/render/OverlaySystem";
import { getTemplate } from "@/templates/registry";
import { getPalette } from "@/lib/render/palettes";
import { buildReactiveFrames } from "@/lib/audio/ReactiveFeatureBuilder";
import type { ReactiveFrame } from "@/types/project";

const DEFAULT_FRAME: ReactiveFrame = { time: 0, bass: 0, mid: 0, treble: 0, amplitude: 0, kick: false, onset: false, kickIntensity: 0 };

export default function EditorPage() {
  useRouteGuard(["audio"]);

  const {
    audioFile,
    audioBuffer,
    audioDuration,
    waveformPeaks,
    clip,
    reactiveFrames,
    selectedTemplateId,
    templateParams,
    palette,
    intensityMultiplier,
    overlay,
    setClip,
    setReactiveFrames,
    setSelectedTemplate,
    setTemplateParams,
    setPalette,
    setIntensityMultiplier,
    updateOverlay,
  } = useProjectStore();

  const [showSafeZones, setShowSafeZones] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Auto-set default clip if none exists
  const inTime = clip?.inTime ?? 0;
  const outTime = clip?.outTime ?? Math.min(audioDuration, 30);
  const clipDuration = outTime - inTime;

  // Auto-set default clip on mount
  useEffect(() => {
    if (!clip && audioDuration > 0) {
      setClip({ inTime: 0, outTime: Math.min(audioDuration, 30) });
    }
  }, [clip, audioDuration, setClip]);

  // Auto-select first template if none selected
  useEffect(() => {
    if (!selectedTemplateId) {
      setSelectedTemplate("particle-storm");
    }
  }, [selectedTemplateId, setSelectedTemplate]);

  // Auto-compute reactive frames when clip changes
  useEffect(() => {
    if (!audioBuffer || clipDuration <= 0) return;
    const frames = buildReactiveFrames(audioBuffer, inTime, outTime);
    setReactiveFrames(frames);
  }, [audioBuffer, inTime, outTime, clipDuration, setReactiveFrames]);

  const { canvasRef, rendererRef, ready } = useThreeCanvas("high");
  const templateManagerRef = useRef<TemplateManager | null>(null);
  const overlaySystemRef = useRef<OverlaySystem | null>(null);

  // Audio playback
  const playback = useAudioPlayback(audioBuffer, inTime, outTime, true);

  // Initialize template
  useEffect(() => {
    if (!ready) return;
    const renderer = rendererRef.current;
    if (!renderer || !selectedTemplateId) return;

    const template = getTemplate(selectedTemplateId);
    if (!template) return;

    const manager = new TemplateManager();
    manager.load(template, renderer.getContext());
    templateManagerRef.current = manager;

    const overlaySystem = new OverlaySystem();
    overlaySystem.init(renderer.scene, renderer.camera);
    overlaySystemRef.current = overlaySystem;

    // Render initial frame
    const frame = reactiveFrames[0] ?? DEFAULT_FRAME;
    const paletteColors = getPalette(palette);
    manager.update(renderer.getContext(), {
      frame,
      intensityMultiplier,
      palette: paletteColors,
      params: templateParams,
    }, 0);
    renderer.renderFrame();

    return () => {
      manager.dispose();
      overlaySystem.dispose();
      templateManagerRef.current = null;
      overlaySystemRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId, ready]);

  // Re-render when palette, intensity, or template params change while paused
  useEffect(() => {
    const renderer = rendererRef.current;
    const manager = templateManagerRef.current;
    if (!renderer || !manager) return;

    const frame = reactiveFrames[0] ?? DEFAULT_FRAME;
    const paletteColors = getPalette(palette);
    manager.update(renderer.getContext(), {
      frame,
      intensityMultiplier,
      palette: paletteColors,
      params: templateParams,
    }, 0);
    renderer.renderFrame();
  }, [palette, intensityMultiplier, templateParams, reactiveFrames, rendererRef]);

  // Update overlays when settings change
  useEffect(() => {
    const overlay_ = overlaySystemRef.current;
    if (!overlay_) return;
    overlay_.updateText({
      title: overlay.title,
      artist: overlay.artist,
      textPosition: overlay.textPosition,
      textSize: overlay.textSize,
      textShadow: overlay.textShadow,
      coverArtUrl: overlay.coverArtUrl,
      coverPosition: overlay.coverPosition,
      coverScale: overlay.coverScale,
    }).then(() => {
      rendererRef.current?.renderFrame();
    });
  }, [overlay.title, overlay.artist, overlay.textPosition, overlay.textSize, overlay.textShadow, rendererRef]);

  useEffect(() => {
    const overlay_ = overlaySystemRef.current;
    if (!overlay_) return;
    overlay_.updateCoverArt(
      overlay.coverArtUrl,
      overlay.coverPosition,
      overlay.coverScale
    ).then(() => {
      rendererRef.current?.renderFrame();
    });
  }, [overlay.coverArtUrl, overlay.coverPosition, overlay.coverScale, rendererRef]);

  // Animation frame callback
  const onFrame = useCallback(
    (_time: number, frameIndex: number, delta: number) => {
      const renderer = rendererRef.current;
      const manager = templateManagerRef.current;
      if (!renderer || !manager) return;

      const frame = reactiveFrames[frameIndex] ?? DEFAULT_FRAME;
      const paletteColors = getPalette(palette);

      manager.update(renderer.getContext(), {
        frame,
        intensityMultiplier,
        palette: paletteColors,
        params: templateParams,
      }, delta);

      renderer.renderFrame();
    },
    [reactiveFrames, palette, intensityMultiplier, templateParams, rendererRef]
  );

  const animation = useAnimationLoop(clipDuration, 30, onFrame);

  // Sync audio playback with animation
  const handleToggle = useCallback(() => {
    playback.toggle();
    animation.toggle();
  }, [playback, animation]);

  const handleSeek = useCallback(
    (time: number) => {
      playback.seek(inTime + time);
      animation.seek(time);
    },
    [playback, animation, inTime]
  );

  const handleTrimChange = useCallback(
    (newIn: number, newOut: number) => {
      // Stop playback during trim changes to avoid audio glitches
      // from rapid source creation/destruction
      if (animation.isPlaying) {
        playback.pause();
        animation.pause();
      }
      setClip({ inTime: newIn, outTime: newOut });
    },
    [setClip, playback, animation]
  );

  const handleTrimSeek = useCallback(
    (time: number) => {
      playback.seek(time);
      const relativeTime = time - inTime;
      animation.seek(Math.max(0, relativeTime));
    },
    [playback, animation, inTime]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        handleToggle();
      }
      if (e.code === "Escape" && showExportModal) {
        setShowExportModal(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleToggle, showExportModal]);

  // Warn before leaving during export
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    if (showExportModal) {
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }
  }, [showExportModal]);

  const template = selectedTemplateId ? getTemplate(selectedTemplateId) : null;
  const controls = template?.getControlsSchema() ?? [];
  const canExport = !!audioBuffer && !!clip && !!selectedTemplateId && reactiveFrames.length > 0;

  return (
    <>
      <WorkspaceLayout
        header={
          <WorkspaceHeader
            filename={audioFile?.name ?? "Untitled"}
            onExport={() => setShowExportModal(true)}
            canExport={canExport}
          />
        }
        leftPanel={
          <div className="flex flex-col">
            {/* Trim section */}
            {waveformPeaks && (
              <>
                <TrimSection
                  peaks={waveformPeaks}
                  inTime={inTime}
                  outTime={outTime}
                  duration={audioDuration}
                  currentTime={playback.currentTime}
                  onTrimChange={handleTrimChange}
                  onSeek={handleTrimSeek}
                />
                <Separator />
              </>
            )}

            {/* Template browser */}
            <TemplateBrowser
              selectedId={selectedTemplateId}
              onSelect={setSelectedTemplate}
            />
          </div>
        }
        centerPanel={
          <PreviewCanvas
            canvasRef={canvasRef}
            showSafeZones={showSafeZones}
          />
        }
        rightPanel={
          <div className="flex flex-col gap-6 p-4">
            <IntensityControl
              value={intensityMultiplier}
              onChange={setIntensityMultiplier}
            />

            <Separator />

            <TemplateControls
              controls={controls}
              values={templateParams}
              onChange={setTemplateParams}
            />

            <Separator />

            <PaletteSelector selected={palette} onChange={setPalette} />

            <Separator />

            <OverlayControls overlay={overlay} onChange={updateOverlay} />
          </div>
        }
        bottomBar={
          <TransportBar
            isPlaying={animation.isPlaying}
            currentTime={animation.time}
            duration={clipDuration}
            peaks={waveformPeaks}
            showSafeZones={showSafeZones}
            onToggle={handleToggle}
            onSeek={handleSeek}
            onSafeZoneToggle={() => setShowSafeZones((v) => !v)}
          />
        }
      />

      <ExportModal open={showExportModal} onClose={() => setShowExportModal(false)} />
    </>
  );
}
