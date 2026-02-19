const DEFAULT_BIN_COUNT = 16000;

export function buildWaveformPeaks(
  buffer: AudioBuffer,
  binCount: number = DEFAULT_BIN_COUNT
): Float32Array {
  // Mix to mono
  const length = buffer.length;
  const mono = new Float32Array(length);
  const channels = buffer.numberOfChannels;

  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i]! += data[i]! / channels;
    }
  }

  // Compute peaks per bin
  const samplesPerBin = Math.floor(length / binCount);
  const peaks = new Float32Array(binCount);
  let globalMax = 0;

  for (let bin = 0; bin < binCount; bin++) {
    const start = bin * samplesPerBin;
    let max = 0;
    for (let i = 0; i < samplesPerBin; i++) {
      const abs = Math.abs(mono[start + i]!);
      if (abs > max) max = abs;
    }
    peaks[bin] = max;
    if (max > globalMax) globalMax = max;
  }

  // Normalize to 0..1
  if (globalMax > 0) {
    for (let i = 0; i < binCount; i++) {
      peaks[i]! /= globalMax;
    }
  }

  return peaks;
}
