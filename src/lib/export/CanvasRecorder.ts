export class CanvasRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private resolveStop: ((blob: Blob) => void) | null = null;

  start(canvas: HTMLCanvasElement, fps: number = 30): boolean {
    const stream = canvas.captureStream(fps);

    // Try VP9 first, then VP8
    const mimeTypes = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];

    let selectedMime = "";
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }

    if (!selectedMime) return false;

    this.chunks = [];
    this.recorder = new MediaRecorder(stream, {
      mimeType: selectedMime,
      videoBitsPerSecond: 8_000_000,
    });

    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.recorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: selectedMime });
      this.chunks = [];
      this.resolveStop?.(blob);
    };

    this.recorder.start(100); // Collect data every 100ms
    return true;
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      this.resolveStop = resolve;
      this.recorder?.stop();
    });
  }

  cancel() {
    if (this.recorder?.state === "recording") {
      this.recorder.stop();
    }
    this.chunks = [];
    this.resolveStop = null;
    this.recorder = null;
  }
}
