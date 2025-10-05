"use client";

import { useEffect, useState } from "react";

export type ChatChannel = "normal" | "realtime" | "human" | "line";

const STORAGE_KEY = "chat-active-channel";

export function usePersistedChannel(defaultChannel: ChatChannel = "normal") {
  // Start with default to avoid hydration mismatch
  const [channel, setChannel] = useState<ChatChannel>(defaultChannel);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load saved channel once client-side
  useEffect(() => {
    setIsHydrated(true);
    try {
      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem(STORAGE_KEY) as ChatChannel | null;
        if (saved === "normal" || saved === "realtime" || saved === "human" || saved === "line") {
          if (saved !== defaultChannel) setChannel(saved);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist when changed (after hydration)
  useEffect(() => {
    if (!isHydrated) return;
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, channel);
      }
    } catch {}
  }, [channel, isHydrated]);

  return [channel, setChannel] as const;
}




