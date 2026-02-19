"use client";

import { useEffect, useRef, useState } from "react";
import { ThreeRenderer } from "@/lib/render/ThreeRenderer";

export function useThreeCanvas(quality: "low" | "medium" | "high" = "medium") {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ThreeRenderer | null>(null);
  const [ready, setReady] = useState(0);

  // Effect 1: Create renderer + resize observer (no quality dep)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new ThreeRenderer(canvas);
    renderer.setQuality(quality);
    rendererRef.current = renderer;
    setReady((c) => c + 1);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          renderer.resize(width, height);
        }
      }
    });
    observer.observe(canvas);

    // Initial size
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      renderer.resize(rect.width, rect.height);
    }

    return () => {
      observer.disconnect();
      renderer.dispose();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect 2: Update quality without recreating renderer
  useEffect(() => {
    rendererRef.current?.setQuality(quality);
  }, [quality]);

  return { canvasRef, rendererRef, ready };
}
