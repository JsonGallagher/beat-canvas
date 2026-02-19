import type { ProjectState } from "@/types/project";

export const hasAudio = (state: ProjectState) => state.audioBuffer !== null;

export const hasValidClip = (state: ProjectState) =>
  state.clip !== null && state.clip.outTime - state.clip.inTime > 0;

export const hasTemplate = (state: ProjectState) => state.selectedTemplateId !== null;

export const canExport = (state: ProjectState) =>
  hasAudio(state) && hasValidClip(state) && hasTemplate(state);
