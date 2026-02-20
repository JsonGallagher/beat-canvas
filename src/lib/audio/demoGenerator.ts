/**
 * Synthesizes a 15-second, 120 BPM demo beat using OfflineAudioContext.
 * Produces a real AudioBuffer with meaningful bass/mid/treble frequency content.
 */
export async function generateDemoAudio(): Promise<AudioBuffer> {
  const sampleRate = 44100;
  const bpm = 120;
  const bars = 4;
  const beatsPerBar = 4;
  const beatDuration = 60 / bpm;
  const totalDuration = bars * beatsPerBar * beatDuration * 2; // 2 repetitions = 16 bars

  const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * totalDuration), sampleRate);

  function scheduleKick(time: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(60, time);
    osc.frequency.exponentialRampToValueAtTime(20, time + 0.15);
    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
    osc.start(time);
    osc.stop(time + 0.35);
  }

  function scheduleSnare(time: number) {
    const bufferSize = Math.ceil(sampleRate * 0.2);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 200;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    source.start(time);
    source.stop(time + 0.2);
  }

  function scheduleHihat(time: number, velocity = 0.3) {
    const bufferSize = Math.ceil(sampleRate * 0.05);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 8000;
    const gain = ctx.createGain();
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    source.start(time);
    source.stop(time + 0.05);
  }

  const totalBeats = bars * beatsPerBar * 2;
  for (let beat = 0; beat < totalBeats; beat++) {
    const t = beat * beatDuration;
    const beatInBar = beat % beatsPerBar;

    // Kick on beats 1 and 3 (0-indexed: 0 and 2)
    if (beatInBar === 0 || beatInBar === 2) {
      scheduleKick(t);
    }
    // Snare on beats 2 and 4 (0-indexed: 1 and 3)
    if (beatInBar === 1 || beatInBar === 3) {
      scheduleSnare(t);
    }
    // Hi-hat on every 8th note (every half beat)
    for (let eighth = 0; eighth < 2; eighth++) {
      const hTime = t + eighth * beatDuration * 0.5;
      const isOffbeat = eighth === 1;
      scheduleHihat(hTime, isOffbeat ? 0.2 : 0.3);
    }
  }

  return ctx.startRendering();
}
