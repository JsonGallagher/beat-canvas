"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface AnimationLoopState {
  time: number;
  frameIndex: number;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
}

export function useAnimationLoop(
  clipDuration: number,
  fps: number = 30,
  onFrame?: (time: number, frameIndex: number, delta: number) => void
): AnimationLoopState {
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);

  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const rafRef = useRef(0);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const tick = useCallback(() => {
    const now = performance.now();
    const delta = Math.min((now - lastFrameRef.current) / 1000, 0.1);
    lastFrameRef.current = now;

    timeRef.current += delta;
    if (timeRef.current >= clipDuration) {
      timeRef.current -= clipDuration;
    }

    const frameIndex = Math.floor(timeRef.current * fps);
    setTime(timeRef.current);
    onFrameRef.current?.(timeRef.current, frameIndex, delta);

    rafRef.current = requestAnimationFrame(tick);
  }, [clipDuration, fps]);

  const play = useCallback(() => {
    lastFrameRef.current = performance.now();
    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const seek = useCallback(
    (t: number) => {
      timeRef.current = Math.max(0, Math.min(clipDuration, t));
      setTime(timeRef.current);
      const frameIndex = Math.floor(timeRef.current * fps);
      onFrameRef.current?.(timeRef.current, frameIndex, 0);
    },
    [clipDuration, fps]
  );

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const frameIndex = Math.floor(time * fps);

  return { time, frameIndex, isPlaying, play, pause, toggle, seek };
}
