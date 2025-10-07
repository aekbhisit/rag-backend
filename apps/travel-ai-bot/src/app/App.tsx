"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { SessionStatus } from "@/app/types";

// Components
import AppHeader from "./components/app/AppHeader";
import MainContent from "./components/app/MainContent";
import BottomToolbar from "./components/voice/BottomToolbar";

// Contexts
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { LanguageProvider, useLanguage } from "@/app/contexts/LanguageContext";

// Hooks
import { useHandleServerEvent } from "./hooks/useHandleServerEvent";
import useAudioDownload from "./hooks/useAudioDownload";
import { useWebRTCConnection } from "./hooks/useWebRTCConnection";
import { useUIPreferences } from "./hooks/useUIPreferences";
import { useCommunication } from "./hooks/useCommunication";
import { useAgentSelection } from "./hooks/useAgentSelection";
import { useSessionOperations } from "./hooks/useSessionOperations";
import { useRecordingEffect } from "./hooks/useRecordingEffect";
import { useSessionEffects } from "./hooks/useSessionEffects";
// Removed hardcoded agent import - using database agents instead
import { SessionRegistryProvider } from "./contexts/SessionRegistryContext";

// Create an inner AppContent component that uses the context
function AppContent() {
  const searchParams = useSearchParams();
  const urlCodec = searchParams.get("codec") || "opus";
  const urlModel = searchParams.get("model") || "gpt-4o-realtime-preview-2024-12-17";
  
  // Use language from context instead of local state
  const { language, switchLanguage } = useLanguage();
  
  const [isInitialSetupDone, setIsInitialSetupDone] = useState<boolean>(false);
  const [isOutputAudioBufferActive, setIsOutputAudioBufferActive] = useState<boolean>(false);

  // Context hooks
  const { addTranscriptBreadcrumb } = useTranscript();
  
  // UI state hooks
  const {
    isPTTActive,
    setIsPTTActive,
    isEventsPaneExpanded,
    setIsEventsPaneExpanded,
    isAudioPlaybackEnabled,
    setIsAudioPlaybackEnabled,
  } = useUIPreferences();

  // Agent selection hook
  const {
    selectedAgentName,
    setSelectedAgentName,
    selectedAgentConfigSet,
    agentSetKey,
    handleAgentChange,
    handleSelectedAgentChange,
  } = useAgentSelection();

  // Recording hook
  const { startRecording, stopRecording, downloadRecording } = useAudioDownload();

  // Define the server event handler with rich logging
  const eventSeqRef = useRef<number>(0);
  const handleServerEvent = (event: any) => {
    const seq = ++eventSeqRef.current;
    const t = new Date().toISOString();
    const type = event?.type;
    const itemId = event?.item_id || event?.item?.id;
    const role = event?.item?.role;
    const delta = event?.delta;
    const transcript = event?.transcript;
    console.log(`[App.Event #${seq} @ ${t}]`, {
      type,
      itemId,
      role,
      deltaLen: typeof delta === 'string' ? delta.length : undefined,
      transcriptLen: typeof transcript === 'string' ? transcript.length : undefined,
      raw: event,
    });
    handleServerEventRef.current(event);
  };

  // WebRTC connection hook - DISABLED to prevent automatic microphone permission request
  // The VoiceChatInterface uses the new SDK approach instead
  const webRTCConnection = {
    sessionStatus: 'DISCONNECTED' as SessionStatus,
    connectToRealtime: async () => { console.log('[App] WebRTC connection disabled - using SDK instead'); },
    disconnectFromRealtime: async () => { console.log('[App] WebRTC connection disabled - using SDK instead'); },
    sendClientEvent: () => console.log('[App] WebRTC connection disabled - using SDK instead'),
    setSessionStatus: (_: SessionStatus) => console.log('[App] WebRTC connection disabled - using SDK instead'),
    audioElementRef: { current: null as HTMLAudioElement | null },
    dcRef: { current: null as RTCDataChannel | null }
  };
  
  // Original WebRTC connection (commented out to prevent microphone permission request)
  // const webRTCConnection = useWebRTCConnection({
  //   isAudioPlaybackEnabled,
  //   handleServerEvent,
  //   urlCodec,
  //   urlModel,
  //   language: language || 'th-TH',
  // });
  
  // Track language change state to prevent unnecessary reconnections
  const previousLanguageRef = useRef<string | null>(null);
  
  // Re-connect when language changes to apply new language setting
  useEffect(() => {
    // Skip if this is the first render
    if (previousLanguageRef.current === null) {
      previousLanguageRef.current = language;
      return;
    }
    
    // Only reconnect if language actually changed and we're connected
    if (previousLanguageRef.current !== language && webRTCConnection.sessionStatus === "CONNECTED") {
      console.log(`[App] Language changed from ${previousLanguageRef.current} to ${language}, reconnecting...`);
      
      // Update ref before reconnection
      previousLanguageRef.current = language;
      
      // Store timestamp to prevent multiple reconnects in a short time
      const now = Date.now();
      const lastReconnectTime = sessionStorage.getItem('last_language_reconnect_time');
      const shouldDebounce = lastReconnectTime && (now - parseInt(lastReconnectTime, 10) < 5000);
      
      if (shouldDebounce) {
        console.log('[App] Debouncing reconnection - too many language changes in short period');
        return;
      }
      
      // Store current time for future debouncing
      try {
        sessionStorage.setItem('last_language_reconnect_time', now.toString());
      } catch (e) {
        console.warn('[App] Could not store reconnect timestamp', e);
      }
      
      // Use a timeout to ensure stable reconnection
      const reconnectTimeout = setTimeout(() => {
        // Only reconnect if we're still connected (user might have disconnected)
        if (webRTCConnection.sessionStatus === "CONNECTED") {
          console.log('[App] Executing language change reconnection');
          webRTCConnection.disconnectFromRealtime();
          
          // Wait longer before reconnecting to ensure clean state
          const connectTimeout = setTimeout(() => {
            // Double-check we're still in the right state before reconnecting
            if (webRTCConnection.sessionStatus === "DISCONNECTED") {
              console.log('[App] Reconnecting after language change');
              webRTCConnection.connectToRealtime();
            } else {
              console.log('[App] Skipping reconnection - session status changed');
            }
          }, 1000);
          
          // Cleanup function
          return () => clearTimeout(connectTimeout);
        } else {
          console.log('[App] Skipping language reconnection - no longer connected');
        }
      }, 500);
      
      return () => clearTimeout(reconnectTimeout);
    }
    
    // Update ref even if we didn't reconnect
    previousLanguageRef.current = language;
  }, [language, webRTCConnection.sessionStatus, webRTCConnection.connectToRealtime, webRTCConnection.disconnectFromRealtime]);

  // Function handlers are now managed by database agents
  const handleThaiResortFunction = () => {
    console.log('[App] Function calls are now handled by database agents');
  };

  // Simple identifyUser function - will only log for now
  const identifyUser = (userId: string) => {
    console.log(`[App] Would identify user with ID: ${userId}`);
  };
  
  // Server event handler hook
  const handleServerEventRef = useHandleServerEvent({
    setSessionStatus: webRTCConnection.setSessionStatus,
    selectedAgentName,
    selectedAgentConfigSet,
    sendClientEvent: webRTCConnection.sendClientEvent,
    setSelectedAgentName,
    setIsOutputAudioBufferActive,
    handleThaiResortFunction,
  });

  // Session operations hook - consolidated session management functionality
  const sessionOperations = useSessionOperations({
    selectedAgentName,
    selectedAgentConfigSet,
    isPTTActive,
    sendClientEvent: webRTCConnection.sendClientEvent,
  });

  // Send language flexibility reminder ONLY when language actually changes
  const previousLanguageForReminderRef = useRef<string | null>(null);
  const isInitialLanguageSetRef = useRef<boolean>(false);
  
  useEffect(() => {
    // Skip during app initialization to prevent multiple language-related events
    if (!isInitialLanguageSetRef.current) {
      isInitialLanguageSetRef.current = true;
      previousLanguageForReminderRef.current = language;
      console.log(`[App] Initial language set to ${language}, skipping reminder`);
      return;
    }
    
    // Only send reminder when language changes, not on initial render
    if (
      previousLanguageForReminderRef.current !== null && // Skip initial render
      previousLanguageForReminderRef.current !== language && // Only on language change
      webRTCConnection.sessionStatus === "CONNECTED" && 
      sessionOperations && 
      'sendLanguageFlexibilityReminder' in sessionOperations
    ) {
      console.log(`[App] Language changed from ${previousLanguageForReminderRef.current} to ${language}, sending flexibility reminder`);
      
      // Add slight delay to ensure language change is processed
      setTimeout(() => {
        sessionOperations.sendLanguageFlexibilityReminder();
      }, 500);
    }
    
    // Update reference for next comparison
    previousLanguageForReminderRef.current = language;
  }, [language, webRTCConnection.sessionStatus, sessionOperations]);

  // Communication hook
  const communication = useCommunication({
    sessionStatus: webRTCConnection.sessionStatus,
    isPTTActive,
    sendClientEvent: webRTCConnection.sendClientEvent,
    cancelAssistantSpeech: async (isActive) => { await sessionOperations.cancelAssistantSpeech(isActive); },
    isOutputAudioBufferActive,
    connectToRealtime: webRTCConnection.connectToRealtime,
    disconnectFromRealtime: webRTCConnection.disconnectFromRealtime,
  });

  // Recording effect hook
  useRecordingEffect({
    sessionStatus: webRTCConnection.sessionStatus,
    audioElementRef: webRTCConnection.audioElementRef,
    startRecording,
    stopRecording,
  });
  
  // Session effects hook
  useSessionEffects({
    selectedAgentName,
    selectedAgentConfigSet,
    sessionStatus: webRTCConnection.sessionStatus,
    isInitialSetupDone,
    setIsInitialSetupDone,
    isPTTActive,
    isManualDisconnect: communication.isManualDisconnect,
    updateSession: sessionOperations.updateSession,
    connectToRealtime: webRTCConnection.connectToRealtime,
    addTranscriptBreadcrumb,
    identifyUser,
    language,
  });

  // Handle language change
  const handleLanguageChange = (newLanguage: string) => {
    switchLanguage(newLanguage as any);
  };

  return (
    <div className="text-base flex flex-col h-screen bg-gray-100 text-gray-800 relative">
      <AppHeader
        agentSetKey={agentSetKey}
        selectedAgentName={selectedAgentName}
        selectedAgentConfigSet={selectedAgentConfigSet}
        handleAgentChange={handleAgentChange}
        handleSelectedAgentChange={handleSelectedAgentChange}
      />

      <MainContent
        userText={communication.userText}
        setUserText={communication.setUserText}
        onSendMessage={communication.handleSendTextMessage}
        downloadRecording={downloadRecording}
        canSend={
          webRTCConnection.sessionStatus === "CONNECTED" &&
          webRTCConnection.dcRef.current?.readyState === "open"
        }
        isEventsPaneExpanded={isEventsPaneExpanded}
      />

      <BottomToolbar
        sessionStatus={webRTCConnection.sessionStatus}
        onToggleConnection={communication.onToggleConnection}
        isPTTActive={isPTTActive}
        setIsPTTActive={setIsPTTActive}
        isPTTUserSpeaking={communication.isPTTUserSpeaking}
        handleTalkButtonDown={communication.handleTalkButtonDown}
        handleTalkButtonUp={communication.handleTalkButtonUp}
        isEventsPaneExpanded={isEventsPaneExpanded}
        setIsEventsPaneExpanded={setIsEventsPaneExpanded}
        isAudioPlaybackEnabled={isAudioPlaybackEnabled}
        setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
        codec={urlCodec}
        onCodecChange={communication.handleCodecChange}
        model={urlModel}
        onModelChange={communication.handleModelChange}
        language={language}
        onLanguageChange={handleLanguageChange}
        audioElementRef={webRTCConnection.audioElementRef}
      />
    </div>
  );
}

// Main App component is now just a provider wrapper
function App() {
  return (
    <SessionRegistryProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </SessionRegistryProvider>
  );
}

export default App;
