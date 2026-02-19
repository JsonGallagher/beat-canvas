export interface ClipSelection {
  inTime: number;
  outTime: number;
}

export interface ReactiveFrame {
  time: number;
  bass: number;
  mid: number;
  treble: number;
  amplitude: number;
  kick: boolean;
  onset: boolean;
  kickIntensity: number;
}

export interface OverlaySettings {
  title: string;
  artist: string;
  textPosition: "top" | "center" | "bottom";
  textSize: "small" | "medium" | "large";
  textShadow: boolean;
  coverArt: File | null;
  coverArtUrl: string | null;
  coverPosition: "center" | "corner";
  coverScale: number;
}

export interface ProjectState {
  // Audio
  audioFile: File | null;
  audioBuffer: AudioBuffer | null;
  audioDuration: number;
  waveformPeaks: Float32Array | null;

  // Clip
  clip: ClipSelection | null;

  // Reactive data
  reactiveFrames: ReactiveFrame[];

  // Template
  selectedTemplateId: string | null;
  templateParams: Record<string, unknown>;
  palette: string;
  intensityMultiplier: number;
  qualityTier: "low" | "medium" | "high";

  // Overlays
  overlay: OverlaySettings;
}
