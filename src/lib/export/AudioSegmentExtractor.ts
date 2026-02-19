export function extractAudioSegment(
  buffer: AudioBuffer,
  inTime: number,
  outTime: number
): ArrayBuffer {
  const sampleRate = buffer.sampleRate;
  const channels = buffer.numberOfChannels;
  const startSample = Math.floor(inTime * sampleRate);
  const endSample = Math.floor(outTime * sampleRate);
  const length = endSample - startSample;

  // Create WAV file (PCM 16-bit)
  const bytesPerSample = 2;
  const dataSize = length * channels * bytesPerSample;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write interleaved samples
  let offset = headerSize;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < channels; ch++) {
      const channelData = buffer.getChannelData(ch);
      const sample = channelData[startSample + i] ?? 0;
      const clamped = Math.max(-1, Math.min(1, sample));
      const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += bytesPerSample;
    }
  }

  return arrayBuffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
