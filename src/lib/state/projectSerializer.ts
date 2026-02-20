import { toast } from "sonner";
import { useProjectStore } from "./projectStore";
import type { OverlaySettings, ClipSelection } from "@/types/project";

const VERSION = 1;
const LS_KEY = "bc-project-v1";

interface ProjectSnapshot {
  version: number;
  selectedTemplateId: string | null;
  templateParams: Record<string, unknown>;
  palette: string;
  intensityMultiplier: number;
  qualityTier: string;
  clip: ClipSelection | null;
  overlay: OverlaySettings;
  audioFileName: string | null;
}

function serialize(): ProjectSnapshot {
  const s = useProjectStore.getState();
  return {
    version: VERSION,
    selectedTemplateId: s.selectedTemplateId,
    templateParams: s.templateParams,
    palette: s.palette,
    intensityMultiplier: s.intensityMultiplier,
    qualityTier: s.qualityTier,
    clip: s.clip,
    overlay: s.overlay,
    audioFileName: s.audioFile?.name ?? null,
  };
}

function deserialize(snap: ProjectSnapshot): void {
  if (snap.version !== VERSION) {
    toast.error("Project file version mismatch");
    return;
  }
  const { setSelectedTemplate, setTemplateParams, setPalette, setIntensityMultiplier, setQualityTier, setClip, updateOverlay } =
    useProjectStore.getState();
  if (snap.selectedTemplateId) setSelectedTemplate(snap.selectedTemplateId);
  setTemplateParams(snap.templateParams);
  setPalette(snap.palette);
  setIntensityMultiplier(snap.intensityMultiplier);
  setQualityTier(snap.qualityTier as "low" | "medium" | "high");
  if (snap.clip) setClip(snap.clip);
  updateOverlay(snap.overlay);
}

export function saveToLocalStorage(): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(serialize()));
  } catch {
    // Storage might be full; ignore silently
  }
}

export function loadFromLocalStorage(): ProjectSnapshot | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProjectSnapshot;
  } catch {
    return null;
  }
}

export function restoreFromSnapshot(snap: ProjectSnapshot): void {
  deserialize(snap);
}

export function exportToFile(): void {
  const snap = serialize();
  const json = JSON.stringify(snap, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "project.beatcanvas";
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Project saved");
}

export async function importFromFile(file: File): Promise<void> {
  try {
    const text = await file.text();
    const snap = JSON.parse(text) as ProjectSnapshot;
    deserialize(snap);
    toast.success("Project loaded" + (snap.audioFileName ? ` — re-upload "${snap.audioFileName}" to restore audio` : ""));
  } catch {
    toast.error("Failed to load project file");
  }
}
