"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_CLIP_SPAN = 1e-3;
const OFFSET_EPSILON = 1e-4;

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  toggle: () => void;
}

export function useAudioPlayback(
  buffer: AudioBuffer | null,
  inTime: number,
  outTime: number,
  loop: boolean = true
): PlaybackState {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(inTime);

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startWallRef = useRef(0);
  const startOffsetRef = useRef(inTime);
  const rafRef = useRef(0);
  const tickRef = useRef<() => void>(() => {});

  const getSafeClipRange = useCallback(() => {
    if (!buffer) {
      const safeIn = Math.max(0, inTime);
      const safeOut = Math.max(safeIn + MIN_CLIP_SPAN, outTime);
      return { safeIn, safeOut, clipDuration: safeOut - safeIn };
    }

    const duration = Math.max(buffer.duration, MIN_CLIP_SPAN);
    const safeIn = clamp(inTime, 0, Math.max(0, duration - MIN_CLIP_SPAN));
    const safeOut = clamp(outTime, safeIn + MIN_CLIP_SPAN, duration);
    return {
      safeIn,
      safeOut,
      clipDuration: Math.max(MIN_CLIP_SPAN, safeOut - safeIn),
    };
  }, [buffer, inTime, outTime]);

  const stopSource = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // already stopped
      }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
  }, []);

  const tick = useCallback(() => {
    if (!ctxRef.current) return;
    const elapsed = ctxRef.current.currentTime - startWallRef.current;
    const { safeIn, safeOut, clipDuration } = getSafeClipRange();
    let t = startOffsetRef.current + elapsed;

    if (loop) {
      while (t >= safeOut) t -= clipDuration;
      while (t < safeIn) t += clipDuration;
    } else if (t >= safeOut) {
      setCurrentTime(safeOut);
      setIsPlaying(false);
      stopSource();
      return;
    }

    setCurrentTime(clamp(t, safeIn, safeOut));
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, [getSafeClipRange, loop, stopSource]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const play = useCallback(() => {
    if (!buffer) return;

    stopSource();

    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.loop = loop;
    const { safeIn, safeOut } = getSafeClipRange();
    const maxOffset = Math.max(safeIn, safeOut - OFFSET_EPSILON);
    if (loop) {
      source.loopStart = safeIn;
      source.loopEnd = safeOut;
    }

    const offset = clamp(currentTime, safeIn, maxOffset);
    startOffsetRef.current = offset;
    startWallRef.current = ctx.currentTime;

    source.start(0, offset, loop ? undefined : Math.max(MIN_CLIP_SPAN, safeOut - offset));
    sourceRef.current = source;

    source.onended = () => {
      if (!loop) {
        setIsPlaying(false);
        stopSource();
      }
    };

    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, [buffer, currentTime, getSafeClipRange, loop, stopSource]);

  const pause = useCallback(() => {
    stopSource();
    setIsPlaying(false);
  }, [stopSource]);

  const seek = useCallback(
    (time: number) => {
      const { safeIn, safeOut } = getSafeClipRange();
      const maxOffset = Math.max(safeIn, safeOut - OFFSET_EPSILON);
      const clamped = clamp(time, safeIn, maxOffset);
      setCurrentTime(clamped);
      if (isPlaying) {
        stopSource();

        if (!buffer || !ctxRef.current) return;
        const ctx = ctxRef.current;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.loop = loop;
        if (loop) {
          source.loopStart = safeIn;
          source.loopEnd = safeOut;
        }

        startOffsetRef.current = clamped;
        startWallRef.current = ctx.currentTime;
        source.start(0, clamped, loop ? undefined : Math.max(MIN_CLIP_SPAN, safeOut - clamped));
        sourceRef.current = source;
        rafRef.current = requestAnimationFrame(() => tickRef.current());
      }
    },
    [buffer, getSafeClipRange, isPlaying, loop, stopSource]
  );

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSource();
      if (ctxRef.current) {
        ctxRef.current.close();
        ctxRef.current = null;
      }
    };
  }, [stopSource]);

  const { safeIn, safeOut } = getSafeClipRange();
  const clampedCurrentTime = clamp(currentTime, safeIn, safeOut);

  return { isPlaying, currentTime: clampedCurrentTime, play, pause, seek, toggle };
}
