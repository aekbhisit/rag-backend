/**
 * useSDKRealtimeSession
 * Realtime SDK hook for multi-agent voice mode with PTT.
 */
      // Create session
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RealtimeSession } from '@openai/agents/realtime';
import { markGlobalUserInteraction } from '@/app/lib/sdk-agent-wrapper';
import { createAllVoiceAgents } from '@/app/lib/realtime/voiceAgentFactory';
import { createResponseQueueController } from '@/app/lib/realtime/responseQueue';
import { createRealtimeTransport } from '@/app/lib/realtime/transport';
import { updateRealtimeSession } from '@/app/lib/realtime/sessionUpdate';
import { registerSessionEventHandlers } from '@/app/lib/realtime/sessionEvents';
import { installGlobalHandoffTrigger } from '@/app/lib/realtime/handoff';
import { fetchEphemeralKey } from '@/app/lib/realtime/sessionAuth';
import { AgentConfig } from '@/app/types';
import { UniversalMessage } from '@/app/types';
import { getOrCreateDbSession } from '@/app/lib/sharedSessionManager';
import { logMessage as logToDb } from '@/app/lib/loggerClient';
      // Register handlers
interface UseSDKRealtimeSessionProps {
  // Multi-agent configuration (OpenAI approach)
  allAgentConfigs: AgentConfig[];
  selectedAgentName: string;
  onMessage?: (message: UniversalMessage) => void;
  onError?: (error: Error) => void;
  sessionId: string;
  onAgentTransfer?: (agentName: string) => void;
  // Voice control options
  enabled?: boolean;
  acceptResponses?: boolean;
  muteAudio?: boolean;
  shouldAcceptResponseStart?: () => boolean;
  onUserVoiceItemCreated?: (initialText?: string) => void;
  // Response callbacks for UI updates
  onResponseStart?: () => void;
  onResponseStartFromDelta?: (agentName?: string) => void;
  onResponseDelta?: (delta: string) => void;
  onResponseDone?: (text: string, agentName?: string) => void;
  onTranscript?: (text: string) => void;
  onTranscriptDelta?: (delta: string) => void;
  // Preferred input transcription language (BCP-47 or provider code, e.g. 'th' or 'th-TH')
  transcriptionLanguage?: string;
  // Agent management for function calls
  dynamicAgentSets?: { [key: string]: any[] };
  activeAgentSetKeyState?: string;
  setActiveAgentSetKeyState?: (key: string) => void;
  setActiveAgentNameState?: (name: string) => void;
  messages?: UniversalMessage[];
}

interface UseSDKRealtimeSessionReturn {
  session: RealtimeSession | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  startVoice: () => Promise<void>;
  stopVoice: () => void;
  disconnect: () => void;
  interrupt: () => void;
  isVoiceActive: boolean;
  isPTTActive: boolean;
  setIsPTTActive: (active: boolean) => void;
  isPTTUserSpeaking: boolean;
  mute: (mute: boolean) => void;
  markUserInteraction: () => void;
}

/**
 * SDK hook for Realtime API with PTT support
 * - Push-to-talk voice input
 * - WebRTC audio handling
 * - UniversalMessage integration
 * - Database session management
 */
