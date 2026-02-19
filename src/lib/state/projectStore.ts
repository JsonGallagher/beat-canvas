import { create } from "zustand";
import type { ClipSelection, OverlaySettings, ProjectState, ReactiveFrame } from "@/types/project";

const defaultOverlay: OverlaySettings = {
  title: "",
  artist: "",
  textPosition: "bottom",
  textSize: "medium",
  textShadow: true,
  coverArt: null,
  coverArtUrl: null,
  coverPosition: "center",
  coverScale: 0.3,
};

interface ProjectActions {
  // Audio
  setAudioFile: (file: File, buffer: AudioBuffer) => void;
  setWaveformPeaks: (peaks: Float32Array) => void;

  // Clip
  setClip: (clip: ClipSelection) => void;

  // Reactive
  setReactiveFrames: (frames: ReactiveFrame[]) => void;

  // Template
  setSelectedTemplate: (id: string) => void;
  setTemplateParams: (params: Record<string, unknown>) => void;
  setPalette: (palette: string) => void;
  setIntensityMultiplier: (value: number) => void;
  setQualityTier: (tier: "low" | "medium" | "high") => void;

  // Overlay
  updateOverlay: (updates: Partial<OverlaySettings>) => void;

  // Reset
  reset: () => void;
}

const initialState: ProjectState = {
  audioFile: null,
  audioBuffer: null,
  audioDuration: 0,
  waveformPeaks: null,
  clip: null,
  reactiveFrames: [],
  selectedTemplateId: null,
  templateParams: {},
  palette: "phosphor",
  intensityMultiplier: 1,
  qualityTier: "medium",
  overlay: defaultOverlay,
};

export const useProjectStore = create<ProjectState & ProjectActions>((set) => ({
  ...initialState,

  setAudioFile: (file, buffer) =>
    set({
      audioFile: file,
      audioBuffer: buffer,
      audioDuration: buffer.duration,
    }),

  setWaveformPeaks: (peaks) => set({ waveformPeaks: peaks }),

  setClip: (clip) => set({ clip }),

  setReactiveFrames: (frames) => set({ reactiveFrames: frames }),

  setSelectedTemplate: (id) => set({ selectedTemplateId: id }),

  setTemplateParams: (params) =>
    set((state) => ({ templateParams: { ...state.templateParams, ...params } })),

  setPalette: (palette) => set({ palette }),

  setIntensityMultiplier: (value) => set({ intensityMultiplier: value }),

  setQualityTier: (tier) => set({ qualityTier: tier }),

  updateOverlay: (updates) =>
    set((state) => ({ overlay: { ...state.overlay, ...updates } })),

  reset: () => set(initialState),
}));
