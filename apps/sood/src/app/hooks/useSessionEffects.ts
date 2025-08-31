"use client";

import { useEffect, useRef } from "react";
import { SessionStatus } from "@/app/types";
import { AgentConfig } from "@/app/types";
import { useSessionRegistry } from "./useSessionRegistry";

interface UseSessionEffectsProps {
  selectedAgentName: string;
  selectedAgentConfigSet: AgentConfig[] | null;
  sessionStatus: SessionStatus;
  isInitialSetupDone: boolean;
  setIsInitialSetupDone: (value: boolean) => void;
  isPTTActive: boolean;
  isManualDisconnect: boolean;
  updateSession: (isInitialGreeting?: boolean) => void;
  connectToRealtime: () => void;
  addTranscriptBreadcrumb: (message: string, currentAgent?: any) => void;
  identifyUser?: (userId: string) => void;
  language: string;
}

export function useSessionEffects({
  selectedAgentName,
  selectedAgentConfigSet,
  sessionStatus,
  isInitialSetupDone,
  setIsInitialSetupDone,
  isPTTActive,
  isManualDisconnect,
  updateSession,
  connectToRealtime,
  addTranscriptBreadcrumb,
  identifyUser,
  language,
}: UseSessionEffectsProps) {
  // Store previous values to avoid infinite loops
  const prevPTTActiveRef = useRef(isPTTActive);
  
  // Add connection debouncing
  const lastConnectAttemptRef = useRef<number>(0);
  const CONNECT_DEBOUNCE_MS = 2000; // 2 seconds between connection attempts
  
  // Prevent repeated breadcrumb spam when media devices are unavailable
  const mediaWarningShownRef = useRef<boolean>(false);
  
  // Get the session registry functions directly
  const { activateBot } = useSessionRegistry();
  
  // Effect 1: Handle PTT mode changes
  useEffect(() => {
    const isPTTChanged = prevPTTActiveRef.current !== isPTTActive;
    const canUpdateSession = sessionStatus === "CONNECTED" && isInitialSetupDone;
    
    if (canUpdateSession && isPTTChanged) {
      prevPTTActiveRef.current = isPTTActive;
      console.log(`PTT mode changed to: ${isPTTActive ? "active" : "inactive"}, updating session`);
      updateSession();
    }
  }, [isPTTActive, sessionStatus, updateSession, isInitialSetupDone]);

  // Effect 2: Auto-connect when agent is selected and we're disconnected
  useEffect(() => {
    // Check for media device support
    const hasMediaDevicesSupport = 
      typeof navigator !== 'undefined' && 
      navigator.mediaDevices && 
      !!navigator.mediaDevices.getUserMedia;
    
    const shouldConnect = 
      selectedAgentName && 
      sessionStatus === "DISCONNECTED" && 
      !isManualDisconnect;
    
    if (shouldConnect && hasMediaDevicesSupport) {
      // Add debouncing to prevent rapid connection attempts
      const now = Date.now();
      const timeSinceLastAttempt = now - lastConnectAttemptRef.current;
      
      if (timeSinceLastAttempt < CONNECT_DEBOUNCE_MS) {
        console.log(`[SessionEffects] Debouncing connection attempt (${timeSinceLastAttempt}ms since last attempt)`);
        return;
      }
      
      lastConnectAttemptRef.current = now;
      console.log(`[SessionEffects] Auto-connecting for agent: ${selectedAgentName}`);
      connectToRealtime();
    } else if (shouldConnect && !hasMediaDevicesSupport) {
      console.warn("Auto-connect prevented: MediaDevices API is not available in this environment.");
      if (!mediaWarningShownRef.current) {
        const insecureHint = typeof window !== 'undefined' && !window.isSecureContext
          ? " Tip: Use http://localhost:3200 or enable HTTPS to allow microphone access."
          : "";
        addTranscriptBreadcrumb(
          `Connection failed: Microphone access is not available in this browser or environment.${insecureHint}`
        );
        mediaWarningShownRef.current = true;
      }
    }
  }, [selectedAgentName, sessionStatus, isManualDisconnect, connectToRealtime, addTranscriptBreadcrumb]);

  // Effect 3: Initial setup after connection is established
  useEffect(() => {
    const isConnected = 
      sessionStatus === "CONNECTED" &&
      selectedAgentConfigSet &&
      selectedAgentName;
    
    if (isConnected && !isInitialSetupDone) {
      // Get current agent
      const currentAgent = selectedAgentConfigSet.find(
        (a) => a.name === selectedAgentName
      );
      
      // Add agent info to transcript
      addTranscriptBreadcrumb(`Agent: ${selectedAgentName}`, currentAgent);
      
      // Register this agent in our session registry
      activateBot(selectedAgentName, 'Initial agent activation');
      console.log(`[SessionRegistry] Activated initial agent: ${selectedAgentName}`);
      
      // Initialize session with greeting
      addTranscriptBreadcrumb(
        `You are now acting as ${selectedAgentName}. IMPORTANT: You must respond entirely in ${language}.`
      );
      
      // Add a special note about language flexibility
      addTranscriptBreadcrumb(
        `LANGUAGE NOTE: While your default language is ${language}, you should respond in the same language as the user. If the user explicitly asks for responses in a specific language, honor that request.`
      );
      
      // Mark setup as complete before triggering updateSession to prevent race conditions
      setIsInitialSetupDone(true);
      
      // Add a small delay before triggering the initial welcome message
      // This ensures everything is properly initialized first
      setTimeout(() => {
        console.log("[SessionEffects] Triggering initial welcome after delay");
        updateSession(true);
      }, 1000);
      
      // Identify user if possible
      if (identifyUser) {
        identifyUser("user-123-abc");
      }
    }
  }, [
    selectedAgentConfigSet,
    selectedAgentName,
    sessionStatus,
    updateSession,
    addTranscriptBreadcrumb,
    isInitialSetupDone,
    setIsInitialSetupDone,
    identifyUser,
    activateBot,
    language,
  ]);
} 