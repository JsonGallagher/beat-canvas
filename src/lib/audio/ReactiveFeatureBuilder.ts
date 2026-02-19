import type { ReactiveFrame } from "@/types/project";
import {
  FFT_SIZE,
  FPS,
  BASS_LOW,
  BASS_HIGH,
  MID_LOW,
  MID_HIGH,
  TREBLE_LOW,
  TREBLE_HIGH,
  ATTACK_ALPHA,
  RELEASE_ALPHA,
  QUIET_THRESHOLD,
  QUIET_TARGET_PEAK,
} from "./audioConstants";

// Inline radix-2 FFT (Cooley-Tukey)
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }

  // Butterfly operations
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let j = 0; j < halfLen; j++) {
        const a = i + j;
        const b = a + halfLen;
        const tRe = curRe * re[b]! - curIm * im[b]!;
        const tIm = curRe * im[b]! + curIm * re[b]!;
        re[b] = re[a]! - tRe;
        im[b] = im[a]! - tIm;
        re[a] = re[a]! + tRe;
        im[a] = im[a]! + tIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

function hanningWindow(data: Float64Array): void {
  const n = data.length;
  for (let i = 0; i < n; i++) {
    data[i]! *= 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  }
}

function getBandEnergy(
  magnitudes: Float64Array,
  sampleRate: number,
  fftSize: number,
  lowHz: number,
  highHz: number
): number {
  const binWidth = sampleRate / fftSize;
  const lowBin = Math.max(1, Math.floor(lowHz / binWidth));
  const highBin = Math.min(fftSize / 2, Math.ceil(highHz / binWidth));
  let sum = 0;
  let count = 0;
  for (let i = lowBin; i < highBin; i++) {
    sum += magnitudes[i]!;
    count++;
  }
  return count > 0 ? sum / count : 0;
}

function getMono(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  const mono = new Float32Array(length);
  const channels = buffer.numberOfChannels;
  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i]! += data[i]! / channels;
    }
  }
  return mono;
}

export function buildReactiveFrames(
  buffer: AudioBuffer,
  inTime: number,
  outTime: number
): ReactiveFrame[] {
  const sampleRate = buffer.sampleRate;
  const mono = getMono(buffer);
  const clipDuration = outTime - inTime;
  const totalFrames = Math.ceil(clipDuration * FPS);
  const frames: ReactiveFrame[] = [];

  const halfFFT = FFT_SIZE / 2;

  // Previous smoothed values
  let prevBass = 0;
  let prevMid = 0;
  let prevTreble = 0;
  let prevAmp = 0;

  for (let f = 0; f < totalFrames; f++) {
    const time = f / FPS;
    const sampleStart = Math.floor((inTime + time) * sampleRate);

    // Extract window
    const re = new Float64Array(FFT_SIZE);
    const im = new Float64Array(FFT_SIZE);
    for (let i = 0; i < FFT_SIZE; i++) {
      const idx = sampleStart + i - halfFFT;
      re[i] = idx >= 0 && idx < mono.length ? mono[idx]! : 0;
    }

    hanningWindow(re);
    fft(re, im);

    // Compute magnitudes
    const magnitudes = new Float64Array(halfFFT);
    for (let i = 0; i < halfFFT; i++) {
      magnitudes[i] = Math.sqrt(re[i]! * re[i]! + im[i]! * im[i]!) / halfFFT;
    }

    // Band energies
    let bass = getBandEnergy(magnitudes, sampleRate, FFT_SIZE, BASS_LOW, BASS_HIGH);
    let mid = getBandEnergy(magnitudes, sampleRate, FFT_SIZE, MID_LOW, MID_HIGH);
    let treble = getBandEnergy(magnitudes, sampleRate, FFT_SIZE, TREBLE_LOW, TREBLE_HIGH);

    // Amplitude from time domain (RMS around frame center)
    let ampSum = 0;
    const ampWindow = Math.min(FFT_SIZE, mono.length);
    for (let i = 0; i < ampWindow; i++) {
      const idx = sampleStart + i - halfFFT;
      if (idx >= 0 && idx < mono.length) {
        ampSum += mono[idx]! * mono[idx]!;
      }
    }
    let amplitude = Math.sqrt(ampSum / ampWindow);

    // Smoothing
    const smoothBass = bass > prevBass ? ATTACK_ALPHA : RELEASE_ALPHA;
    const smoothMid = mid > prevMid ? ATTACK_ALPHA : RELEASE_ALPHA;
    const smoothTreble = treble > prevTreble ? ATTACK_ALPHA : RELEASE_ALPHA;
    const smoothAmp = amplitude > prevAmp ? ATTACK_ALPHA : RELEASE_ALPHA;

    bass = prevBass + smoothBass * (bass - prevBass);
    mid = prevMid + smoothMid * (mid - prevMid);
    treble = prevTreble + smoothTreble * (treble - prevTreble);
    amplitude = prevAmp + smoothAmp * (amplitude - prevAmp);

    prevBass = bass;
    prevMid = mid;
    prevTreble = treble;
    prevAmp = amplitude;

    frames.push({ time, bass, mid, treble, amplitude });
  }

  // Normalize: find max of each band
  let maxBass = 0,
    maxMid = 0,
    maxTreble = 0,
    maxAmp = 0;
  for (const frame of frames) {
    if (frame.bass > maxBass) maxBass = frame.bass;
    if (frame.mid > maxMid) maxMid = frame.mid;
    if (frame.treble > maxTreble) maxTreble = frame.treble;
    if (frame.amplitude > maxAmp) maxAmp = frame.amplitude;
  }

  for (const frame of frames) {
    if (maxBass > 0) frame.bass /= maxBass;
    if (maxMid > 0) frame.mid /= maxMid;
    if (maxTreble > 0) frame.treble /= maxTreble;
    if (maxAmp > 0) frame.amplitude /= maxAmp;
  }

  // Quiet audio normalization
  if (maxAmp < QUIET_THRESHOLD) {
    const scale = QUIET_TARGET_PEAK;
    for (const frame of frames) {
      frame.bass = Math.min(1, frame.bass * scale);
      frame.mid = Math.min(1, frame.mid * scale);
      frame.treble = Math.min(1, frame.treble * scale);
      frame.amplitude = Math.min(1, frame.amplitude * scale);
    }
  }

  return frames;
}
