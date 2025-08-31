import { useState, useEffect } from "react";

interface UseUIPreferencesReturn {
  isPTTActive: boolean;
  setIsPTTActive: React.Dispatch<React.SetStateAction<boolean>>;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useUIPreferences(): UseUIPreferencesReturn {
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [isEventsPaneExpanded, setIsEventsPaneExpanded] = useState<boolean>(true);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(true);

  // Load preferences from localStorage on component mount
  useEffect(() => {
    const storedPushToTalkUI = localStorage.getItem("pushToTalkUI");
    if (storedPushToTalkUI) {
      setIsPTTActive(storedPushToTalkUI === "true");
    }
    
    const storedLogsExpanded = localStorage.getItem("logsExpanded");
    if (storedLogsExpanded) {
      setIsEventsPaneExpanded(storedLogsExpanded === "true");
    }
    
    const storedAudioPlaybackEnabled = localStorage.getItem("audioPlaybackEnabled");
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem("pushToTalkUI", isPTTActive.toString());
  }, [isPTTActive]);

  useEffect(() => {
    localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString());
  }, [isEventsPaneExpanded]);

  useEffect(() => {
    localStorage.setItem("audioPlaybackEnabled", isAudioPlaybackEnabled.toString());
  }, [isAudioPlaybackEnabled]);

  return {
    isPTTActive,
    setIsPTTActive,
    isEventsPaneExpanded,
    setIsEventsPaneExpanded,
    isAudioPlaybackEnabled,
    setIsAudioPlaybackEnabled,
  };
} 