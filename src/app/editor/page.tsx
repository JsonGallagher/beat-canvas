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
import { ShortcutsModal } from "@/components/editor/ShortcutsModal";
import { Separator } from "@/components/ui/separator";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { useThreeCanvas } from "@/hooks/useThreeCanvas";
import { useAnimationLoop } from "@/hooks/useAnimationLoop";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { useStore } from "zustand";
import { useProjectStore, useTemporalStore } from "@/lib/state/projectStore";
import { TemplateManager } from "@/lib/render/TemplateManager";
import { OverlaySystem } from "@/lib/render/OverlaySystem";
import { getTemplate } from "@/templates/registry";
import { getPalette } from "@/lib/render/palettes";
import { buildReactiveFrames } from "@/lib/audio/ReactiveFeatureBuilder";
import { saveToLocalStorage, loadFromLocalStorage, restoreFromSnapshot } from "@/lib/state/projectSerializer";
import { toast } from "sonner";
import type { ReactiveFrame } from "@/types/project";

const DEFAULT_FRAME: ReactiveFrame = { time: 0, bass: 0, mid: 0, treble: 0, amplitude: 0, kick: false, onset: false, kickIntensity: 0 };
const MIN_TRIM_SPAN = 0.1;
const MAX_TRIM_DURATION = 30;
const TRIM_EPSILON = 1e-6;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function sanitizeClipRange(inTime: number, outTime: number, duration: number) {
  const safeDuration = Math.max(0, duration);
  if (safeDuration <= 0) return { inTime: 0, outTime: 0 };

  let start = clamp(inTime, 0, safeDuration);
  let end = clamp(outTime, 0, safeDuration);

  if (end < start) [start, end] = [end, start];

  if (end - start < MIN_TRIM_SPAN) {
    end = Math.min(safeDuration, start + MIN_TRIM_SPAN);
    start = Math.max(0, end - MIN_TRIM_SPAN);
  }

  if (end - start > MAX_TRIM_DURATION) {
    end = start + MAX_TRIM_DURATION;
  }

  if (end > safeDuration) {
    end = safeDuration;
    start = Math.max(0, end - MAX_TRIM_DURATION);
  }

  return { inTime: start, outTime: end };
}

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
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Undo/Redo
  const { undo, redo, pastStates, futureStates } = useStore(useTemporalStore);
  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  // Derived export readiness (needed before keyboard effect)
  const canExport = !!audioBuffer && !!clip && !!selectedTemplateId;

  // Restore session on mount
  useEffect(() => {
    const snap = loadFromLocalStorage();
    if (snap) {
      restoreFromSnapshot(snap);
      toast("Session restored", { duration: 3000 });
    }
  }, []);

  // Auto-set default clip if none exists
  const initialInTime = clip?.inTime ?? 0;
  const initialOutTime = clip?.outTime ?? Math.min(audioDuration, MAX_TRIM_DURATION);
  const { inTime, outTime } = sanitizeClipRange(initialInTime, initialOutTime, audioDuration);
  const clipDuration = outTime - inTime;

  // Auto-set default clip on mount
  useEffect(() => {
    if (!clip && audioDuration > 0) {
      setClip({ inTime: 0, outTime: Math.min(audioDuration, MAX_TRIM_DURATION) });
    }
  }, [clip, audioDuration, setClip]);

  // Normalize persisted/restored clip values so trim UI always receives valid bounds.
  useEffect(() => {
    if (!clip) return;
    const normalized = sanitizeClipRange(clip.inTime, clip.outTime, audioDuration);
    if (
      Math.abs(normalized.inTime - clip.inTime) > TRIM_EPSILON ||
      Math.abs(normalized.outTime - clip.outTime) > TRIM_EPSILON
    ) {
      setClip(normalized);
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
  }, [
    overlay.title,
    overlay.artist,
    overlay.textPosition,
    overlay.textSize,
    overlay.textShadow,
    overlay.coverArtUrl,
    overlay.coverPosition,
    overlay.coverScale,
    rendererRef,
  ]);

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
      setClip(sanitizeClipRange(newIn, newOut, audioDuration));
    },
    [setClip, playback, animation, audioDuration]
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
      const meta = e.metaKey || e.ctrlKey;

      if (e.code === "Space") {
        e.preventDefault();
        handleToggle();
        return;
      }
      if (e.code === "Escape") {
        if (showExportModal) setShowExportModal(false);
        if (showShortcutsModal) setShowShortcutsModal(false);
        return;
      }
      if (meta && e.shiftKey && e.code === "KeyZ") {
        e.preventDefault();
        redo();
        return;
      }
      if (meta && e.code === "KeyZ") {
        e.preventDefault();
        undo();
        return;
      }
      if (e.code === "BracketLeft") {
        e.preventDefault();
        handleSeek(Math.max(0, animation.time - 1));
        return;
      }
      if (e.code === "BracketRight") {
        e.preventDefault();
        handleSeek(Math.min(clipDuration, animation.time + 1));
        return;
      }
      if (e.code === "KeyR") {
        e.preventDefault();
        handleSeek(0);
        return;
      }
      if (e.code === "KeyE" && canExport) {
        e.preventDefault();
        setShowExportModal(true);
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleToggle, handleSeek, showExportModal, showShortcutsModal, animation.time, clipDuration, canExport, undo, redo]);

  // Autosave on store changes (debounced)
  useEffect(() => {
    const id = setTimeout(() => saveToLocalStorage(), 1000);
    return () => clearTimeout(id);
  }, [selectedTemplateId, templateParams, palette, intensityMultiplier, overlay, clip]);

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

  return (
    <>
      <WorkspaceLayout
        header={
          <WorkspaceHeader
            filename={audioFile?.name ?? "Untitled"}
            onExport={() => setShowExportModal(true)}
            canExport={canExport}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            onShowShortcuts={() => setShowShortcutsModal(true)}
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
      <ShortcutsModal open={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />
    </>
  );
}
