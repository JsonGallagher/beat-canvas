export type AudioLoadError = "UNSUPPORTED_FORMAT" | "DECODE_FAILURE" | "FILE_TOO_LARGE";

export interface AudioLoadResult {
  file: File;
  buffer: AudioBuffer;
  duration: number;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const SUPPORTED_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
  "audio/webm",
]);

const SUPPORTED_EXTENSIONS = new Set(["mp3", "wav", "m4a", "aac", "ogg", "webm"]);

function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function isSupported(file: File): boolean {
  if (file.type && SUPPORTED_MIME_TYPES.has(file.type)) return true;
  return SUPPORTED_EXTENSIONS.has(getExtension(file.name));
}

export async function loadAudioFile(
  file: File
): Promise<{ ok: true; result: AudioLoadResult } | { ok: false; error: AudioLoadError }> {
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: "FILE_TOO_LARGE" };
  }

  if (!isSupported(file)) {
    return { ok: false, error: "UNSUPPORTED_FORMAT" };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new AudioContext();
    const buffer = await audioContext.decodeAudioData(arrayBuffer);
    await audioContext.close();

    return {
      ok: true,
      result: { file, buffer, duration: buffer.duration },
    };
  } catch {
    return { ok: false, error: "DECODE_FAILURE" };
  }
}
