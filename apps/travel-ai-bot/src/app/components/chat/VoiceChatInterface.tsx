"use client";

/**
 * Voice Mode Architecture (no agent wrappers)
 * - Multi-agent session created up front; agent handoff via agent_handoff
 * - session.update() reconfigures active agent without recreation
 * - Single global user interaction gate controls tool execution
 * - PTT/text → transcript → AI response with streaming placeholders
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSDKRealtimeSession } from '@/app/hooks/useSDKRealtimeSession';
import { UniversalMessage } from '@/app/types';
import { useMessageHistory } from './MessageHistory';
import { SpeakerWaveIcon, SpeakerXMarkIcon, UserIcon, CpuChipIcon, UserGroupIcon, TrashIcon, ArrowsRightLeftIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { getOrCreateDbSession, clearCurrentSession } from '@/app/lib/sharedSessionManager';
import { useDbAgentSets } from '@/app/hooks/useDbAgentSets';
// Removed import from deleted agents/index.ts - now using database-driven agents
const allAgentSets = {}; // Fallback empty object
const defaultAgentSetKey = 'default';
import { logMessage as logToDb } from '@/app/lib/loggerClient';
import { getApiUrl } from '@/app/lib/apiHelper';

// Custom microphone icon component
const MicrophoneIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
  </svg>
);

interface VoiceChatInterfaceProps {
  sessionId: string;
  activeChannel: 'normal' | 'realtime' | 'human';
  onChannelSwitch: (channel: 'normal' | 'realtime' | 'human') => void;
  onVoiceResponse: (message: UniversalMessage) => void;
  // Language props
  baseLanguage?: string; // Language from UI selector (en/th)
  // Optional agent override props (for backward compatibility)
  selectedAgentName?: string;
  selectedAgentConfigSet?: any[] | null;
  onAgentTransfer?: (agentName: string) => void;
}

export default function VoiceChatInterface({
  sessionId,
  activeChannel,
  onChannelSwitch,
  onVoiceResponse,
  baseLanguage = 'en', // Default to English
  // Optional agent override props (for backward compatibility)
  selectedAgentName: providedAgentName,
  selectedAgentConfigSet: providedAgentConfigSet,
  onAgentTransfer: providedOnAgentTransfer
}: VoiceChatInterfaceProps) {
  // State to force new session ID when clearing
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);

  const { messages, addMessage, updateMessage, replaceMessageById, replaceLatestSpeechPlaceholder, clearMessages } = useMessageHistory(currentSessionId);

  // Use agent sets passed from parent (ChatInterface) to avoid duplicate API calls
  const dynamicAgentSets = providedAgentConfigSet ? { default: providedAgentConfigSet } : allAgentSets;
  const agentSetsLoading = false; // No loading since we use passed data

  // State for active agent (similar to text mode)
  const [activeAgentSetKeyState, setActiveAgentSetKeyState] = useState<string>(defaultAgentSetKey);
  const [activeAgentNameState, setActiveAgentNameState] = useState<string | null>(providedAgentName || null);

  // Multi-agent approach: Get current agent from pre-loaded agents (no recreation)
  const currentAgent = useMemo(() => {
    const setKey = activeAgentSetKeyState || defaultAgentSetKey;
    const allInSet = dynamicAgentSets[setKey] || [];
    const targetName = activeAgentNameState || (allInSet[0]?.name || 'welcomeAgent');
    const agent = allInSet.find((a: { name: string }) => a.name === targetName) || allInSet[0];
    return agent;
  }, [activeAgentNameState, activeAgentSetKeyState, dynamicAgentSets, providedAgentName]);

  // Get current agent config set
  const selectedAgentConfigSet = useMemo(() => {
    if (providedAgentConfigSet) return providedAgentConfigSet;
    const setKey = activeAgentSetKeyState || defaultAgentSetKey;
    return dynamicAgentSets[setKey] || [];
  }, [providedAgentConfigSet, activeAgentSetKeyState, dynamicAgentSets]);

  // Get current agent name
  const selectedAgentName = activeAgentNameState || (selectedAgentConfigSet[0]?.name || 'default');

  // Render in insertion order; filter out deleted/empty messages (show streaming placeholders)
  const sortedMessages = useMemo(() => {
    return [...messages]
      .filter(m => {
        const meta: any = m.metadata || {};
        const hasContent = (m.content || '').trim().length > 0;
        const isPlaceholder = meta.isStreaming === true || meta.isTranscribing === true;
        return (hasContent || isPlaceholder) && !meta.deleted;
      })
      .map((m) => m);
  }, [messages]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isPTTActive, setIsPTTActive] = useState(false);
  // Realtime connection starts disabled, user activates it first time, then stays enabled
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  // Track whether we've already requested mic permission (prompt only once)
  const [micPermissionRequested, setMicPermissionRequested] = useState(false);
  const [dbSessionId, setDbSessionId] = useState<string>('');
  const getStableSessionId = useCallback(() => {
    const sessionId = dbSessionId || currentSessionId;
    console.log('[VoiceChatInterface] getStableSessionId called:', { dbSessionId, currentSessionId, result: sessionId });
    return sessionId;
  }, [dbSessionId, currentSessionId]);
  // Dedup guards for DB logging
  const loggedUserKeysRef = useRef<Set<string>>(new Set());
  const loggedAssistantKeysRef = useRef<Set<string>>(new Set());
  const shouldLogOnce = useCallback((store: React.MutableRefObject<Set<string>>, key: string) => {
    try {
      const k = key.trim();
      if (!k) return false;
      if (store.current.has(k)) return false;
      // Cap set size to avoid unbounded growth
      if (store.current.size > 200) {
        store.current.clear();
      }
      store.current.add(k);
      return true;
    } catch { return true; }
  }, []);

  // UX placeholders
  const userSpeechPlaceholderIdRef = useRef<string | null>(null);
  const aiPlaceholderIdRef = useRef<string | null>(null);
  // Buffer for early deltas that arrive before placeholder is ready
  const earlyDeltaBufferRef = useRef<string>('');
  // Track if placeholder was created for current response to prevent timeout duplicates
  const placeholderCreatedForCurrentResponseRef = useRef<boolean>(false);
  // Gate for starting AI response placeholders only after explicit user action
  const allowResponseStartRef = useRef<boolean>(false);
  // Timeout for manual AI placeholder creation
  const placeholderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Web Speech API fallback (removed)

  // State for dynamic language - initialized from baseLanguage prop
  const getLanguageCode = (lang: string) => {
    switch (lang) {
      case 'th': return 'th-TH';
      case 'en': return 'en-US';
      case 'vi': return 'vi-VN';
      case 'ja': return 'ja-JP';
      case 'ko': return 'ko-KR';
      case 'zh': return 'zh-CN';
      default: return 'en-US';
    }
  };

  const [currentLanguage, setCurrentLanguage] = useState<string>(() => getLanguageCode(baseLanguage));

  // Sync with base language changes from UI selector
  useEffect(() => {
    const newBaseLanguageCode = getLanguageCode(baseLanguage);
    setCurrentLanguage(newBaseLanguageCode);
  }, [baseLanguage]);

  // Handle browser close/refresh - end session
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (dbSessionId) {
        // Use sendBeacon for reliable delivery even when page is closing
        const formData = new FormData();
        formData.append('tenantId', process.env.TENANT_ID || '00000000-0000-0000-0000-000000000000');
        navigator.sendBeacon(getApiUrl('/api/sessions/' + encodeURIComponent(dbSessionId) + '/end'), formData);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [dbSessionId]);

  // Local speech removed: all transcription comes from server only during PTT

  // Initialize shared database session for voice mode
  useEffect(() => {
    const initializeVoiceSession = async () => {
      try {
        console.log('[VoiceChat] Initializing voice session for frontend ID:', currentSessionId);
        const voiceDbSessionId = await getOrCreateDbSession(currentSessionId, 'voice');
        console.log('[VoiceChat] Got database session ID:', voiceDbSessionId);
        setDbSessionId(voiceDbSessionId);
        // Session initialized silently
      } catch (err) {
        console.error(`[VoiceChat] ❌ Failed to get session, using frontend session:`, err);
        setDbSessionId(currentSessionId);
      }
    };

    initializeVoiceSession();
  }, [currentSessionId]);

  // Reset dedup stores when backend session changes
  useEffect(() => {
    try { loggedUserKeysRef.current.clear(); loggedAssistantKeysRef.current.clear(); } catch {}
  }, [dbSessionId]);


  // Keep a ref to the current messages to avoid stale closure issues
  const messagesRef = useRef<UniversalMessage[]>(messages);

  // Update the ref whenever messages change
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);


  // Generate message ID
  const generateMessageId = () => {
    return crypto.randomUUID().slice(0, 32);
  };

  // Memoize callbacks to prevent re-renders and multiple connections
  const handleSDKMessage = useCallback((message: UniversalMessage) => {
    // Replace placeholder if present; otherwise add
    if (aiPlaceholderIdRef.current) {
      replaceMessageById(aiPlaceholderIdRef.current, message);
      aiPlaceholderIdRef.current = null;
    } else {
      addMessage(message);
    }
    onVoiceResponse(message);
  }, [addMessage, onVoiceResponse, replaceMessageById]);

  // Create AI response placeholder (called from delta handler)
  const handleSDKResponseStart = useCallback(() => {
    // Clear the placeholder timeout since response started properly
    if (placeholderTimeoutRef.current) {
      clearTimeout(placeholderTimeoutRef.current);
      placeholderTimeoutRef.current = null;
    }

    // Create AI streaming placeholder bubble
    try {
      // Remove any stale streaming placeholders
      try {
        const stale = (messagesRef.current || []).filter(m => m.metadata.source === 'ai' && (m.metadata as any)?.isStreaming && !(m.metadata as any)?.deleted);
        stale.forEach(ph => updateMessage({ ...ph, metadata: { ...ph.metadata, deleted: true, isStreaming: false } }));
      } catch { }

      const phId = `ai-stream-${generateMessageId()}`;
      aiPlaceholderIdRef.current = phId;
      // Place after the latest user message like org implementation
      const lastUser = [...(messagesRef.current || [])].filter(m => m.metadata.source === 'user').pop();
      const baseTs = lastUser ? new Date(lastUser.timestamp).getTime() : Date.now();
      const aiTs = new Date(Math.max(baseTs + 150, Date.now())).toISOString();
      // Check if we have any buffered deltas to include
      const initialContent = earlyDeltaBufferRef.current || '';
      if (initialContent) {
        earlyDeltaBufferRef.current = '';
      }

      addMessage({
        id: phId,
        sessionId,
        timestamp: aiTs,
        type: 'text',
        content: initialContent, // Start with buffered content if available
        metadata: {
          source: 'ai',
          channel: 'realtime',
          language: currentLanguage,
          isStreaming: true,
          agentName: currentAgent?.name || selectedAgentName
        } as any
      });
      // Defensive: clear any previous final messages with same id if exist
      setTimeout(() => {
        const dup = (messagesRef.current || []).filter(m => m.id === phId && (m.metadata as any)?.isStreaming !== true);
        dup.forEach(d => updateMessage({ ...d, metadata: { ...d.metadata, deleted: true } }));
      }, 0);

      // Safety: if a final AI message with identical content is added, remove this placeholder
      setTimeout(() => {
        const latestAI = [...(messagesRef.current || [])].reverse().find(m => m.metadata.source === 'ai' && !(m.metadata as any)?.isStreaming && !(m.metadata as any)?.deleted);
        const ph = (messagesRef.current || []).find(m => m.id === phId);
        if (latestAI && ph && (latestAI.content || '').trim() === (ph.content || '').trim() && (latestAI.metadata as any)?.agentName === (ph.metadata as any)?.agentName) {
          updateMessage({ ...ph, metadata: { ...ph.metadata, deleted: true } });
          aiPlaceholderIdRef.current = null;
        }
      }, 50);

      try { setTimeout(() => scrollToBottom(), 0); } catch { }
    } catch (e) {
      console.error('[VoiceChat-UI] ❌ Error creating AI placeholder:', e);
    }
  }, [currentLanguage, selectedAgentName, addMessage, updateMessage]);

  // Create user message bubble from realtime transcript
  const handleSDKTranscript = useCallback((text: string) => {
    const content = (text || '').trim();
    if (!content) {
      return;
    }

    // Find the current transcribing message
    const transcribing = [...(messagesRef.current || [])].reverse().find(m =>
      (m.metadata as any)?.isTranscribing &&
      m.metadata.source === 'user' &&
      !(m.metadata as any)?.deleted
    );

    // If an identical user message already exists recently, skip creating/logging another
    const hasSameUser = [...(messagesRef.current || [])].some(m => m.metadata.source === 'user' && (m.content || '').trim() === content);

    if (transcribing) {
      // Update the existing placeholder with the final text
      updateMessage({
        ...transcribing,
        content,
        metadata: {
          ...transcribing.metadata,
          isTranscribing: false // Mark as no longer transcribing
        }
      });
      userSpeechPlaceholderIdRef.current = null;
      // Log final transcribed user message to DB (shared client) with dedup
      try {
        if (hasSameUser) return;
        const key = `${dbSessionId || currentSessionId}|user|${content}`;
        if (shouldLogOnce(loggedUserKeysRef, key)) {
          logToDb({ sessionId: dbSessionId || currentSessionId, role: 'user', type: 'text', content, channel: 'realtime', meta: { is_internal: false, input: 'voice_transcript' } }).catch(() => {});
        }
      } catch {}
    } else {
      // Create a new message if no placeholder exists
      if (hasSameUser) {
        return;
      }
      const userFinal: UniversalMessage = {
        id: generateMessageId(),
        sessionId,
        timestamp: new Date().toISOString(),
        type: 'text',
        content,
        metadata: {
          source: 'user',
          channel: 'realtime',
          language: currentLanguage
        }
      };
      addMessage(userFinal);
      // Log created user message to DB (shared client) with dedup
      try {
        const key = `${dbSessionId || currentSessionId}|user|${content}`;
        if (shouldLogOnce(loggedUserKeysRef, key)) {
          logToDb({ sessionId: dbSessionId || currentSessionId, role: 'user', type: 'text', content, channel: 'realtime', meta: { is_internal: false, input: 'voice_transcript' } }).catch(() => {});
        }
      } catch {}
    }
  }, [currentLanguage, updateMessage, addMessage]);

  // live delta for user transcription
  const handleSDKTranscriptDelta = useCallback((delta: string) => {
    if (!delta) {
      return;
    }

    // Find existing transcribing message (should already exist from PTT start)
    let transcribing = [...(messagesRef.current || [])].reverse().find(m => (m.metadata as any)?.isTranscribing && m.metadata.source === 'user' && !(m.metadata as any)?.deleted);

    if (!transcribing) {
      return;
    }

    // Update existing message with delta
    const updated: UniversalMessage = {
      ...transcribing as UniversalMessage,
      content: ((transcribing as UniversalMessage).content || '') + delta,
      metadata: { ...((transcribing as UniversalMessage).metadata as any), isTranscribing: true }
    };
    updateMessage(updated);
  }, [updateMessage]);

  const handleSDKError = useCallback((error: Error) => {
    console.error('[VoiceRealtime-RAW] ❌ SDK Error:', error);
    
    // Don't show error to user for common WebRTC/connection issues
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes('WebRTC') || 
        errorMessage.includes('connection') || 
        errorMessage.includes('network') ||
        errorMessage === 'error' ||
        errorMessage === 'Unknown error') {
      console.warn('[VoiceRealtime-RAW] ⚠️ Ignoring common connection error:', errorMessage);
      return;
    }
    
    // Only show meaningful errors to user
    console.error('[VoiceRealtime-RAW] 🚨 User-facing error:', errorMessage);
  }, []);

  // Initialize SDK connection automatically on page load
  const {
    isConnected,
    isConnecting,
    error: sdkError,
    sendMessage: sdkSendMessage,
    startVoice: sdkStartVoice,
    stopVoice: sdkStopVoice,
    disconnect: sdkDisconnect,
    mute: sdkMute,
    markUserInteraction
  } = useSDKRealtimeSession({
    allAgentConfigs: dynamicAgentSets[activeAgentSetKeyState] || [],
    selectedAgentName: currentAgent?.name || selectedAgentName,
    sessionId: dbSessionId || currentSessionId,
    onMessage: handleSDKMessage,
    onTranscript: handleSDKTranscript,
    onTranscriptDelta: handleSDKTranscriptDelta,
    transcriptionLanguage: (currentLanguage || 'en-US').split('-')[0],
    onResponseStart: () => {
      // Only allow if a user-initiated turn requested a response
      if (!allowResponseStartRef.current) {
        return;
      }
      // Consume the gate immediately to prevent duplicate placeholders
      allowResponseStartRef.current = false;
      placeholderCreatedForCurrentResponseRef.current = true;

      // Ensure audio is unmuted for AI response playback
      try { sdkMute?.(false); } catch { }
      // Create AI streaming placeholder bubble
      try {
        // Remove any stale streaming placeholders
        try {
          const stale = (messagesRef.current || []).filter(m => m.metadata.source === 'ai' && (m.metadata as any)?.isStreaming && !(m.metadata as any)?.deleted);
          stale.forEach(ph => updateMessage({ ...ph, metadata: { ...ph.metadata, deleted: true, isStreaming: false } }));
        } catch { }

        const phId = `ai-stream-${generateMessageId()}`;
        aiPlaceholderIdRef.current = phId;
        // Place after the latest user message like org implementation
        const lastUser = [...(messagesRef.current || [])].filter(m => m.metadata.source === 'user').pop();
        const baseTs = lastUser ? new Date(lastUser.timestamp).getTime() : Date.now();
        const aiTs = new Date(Math.max(baseTs + 150, Date.now())).toISOString();
        addMessage({
          id: phId,
          sessionId,
          timestamp: aiTs,
          type: 'text',
          content: '',
          metadata: {
            source: 'ai',
            channel: 'realtime',
            language: currentLanguage,
            isStreaming: true,
            agentName: selectedAgentName
          } as any
        });
        try { setTimeout(() => scrollToBottom(), 0); } catch { }
      } catch { }
    },
    onResponseStartFromDelta: (_agentName?: string) => {
      handleSDKResponseStart();
    },
    onResponseDelta: (delta: string) => {
      // Append delta into the placeholder
      const phId = aiPlaceholderIdRef.current;

      // If no placeholder yet, buffer the delta
      if (!phId) {
        earlyDeltaBufferRef.current += (delta || '');
        return;
      }

      const existing = (messagesRef.current || []).find(m => m.id === phId);
      if (!existing) {
        // Buffer the delta and schedule a short flush once the placeholder arrives
        earlyDeltaBufferRef.current += (delta || '');
        setTimeout(() => {
          const ph = (messagesRef.current || []).find(m => m.id === phId);
          const buffered = earlyDeltaBufferRef.current;
          if (ph && buffered) {
            earlyDeltaBufferRef.current = '';
            updateMessage({
              ...ph,
              content: (ph.content || '') + buffered,
              metadata: { ...ph.metadata, isStreaming: true }
            });
          }
        }, 30);
        return;
      }

      // Process any buffered deltas first
      const bufferedContent = earlyDeltaBufferRef.current;
      if (bufferedContent) {
        earlyDeltaBufferRef.current = '';
      }

      // Merge strategy: some SDKs send full transcript-so-far deltas; others send only the increment.
      // We support both. If the delta (with buffer) starts with existing, treat it as a replacement.
      const currentContent = existing.content || '';
      const incoming = bufferedContent + (delta || '');
      let merged: string;
      if (incoming && (incoming.startsWith(currentContent) || currentContent.length === 0)) {
        // Replacement with the latest full text so far (prevents missing characters in Thai grapheme clusters)
        merged = incoming;
      } else {
        // Fallback to append if it's a true incremental tail
        merged = currentContent + incoming;
      }

      updateMessage({
        ...existing,
        content: merged,
        metadata: { ...existing.metadata, isStreaming: true }
      });
    },
    onResponseDone: (text: string, agentName?: string) => {
      // Clear the placeholder timeout since response is complete
      if (placeholderTimeoutRef.current) {
        clearTimeout(placeholderTimeoutRef.current);
        placeholderTimeoutRef.current = null;
      }

      const phId = aiPlaceholderIdRef.current;
      if (phId) {
        const existing = (messagesRef.current || []).find(m => m.id === phId);
        if (existing) {
          updateMessage({
            ...existing,
            content: text,
            metadata: { ...existing.metadata, isStreaming: false, agentName: agentName || existing.metadata.agentName }
          });
          aiPlaceholderIdRef.current = null;
        } else {
          // Placeholder missing; fall back to creating a final AI message
          addMessage({
            id: `ai-final-${generateMessageId()}`,
            sessionId,
            timestamp: new Date().toISOString(),
            type: 'text',
            content: text,
            metadata: {
              source: 'ai',
              channel: 'realtime',
              language: currentLanguage,
              isStreaming: false,
              agentName: agentName || currentAgent?.name || selectedAgentName
            } as any
          });
          // Schedule cleanup to hide any late-arriving placeholder with phId
          setTimeout(() => {
            const late = (messagesRef.current || []).find(m => m.id === phId);
            if (late) {
              updateMessage({ ...late, metadata: { ...late.metadata, deleted: true, isStreaming: false } });
            }
          }, 50);
          aiPlaceholderIdRef.current = null;
        }
        // Dedup: If there is another final AI message with identical content just added (from fallback), remove duplicates
        setTimeout(() => {
          const finals = (messagesRef.current || []).filter(m => m.metadata.source === 'ai' && !(m.metadata as any)?.isStreaming && !(m.metadata as any)?.deleted && (m.content || '').trim() === text.trim());
          if (finals.length > 1) {
            // Keep the earliest, delete later ones
            finals.slice(1).forEach(m => updateMessage({ ...m, metadata: { ...m.metadata, deleted: true } }));
          }
        }, 60);
      } else {
        // No placeholder created; create a final AI message directly
        addMessage({
          id: `ai-final-${generateMessageId()}`,
          sessionId,
          timestamp: new Date().toISOString(),
          type: 'text',
          content: text,
          metadata: {
            source: 'ai',
            channel: 'realtime',
            language: currentLanguage,
            isStreaming: false,
            agentName: agentName || currentAgent?.name || selectedAgentName
          } as any
        });
      }
      // Log assistant final reply to DB (shared client) with dedup
      try {
        const key = `${dbSessionId || currentSessionId}|assistant|${(text || '').trim()}`;
        if (shouldLogOnce(loggedAssistantKeysRef, key)) {
          logToDb({ sessionId: dbSessionId || currentSessionId, role: 'assistant', type: 'text', content: (text || '').trim(), channel: 'realtime', meta: { agentName: agentName || currentAgent?.name || selectedAgentName } }).catch(() => {});
        }
      } catch {}
      // Reset placeholder flag when response is done
      placeholderCreatedForCurrentResponseRef.current = false;
    },
    onError: handleSDKError,
    onAgentTransfer: (agentName: string) => {
      // Keep realtime enabled during agent transfers for seamless experience
      if (!realtimeEnabled) {
        setRealtimeEnabled(true);
      }

      providedOnAgentTransfer?.(agentName);
    },
    // Connect when agent is ready and either not initialized yet OR agent has changed
    enabled: realtimeEnabled && !!currentAgent && !agentSetsLoading,
    acceptResponses: realtimeEnabled, // do not emit any responses until user interacts
    muteAudio: !isAudioEnabled, // mute audio only when user explicitly disables it
    shouldAcceptResponseStart: () => allowResponseStartRef.current,
    onUserVoiceItemCreated: (initialText?: string) => {
      // If our latest user speech placeholder exists and is empty, set transcribing text
      const transcribing = [...(messagesRef.current || [])].reverse().find(m => (m.metadata as any)?.isTranscribing && m.metadata.source === 'user' && !(m.metadata as any)?.deleted);
      if (transcribing && !((transcribing.content || '').trim().length > 0)) {
        const nextContent = (initialText && initialText.trim().length > 0) ? initialText : '[Transcribing...]';
        updateMessage({
          ...transcribing,
          content: nextContent,
          metadata: { ...transcribing.metadata, isTranscribing: true }
        });
      }
    },
    // Pass agent management props for function call execution
    dynamicAgentSets,
    activeAgentSetKeyState,
    setActiveAgentSetKeyState,
    setActiveAgentNameState,
    messages
  });



  // Map SDK states to existing interface
  const sessionStatus = isConnecting ? 'CONNECTING' : isConnected ? 'CONNECTED' : 'DISCONNECTED';

  // Ensure audio is properly unmuted when connected
  useEffect(() => {
    console.log('[VoiceChatInterface] Audio state changed:', {
      sessionStatus,
      isAudioEnabled,
      muteAudio: !isAudioEnabled
    });
    
    if (sessionStatus === 'CONNECTED' && isAudioEnabled) {
      console.log('[VoiceChatInterface] Connection established, ensuring audio is unmuted...');
      try { sdkMute?.(false); } catch { }
    }
  }, [sessionStatus, isAudioEnabled, sdkMute]);

  // Log session ID changes for debugging
  useEffect(() => {
    console.log('[VoiceChatInterface] Session ID changed:', {
      currentSessionId,
      dbSessionId,
      stableSessionId: getStableSessionId()
    });
  }, [currentSessionId, dbSessionId, getStableSessionId]);

  // Update SDK hook's database session ID when it changes
  useEffect(() => {
    if (dbSessionId && dbSessionId !== currentSessionId) {
      console.log('[VoiceChatInterface] Updating SDK hook database session ID:', dbSessionId);
      // Force the SDK hook to use the new database session ID
      // This is a workaround since the SDK hook doesn't expose a way to update its dbSessionIdRef
      // We'll rely on the sessionId parameter we pass to the hook
    }
  }, [dbSessionId, currentSessionId]);

  // Handle push-to-talk
  const handlePTTStart = useCallback(async () => {
    // Mark user interaction to enable tool execution (including transferAgents)
    markUserInteraction();

    // Request microphone permission on first PTT (user gesture), but do not keep stream open
    if (!micPermissionRequested && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        try { stream.getTracks().forEach(t => t.stop()); } catch { }
        setMicPermissionRequested(true);
      } catch (err) {
        console.warn('[VoiceChat] ⚠️ Microphone permission denied or unavailable', err);
        return; // Do not proceed without permission
      }
    }

    // Local speech removed

    // Enable realtime on first user interaction and keep it enabled
    if (!realtimeEnabled) {
      setRealtimeEnabled(true);
    }

    if (sessionStatus === 'CONNECTED') {
      setIsPTTActive(true);

      // Create user placeholder message immediately when PTT is pressed
      try {
        const existing = [...(messagesRef.current || [])].reverse().find(m => (m.metadata as any)?.isTranscribing && m.metadata.source === 'user' && !(m.metadata as any)?.deleted);
        if (!existing) {
          const placeholderId = `speech-${generateMessageId()}`;
          userSpeechPlaceholderIdRef.current = placeholderId;
          const placeholder: UniversalMessage = {
            id: placeholderId,
            sessionId,
            timestamp: new Date().toISOString(),
            type: 'text',
            content: '[Transcribing...]',
            metadata: {
              source: 'user',
              channel: 'realtime',
              language: currentLanguage,
              isTranscribing: true
            }
          };
          addMessage(placeholder);
        }
      } catch (e) {
        console.warn('[VoiceChat] ⚠️ Placeholder creation failed on PTT start', e);
      }

      try {
        await sdkStartVoice();
      } catch (error) {
        console.error('[VoiceChat] ❌ Error starting voice:', error);
      }
      // Do not restart local speech fallback automatically
    }
  }, [sessionStatus, sdkStartVoice, realtimeEnabled, micPermissionRequested, currentLanguage, addMessage]);

  const handlePTTEnd = useCallback(() => {
    if (isPTTActive) {
      setIsPTTActive(false);

      // Allow one AI response placeholder to start for this turn
      allowResponseStartRef.current = true;

      try {
        sdkStopVoice();
      } catch (error) {
        console.error('[VoiceChat] ❌ Error stopping voice:', error);
      }
      // Local speech removed: no browser-side finalization

      // Fallback: if response.created doesn't arrive quickly, create a placeholder early
      if (placeholderTimeoutRef.current) {
        clearTimeout(placeholderTimeoutRef.current);
        placeholderTimeoutRef.current = null;
      }
      placeholderTimeoutRef.current = setTimeout(() => {
        if (allowResponseStartRef.current && !placeholderCreatedForCurrentResponseRef.current) {
          const existingAI = (messagesRef.current || []).find(m =>
            m.metadata.source === 'ai' &&
            (m.metadata as any)?.isStreaming &&
            !(m.metadata as any)?.deleted
          );
          if (existingAI) {
            allowResponseStartRef.current = false;
            return;
          }
          try {
            const phId = `ai-stream-${generateMessageId()}`;
            aiPlaceholderIdRef.current = phId;
            const lastUser = [...(messagesRef.current || [])].filter(m => m.metadata.source === 'user').pop();
            const baseTs = lastUser ? new Date(lastUser.timestamp).getTime() : Date.now();
            const aiTs = new Date(Math.max(baseTs + 150, Date.now())).toISOString();
            addMessage({
              id: phId,
              sessionId,
              timestamp: aiTs,
              type: 'text',
              content: '',
              metadata: {
                source: 'ai',
                channel: 'realtime',
                language: currentLanguage,
                isStreaming: true,
                agentName: currentAgent?.name || selectedAgentName
              } as any
            });
            allowResponseStartRef.current = false;
            placeholderCreatedForCurrentResponseRef.current = true;
          } catch (e) {
            console.error('[VoiceChat-UI] ❌ Error creating PTT fallback AI placeholder:', e);
          }
        }
      }, 200);
    }
  }, [isPTTActive, sdkStopVoice, currentLanguage, replaceLatestSpeechPlaceholder]);

  // Handle text input in voice mode (fallback)
  const handleTextInput = useCallback(async (text: string) => {
    if (text.trim()) {
      // Mark user interaction to enable tool execution (including transferAgents)
      markUserInteraction();

      // Enable realtime on first user interaction and keep it enabled
      if (!realtimeEnabled) {
        setRealtimeEnabled(true);
      }

      // Reset and open a gate to allow a single AI placeholder on response start
      allowResponseStartRef.current = true;
      placeholderCreatedForCurrentResponseRef.current = false; // Reset for new response

      // Send message via SDK (only if connected) - SDK will handle user message creation
      try {
        await sdkSendMessage(text.trim());

        // Clear any existing timeout
        if (placeholderTimeoutRef.current) {
          clearTimeout(placeholderTimeoutRef.current);
          placeholderTimeoutRef.current = null;
        }

        // Set a short timeout to create AI placeholder if response.created doesn't fire
        placeholderTimeoutRef.current = setTimeout(() => {
          if (allowResponseStartRef.current && !placeholderCreatedForCurrentResponseRef.current) {
            // Check if there's already an AI placeholder to avoid duplicates
            const existingAI = (messagesRef.current || []).find(m =>
              m.metadata.source === 'ai' &&
              (m.metadata as any)?.isStreaming &&
              !(m.metadata as any)?.deleted
            );

            if (existingAI) {
              allowResponseStartRef.current = false; // Consume the flag
              return;
            }

            // Manually trigger response start if it hasn't happened
            try {
              // Create AI placeholder directly
              const phId = `ai-stream-${generateMessageId()}`;
              aiPlaceholderIdRef.current = phId;

              const lastUser = [...(messagesRef.current || [])].filter(m => m.metadata.source === 'user').pop();
              const baseTs = lastUser ? new Date(lastUser.timestamp).getTime() : Date.now();
              const aiTs = new Date(Math.max(baseTs + 150, Date.now())).toISOString();

              addMessage({
                id: phId,
                sessionId,
                timestamp: aiTs,
                type: 'text',
                content: '',
                metadata: {
                  source: 'ai',
                  channel: 'realtime',
                  language: currentLanguage,
                  isStreaming: true,
                  agentName: currentAgent?.name || selectedAgentName
                } as any
              });

              allowResponseStartRef.current = false; // Consume the flag
              placeholderCreatedForCurrentResponseRef.current = true; // Mark as created
            } catch (e) {
              console.error('[VoiceChat-UI] ❌ Error creating manual AI placeholder:', e);
            }
          }
        }, 200); // 200ms timeout for text submit
      } catch (error) {
        console.error('[VoiceRealtime-RAW] ❌ SDK Send error:', error);
        // Reset flag on error to allow retry
        allowResponseStartRef.current = true;
      }

      // Do not log here to avoid duplicate with SDK hook; SDK will log the user message
    }
  }, [sdkSendMessage, dbSessionId, realtimeEnabled]);


  // Get channel info
  const getChannelInfo = (channel: string) => {
    switch (channel) {
      case 'normal':
        return { name: 'Text Chat', icon: ChatBubbleLeftRightIcon, color: 'blue' };
      case 'realtime':
        return { name: 'Voice Chat', icon: MicrophoneIcon, color: 'green' };
      case 'human':
        return { name: 'Human Support', icon: UserGroupIcon, color: 'purple' };
      default:
        return { name: 'Unknown', icon: CpuChipIcon, color: 'gray' };
    }
  };

  // Format message time
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending placeholder timeout
      if (placeholderTimeoutRef.current) {
        clearTimeout(placeholderTimeoutRef.current);
        placeholderTimeoutRef.current = null;
      }
    };
  }, []);

  // Show loading state while agents are being loaded from database
  if (agentSetsLoading) {
    return (
      <div className="flex flex-col h-full min-h-0 bg-white rounded-lg shadow border border-gray-200">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-lg font-medium text-gray-600">Loading Voice Chat...</p>
            <p className="text-sm text-gray-500">Initializing AI agents from database</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if no agent is available after loading is complete
  if (!currentAgent) {
    return (
      <div className="flex flex-col h-full min-h-0 bg-white rounded-lg shadow border border-gray-200">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-lg font-medium text-red-600">No Agent Available</p>
            <p className="text-sm text-gray-500">Unable to load AI agent configuration</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-white rounded-lg shadow border border-gray-200">
      {/* Chat Header with Channel Switching */}
      <div className="flex items-center justify-between p-4 border-b border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${activeChannel === 'normal' ? 'bg-orange-700' :
              activeChannel === 'realtime' ? 'bg-orange-700' :
                'bg-orange-700'
            }`}></div>
          <h3 className="font-medium text-gray-800">
            {getChannelInfo(activeChannel).name}
          </h3>
          {/* Status hidden in header per design */}
        </div>

        {/* Channel Switch Buttons and Actions */}
        <div className="flex space-x-2">
          {/* Clear messages button */}
          {messages.length > 0 && (
            <button
              onClick={async () => {
                try { if (!confirm('Clear all messages and start a new voice session?')) return; } catch { return; }
                
                // End the current session in the database
                try {
                  console.log('[VoiceChatInterface] Trash button clicked');
                  console.log('[VoiceChatInterface] currentSessionId:', currentSessionId);
                  console.log('[VoiceChatInterface] dbSessionId:', dbSessionId);
                  console.log('[VoiceChatInterface] dbSessionId type:', typeof dbSessionId);
                  
                  if (dbSessionId && dbSessionId !== currentSessionId) {
                    console.log('[VoiceChatInterface] Calling session end API for database session:', dbSessionId);
                    const response = await fetch(getApiUrl('/api/sessions/' + encodeURIComponent(dbSessionId) + '/end'), {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'X-Tenant-ID': process.env.TENANT_ID || '00000000-0000-0000-0000-000000000000'
                      }
                    });
                    const result = await response.json();
                    console.log('[VoiceChatInterface] Session end API response:', response.status, result);
                    if (response.ok) {
                      console.log('[VoiceChatInterface] Current session ended successfully:', dbSessionId);
                    } else {
                      console.error('[VoiceChatInterface] Failed to end session:', result);
                    }
                  } else {
                    console.warn('[VoiceChatInterface] No valid dbSessionId to end. dbSessionId:', dbSessionId, 'currentSessionId:', currentSessionId);
                  }
                } catch (err) {
                  console.error('[VoiceChatInterface] Failed to end current session:', err);
                }
                
                clearMessages();
                try { clearCurrentSession(); } catch {}
                
                // Clear dedup keys for new session
                loggedUserKeysRef.current.clear();
                loggedAssistantKeysRef.current.clear();
                console.log('[VoiceChatInterface] Cleared dedup keys for new session');
                
                // Reset realtime state to allow reconnection
                console.log('[VoiceChatInterface] Resetting realtime state...');
                setRealtimeEnabled(false);
                setIsPTTActive(false);
                
                // Ensure audio is enabled for the new session
                setIsAudioEnabled(true);
                
                // Disconnect SDK first to reset state
                console.log('[VoiceChatInterface] Disconnecting SDK to reset state...');
                try { sdkDisconnect?.(); } catch {}
                
                // Small delay to ensure state is reset
                console.log('[VoiceChatInterface] Waiting for state reset...');
                await new Promise(resolve => setTimeout(resolve, 100));
                console.log('[VoiceChatInterface] State reset complete, creating new session...');
                
                const newSessionId = crypto.randomUUID();
                console.log('[VoiceChatInterface] Creating new session ID:', newSessionId);
                setCurrentSessionId(newSessionId);
                try {
                  const newDbId = await getOrCreateDbSession(newSessionId, 'voice');
                  console.log('[VoiceChatInterface] New database session ID:', newDbId);
                  setDbSessionId(newDbId);
                } catch (err) {
                  console.error('[VoiceChatInterface] Failed to create database session, using frontend ID:', err);
                  setDbSessionId(newSessionId);
                }
                // Reset active agent selection to defaults/props
                console.log('[VoiceChatInterface] Resetting agent state...');
                setActiveAgentSetKeyState(defaultAgentSetKey);
                setActiveAgentNameState(providedAgentName || null);
                
                // Wait a bit for agent state to be updated
                await new Promise(resolve => setTimeout(resolve, 50));
              }}
              className="p-2 rounded-md bg-white text-gray-400 hover:text-red-600 transition-colors"
              title="Clear all messages and start a new session"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}

          {/* Audio toggle */}
          <button
            onClick={() => { setIsAudioEnabled(!isAudioEnabled); try { sdkMute?.(isAudioEnabled); } catch { } }}
            className={`p-2 rounded-md border transition-colors ${isAudioEnabled
                ? 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200'
                : 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
              }`}
            title={isAudioEnabled ? 'Mute audio' : 'Enable audio'}
          >
            {isAudioEnabled ? (
              <SpeakerWaveIcon className="w-4 h-4" />
            ) : (
              <SpeakerXMarkIcon className="w-4 h-4" />
            )}
          </button>

          {/* Channel Switch Buttons */}
          {(() => {
            const HUMAN_MODE_ENABLED = typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_HUMAN_MODE_ENABLED === 'true');
            const channelOptions = (HUMAN_MODE_ENABLED ? (['normal', 'realtime', 'human'] as const) : (['normal', 'realtime'] as const));
            return channelOptions.map((channel) => {
            const info = getChannelInfo(channel);
            const Icon = info.icon;
            return (
              <button
                key={channel}
                onClick={() => onChannelSwitch(channel)}
                className={`p-2 rounded-md transition-colors border ${activeChannel === channel
                    ? 'bg-orange-100 text-orange-800 border-orange-300'
                    : 'bg-white/80 text-amber-700 border-orange-200 hover:text-orange-800 hover:bg-orange-50'
                  }`}
                title={`Switch to ${info.name}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
            });
          })()}
        </div>
      </div>

      {/* Messages Area fills remaining height */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4"
      >
        {sortedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-amber-800" style={{ minHeight: '300px' }}>
            <div className="text-4xl mb-4">
              <MicrophoneIcon className="w-16 h-16 mx-auto text-amber-600" />
            </div>
            <p className="text-lg font-medium mb-2 text-orange-900">Voice Chat Mode</p>
            <p className="text-sm text-center text-amber-800 mb-4">
              {sessionStatus === 'CONNECTED'
                ? 'Hold the microphone button to speak or type a message below'
                : 'Connecting to voice service...'
              }
            </p>
          </div>
        ) : (
          sortedMessages.map((message) => (
            <div
              key={message.id}
              id={`msg-${message.id}`}
              data-message-id={message.id}
              data-source={message.metadata.source}
              data-channel={message.metadata.channel}
              data-is-transcribing={String((message.metadata as any)?.isTranscribing || false)}
              data-is-streaming={String((message.metadata as any)?.isStreaming || false)}
              data-deleted={String((message.metadata as any)?.deleted || false)}
              className={`flex items-start space-x-3 ${message.metadata.source === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              title={`id=${message.id}`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.metadata.source === 'user'
                  ? 'bg-gradient-to-br from-orange-600 to-red-700 text-white'
                  : message.metadata.source === 'ai'
                    ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white'
                    : 'bg-gradient-to-br from-neutral-600 to-stone-700 text-white'
                }`}>
                {message.metadata.source === 'user' ? (
                  <UserIcon className="w-4 h-4" />
                ) : message.metadata.source === 'ai' ? (
                  <MicrophoneIcon className="w-4 h-4" />
                ) : (
                  <UserGroupIcon className="w-4 h-4" />
                )}
              </div>

              {/* Message Bubble */}
              <div className={`flex-1 max-w-xs lg:max-w-md ${message.metadata.source === 'user' ? 'text-right' : 'text-left'
                }`}>
                <div
                  id={`bubble-${message.id}`}
                  data-bubble-id={message.id}
                  className={`inline-block p-3 rounded-lg relative ${message.metadata.source === 'user'
                      ? 'bg-gradient-to-br from-orange-600 to-red-700 text-white'
                      : message.type === 'system'
                        ? 'bg-gradient-to-br from-amber-50 to-orange-100 text-amber-900 border border-amber-200'
                        : 'bg-gradient-to-br from-orange-50 to-amber-100 text-orange-900 border border-orange-200'
                    }`}
                >
                  {message.metadata?.mappedFrom?.startsWith('agent-transfer:') && (
                    <div className="absolute -top-4 left-0 flex items-center space-x-1 text-amber-900">
                      <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{message.metadata.mappedFrom.split(':')[1] || 'agent'}</span>
                    </div>
                  )}
                  {((message.metadata as any)?.isStreaming || (message.metadata as any)?.isTranscribing) ? (
                    <div>
                      {(message.content || '').trim().length > 0 && (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                      <div className="flex items-center space-x-1 mt-1" aria-label="loading">
                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#a16207', animation: 'vcPulse 1s infinite' }} />
                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#a16207', animation: 'vcPulse 1s infinite', animationDelay: '0.15s' }} />
                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#a16207', animation: 'vcPulse 1s infinite', animationDelay: '0.3s' }} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                  {/* Channel icon inline with timestamp (handled below) */}
                </div>
                <div className={`text-xs text-amber-700 mt-1 ${message.metadata.source === 'user' ? 'text-right' : 'text-left'}`}>
                  {formatTime(message.timestamp)}
                  {(() => {
                    const ch = (message.metadata as any)?.channel || 'realtime';
                    return (
                      <span className="inline-block ml-1 align-text-bottom">
                        {ch === 'realtime' ? (
                          <MicrophoneIcon className="w-3.5 h-3.5 inline" />
                        ) : (
                          <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 inline" />
                        )}
                      </span>
                    );
                  })()}
                  {message.metadata.agentName && (
                    <span className="ml-2 text-amber-600">• {message.metadata.agentName}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Controls */}
      <div className="p-4 border-t border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
        {(() => {
          const isEnabled = sessionStatus === 'CONNECTED';
          // More forgiving condition: allow connection if we're disconnected and not in realtime mode
          // even if currentAgent is not immediately available (it will be loaded shortly)
          const canConnect = !realtimeEnabled && sessionStatus === 'DISCONNECTED' && (!agentSetsLoading);
          
          // Debug logging for button state
          // console.log('[VoiceChatInterface] Button state:', {
          //   sessionStatus,
          //   realtimeEnabled,
          //   currentAgent: !!currentAgent,
          //   agentSetsLoading,
          //   isEnabled,
          //   canConnect
          // });
          
          return (
            <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: 120 }}>
              <button
                onMouseDown={isEnabled ? handlePTTStart : undefined}
                onMouseUp={isEnabled ? handlePTTEnd : undefined}
                onTouchStart={isEnabled ? handlePTTStart : undefined}
                onTouchEnd={isEnabled ? handlePTTEnd : undefined}
                onClick={() => {
                  // Always mark user interaction on any button click
                  markUserInteraction();

                  // Handle connect logic if needed
                  if (canConnect) {
                    console.log('[VoiceChatInterface] Connect button clicked, enabling realtime...');
                    console.log('[VoiceChatInterface] Current state before connect:', {
                      sessionStatus,
                      realtimeEnabled,
                      currentAgent: !!currentAgent,
                      agentSetsLoading,
                      isConnected,
                      isConnecting
                    });
                    setRealtimeEnabled(true);
                  } else {
                    console.log('[VoiceChatInterface] Connect button clicked but canConnect is false:', {
                      sessionStatus,
                      realtimeEnabled,
                      currentAgent: !!currentAgent,
                      agentSetsLoading,
                      canConnect
                    });
                  }
                }}
                aria-disabled={!isEnabled && !canConnect}
                className={`w-16 h-16 rounded-full border-4 transition-all duration-200 ${!isEnabled && !canConnect
                    ? 'bg-gray-100 border-gray-200 text-gray-400'
                    : !isEnabled && canConnect
                      ? 'bg-amber-100 border-amber-200 text-amber-600 hover:bg-amber-200 hover:scale-105'
                      : isPTTActive
                        ? 'bg-red-600 border-red-700 scale-110 shadow-lg'
                        : 'bg-orange-600 border-orange-700 hover:bg-orange-700 hover:scale-105'
                  }`}
                title={isEnabled ? 'Hold to talk' : (canConnect ? 'Click to connect' : (sessionStatus === 'CONNECTING' ? 'Connecting…' : 'Not ready'))}
              >
                <MicrophoneIcon className={`w-6 h-6 mx-auto ${!isEnabled ? 'text-amber-600' : 'text-white'}`} />
              </button>
              <p className="text-sm font-medium text-orange-900">
                {!isEnabled
                  ? (canConnect ? 'Click to connect' : (sessionStatus === 'CONNECTING' ? 'Connecting…' : 'Not ready'))
                  : 'Press hold to talk'
                }
              </p>
            </div>
          );
        })()}
      </div>

      {/* Text Input */}
      <div className="p-4 border-t border-orange-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.textInput;
            if (input.value.trim()) {
              handleTextInput(input.value);
              input.value = '';
            }
          }}
          className="flex space-x-3"
        >
          <input
            name="textInput"
            type="text"
            placeholder={sessionStatus === 'CONNECTED' ? "Type a message or use voice..." : "Connecting to voice service..."}
            disabled={sessionStatus !== 'CONNECTED'}
            className="flex-1 px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent disabled:bg-amber-100 disabled:cursor-not-allowed disabled:text-amber-700 text-orange-900 placeholder-amber-600"
          />
          <button
            type="submit"
            disabled={sessionStatus !== 'CONNECTED'}
            className="px-4 py-2 bg-gradient-to-r from-orange-700 to-red-800 text-white rounded-lg hover:from-orange-800 hover:to-red-900 focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>

        {/* Status */}
        <div className="mt-2 text-xs text-amber-800 flex items-center justify-between">
          <span>
            Voice Chat • <span className={sessionStatus === 'CONNECTED' ? 'text-green-700 font-medium' : ''}>{sessionStatus === 'CONNECTED' ? 'Ready' : 'Connecting...'}</span>
          </span>
          <span className="sr-only">{sessionStatus === 'CONNECTED' ? 'Voice ready' : 'Voice connecting'}</span>
        </div>
      </div>

      <style>{`
        @keyframes vcPulse {
          0% { opacity: .25; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-1px); }
          100% { opacity: .25; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
} 