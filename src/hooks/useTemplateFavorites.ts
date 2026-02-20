"use client";

import { useState, useCallback, useEffect } from "react";

const FAV_KEY = "bc-favorites";
const RECENTS_KEY = "bc-recents";
const MAX_RECENTS = 6;

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function readArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function useTemplateFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(readSet(FAV_KEY));
    setRecents(readArray(RECENTS_KEY));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const addRecent = useCallback((id: string) => {
    setRecents((prev) => {
      const filtered = prev.filter((r) => r !== id);
      const next = [id, ...filtered].slice(0, MAX_RECENTS);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { favorites, recents, toggleFavorite, addRecent };
}
