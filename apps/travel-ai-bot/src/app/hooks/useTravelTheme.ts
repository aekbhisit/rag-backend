"use client";

import { useEffect, useState } from "react";

export type TravelTheme = "sunset" | "tropical" | "ocean" | "forest" | "desert" | "island" | "pro" | "warm";

const STORAGE_KEY = "ta_theme_v4";

export function useTravelTheme(defaultTheme: TravelTheme = "warm") {
  const [theme, setTheme] = useState<TravelTheme>(defaultTheme);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as TravelTheme | null;
      if (stored) setTheme(stored);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  return { theme, setTheme } as const;
}


