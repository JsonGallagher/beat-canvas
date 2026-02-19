export const FFT_SIZE = 2048;
export const FPS = 30;

// Frequency band ranges (Hz)
export const BASS_LOW = 20;
export const BASS_HIGH = 250;
export const MID_LOW = 250;
export const MID_HIGH = 4000;
export const TREBLE_LOW = 4000;
export const TREBLE_HIGH = 16000;

// Smoothing
export const ATTACK_ALPHA = 0.8;
export const RELEASE_ALPHA = 0.3;

// Quiet audio normalization
export const QUIET_THRESHOLD = 0.1;
export const QUIET_TARGET_PEAK = 0.8;

// Beat detection
export const KICK_THRESHOLD = 0.12;
export const ONSET_THRESHOLD = 0.08;
export const KICK_DECAY = 0.88;
export const KICK_COOLDOWN_FRAMES = 4;
