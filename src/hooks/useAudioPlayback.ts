"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
    const clipDuration = outTime - inTime;
    let t = startOffsetRef.current + elapsed;

    if (loop) {
      while (t >= outTime) t -= clipDuration;
    } else if (t >= outTime) {
      setCurrentTime(outTime);
      setIsPlaying(false);
      stopSource();
      return;
    }

    setCurrentTime(t);
    rafRef.current = requestAnimationFrame(tick);
  }, [inTime, outTime, loop, stopSource]);

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
    if (loop) {
      source.loopStart = inTime;
      source.loopEnd = outTime;
    }

    const offset = currentTime < inTime || currentTime >= outTime ? inTime : currentTime;
    startOffsetRef.current = offset;
    startWallRef.current = ctx.currentTime;

    source.start(0, offset, loop ? undefined : outTime - offset);
    sourceRef.current = source;

    source.onended = () => {
      if (!loop) {
        setIsPlaying(false);
        stopSource();
      }
    };

    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [buffer, inTime, outTime, currentTime, loop, tick, stopSource]);

  const pause = useCallback(() => {
    stopSource();
    setIsPlaying(false);
  }, [stopSource]);

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.max(inTime, Math.min(outTime, time));
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
          source.loopStart = inTime;
          source.loopEnd = outTime;
        }

        startOffsetRef.current = clamped;
        startWallRef.current = ctx.currentTime;
        source.start(0, clamped, loop ? undefined : outTime - clamped);
        sourceRef.current = source;
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [buffer, inTime, outTime, isPlaying, loop, tick, stopSource]
  );

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  // Snap playhead if trim changes exclude it
  useEffect(() => {
    if (currentTime < inTime || currentTime > outTime) {
      setCurrentTime(inTime);
    }
  }, [inTime, outTime, currentTime]);

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

  return { isPlaying, currentTime, play, pause, seek, toggle };
}