export function useSDKRealtimeSession({
  allAgentConfigs,
  selectedAgentName,
  onMessage,
  onError,
  sessionId,
  onAgentTransfer,
  enabled = true,
  acceptResponses = true,
  muteAudio = false,
  shouldAcceptResponseStart,
  onUserVoiceItemCreated,
  onResponseStart,
  onResponseStartFromDelta,
  onResponseDelta,
  onResponseDone,
  onTranscript,
  onTranscriptDelta,
  transcriptionLanguage,
  dynamicAgentSets = {},
  activeAgentSetKeyState,
  setActiveAgentSetKeyState,
  setActiveAgentNameState,
  messages = []
}: UseSDKRealtimeSessionProps): UseSDKRealtimeSessionReturn {

  // ===== Runtime sequence: State & Refs =====
  const [session, setSession] = useState<RealtimeSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isPTTActive, setIsPTTActive] = useState(false);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState(false);

  const sessionRef = useRef<RealtimeSession | null>(null);
  const dbSessionIdRef = useRef<string>('');
  const currentResponseRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioSenderRef = useRef<RTCRtpSender | null>(null);
  const pttStartAtRef = useRef<number>(0);
  const allowAgentRunsRef = useRef<boolean>(false);
  const hasAttemptedConnectionRef = useRef<boolean>(false);
  const aiPlaceholderCreatedRef = useRef<boolean>(false);
  const userTranscriptionCompleteRef = useRef<boolean>(false);

  // Track function_call name per call_id for better logs when events omit name
  const functionCallNameByIdRef = useRef<Map<string, string>>(new Map());
  // Flag that prevents duplicate finalization between transcript.done and response.done fallback
  const assistantResponseHandledRef = useRef<boolean>(false);

  const previousAgentNameRef = useRef<string>('');
  const transferContextRef = useRef<{ agentName: string, rationale: string, context: string } | null>(null);
  const handoffKickoffSentRef = useRef<boolean>(false);
  // Keep live refs in event handlers
  const selectedAgentNameRef = useRef<string>(selectedAgentName);
  // Tracks which agent is expected to produce the next assistant output
  const currentOutputAgentRef = useRef<string>('');
  // Tracks the currently applied TTS voice at the session level
  const appliedVoiceRef = useRef<string>('');
  // Queue a pending voice change when assistant audio is active
  const pendingVoiceRef = useRef<string | null>(null);
  // PTT response attempt tracking for fallback
  const pttCreateAttemptedRef = useRef<boolean>(false);
  const lastPTTCommitAtRef = useRef<number>(0);
  selectedAgentNameRef.current = selectedAgentName;
  const allAgentConfigsRef = useRef<AgentConfig[]>(allAgentConfigs);
  allAgentConfigsRef.current = allAgentConfigs;
  // Tracks the agent name most recently reported by the server as active
  const sessionReadyForAgentRef = useRef<string | null>(null);
  // Feature flag for auto-kickoff after handoff; default disabled to match App.tsx
  const enableAgentEndKickoffRef = useRef<boolean>(false);

  // ===== Core helpers =====
  // Safe event sender with basic type validation and connection guard
  const sendEventSafe = useCallback((evt: any) => {
    try {
      if (!sessionRef.current || !(sessionRef.current as any)?.transport?.sendEvent) {
        console.warn('[SDK-Realtime] ⚠️ sendEvent skipped - no active transport');
        return false;
      }
      const allowed = new Set([
        'session.update',
        'transcription_session.update',
        'input_audio_buffer.append',
        'input_audio_buffer.commit',
        'input_audio_buffer.clear',
        'conversation.item.create',
        'response.create',
        'response.cancel',
        // Needed to acknowledge tool execution back to the server orchestrator
        'response.function_call_output'
      ]);
      const t = (evt && evt.type) || '';
      if (!allowed.has(t)) {
        console.warn('[SDK-Realtime] ⚠️ Invalid event type, skipping:', t, 'evt=', evt);
        return false;
      }
      (sessionRef.current as any).transport.sendEvent(evt);
      return true;
    } catch (e) {
      console.warn('[SDK-Realtime] ⚠️ sendEventSafe failed:', e);
      return false;
    }
  }, []);

  // Get current agent config
  const currentAgentConfig = useMemo(() => {
    if (!allAgentConfigs || allAgentConfigs.length === 0) {
      return null;
    }
    return allAgentConfigs.find(config => config.name === selectedAgentName) || allAgentConfigs[0];
  }, [allAgentConfigs, selectedAgentName]);

  // ===== Stable refs =====
  // Store onMessage in ref to avoid recreating agents
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  // Store onAgentTransfer in ref to avoid recreating handoff trigger
  const onAgentTransferRef = useRef(onAgentTransfer);
  onAgentTransferRef.current = onAgentTransfer;

  // ===== Global handoff trigger =====
  useEffect(() => {
    const cleanup = installGlobalHandoffTrigger({
      isConnected: () => isConnected,
      isConnecting: () => isConnecting,
      setActiveAgentNameState,
      onAgentTransfer: onAgentTransferRef.current || undefined,
    });
    return cleanup;
  }, []);

  // Initialize response queue controller now that sendEventSafe is defined
  const {
    isResponseActiveRef,
    activeResponseIdRef,
    responseCreationLockRef,
    responseCreationQueueRef,
    isProcessingQueueRef,
    responseCompletionPromiseRef,
    responseCompletionResolveRef,
    resetResponseState,
    waitForResponseDone,
    resetResponseCompletionPromise,
    processResponseQueue,
    safeCreateResponse,
  } = useMemo(() => createResponseQueueController({
    sendEventSafe,
    getSession: () => sessionRef.current
  }), [sendEventSafe]);

  // ===== Agents (voice mode) =====
  const allSDKAgents = useMemo(() => {
    if (!allAgentConfigs || allAgentConfigs.length === 0) {
      return [];
    }
    return createAllVoiceAgents(allAgentConfigs, {
      sessionId,
      onMessage: (universalMessage) => onMessageRef.current?.(universalMessage)
    });
  }, [allAgentConfigs, sessionId]);

  // ===== DB session initialization =====
  useEffect(() => {
    const initializeDbSession = async () => {
      try {
        console.log('[SDK] Initializing database session for sessionId:', sessionId);
        const dbSessionId = await getOrCreateDbSession(sessionId, 'voice');
        console.log('[SDK] Database session created/retrieved:', dbSessionId);
        dbSessionIdRef.current = dbSessionId;
      } catch (err) {
        console.warn('[SDK] Failed to get session, using frontend session:', err);
        dbSessionIdRef.current = sessionId;
      }
    };

    initializeDbSession();
  }, [sessionId]);

  // ===== Interaction helper =====
  const markUserInteraction = useCallback(() => {
    console.log('[SDK-Realtime] 👤 Marking global user interaction');
    markGlobalUserInteraction();
  }, []);

  // ===== Session update helper =====
  const updateSession = useCallback(async (shouldTriggerResponse: boolean = false) => {
    await updateRealtimeSession({
      sendEventSafe,
      isConnected: () => !!sessionRef.current && isConnected,
      getSelectedAgentName: () => selectedAgentName,
      getAgentInstructions: () => {
        try {
          const cfg = (allAgentConfigsRef.current || []).find(c => c.name === selectedAgentName) || null;
          const raw = (cfg?.instructions || cfg?.systemPrompt || '').toString();
          const source = (cfg?.instructions ? 'instructions' : (cfg?.systemPrompt ? 'systemPrompt' : 'none')) as 'instructions' | 'systemPrompt' | 'none';
          return { instructions: raw, source };
        } catch { return null; }
      }
    }, {
      isPTTActive,
      transcriptionLanguage,
      shouldTriggerResponse,
      safeCreateResponse,
    });
  }, [isPTTActive, selectedAgentName, transcriptionLanguage, sendEventSafe, safeCreateResponse, isConnected]);

  // ===== Mic control helper =====
  const setMicEnabled = useCallback((enabled: boolean) => {
    try {
      const sender = audioSenderRef.current;
      const track = sender?.track as MediaStreamTrack | undefined;
      if (track && typeof track.enabled !== 'undefined') {
        track.enabled = enabled;
        console.log('[SDK-Realtime] 🎚️ Mic track toggled:', enabled);
      } else {
        console.log('[SDK-Realtime] ⚠️ No local audio track found to toggle');
      }
    } catch (e) {
      console.warn('[SDK-Realtime] ⚠️ setMicEnabled failed:', e);
    }
  }, []);

  // ===== Connect flow =====
  const connect = useCallback(async () => {
    console.log('[SDK-Realtime] Connect function called:', {
      enabled,
      hasAttempted: hasAttemptedConnectionRef.current,
      agentsCount: allSDKAgents.length,
      hasAgentConfig: !!currentAgentConfig
    });
    
    if (!enabled) {
      console.log('[SDK-Realtime] Connect aborted: not enabled');
      return;
    }

    if (hasAttemptedConnectionRef.current) {
      console.log('[SDK-Realtime] Connect aborted: already attempted');
      return;
    }

    if (!allSDKAgents.length || !currentAgentConfig) {
      console.log('[SDK-Realtime] Connect aborted: no agent config available');
      setError('No agent configurations available');
      return;
    }

    hasAttemptedConnectionRef.current = true;
    setIsConnecting(true);
    setError(null);

    try {
      // Create transport (WebRTC + audio element + sender discovery)
      const { transport: webRTCTransport } = createRealtimeTransport({
        audioElementRef,
        peerConnectionRef,
        audioSenderRef,
      });

      console.log('[SDK-Realtime] 🔄 Creating multi-agent session with all agents:', allSDKAgents.map(a => a.name));

      // Trimmed verbose agent configuration logging

      const reorderedAgents = [...allSDKAgents];
      const selectedAgentIndex = reorderedAgents.findIndex(agent => agent.name === selectedAgentName);

      if (selectedAgentIndex > 0) {
        const [selectedAgent] = reorderedAgents.splice(selectedAgentIndex, 1);
        reorderedAgents.unshift(selectedAgent); // Move selected agent to front
      }

      const rootAgent = reorderedAgents[0];

      console.log('[SDK-Realtime] 🔄 Creating session with agents:', reorderedAgents.map(a => a.name));
      // Trimmed payload preview logging

      let newSession;
      try {
        // Create session with root agent - the SDK will handle multi-agent functionality
        // Only enable audio when user explicitly enables voice mode
        // Force PTT-only by disabling server VAD at session creation
        const turnDetection = null;

        newSession = new RealtimeSession(rootAgent, {
          transport: webRTCTransport,
          model: 'gpt-4o-realtime-preview-2025-06-03',
          config: {
            inputAudioFormat: 'pcm16',
            outputAudioFormat: 'pcm16',
            inputAudioTranscription: {
              model: 'gpt-4o-mini-transcribe',
              // Hint language at creation if available
              ...(transcriptionLanguage ? { language: transcriptionLanguage } : {}),
            },
            turnDetection: turnDetection || undefined
          }
        });

        // Keep a local copy for debugging/inspection only, and register agents via helper if supported
        (newSession as any).allAgents = reorderedAgents;
        try {
          if (typeof (newSession as any).setAgents === 'function') {
            (newSession as any).setAgents(reorderedAgents);
          }
        } catch { }

        console.log('[SDK-Realtime] ✅ RealtimeSession created with root agent:', rootAgent.name);
      } catch (sessionError) {
        console.error('[SDK-Realtime] ❌ Failed to create multi-agent RealtimeSession:', {
          error: sessionError,
          message: (sessionError as any)?.message,
          stack: (sessionError as any)?.stack,
          rootAgentName: rootAgent.name,
          agentsCount: allSDKAgents.length,
          agentNames: allSDKAgents.map(a => a.name)
        });
        throw sessionError;
      }

      // Register consolidated handlers (replaces inline listeners)
      registerSessionEventHandlers(newSession, {
        sendEventSafe,
        setIsConnected,
        setIsConnecting,
        setMicEnabled,
        setActiveAgentNameState,
        onAgentTransfer,
        onError,
        setError,
        updateSession,
        sessionRef,
        selectedAgentNameRef,
        allAgentConfigsRef,
        audioElementRef,
        allowAgentRunsRef,
        currentResponseRef,
        aiPlaceholderCreatedRef,
        userTranscriptionCompleteRef,
        functionCallNameByIdRef,
        assistantResponseHandledRef,
        currentOutputAgentRef,
        appliedVoiceRef,
        transferContextRef,
        handoffKickoffSentRef,
        waitForResponseDone,
        resetResponseCompletionPromise,
        responseCompletionResolveRef,
        processResponseQueue,
        onResponseStart,
        onResponseStartFromDelta,
        onResponseDelta,
        onResponseDone,
        acceptResponses,
        shouldAcceptResponseStart,
        onTranscript,
        onTranscriptDelta,
        onUserVoiceItemCreated,
        markUserInteraction,
        getAgents: () => reorderedAgents,
      });

      // Session events are handled by registerSessionEventHandlers above


      let ephemeralKey: string;
      try {
        ephemeralKey = await fetchEphemeralKey();
      } catch (err) {
        console.error('[SDK] Failed to get ephemeral key:', err);
        setError('Failed to get ephemeral key from server');
        setIsConnecting(false);
        setIsConnected(false);
        onError?.(err instanceof Error ? err : new Error('Failed to get ephemeral key'));
        return;
      }

      try {
        const connectionPromise = newSession.connect({ apiKey: ephemeralKey });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        );

        await Promise.race([connectionPromise, timeoutPromise]);
      } catch (err: any) {
        console.error('[SDK] Connection failed:', err?.message || err);
        setError(`Connection failed: ${err?.message || 'Unknown error'}`);
        setIsConnecting(false);
        setIsConnected(false);
        onError?.(err instanceof Error ? err : new Error('Connection failed'));
        return;
      }

      sessionRef.current = newSession;
      setSession(newSession);
      setIsConnected(true);
      setIsConnecting(false);
      updateSession();

    } catch (err) {
      console.error('[SDK] Connection failed:', err);
      setIsConnecting(false);
      setError(err instanceof Error ? err.message : 'Connection failed');
      onError?.(err instanceof Error ? err : new Error('Connection failed'));
    }
  }, [currentAgentConfig, onMessage, onError, onAgentTransfer, sessionId, enabled, acceptResponses, muteAudio, shouldAcceptResponseStart, onUserVoiceItemCreated, onResponseStart, onResponseDelta, onResponseDone, onTranscript, onTranscriptDelta]);

  // React to muteAudio changes
  useEffect(() => {
    if (audioElementRef.current) {
      audioElementRef.current.muted = !!muteAudio;
    }
  }, [muteAudio]);

  // Send message through SDK session
  const sendMessage = useCallback(async (message: string) => {
    if (!sessionRef.current || !isConnected) {
      setError('Session not connected');
      return;
    }

    try {
      // If assistant is speaking, stop playback and clear buffers (guarded) before sending new text
      const isAudioPlaying = (() => {
        try { return !!(audioElementRef.current && !audioElementRef.current.paused); } catch { return false; }
      })();
      const hasActiveResponse = !!(activeResponseIdRef.current);
      const shouldInterrupt = isResponseActiveRef.current || hasActiveResponse || isAudioPlaying || !!currentResponseRef.current;
      if (shouldInterrupt) {
        try { (sessionRef.current as any).interrupt?.(); } catch { }
        try { if (isResponseActiveRef.current || hasActiveResponse) { sendEventSafe({ type: 'response.cancel' }); } } catch { }
        try { sendEventSafe({ type: 'output_audio_buffer.clear' }); } catch { }
        try { sendEventSafe({ type: 'input_audio_buffer.clear' }); } catch { }
      }

      // Enable agent runs when user sends a message
      allowAgentRunsRef.current = true;

      // For text input, mark user transcription as complete immediately
      userTranscriptionCompleteRef.current = true;

      // Add user message to chat
      const userMessage: UniversalMessage = {
        id: `msg-${Date.now()}`,
        sessionId,
        timestamp: new Date().toISOString(),
        type: 'text',
        content: message,
        metadata: {
          source: 'user',
          channel: 'realtime',
          language: 'en'
        }
      };

      onMessage?.(userMessage);

      // Send through SDK
      await (sessionRef.current as any).sendMessage(message);

      // Log to database (shared logger)
      try { await logToDb({ sessionId: dbSessionIdRef.current, role: 'user', type: 'text', content: message, channel: 'realtime', meta: { is_internal: false, input: 'voice_text' } }); } catch (err) { console.warn('[SDK] Failed to log user message:', err); }

    } catch (err) {
      console.error('[SDK] Failed to send message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      onError?.(err instanceof Error ? err : new Error('Failed to send message'));
    }
  }, [isConnected, onMessage, onError, sessionId]);

  // PTT button down handler
  const startVoice = useCallback(async () => {
    if (!sessionRef.current || !isConnected) {
      setError('Session not connected');
      return;
    }

    // Enable agent runs when user starts voice input
    allowAgentRunsRef.current = true;

    // Reset flags for new PTT session
    userTranscriptionCompleteRef.current = false;
    aiPlaceholderCreatedRef.current = false;
    pttCreateAttemptedRef.current = false;

    try {
      (sessionRef.current as any).interrupt?.();
    } catch (err) {
      console.error('[SDK] Failed to interrupt session:', err);
    }

    try {
      (sessionRef.current as any).transport?.sendEvent?.({ type: 'input_audio_buffer.clear' });
    } catch (err) {
      console.error('[SDK] Failed to clear audio buffer:', err);
    }

    // Mark PTT start time
    pttStartAtRef.current = Date.now();

    // Keep transport mute state unchanged; manage mic track + DOM audio to avoid feedback
    try { if (audioElementRef.current) { audioElementRef.current.muted = true; } } catch { }
    // Enable mic track for PTT window
    setMicEnabled(true);
    setIsPTTUserSpeaking(true);
    setIsVoiceActive(true);
  }, [isConnected, onError]);

  // PTT button up handler
  const stopVoice = useCallback(() => {
    if (!sessionRef.current || !isPTTUserSpeaking) {
      return;
    }

    // Ensure minimum capture time to avoid empty buffer commits
    const MIN_AUDIO_MS = 150;
    const elapsed = Date.now() - (pttStartAtRef.current || 0);
    const waitMs = Math.max(0, MIN_AUDIO_MS - Math.max(0, elapsed));

    setTimeout(async () => {
      // If we still have no sender/track, skip commit to avoid server error
      const track: MediaStreamTrack | undefined = (audioSenderRef.current?.track as any);
      if (!track) {
        console.warn('[SDK] Skipping input_audio_buffer.commit: no local audio track available');
      } else if (!track.enabled) {
        console.warn('[SDK] Skipping input_audio_buffer.commit: track disabled, likely no audio captured');
      } else {
        try {
          sendEventSafe({ type: 'input_audio_buffer.commit' });
          lastPTTCommitAtRef.current = Date.now();
        } catch (err) {
          console.error('[SDK] Failed to commit audio buffer:', err);
        }
      }

      // Only attempt to create a response if we issued a commit
      if (track && track.enabled) {
        try {
          const created = await safeCreateResponse();
          pttCreateAttemptedRef.current = true;
          if (!created) {
            // Retry once after a short delay if not created (e.g., lock/active settling)
            setTimeout(async () => {
              try {
                if (!isResponseActiveRef.current) {
                  await safeCreateResponse();
                }
              } catch (e) {
                console.warn('[SDK] Retry response.create failed:', e);
              }
            }, 250);
          }
        } catch (err) {
          console.error('[SDK] Failed to create response:', err);
        }
      }

      setIsPTTUserSpeaking(false);
      // Re-enable playback for assistant reply (audio element only)
      try { if (audioElementRef.current) { audioElementRef.current.muted = false; audioElementRef.current.play().catch(() => { }); } } catch { }
      // Disable mic track after PTT
      setMicEnabled(false);
    }, waitMs);

    setIsPTTUserSpeaking(false);
    setIsVoiceActive(false);
  }, [isPTTUserSpeaking, onError]);

  // Disconnect session
  const disconnect = useCallback(async () => {
    if (!sessionRef.current) return;

    try {
      const s: any = sessionRef.current as any;

      if (typeof s.disconnect === 'function') {
        s.disconnect();
      } else if (typeof s.close === 'function') {
        s.close();
      } else if (typeof s.transport?.close === 'function') {
        s.transport.close();
      }
      sessionRef.current = null;
      setSession(null);
      setIsConnected(false);
      setIsConnecting(false);
      setIsVoiceActive(false);
      
      // Reset connection attempt flag to allow reconnection
      hasAttemptedConnectionRef.current = false;

      // End the session in the database
      try {
        if (dbSessionIdRef.current) {
          console.log('[SDK] Ending database session:', dbSessionIdRef.current);
          await fetch('http://localhost:3100/api/admin/sessions/' + encodeURIComponent(dbSessionIdRef.current) + '/end', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Tenant-ID': 'acc44cdb-8da5-4226-9569-1233a39f564f'
            }
          });
          console.log('[SDK] Session ended in database:', dbSessionIdRef.current);
        } else {
          console.warn('[SDK] No database session ID to end');
        }
      } catch (err) {
        console.warn('[SDK] Failed to end session in database:', err);
      }
    } catch (err) {
      console.error('[SDK] Failed to disconnect:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  }, [sessionId]);

  // Update session when PTT state changes
  useEffect(() => {
    if (isConnected) {
      updateSession();
    }
  }, [isPTTActive, isConnected, updateSession]);

  useEffect(() => {
    if (selectedAgentName && previousAgentNameRef.current && previousAgentNameRef.current !== selectedAgentName) {
      console.log('[SDK-Realtime] 🎯 Agent change detected (UI only):', {
        from: previousAgentNameRef.current,
        to: selectedAgentName,
        isConnected,
        isConnecting,
        timestamp: new Date().toISOString()
      });

      // The SDK handles agent switching automatically via agent_handoff events
      // We only need to update the UI state here
      console.log('[SDK-Realtime] ✅ Agent change handled by SDK automatically');
    }
    previousAgentNameRef.current = selectedAgentName || '';
  }, [selectedAgentName, isConnected, isConnecting]);

  // Auto-connect when dependencies are ready
  useEffect(() => {
    const snapshot = {
      enabled,
      isConnected,
      isConnecting,
      hasTools: !!(currentAgentConfig?.tools && currentAgentConfig.tools.length > 0),
      agentName: currentAgentConfig?.name || ''
    };
    const last = (window as any).__SDK_RT_AUTO_CONN__ || { key: '' };
    const key = JSON.stringify(snapshot);
    if (last.key !== key) {
      console.log('[SDK-Realtime] Auto-connect check:', snapshot);
      (window as any).__SDK_RT_AUTO_CONN__ = { key };
    }
    
    if (snapshot.enabled && !snapshot.isConnected && !snapshot.isConnecting && snapshot.hasTools) {
      console.log('[SDK-Realtime] 🔄 Auto-connecting with agent:', snapshot.agentName);
      connect();
    }
  }, [enabled, isConnected, isConnecting, currentAgentConfig?.tools?.length, currentAgentConfig?.name, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Mute function for client-side microphone control
  const mute = useCallback((mute: boolean) => {
    try {
      if (sessionRef.current && (sessionRef.current as any).mute) {
        (sessionRef.current as any).mute(mute);
      }
      if (audioElementRef.current) {
        audioElementRef.current.muted = !!mute;
        if (!mute) {
          audioElementRef.current.play().catch(() => { });
        }
      }
    } catch (e) {
      console.warn('[SDK] Failed to toggle mute:', e);
    }
  }, []);

  // Interrupt function
  const interrupt = useCallback(() => {
    if (sessionRef.current) {
      try {
        (sessionRef.current as any).interrupt?.();
      } catch (e) {
        console.warn('[SDK] Failed to interrupt:', e);
      }
    }
  }, []);

  return {
    session,
    isConnected,
    isConnecting,
    error,
    sendMessage,
    startVoice,
    stopVoice,
    disconnect,
    interrupt,
    isVoiceActive,
    isPTTActive,
    setIsPTTActive,
    isPTTUserSpeaking,
    mute,
    markUserInteraction
  };
}