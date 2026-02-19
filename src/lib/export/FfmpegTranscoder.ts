import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const CORE_VERSION = "0.12.6";
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

let ffmpegInstance: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  const ffmpeg = new FFmpeg();

  // toBlobURL fetches the file and returns a same-origin blob: URL, bypassing
  // the CORP restriction that blocks cross-origin fetches under COEP: require-corp.
  const [coreURL, wasmURL] = await Promise.all([
    toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
    toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
  ]);

  await ffmpeg.load({ coreURL, wasmURL });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

export interface TranscodeResult {
  blob: Blob;
  format: string;
  warning?: string;
}

export async function transcodeToMp4(
  videoBlob: Blob,
  audioData: ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<TranscodeResult> {
  try {
    const ffmpeg = await getFFmpeg();

    ffmpeg.on("progress", ({ progress }) => {
      onProgress?.(Math.min(progress, 1));
    });

    // Write inputs
    await ffmpeg.writeFile("video.webm", await fetchFile(videoBlob));
    await ffmpeg.writeFile("audio.wav", new Uint8Array(audioData));

    // Try MP4 output
    try {
      await ffmpeg.exec([
        "-i", "video.webm",
        "-i", "audio.wav",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-shortest",
        "output.mp4",
      ]);

      const data = await ffmpeg.readFile("output.mp4") as Uint8Array;
      const copied = data.slice();
      const blob = new Blob([copied.buffer as ArrayBuffer], { type: "video/mp4" });

      // Cleanup
      await cleanupFiles(ffmpeg, ["video.webm", "audio.wav", "output.mp4"]);

      return { blob, format: "mp4" };
    } catch {
      // MP4 encoding failed, try WebM with audio
      try {
        await ffmpeg.exec([
          "-i", "video.webm",
          "-i", "audio.wav",
          "-c:v", "copy",
          "-c:a", "opus",
          "-b:a", "128k",
          "-shortest",
          "output.webm",
        ]);

        const data = await ffmpeg.readFile("output.webm") as Uint8Array;
        const copied = data.slice();
        const blob = new Blob([copied.buffer as ArrayBuffer], { type: "video/webm" });

        await cleanupFiles(ffmpeg, ["video.webm", "audio.wav", "output.webm"]);

        return {
          blob,
          format: "webm",
          warning: "MP4 encoding unavailable. Exported as WebM instead.",
        };
      } catch {
        // All transcode failed, return video-only
        await cleanupFiles(ffmpeg, ["video.webm", "audio.wav"]);

        return {
          blob: videoBlob,
          format: "webm",
          warning: "Audio muxing failed. Video exported without audio.",
        };
      }
    }
  } catch {
    // FFmpeg load failed entirely
    return {
      blob: videoBlob,
      format: "webm",
      warning: "FFmpeg unavailable. Video exported without audio.",
    };
  }
}

async function cleanupFiles(ffmpeg: FFmpeg, files: string[]) {
  for (const file of files) {
    try {
      await ffmpeg.deleteFile(file);
    } catch {
      // Ignore cleanup errors
    }
  }
}
