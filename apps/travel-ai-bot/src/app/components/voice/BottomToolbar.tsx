import React, { useEffect } from "react";
import { SessionStatus } from "@/app/types";
import VolumeControl from "../ui/VolumeControl";

interface BottomToolbarProps {
  sessionStatus: SessionStatus;
  onToggleConnection: () => void;
  isPTTActive: boolean;
  setIsPTTActive: (val: boolean) => void;
  isPTTUserSpeaking: boolean;
  handleTalkButtonDown: () => void;
  handleTalkButtonUp: () => void;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: (val: boolean) => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (val: boolean) => void;
  codec: string;
  onCodecChange: (newCodec: string) => void;
  model: string;
  onModelChange: (newModel: string) => void;
  language?: string;
  onLanguageChange?: (language: string) => void;
  audioElementRef?: React.RefObject<HTMLAudioElement | null>;
}

function BottomToolbar({
  sessionStatus,
  onToggleConnection,
  isPTTActive,
  setIsPTTActive,
  isPTTUserSpeaking,
  handleTalkButtonDown,
  handleTalkButtonUp,
  isEventsPaneExpanded,
  setIsEventsPaneExpanded,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
  codec,
  onCodecChange,
  model,
  onModelChange,
  language = "en-US",
  onLanguageChange = () => {},
  audioElementRef,
}: BottomToolbarProps) {
  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";

  // Log connection status changes for debugging
  useEffect(() => {
    console.log(`[BottomToolbar] Connection status changed to: ${sessionStatus}`);
    
    // Add connection status to DOM for potential timeout checks
    const root = document.documentElement;
    root.setAttribute('data-connection-status', sessionStatus);
  }, [sessionStatus]);

  const handleCodecChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCodec = e.target.value;
    onCodecChange(newCodec);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    onModelChange(newModel);
  };

  // Helper function to get short model name for display
  const getShortModelName = (fullModel: string): string => {
    if (fullModel.includes("gpt-4o-mini")) return "gpt-4o-mini";
    if (fullModel.includes("gpt-4o")) return "gpt-4o";
    return fullModel;
  };

  // Helper function to get display name
  const getModelDisplayName = (fullModel: string): string => {
    if (fullModel.includes("gpt-4o-mini")) return "GPT-4o Mini";
    if (fullModel.includes("gpt-4o")) return "GPT-4o";
    return fullModel;
  };

  function getConnectionButtonLabel() {
    if (isConnected) return "Disconnect";
    if (isConnecting) return "Connecting...";
    return "Connect";
  }

  function getConnectionButtonClasses() {
    const baseClasses = "text-white text-base p-2 w-36 rounded-md h-full";
    const cursorClass = isConnecting ? "cursor-not-allowed" : "cursor-pointer";

    if (isConnected) {
      // Connected -> label "Disconnect" -> red
      return `bg-red-600 hover:bg-red-700 ${cursorClass} ${baseClasses}`;
    }
    // Disconnected or connecting -> label is either "Connect" or "Connecting" -> black
    return `bg-black hover:bg-gray-900 ${cursorClass} ${baseClasses}`;
  }

  return (
    <div className="p-4 flex flex-row items-center justify-center gap-x-8">
      <button
        onClick={onToggleConnection}
        className={getConnectionButtonClasses()}
        disabled={isConnecting}
      >
        {getConnectionButtonLabel()}
      </button>

      <div className="flex flex-row items-center gap-2">
        <input
          id="push-to-talk"
          type="checkbox"
          checked={isPTTActive}
          onChange={(e) => setIsPTTActive(e.target.checked)}
          disabled={!isConnected}
          className="w-4 h-4"
        />
        <label
          htmlFor="push-to-talk"
          className="flex items-center cursor-pointer"
        >
          Push to talk
        </label>
        <button
          onMouseDown={handleTalkButtonDown}
          onMouseUp={handleTalkButtonUp}
          onTouchStart={handleTalkButtonDown}
          onTouchEnd={handleTalkButtonUp}
          disabled={!isPTTActive}
          className={
            (isPTTUserSpeaking ? "bg-gray-300" : "bg-gray-200") +
            " py-1 px-4 cursor-pointer rounded-md" +
            (!isPTTActive ? " bg-gray-100 text-gray-400" : "")
          }
        >
          Talk
        </button>
      </div>

      <div className="flex flex-row items-center gap-1">
        <input
          id="audio-playback"
          type="checkbox"
          checked={isAudioPlaybackEnabled}
          onChange={(e) => setIsAudioPlaybackEnabled(e.target.checked)}
          disabled={!isConnected}
          className="w-4 h-4"
        />
        <label
          htmlFor="audio-playback"
          className="flex items-center cursor-pointer"
        >
          Audio playback
        </label>
      </div>

      <div className="flex flex-row items-center gap-2">
        <input
          id="logs"
          type="checkbox"
          checked={isEventsPaneExpanded}
          onChange={(e) => setIsEventsPaneExpanded(e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="logs" className="flex items-center cursor-pointer">
          Logs
        </label>
      </div>

      <div className="flex flex-row items-center gap-2">
        <div>Codec:</div>
        <select
          id="codec-select"
          value={codec}
          onChange={handleCodecChange}
          className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none cursor-pointer"
        >
          <option value="opus">Opus (48 kHz)</option>
          <option value="pcmu">PCMU (8 kHz)</option>
          <option value="pcma">PCMA (8 kHz)</option>
        </select>
      </div>

      <div className="flex flex-row items-center gap-2">
        <div>Model:</div>
        <select
          id="model-select"
          value={model}
          onChange={handleModelChange}
          className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none cursor-pointer"
        >
          <option value="gpt-4o-realtime-preview-2024-12-17">GPT-4o</option>
          <option value="gpt-4o-mini-realtime-preview-2024-12-17">GPT-4o Mini</option>
        </select>
      </div>

      {/* Volume Control */}
      {audioElementRef && (
        <div className="flex flex-row items-center gap-2">
          <VolumeControl audioRef={audioElementRef} />
        </div>
      )}

      <button
        onClick={() => {
          console.log("----- WebRTC Debug Info -----");
          console.log("Session Status:", sessionStatus);
          console.log("Connection State:", document.documentElement.getAttribute('data-connection-status'));
          console.log("Browser:", navigator.userAgent);
          console.log("Language:", language);
          console.log("Codec:", codec);
          console.log("Model:", model);
          console.log("PTT Active:", isPTTActive);
          console.log("Audio Enabled:", isAudioPlaybackEnabled);
          
          // Test API connectivity
          console.log("Running API connectivity tests...");
          
          // Test session API
          fetch("/api/session", {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
          })
          .then(res => {
            console.log("Session API test:", { 
              status: res.status, 
              ok: res.ok, 
              statusText: res.statusText 
            });
            return res.ok ? res.json() : { error: `Status ${res.status}` };
          })
          .then(data => {
            console.log("Session API response:", { 
              hasClientSecret: !!data.client_secret,
              hasValue: data.client_secret && !!data.client_secret.value 
            });
          })
          .catch(err => console.error("Session API test error:", err));
          
          // Check WebRTC connection
          const rtcSupport = {
            RTCPeerConnection: !!window.RTCPeerConnection,
            RTCSessionDescription: !!window.RTCSessionDescription,
            RTCIceCandidate: !!window.RTCIceCandidate,
            getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
          };
          
          console.log("WebRTC API support:", rtcSupport);
          
          // Check for possible cors or network issues with a simple fetch to OpenAI
          fetch("https://api.openai.com/healthz", { 
            method: "GET",
            mode: "cors"
          })
          .then(res => {
            console.log("OpenAI API connectivity test:", { 
              status: res.status,
              ok: res.ok,
              statusText: res.statusText
            });
          })
          .catch(err => console.error("OpenAI API connectivity test error:", err));
          
          console.log("---------------------------");
          alert("WebRTC debug info logged to console. Please open developer tools to see it.");
        }}
        className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-2 rounded"
      >
        Debug
      </button>
    </div>
  );
}

export default BottomToolbar;
