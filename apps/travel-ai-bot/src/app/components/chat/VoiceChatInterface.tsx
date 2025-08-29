"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useWebRTCConnection } from '@/app/hooks/useWebRTCConnection';
import { UniversalMessage } from '@/app/types';
import { useMessageHistory } from './MessageHistory';
import { MicrophoneIcon, SpeakerWaveIcon, SpeakerXMarkIcon, UserIcon, CpuChipIcon, UserGroupIcon, TrashIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
// import { useHandleServerEvent } from '@/app/hooks/useHandleServerEvent';
import { ALL_HANDLERS } from '@/app/agents/core/functions';
// Removed useConversationLogger - we only use PostgreSQL now, not Elasticsearch/file
import { extractTokenUsage } from '@/app/lib/extractTokenUsage';
import { getOrCreateDbSession, getCurrentDbSessionId } from '@/app/lib/sharedSessionManager';

// Voice/realtime model constants for logging
const VOICE_MODEL = 'gpt-4o-realtime-preview-2025-06-03';
const TRANSCRIPTION_MODEL = 'whisper-1';
// Debug flag to gate verbose logging
const DEBUG_VOICE = typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_DEBUG_VOICE === 'true';

interface VoiceChatInterfaceProps {
  sessionId: string;
  activeChannel: 'normal' | 'realtime' | 'human';
  onChannelSwitch: (channel: 'normal' | 'realtime' | 'human') => void;
  onVoiceResponse: (message: UniversalMessage) => void;
  // Agent integration props
  selectedAgentName?: string;
  selectedAgentConfigSet?: any[] | null;
  onAgentTransfer?: (agentName: string) => void;
  // Language props
  baseLanguage?: string; // Language from UI selector (en/th)
}

export default function VoiceChatInterface({ 
  sessionId, 
  activeChannel,
  onChannelSwitch,
  onVoiceResponse,
  selectedAgentName = 'GPT-4o Voice',
  selectedAgentConfigSet = null,
  onAgentTransfer,
  baseLanguage = 'en' // Default to English
}: VoiceChatInterfaceProps) {
  console.log(`[VoiceChat-LANGUAGE] 🏁 Component initialized with baseLanguage: ${baseLanguage}`);
  const { messages, addMessage, updateMessage, addOrUpdateMessage, replaceMessageById, replaceLatestSpeechPlaceholder, clearMessages } = useMessageHistory(sessionId);
  
  // Render in insertion order; filter out deleted/empty messages (show streaming placeholders)
  const sortedMessages = useMemo(() => {
    return [...messages]
      .filter(m => 
        m.content.trim() && 
        !(m.metadata as any)?.deleted
      )
      .map((m) => m);
  }, [messages]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isPTTActive, setIsPTTActive] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');
  const [dbSessionId, setDbSessionId] = useState<string>('');
  // Removed Elasticsearch/file logging - we only use PostgreSQL database now
  // Track latency timings
  const lastResponseCreateTsRef = useRef<number | null>(null);
  const lastAudioCommitTsRef = useRef<number | null>(null);
  
  // Add duplicate transcription detection
  const processedTranscripts = useRef<Set<string>>(new Set());
  const lastTranscriptTime = useRef<number>(0);
  
  // Add unified message ID system to prevent duplicates
  const processedAIResponses = useRef<Set<string>>(new Set());
  // Prevent duplicate DB logs for the same voice item across different events (delta vs completed)
  const loggedAudioItemIdsRef = useRef<Set<string>>(new Set());
  // Track which user itemIds we've persisted to backend
  const loggedUserItemIdsRef = useRef<Set<string>>(new Set());
  const currentStreamingMessageId = useRef<string | null>(null);
  const streamingContent = useRef<string>('');
  const lastUserMessageTimestampRef = useRef<number>(0);
  const currentStreamSeqRef = useRef<number>(0);
  const messageSequenceRef = useRef<number>(0);
  const activeTurnKeyRef = useRef<string | null>(null);
  const placeholderTurnKeyRef = useRef<string | null>(null);
  const aiItemIdsWithPlaceholderRef = useRef<Set<string>>(new Set());
  // Map additional AI item ids to a single visible bubble to avoid duplicates
  const aiItemAliasRef = useRef<Record<string, string>>({});
  // Track the single visible bubble for the current response
  const currentResponseBubbleIdRef = useRef<string | null>(null);
  // When set, annotate next assistant bubble as coming from a transfer to this agent
  const pendingAgentForNextAssistantRef = useRef<string | null>(null);
  // Persist the last agent name injected into the realtime session
  const lastInjectedAgentNameRef = useRef<string | null>(null);
  // PTT-turn refs
  const pttTurnIdRef = useRef<string | null>(null);
  const pttHadAudioRef = useRef<boolean>(false);
  const turnUserItemIdRef = useRef<string | null>(null);
  const isResponseActiveRef = useRef<boolean>(false);

  // Initialize shared database session for voice mode
  useEffect(() => {
    const initializeVoiceSession = async () => {
      try {
        const voiceDbSessionId = await getOrCreateDbSession(sessionId, 'voice');
        setDbSessionId(voiceDbSessionId);
        console.log(`[VoiceChat] ✅ Using session: ${voiceDbSessionId} for voice mode`);
      } catch (err) {
        console.warn(`[VoiceChat] ❌ Failed to get session, using frontend session:`, err);
        setDbSessionId(sessionId);
      }
    };
    
    initializeVoiceSession();
  }, []); // Only run once on mount

  // Ensure we always have a valid DB session id before logging
  const ensureDbSessionId = async (): Promise<string | null> => {
    try {
      if (dbSessionId && dbSessionId.trim() !== '') return dbSessionId;
      const existing = getCurrentDbSessionId();
      if (existing && existing.trim() !== '') {
        setDbSessionId(existing);
        return existing;
      }
      const created = await getOrCreateDbSession(sessionId, 'voice');
      setDbSessionId(created);
      return created;
    } catch (e) {
      console.warn('[VoiceChat] ⚠️ ensureDbSessionId failed, will skip logging', e);
      return null;
    }
  };

  // Helper function to log messages to database (same format as text mode)
  const logMessageToDatabase = async (messageData: {
    role: 'user' | 'assistant' | 'system';
    type: 'text' | 'audio';
    content: string;
    channel: string;
    content_tokens?: number | null;
    response_tokens?: number | null;
    total_tokens?: number | null;
    model?: string | null;
    latency_ms?: number | null;
    meta?: any;
  }) => {
    const sid = await ensureDbSessionId();
    if (!sid) return;

    try {
      console.log(`[VoiceChat] 📝 Logging ${messageData.role} message to database with session: ${sid}`);
      await fetch('/api/log/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sid,
          ...messageData
        })
      });
    } catch (err) {
      console.warn(`[VoiceChat] ❌ Failed to log message to database:`, err);
    }
  };

  const activeTranscriptionIdRef = useRef<string | null>(null);
  
  // Track created message IDs to prevent processing events for non-existent messages
  const createdMessageIds = useRef<Set<string>>(new Set());
  
  // Keep a ref to the current messages to avoid stale closure issues
  const messagesRef = useRef<UniversalMessage[]>(messages);
  
  // Debounce mechanism to prevent duplicate conversation.item.created events
  const lastConversationItemTime = useRef<number>(0);
  const CONVERSATION_ITEM_DEBOUNCE_MS = 1000; // 1 second debounce
  
  // Update the ref whenever messages change
  useEffect(() => {
    messagesRef.current = messages;
    console.log(`[VoiceChat-TRACK] 🔄 Messages ref updated, count: ${messages.length}, IDs: [${messages.map(m => m.id).join(', ')}]`);
  }, [messages]);

  

  // Generate message ID
  const generateMessageId = () => {
    return crypto.randomUUID().slice(0, 32);
  };

  // Language detection function
  const detectLanguage = (text: string): string => {
    if (!text || text.trim() === '') return 'auto';
    
    const cleanText = text.trim();
    console.log(`[VoiceChat] Detecting language for: "${cleanText}"`);
    
    // Thai language patterns (more comprehensive)
    const thaiPattern = /[\u0E00-\u0E7F]/;
    const thaiMatches = (cleanText.match(thaiPattern) || []).length;
    if (thaiMatches > 0) {
      console.log(`[VoiceChat] Thai characters detected: ${thaiMatches} matches`);
      return 'th-TH';
    }
    
    // Vietnamese language patterns
    const vietnamesePattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    const vietnameseMatches = (cleanText.match(vietnamesePattern) || []).length;
    if (vietnameseMatches > 0) {
      console.log(`[VoiceChat] Vietnamese characters detected: ${vietnameseMatches} matches`);
      return 'vi-VN';
    }
    
    // Japanese language patterns
    const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    if (japanesePattern.test(cleanText)) {
      console.log(`[VoiceChat] Japanese characters detected`);
      return 'ja-JP';
    }
    
    // Korean language patterns
    const koreanPattern = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
    if (koreanPattern.test(cleanText)) {
      console.log(`[VoiceChat] Korean characters detected`);
      return 'ko-KR';
    }
    
    // Chinese language patterns
    const chinesePattern = /[\u4E00-\u9FAF]/;
    if (chinesePattern.test(cleanText)) {
      console.log(`[VoiceChat] Chinese characters detected`);
      return 'zh-CN';
    }
    
    console.log(`[VoiceChat] No Asian language detected, defaulting to English`);
    // Default to English for Latin script
    return 'en-US';
  };

  // Process voice message through agent system
  const processVoiceMessageThroughAgent = async (userMessage: UniversalMessage) => {
    if (!selectedAgentConfigSet || !selectedAgentName) {
      console.log('[VoiceChat] No agent configured, skipping agent processing');
      return;
    }

    const currentAgent = selectedAgentConfigSet.find(agent => agent.name === selectedAgentName);
    if (!currentAgent) {
      console.log('[VoiceChat] Current agent not found in agent set');
      return;
    }

    try {
      console.log('[VoiceChat] Processing voice message through agent system:', userMessage.content);

      // Enhanced API call with agent context (mirrors text mode logic)
      const requestBody: any = {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `${currentAgent.instructions}

You are currently the "${selectedAgentName}" agent. 

${currentAgent.downstreamAgents && currentAgent.downstreamAgents.length > 0 ? 
  `You can transfer users to these specialized agents if needed:
${currentAgent.downstreamAgents.map((agent: any) => `- ${agent.name}: ${agent.publicDescription}`).join('\n')}

Use the transferAgents function to transfer users when appropriate.` : 
  'You cannot transfer users to other agents from this role.'
}

Current conversation context: You are communicating through voice/realtime channel.`
          },
          ...messages.slice(-10).map(msg => ({
            role: msg.metadata.source === 'user' ? 'user' : 'assistant',
            content: msg.content
          })),
          {
            role: 'user',
            content: userMessage.content.trim()
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        agentName: selectedAgentName,
        sessionId: sessionId
      };

      // Only add tools if they exist and are not empty
      if (currentAgent.tools && currentAgent.tools.length > 0) {
        requestBody.tools = currentAgent.tools;
      }

      const response = await fetch('/api/chat/agent-completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const data = await response.json();
      const assistantContent = data.choices?.[0]?.message?.content || '';
      const toolCalls = data.choices?.[0]?.message?.tool_calls;

      // Handle function calls (like transferAgents)
      if (toolCalls && toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          if (toolCall.function.name === 'transferAgents') {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              const { destination_agent, rationale_for_transfer } = args;
              
              // Create transfer message
              const transferMessage: UniversalMessage = {
                id: generateMessageId(),
                sessionId,
                timestamp: new Date().toISOString(),
                type: 'system',
                content: `✅ Transferring you to ${destination_agent}. ${rationale_for_transfer}`,
                metadata: {
                  source: 'ai',
                  channel: 'realtime',
                  language: 'en',
                  agentName: selectedAgentName
                }
              };
              
              addMessage(transferMessage);
              
              // Execute transfer
              if (onAgentTransfer) {
                setTimeout(() => {
                  onAgentTransfer(destination_agent);
                }, 1000);
              }
              
              return;
            } catch (error) {
              console.error('Error parsing transferAgents arguments:', error);
            }
          }
        }
      }

      // Create AI response message with proper timestamp ordering
      const lastUserMessage = messages.filter(m => m.metadata.source === 'user').pop();
      const baseTimestamp = lastUserMessage ? new Date(lastUserMessage.timestamp).getTime() : Date.now();
      const aiTimestamp = new Date(Math.max(baseTimestamp + 100, Date.now())).toISOString();

      const aiMessage: UniversalMessage = {
        id: generateMessageId(),
        sessionId,
        timestamp: aiTimestamp,
        type: 'text',
        content: assistantContent,
        metadata: {
          source: 'ai',
          channel: 'realtime',
          language: 'en',
          agentName: selectedAgentName
        }
      };

      // Add AI response to chat
      if (assistantContent && assistantContent.trim()) {
        addMessage(aiMessage);
        onVoiceResponse(aiMessage);
      }

    } catch (error) {
      console.error('[VoiceChat] Error processing voice message through agent:', error);
      
      // Create error message
      const errorMessage: UniversalMessage = {
        id: generateMessageId(),
        sessionId,
        timestamp: new Date().toISOString(),
        type: 'system',
        content: 'Sorry, there was an error processing your voice message. Please try again.',
        metadata: {
          source: 'ai',
          channel: 'realtime',
          language: 'en',
          agentName: selectedAgentName
        }
      };

      addMessage(errorMessage);
    }
  };

  // Handle server events from the realtime connection
  const handleServerEvent = useCallback((event: any) => {
    // console.debug('[VoiceChat] Received server event:', event.type, event);
    // Forwarding to app-level server-event handler is disabled here to avoid provider/context issues
    
    // Skip only low-level events we don't render here. We handle response.done locally.
    const EVENTS_HANDLED_BY_SERVER_EVENT_HOOK = [
      'session.created',
      'output_audio_buffer.started', 
      'output_audio_buffer.stopped'
    ];
    
    if (EVENTS_HANDLED_BY_SERVER_EVENT_HOOK.includes(event.type)) {
      // console.debug('[VoiceChat] Skipping event handled by useHandleServerEvent:', event.type);
      return;
    }

    // When using agent pipeline, ignore any AI response events from realtime API
    if (useAgentPipeline) {
      const blocked = new Set([
        'response.created',
        'response.completed',
        'response.failed',
        'response.canceled',
        'response.audio_transcript.delta',
        'response.output_text.delta',
        'response.audio.delta',
        'response.output_item.added',
        'response.content_part.added',
        'response.output_item.done'
      ]);
      if (blocked.has(event.type)) {
        return;
      }
    }
    
    // Helpers to manage streaming placeholder lifecycle
    const ensurePlaceholder = (originType: string) => {
      // ALWAYS finalize any existing stream before creating new one
      if (currentStreamingMessageId.current) {
        // console.debug('[VoiceChat] 🔄 Finalizing previous stream before new placeholder');
        finalizeStreaming();
      }
      
      // Create a unique turn key for this response
      const currentTurnKey = `turn-${Date.now()}-${Math.random()}`;
      activeTurnKeyRef.current = currentTurnKey;
      
      const lastUserForTs = messages.filter(m => m.metadata.source === 'user').pop();
      const baseTimestamp = lastUserForTs
        ? new Date(lastUserForTs.timestamp).getTime()
        : lastUserMessageTimestampRef.current || Date.now();
      const aiTimestamp = new Date(baseTimestamp + 150).toISOString();
      
        currentStreamingMessageId.current = generateMessageId();
        streamingContent.current = '';
      currentStreamSeqRef.current += 1;
        
        const agentForPlaceholder = pendingAgentForNextAssistantRef.current || selectedAgentName;
        const placeholderMessage: UniversalMessage = {
          id: currentStreamingMessageId.current,
          sessionId,
          timestamp: aiTimestamp,
          type: 'text',
          content: '🤖 AI responding...',
          metadata: {
            source: 'ai',
            channel: 'realtime',
            language: 'en',
            agentName: agentForPlaceholder,
          originalEventType: originType,
          isStreaming: true,
          streamSeq: String(currentStreamSeqRef.current),
          seq: ++messageSequenceRef.current
          }
        };
        
      placeholderTurnKeyRef.current = currentTurnKey;
        addMessage(placeholderMessage);
      // console.debug('[VoiceChat] ✅ Created new AI placeholder with ID:', currentStreamingMessageId.current);
    };
    
    const finalizeStreaming = () => {
      if (!currentStreamingMessageId.current) return;
      const existing = messages.find(m => m.id === currentStreamingMessageId.current);
      if (existing) {
        updateMessage({
          ...existing,
          content: streamingContent.current || existing.content,
          metadata: { ...existing.metadata, isStreaming: false }
        });
      }
      currentStreamingMessageId.current = null;
      streamingContent.current = '';
      placeholderTurnKeyRef.current = null;
    };
    
    // On new response, hard-reset any previous AI streaming state
    if (event.type === 'response.created') {
      finalizeStreaming();
      currentStreamingMessageId.current = null;
      streamingContent.current = '';
      aiItemIdsWithPlaceholderRef.current.clear();
      aiItemAliasRef.current = {};
      currentResponseBubbleIdRef.current = null;
    }
    
    // Handle AI voice/text response streaming (delta events)
    if (
      event.type === 'response.audio_transcript.delta' ||
      event.type === 'response.output_text.delta' ||
      event.type === 'response.audio.delta'
    ) {
      if (useAgentPipeline) return; // ignore realtime deltas in agent pipeline mode
      // console.debug('[VoiceChat] 🔄 AI response delta:', event.delta);

      // Ensure we have a placeholder bound to the server item_id (idempotent)
      const rawItemId = (event as any).item_id || currentStreamingMessageId.current;
      const aliasId = rawItemId ? (aiItemAliasRef.current[rawItemId] || rawItemId) : '';
      const aiItemId: string = aliasId || '';
      if (aiItemId) {
        // If we already have a bubble for this response and it differs, alias this id to that bubble
        if (currentResponseBubbleIdRef.current && currentResponseBubbleIdRef.current !== aiItemId) {
          aiItemAliasRef.current[aiItemId] = currentResponseBubbleIdRef.current as string;
        }
        if (!currentStreamingMessageId.current || currentStreamingMessageId.current !== aiItemId) {
          if (!aiItemIdsWithPlaceholderRef.current.has(aiItemId)) {
            aiItemIdsWithPlaceholderRef.current.add(aiItemId);
            const exists = messages.find(m => m.id === aiItemId);
            if (!exists) {
              // Before adding a new streaming message, mark any prior generic placeholders as deleted
              const stalePlaceholders = messages.filter(m => 
                m.metadata.source === 'ai' &&
                (m.metadata as any)?.isStreaming &&
                (m.content || '').startsWith('🤖 AI responding...') &&
                !(m.metadata as any)?.deleted
              );
              stalePlaceholders.forEach(ph => {
                updateMessage({ ...ph, metadata: { ...ph.metadata, deleted: true } });
              });

              // Create initial empty bubble; footer label already indicates voice
              const agentNameForMsg = pendingAgentForNextAssistantRef.current || selectedAgentName;
              const mappedFrom = pendingAgentForNextAssistantRef.current ? `agent-transfer:${pendingAgentForNextAssistantRef.current}` : undefined;
              addMessage({
                id: aiItemId,
                sessionId,
                timestamp: new Date().toISOString(),
                type: 'text',
                content: '',
                metadata: {
                  source: 'ai',
                  channel: 'realtime',
                  language: 'en',
                  agentName: agentNameForMsg,
                  ...(mappedFrom ? { mappedFrom } : {}),
                  isStreaming: true,
                  seq: ++messageSequenceRef.current
                }
              });
              // DON'T clear pendingAgentForNextAssistantRef here - keep it for response.done
              currentResponseBubbleIdRef.current = aiItemId;
            }
          }
          currentStreamingMessageId.current = currentResponseBubbleIdRef.current || aiItemId;
          // Always start fresh for a new item to avoid carry-over between replies
          streamingContent.current = '';
        }
      }
      
      // Update streaming content
      if (event.delta && currentStreamingMessageId.current) {
        streamingContent.current += event.delta;
        // console.debug('[VoiceChat] 📝 Updating streaming content:', streamingContent.current.substring(0, 50) + '...');
        
        // Update the message with new content
        const previous = messages.find(m => m.id === (aiItemId || currentStreamingMessageId.current || ''));
        const agentForUpdate = (previous?.metadata as any)?.agentName || pendingAgentForNextAssistantRef.current || selectedAgentName;
        const updatedMessage: UniversalMessage = {
          id: (aiItemId || currentStreamingMessageId.current || crypto.randomUUID().slice(0, 32)),
          sessionId,
          timestamp: previous?.timestamp || new Date().toISOString(),
          type: 'text',
          content: streamingContent.current,
          metadata: {
            source: 'ai',
            channel: 'realtime',
            language: 'en',
            agentName: agentForUpdate,
            originalEventType: event.type,
            isStreaming: true,
            streamSeq: String(currentStreamSeqRef.current),
            seq: (previous?.metadata as any)?.seq ?? ++messageSequenceRef.current
          }
        };
        updateMessage(updatedMessage);
        // Keep pendingAgentForNextAssistantRef until response.done
      }
    }
    
    // Create AI placeholder with item_id as soon as it is known (idempotent)
    if (event.type === 'response.output_item.added' || event.type === 'response.content_part.added') {
      if (useAgentPipeline) return; // ignore creating AI bubbles in agent pipeline mode
      const aiItemId: string = (event as any).item?.id || (event as any).item_id || '';
      if (!aiItemId) return;
      // Only handle assistant message items; ignore other types
      const item = (event as any).item;
      const isAssistantMessage = item && item.type === 'message' && item.role === 'assistant';
      if (!isAssistantMessage) {
        return;
      }

      // If we already have a visible streaming bubble for this response, alias the new id to it to avoid a second bubble
      if (currentResponseBubbleIdRef.current && currentResponseBubbleIdRef.current !== aiItemId) {
        aiItemAliasRef.current[aiItemId] = currentResponseBubbleIdRef.current as string;
        return;
      }

      // Otherwise create the first visible bubble for this response
      aiItemIdsWithPlaceholderRef.current.add(aiItemId);
      currentStreamingMessageId.current = aiItemId;
      streamingContent.current = '';
      const exists = messages.find(m => m.id === aiItemId);
      if (!exists) {
        addMessage({
          id: aiItemId,
          sessionId,
          timestamp: new Date().toISOString(),
          type: 'text',
          content: '',
          metadata: {
            source: 'ai',
            channel: 'realtime',
            language: 'en',
            agentName: selectedAgentName,
            isStreaming: true,
            seq: ++messageSequenceRef.current
          }
        });
        currentResponseBubbleIdRef.current = aiItemId;
      }
      return;
    }
    
    // Final response indicates we should stop streaming and reset
    if (
      event.type === 'response.completed' ||
      event.type === 'response.failed' ||
      event.type === 'response.canceled'
    ) {
      if (useAgentPipeline) return; // ignore finalize sequence in agent pipeline mode
      finalizeStreaming();
    }
    
    // Do not finalize on speech start; keep current stream until model completes

    
    // Handle speech started - create immediate placeholder
    if (event.type === 'input_audio_buffer.speech_started') {
      // Mark that audio is present; user bubble will be created on item.created
      pttHadAudioRef.current = true;
    }
    
    // Handle conversation.item.created for user messages (like root app's useHandleServerEvent)
    if (event.type === 'conversation.item.created') {
      const role = event.item?.role;
      const itemId = event.item?.id;
      let text = event.item?.content?.[0]?.text || event.item?.content?.[0]?.transcript || "";
      const meta = (event.item?.metadata || {}) as any;
      
      console.log(`[VoiceChat-TRACK] 🟡 conversation.item.created EVENT - Role: ${role}, ItemID: ${itemId}, Text: "${text}", CurrentMessages: ${messages.length}`);
      
      // Only handle user messages (skip system and assistant)
      if (role === 'user' && itemId) {
        // Skip replayed transfer messages to avoid duplicate local user bubble
        if (meta?.skipHistoryAdd === true) {
          console.log(`[VoiceChat-TRACK] ⏭️ Skipping history add for replayed transfer user message: ${itemId}`);
          return;
        }
        // Check if message already exists to prevent duplication - use ref for fresh state
        const existingMessage = messagesRef.current.find(m => m.id === itemId);
        if (existingMessage) {
          console.log(`[VoiceChat-TRACK] ❌ DUPLICATE DETECTED - Message ${itemId} already exists, skipping creation`);
          return;
        }
        
        // Check for recent similar user messages to prevent rapid duplicates during same PTT session
        const now = Date.now();
        const recentUserMessages = messagesRef.current.filter(m => 
          m.metadata.source === 'user' && 
          m.metadata.channel === 'realtime' &&
          new Date(m.timestamp).getTime() > now - 5000 // Last 5 seconds
        );
        
        if (recentUserMessages.length > 0) {
          console.log(`[VoiceChat-TRACK] ⚠️ Found ${recentUserMessages.length} recent user messages, checking for PTT session`);
          
          // If we already have a recent user message that's still transcribing or just finished, 
          // this might be a duplicate from the same PTT session
          const activeTranscribing = recentUserMessages.find(m => (m.metadata as any)?.isTranscribing);
          if (activeTranscribing) {
            console.log(`[VoiceChat-TRACK] ⏰ IGNORED - Already have active transcribing message: ${activeTranscribing.id}`);
            return;
          }
        }
        
        lastConversationItemTime.current = now;
        
        console.log(`[VoiceChat-TRACK] ✅ Creating user message for itemId: ${itemId}, text: "${text}"`);
        
        // For user role, show [Transcribing...] for empty text (like root app)
        if (!text || text.trim() === "") {
          text = "[Transcribing...]";
        }
        
        // Track that we're creating this message
        createdMessageIds.current.add(itemId);
        
        // Create the user message directly instead of trying to replace placeholders
        const userMessage: UniversalMessage = {
          id: itemId,
          sessionId,
          timestamp: new Date().toISOString(),
          type: 'text',
          content: text || '[Transcribing...]',
          metadata: {
            source: 'user',
            channel: 'realtime',
            language: 'auto', // Auto-detect language instead of hard-coding
            originalEventType: event.type,
            isTranscribing: (text || '') === '' || text === '[Transcribing...]',
            seq: ++messageSequenceRef.current
          }
        };
        
        // Use addOrUpdateMessage to ensure it's properly added
        addOrUpdateMessage(userMessage);
        console.log(`[VoiceChat-TRACK] 🔄 Created user message directly: ${itemId}`);
        activeTranscriptionIdRef.current = itemId;
        // Log user message to conversation logger with token usage if available
        try {
          let tokenUsage: any = undefined;
          if ((event as any).metadata) {
            tokenUsage = extractTokenUsage((event as any).metadata);
          }
          if (!tokenUsage && (event as any).item?.metadata) {
            tokenUsage = extractTokenUsage((event as any).item.metadata);
          }
          if (!tokenUsage) {
            tokenUsage = extractTokenUsage(event);
          }
          const sessionKey = (itemId || '').substring(0, 8) || sessionId;
          // Use database logging instead of Elasticsearch
          logMessageToDatabase({
            role: 'user',
            type: 'audio',
            content: userMessage.content,
            channel: 'realtime',
            content_tokens: tokenUsage?.promptTokens,
            total_tokens: tokenUsage?.totalTokens,
            model: TRANSCRIPTION_MODEL,
            meta: { source: 'voice_transcription' }
          });
        } catch {}
        // Persist user message to backend (text) if non-empty and not already logged
        try {
          const shouldPersist = userMessage.content && userMessage.content !== '[Transcribing...]' && !loggedUserItemIdsRef.current.has(itemId);
          if (shouldPersist) {
            loggedUserItemIdsRef.current.add(itemId);
            // Use unified DB logger to ensure consistent session_id and payload
            logMessageToDatabase({
              role: 'user',
              type: 'text',
              content: userMessage.content,
              channel: 'realtime',
              meta: { source: 'voice_text_echo' }
            });
          }
        } catch {}
      }
    }
    
    // Handle transcription completion - create user message directly since conversation.item.created might be missing
    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      const itemId = event.item_id;
      const transcript = event.transcript;
      
      console.log(`[VoiceChat-TRACK] 🟢 transcription.completed EVENT - ItemID: ${itemId}, Transcript: "${transcript}", CurrentMessages: ${messagesRef.current.length}`);
      console.log(`[VoiceChat-TRACK] 🔍 Current message IDs in state: [${messagesRef.current.map(m => m.id).join(', ')}]`);
      
      if (itemId && transcript) {
        // Check if we've created this message ID before
        if (!createdMessageIds.current.has(itemId)) {
          console.log(`[VoiceChat-TRACK] ⚠️ Transcription completed for unknown itemId: ${itemId}, skipping processing`);
          return;
        }

        // Check if we already have a message with this itemId - use ref for fresh state
        // Prefer matching by itemId; fallback to last transcribing user message
        const existingMessage = messagesRef.current.find(m => m.id === itemId);
        const fallbackMessage = [...messagesRef.current].reverse().find(m => (m.metadata as any)?.isTranscribing && m.metadata.source === 'user' && !(m.metadata as any)?.deleted);
        
        console.log(`[VoiceChat-TRACK] 🔍 Search results - ExistingById: ${existingMessage ? 'Found' : 'None'}, FallbackTranscribing: ${fallbackMessage ? 'Found' : 'None'}`);
        console.log(`[VoiceChat-TRACK] 🔍 Tracked IDs: [${Array.from(createdMessageIds.current).join(', ')}]`);
        
        // Detect language from transcript
        const detectedLanguage = detectLanguage(transcript);
        console.log(`[VoiceChat] Detected language: ${detectedLanguage} for transcript: "${transcript}"`);
        
        // Smart language handling: respond in user's spoken language, but default to base language from selector
        if (detectedLanguage !== currentLanguage && detectedLanguage !== 'auto') {
          console.log(`[VoiceChat] User spoke in ${detectedLanguage}, responding in their language (base setting: ${getLanguageCode(baseLanguage)})`);
          setCurrentLanguage(detectedLanguage);
          
          // Get current agent instructions and merge with language instructions
          const currentAgent = selectedAgentConfigSet?.find(a => a.name === selectedAgentName);
          const baseInstructions = currentAgent?.instructions || '';
          const downstream = (currentAgent?.downstreamAgents && currentAgent.downstreamAgents.length > 0)
            ? `You can transfer users to these specialized agents if needed:\n${currentAgent.downstreamAgents.map((a: any) => `- ${a.name}: ${a.publicDescription}`).join('\n')}\n\nUse the transferAgents function to transfer users when appropriate.`
            : 'You cannot transfer users to other agents from this role.';
          
          const languageName = detectedLanguage === 'th-TH' ? 'Thai' : detectedLanguage === 'vi-VN' ? 'Vietnamese' : detectedLanguage === 'ja-JP' ? 'Japanese' : detectedLanguage === 'ko-KR' ? 'Korean' : detectedLanguage === 'zh-CN' ? 'Chinese' : 'English';
          
          const languageInstructions = `
CRITICAL: You MUST respond in ${languageName} language. The user is speaking in ${languageName}. 
- Always respond in the SAME language as the user's input
- Do NOT switch to other languages
- Maintain conversation in ${languageName} throughout the entire interaction
- If you don't understand, ask for clarification in ${languageName}

${baseInstructions}

You are currently the "${selectedAgentName}" agent.

${downstream}

Current conversation context: You are communicating through voice/realtime channel.`;
          
          // Send session update to OpenAI API with language-specific instructions
          sendClientEvent({
            type: "session.update", 
            session: {
              instructions: languageInstructions,
              tools: currentAgent?.tools,
              modalities: ["text", "audio"],
              input_audio_transcription: {
                model: "whisper-1"
              }
            }
          }, "language_update");
          
          console.log(`[VoiceChat] Updated session instructions for ${languageName} language`);
        }
        
        const targetMessage = existingMessage || fallbackMessage;
        
        if (targetMessage) {
          // Update existing message
          console.log(`[VoiceChat-TRACK] 🔄 Updating existing message: ${targetMessage.id} with transcript: "${transcript}"`);
          const updatedMessage: UniversalMessage = {
            ...targetMessage,
            content: transcript.trim(),
            metadata: {
              ...targetMessage.metadata,
              language: detectedLanguage, // Update with detected language
              isTranscribing: false,
              originalEventType: event.type
            }
          };
          
          updateMessage(updatedMessage);
          console.log(`[VoiceChat-TRACK] ✅ Updated message ${targetMessage.id} with final transcript`);
          // Persist transcribed user message (audio -> text) to backend via unified logger
          try {
            logMessageToDatabase({
              role: 'user',
              type: 'audio',
              content: transcript.trim(),
              channel: 'realtime',
              content_tokens: (() => { try { const u = extractTokenUsage((event as any).metadata || event); return u?.promptTokens ?? null; } catch { return null; } })(),
              model: TRANSCRIPTION_MODEL,
              latency_ms: (() => { const t = lastAudioCommitTsRef.current; return typeof t === 'number' ? (Date.now() - t) : null; })(),
              meta: { language: detectedLanguage, is_internal: false }
            });
          } catch {}
          // Note: Avoid duplicate user-audio logs; the unified logger call above already persisted the transcript
          
          // Run through agent-completions pipeline only when enabled; otherwise rely on realtime reply
          if (useAgentPipeline) {
            try {
              processVoiceMessageThroughAgent(updatedMessage);
            } catch {}
          }
        } else {
          // This should not happen if we're tracking properly, but fallback just in case
          console.log(`[VoiceChat-TRACK] ⚠️ UNEXPECTED: No existing message found for known itemId: ${itemId}`);
          console.log(`[VoiceChat-TRACK] 🔍 All messages in state: ${JSON.stringify(messagesRef.current.map(m => ({id: m.id, content: m.content.substring(0, 20)})))}`);
        }
        // Safety: ensure any lingering speech-* placeholders are removed now
        const lingeringSpeech = [...messagesRef.current].filter(m => m.id.startsWith('speech-') && !(m.metadata as any)?.deleted);
        lingeringSpeech.forEach(ph => {
          updateMessage({ ...ph, content: '', metadata: { ...ph.metadata, deleted: true } });
          // console.debug('[VoiceChat] 🧹 Cleaned lingering speech placeholder:', ph.id);
        });
        activeTranscriptionIdRef.current = null;
      }
    }

    // Fallback: if the API does not stream deltas, build final assistant message on response.done
    if (event.type === 'response.done') {
      try {
        const output = (event.response && event.response.output) || [];
        // Deep visibility into Realtime API response usage fields
        try {
          if (DEBUG_VOICE) {
            const resp: any = (event as any).response || {};
            console.log('[VoiceLog] response.metadata:', resp?.metadata || null);
            console.log('[VoiceLog] response.usage_metadata:', resp?.usage_metadata || null);
            console.log('[VoiceLog] response keys:', Object.keys(resp));
            // Log full response safely (truncated to avoid flooding console)
            try {
              const full = JSON.stringify(resp);
              const truncated = full.length > 8000 ? (full.slice(0, 8000) + '…') : full;
              console.log('[VoiceLog] response (truncated JSON):', truncated);
            } catch (e) {
              console.log('[VoiceLog] response (raw object):', resp);
            }
          }
        } catch {}

        // Handle function calls (send function_call_output). Do NOT auto response.create here to avoid pre-injection replies
        const functionCalls = output.filter((o: any) => o.type === 'function_call' && o.name);
        if (functionCalls.length > 0) {
          (async () => {
            let shouldRequestFollowup = false;
            for (const call of functionCalls) {
              const functionName = call.name;
              const callId = call.call_id || crypto.randomUUID().slice(0, 32);
              let args: any = {};
              try {
                const rawArgs = call.arguments;
                args = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs || {};
              } catch (err) {
                console.warn('[VoiceRealtime-FC] Failed to parse function args, using empty object', err);
                args = {};
              }

              let result: any = { ok: true };
              try {
                const currentAgent = selectedAgentConfigSet?.find(a => a.name === selectedAgentName);
                const agentHandler = (currentAgent as any)?.toolLogic?.[functionName];
                const coreHandler = (ALL_HANDLERS as any)?.[functionName];
                const handler = agentHandler || coreHandler;
                if (typeof handler === 'function') {
                  console.log(`[VoiceRealtime-FC] ▶ executing handler: ${functionName}, call_id=${callId}`);
                  result = await handler(args);
                } else {
                  console.log(`[VoiceRealtime-FC] ⚠ no handler found for: ${functionName}, returning default result`);
                }
              } catch (err) {
                console.error(`[VoiceRealtime-FC] Handler error for ${functionName}:`, err);
                result = { ok: false, error: String(err) };
              }

              // If transferAgents was called, trigger agent switch in parent
              if (functionName === 'transferAgents') {
                const destination = (result && (result.targetAgent || result.destination || args?.destination_agent)) || '';
                if (destination && typeof onAgentTransfer === 'function') {
                  try {
                    console.log(`[VoiceRealtime-FC] 🔁 onAgentTransfer → ${destination}`);
                    onAgentTransfer(destination);
                    // Ensure next assistant bubble shows new agent label
                    try { pendingAgentForNextAssistantRef.current = destination; } catch {}
                  } catch {}
                }
                // Log internal transfer message (voice mode) via unified logger
                try {
                  logMessageToDatabase({
                    role: 'system',
                    type: 'text',
                    content: `Internal transfer initiated to ${destination}.`,
                    channel: 'realtime',
                    meta: {
                      is_internal: true,
                      source: 'transfer',
                      from_agent: lastInjectedAgentNameRef.current || selectedAgentName,
                      to_agent: destination,
                      conversation_context: typeof args?.conversation_context === 'string' ? args.conversation_context : undefined
                    }
                  });
                } catch {}
              } else {
                // For non-transfer functions, request a model follow-up after outputs
                shouldRequestFollowup = true;
              }

              try {
                console.log(`[VoiceRealtime-FC] ▶ send: function_call_output for ${functionName}`);
                sendClientEvent({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: callId,
                    output: JSON.stringify(result)
                  }
                }, `function_call_output:${functionName}`);
              } catch (err) {
                console.error('[VoiceRealtime-FC] Failed to send function_call_output:', err);
              }
            }
            if (shouldRequestFollowup) {
              try {
                console.log('[VoiceRealtime-FC] ▶ send: response.create (after function_call_output)');
                try { lastResponseCreateTsRef.current = Date.now(); } catch {}
                sendClientEvent({ type: 'response.create' }, 'after_function_call_output');
              } catch {}
            }
          })();
        }

        const assistantItems = output.filter((o: any) => o.type === 'message' && o.role === 'assistant');
        if (assistantItems.length > 0) {
          // Consolidate text from all assistant items
          const texts: string[] = [];
          const itemIds: string[] = [];
          for (const item of assistantItems) {
            const content = item.content && item.content[0];
            const text = content?.transcript || content?.text || '';
            if (text && text.trim()) {
              texts.push(text);
            }
            if (item.id) itemIds.push(item.id);
          }
          const combinedText = texts.join(' ');
          if (combinedText.trim()) {
            // Prefer updating an existing streaming message if present
            let targetId: string | null = null;
            for (const id of itemIds) {
              const effectiveId = aiItemAliasRef.current[id] || currentResponseBubbleIdRef.current || id;
              const existing = messages.find(m => m.id === effectiveId);
              if (existing) {
                targetId = effectiveId;
                updateMessage({
                  ...existing,
                  content: combinedText,
                  metadata: { ...existing.metadata, isStreaming: false }
                });
                // Persist assistant final message to backend (existing bubble case)
                try {
                  const usagePreview = (() => { try { return extractTokenUsage((event as any).response?.metadata || (event as any).response || event) || {}; } catch { return {}; } })();
                  if (DEBUG_VOICE) {
                    console.log('[VoiceLog] Assistant usage preview (existing-bubble):', {
                      promptTokens: usagePreview?.promptTokens ?? null,
                      completionTokens: usagePreview?.completionTokens ?? null,
                      totalTokens: usagePreview?.totalTokens ?? null
                    });
                  }
                  const payload = {
                    session_id: dbSessionId,
                    role: 'assistant',
                    type: 'text',
                    content: combinedText,
                    channel: 'realtime',
                    content_tokens: usagePreview?.promptTokens ?? null,
                    response_tokens: usagePreview?.completionTokens ?? null,
                    total_tokens: usagePreview?.totalTokens ?? null,
                    model: VOICE_MODEL,
                    latency_ms: (() => { const t = lastResponseCreateTsRef.current; return typeof t === 'number' ? (Date.now() - t) : null; })(),
                    meta: { language: 'en', agentName: (existing.metadata as any)?.agentName, is_internal: false }
                  } as any;
                  if (DEBUG_VOICE) { console.log('[VoiceLog] POST /api/log/messages (assistant existing)', payload); }
                  // Use unified DB logger to ensure consistent payload/session
                  logMessageToDatabase({
                    role: 'assistant',
                    type: 'text',
                    content: combinedText,
                    channel: 'realtime',
                    content_tokens: usagePreview?.promptTokens ?? null,
                    response_tokens: usagePreview?.completionTokens ?? null,
                    total_tokens: usagePreview?.totalTokens ?? null,
                    model: VOICE_MODEL,
                    latency_ms: (() => { const t = lastResponseCreateTsRef.current; return typeof t === 'number' ? (Date.now() - t) : null; })(),
                    meta: { language: 'en', agentName: (existing.metadata as any)?.agentName, is_internal: false }
                  });
                } catch {}
                // Log assistant response with token usage
                try {
                  const tokenUsage = extractTokenUsage((event as any).response?.metadata || (event as any).response || event) || {};
                  const sessionKey = (targetId || '').substring(0, 8) || sessionId;
                  // logAssistantResponse (removed - using database logging)(sessionKey, combinedText, tokenUsage, { rawResponse: (event as any).response });
                } catch {}
                break;
              }
            }
            if (!targetId) {
              // No existing message (no deltas). Create one using first item id or a new id
              const firstId = itemIds[0] || generateMessageId();
              const newId = aiItemAliasRef.current[firstId] || currentResponseBubbleIdRef.current || firstId;
              const agentNameForFinal = (lastInjectedAgentNameRef.current || selectedAgentName);
              const mappedFrom = undefined; // No transfer badge on the very first welcome or agent-change replay
              console.log(`[AgentLabel] final agentName=${agentNameForFinal} (selected=${selectedAgentName}, pending=${pendingAgentForNextAssistantRef.current || 'null'}, lastInjected=${lastInjectedAgentNameRef.current || 'null'})`);
              addMessage({
                id: newId,
                sessionId,
                timestamp: new Date().toISOString(),
                type: 'text',
                content: combinedText,
                metadata: {
                  source: 'ai',
                  channel: 'realtime',
                  language: 'en',
                  agentName: agentNameForFinal,
                  ...(mappedFrom ? { mappedFrom } : {}),
                  isStreaming: false,
                  seq: ++messageSequenceRef.current
                }
              });
              // Persist assistant final message to backend (no-delta/new bubble case)
              try {
                const usagePreview = (() => { try { return extractTokenUsage((event as any).response?.metadata || (event as any).response || event) || {}; } catch { return {}; } })();
                if (DEBUG_VOICE) {
                  console.log('[VoiceLog] Assistant usage preview (new-bubble):', {
                    promptTokens: usagePreview?.promptTokens ?? null,
                    completionTokens: usagePreview?.completionTokens ?? null,
                    totalTokens: usagePreview?.totalTokens ?? null
                  });
                }
                // Use unified DB logger for assistant new bubble
                if (DEBUG_VOICE) {
                  console.log('[VoiceLog] POST /api/log/messages (assistant new)', {
                    role: 'assistant', type: 'text', content: combinedText
                  });
                }
                logMessageToDatabase({
                  role: 'assistant',
                  type: 'text',
                  content: combinedText,
                  channel: 'realtime',
                  content_tokens: usagePreview?.promptTokens ?? null,
                  response_tokens: usagePreview?.completionTokens ?? null,
                  total_tokens: usagePreview?.totalTokens ?? null,
                  model: VOICE_MODEL,
                  latency_ms: (() => { const t = lastResponseCreateTsRef.current; return typeof t === 'number' ? (Date.now() - t) : null; })(),
                  meta: { language: 'en', agentName: agentNameForFinal, mappedFrom, is_internal: false }
                });
              } catch {}
              // Clear pending agent label after first assistant message
              pendingAgentForNextAssistantRef.current = null;
              // Log assistant response with token usage (no existing bubble case)
              try {
                const tokenUsage = extractTokenUsage((event as any).response?.metadata || (event as any).response || event) || {};
                const sessionKey = (newId || '').substring(0, 8) || sessionId;
                // logAssistantResponse (removed - using database logging)(sessionKey, combinedText, tokenUsage, { rawResponse: (event as any).response });
              } catch {}
            }
          }
        }
      } catch (e) {
        console.warn('[VoiceChat] Failed to build final assistant message on response.done:', e);
      } finally {
        // Ensure streaming is finalized
        currentStreamingMessageId.current = null;
        streamingContent.current = '';
        aiItemIdsWithPlaceholderRef.current.clear();
        aiItemAliasRef.current = {};
        currentResponseBubbleIdRef.current = null;
      }
    }

    // Handle transcription delta to show and update the user placeholder live
    if (event.type === 'conversation.item.input_audio_transcription.delta') {
      const itemId = event.item_id;
      const delta = event.delta || '';
      console.log(`[VoiceChat-TRACK] 🔵 transcription.delta EVENT - ItemID: ${itemId}, Delta: "${delta}", CurrentMessages: ${messagesRef.current.length}`);
      console.log(`[VoiceChat-TRACK] 🔍 Current message IDs in state: [${messagesRef.current.map(m => m.id).join(', ')}]`);
      
      if (!itemId || !delta) return;

      // Check if we've created this message ID before
      if (!createdMessageIds.current.has(itemId)) {
        console.log(`[VoiceChat-TRACK] ⚠️ Delta for unknown itemId: ${itemId}, skipping delta processing`);
        return;
      }

      // Prefer message with matching itemId; otherwise use last transcribing user message - use ref for fresh state
      const existing = messagesRef.current.find(m => m.id === itemId);
      const fallbackTranscribing = [...messagesRef.current].reverse().find(m => (m.metadata as any)?.isTranscribing && m.metadata.source === 'user' && !(m.metadata as any)?.deleted);

      console.log(`[VoiceChat-TRACK] 🔍 Delta search - ExistingById: ${existing ? 'Found' : 'None'}, FallbackTranscribing: ${fallbackTranscribing ? 'Found' : 'None'}`);

      if (!existing && !fallbackTranscribing) {
        console.log(`[VoiceChat-TRACK] ⚠️ No existing message found for delta, this suggests a state sync issue`);
        console.log(`[VoiceChat-TRACK] 🔍 Tracked IDs: [${Array.from(createdMessageIds.current).join(', ')}]`);
        return;
      }

      const targetMessage = existing || fallbackTranscribing;
      if (targetMessage) {
        console.log(`[VoiceChat-TRACK] 📝 Updating existing message ${targetMessage.id} with delta`);
        updateMessage({
          ...targetMessage,
          content: (targetMessage.content || '') + delta,
          metadata: { ...targetMessage.metadata, isTranscribing: true, originalEventType: event.type }
        });
      }
    }

    if (event.type === 'error') {
      setConnectionError(event.error?.message || 'Voice connection error');
    }
  }, [sessionId, addMessage, addOrUpdateMessage, updateMessage, onVoiceResponse, selectedAgentName, detectLanguage]);

  // State for dynamic language - initialized from baseLanguage prop
  const getLanguageCode = (lang: string) => {
    switch(lang) {
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
  // Removed old stableVoiceSessionId - now using shared dbSessionId from session manager
  
  // Sync with base language changes from UI selector
  useEffect(() => {
    const newBaseLanguageCode = getLanguageCode(baseLanguage);
    console.log(`[VoiceChat-LANGUAGE] 🌐 Base language prop: ${baseLanguage} → ${newBaseLanguageCode}`);
    console.log(`[VoiceChat-LANGUAGE] 🔄 Setting currentLanguage from ${currentLanguage} to ${newBaseLanguageCode}`);
    setCurrentLanguage(newBaseLanguageCode);
  }, [baseLanguage]);
  
  // Initialize WebRTC connection
  const webRTCConnection = useWebRTCConnection({
    isAudioPlaybackEnabled: isAudioEnabled,
    handleServerEvent,
    urlCodec: 'opus',
    // urlModel: 'gpt-4o-realtime-preview-2024-12-17',
    urlModel: 'gpt-4o-realtime-preview-2025-06-03',
    language: currentLanguage // Use dynamic language
  });

  const {
    sessionStatus,
    connectToRealtime,
    sendClientEvent
  } = webRTCConnection;

  // Bridge realtime function calls and transfers via global server-event handler
  // Removed local useHandleServerEvent wiring to prevent context errors when TranscriptProvider isn't present here.

  // Voice mode always uses realtime; never route through agent-completions
  const useAgentPipeline = false;

  // Auto-connect when component mounts
  useEffect(() => {
    if (sessionStatus === 'DISCONNECTED') {
      connectToRealtime().catch((error) => {
        console.error('[VoiceChat] Failed to connect:', error);
        setConnectionError('Failed to connect to voice service');
      });
    }
  }, [connectToRealtime, sessionStatus]);

  // Configure session for input audio transcription when connected
  const [sessionConfigured, setSessionConfigured] = useState(false);
  const sendClientEventRef = useRef(sendClientEvent);
  
  // Update ref when sendClientEvent changes
  useEffect(() => {
    sendClientEventRef.current = sendClientEvent;
  }, [sendClientEvent]);
  
  // Update realtime session when agent changes (instructions/tools)
  useEffect(() => {
    try {
      if (sessionStatus === 'CONNECTED' && sendClientEventRef.current && selectedAgentConfigSet && selectedAgentName) {
        const currentAgent = selectedAgentConfigSet.find(a => a.name === selectedAgentName);
        if (currentAgent) {
          const downstream = (currentAgent.downstreamAgents && currentAgent.downstreamAgents.length > 0)
            ? `You can transfer users to these specialized agents if needed:\n${currentAgent.downstreamAgents.map((a: any) => `- ${a.name}: ${a.publicDescription}`).join('\n')}\n\nUse the transferAgents function to transfer users when appropriate.`
            : 'You cannot transfer users to other agents from this role.';
          // Include language preference in agent instructions
          const languageName = currentLanguage === 'th-TH' ? 'Thai' : currentLanguage === 'vi-VN' ? 'Vietnamese' : currentLanguage === 'ja-JP' ? 'Japanese' : currentLanguage === 'ko-KR' ? 'Korean' : currentLanguage === 'zh-CN' ? 'Chinese' : 'English';
          const isNonEnglish = currentLanguage !== 'en-US' || baseLanguage === 'th';
          const languageInstructions = isNonEnglish ? `
CRITICAL: You MUST respond in ${languageName} language. The user interface is set to ${languageName}. 
- Always respond in ${languageName} from the start
- Greet the user in ${languageName}
- Do NOT use English unless specifically requested
- Maintain conversation in ${languageName} throughout the entire interaction

` : '';
          const instructions = `${languageInstructions}${currentAgent.instructions}\n\nYou are currently the \"${selectedAgentName}\" agent.\n\n${downstream}\n\nCurrent conversation context: You are communicating through voice/realtime channel.`;
          const tools = Array.isArray(currentAgent.tools) ? currentAgent.tools : [];
          const toolsToSend = tools.length > 0 ? tools : undefined;
          try {
            console.log('[VoiceRealtime] session.update instructions (preview):', instructions.slice(0, 220) + (instructions.length > 220 ? '…' : ''));
            console.log('[VoiceRealtime] session.update tools (names):', Array.isArray(toolsToSend) ? toolsToSend.map((t: any) => t.name).join(', ') : 'none');
            // Cancel any in-flight audio/output from previous agent before switching
            try { sendClientEventRef.current({ type: 'output_audio_buffer.clear' }, 'pre_agent_switch'); } catch {}
            try { sendClientEventRef.current({ type: 'response.cancel' }, 'pre_agent_switch'); } catch {}
          } catch {}
          sendClientEventRef.current({
            type: "session.update",
            session: {
              instructions,
              tools: toolsToSend,
              modalities: ["text", "audio"]
            }
          }, "agent_change_update");
          try { console.log(`[VoiceRealtime] Injected tools on agent change: ${Array.isArray(toolsToSend) ? toolsToSend.map((t:any)=>t.name).join(', ') : 'none'}`); } catch {}
          // Track last injected agent name for labeling, but do not set transfer badge here
          try { lastInjectedAgentNameRef.current = selectedAgentName; } catch {}
          // After agent switch, replay the last user query so the new agent can act
          const lastUserText = (() => {
            try {
              const u = [...messagesRef.current].reverse().find(m => m.metadata.source === 'user' && (m.content || '').trim());
              return (u?.content || '').trim();
            } catch { return ''; }
          })();
          const scheduleReplay = () => {
            if (lastUserText) {
              sendClientEventRef.current({
                type: "conversation.item.create",
                item: {
                  type: "message",
                  role: "user",
                  content: [{ type: "input_text", text: lastUserText }],
                  metadata: { replayedFromTransfer: true, skipHistoryAdd: true }
                }
              }, "agent_change_replay_user");
            }
            try { lastResponseCreateTsRef.current = Date.now(); } catch {}
            sendClientEventRef.current({ type: "response.create" }, lastUserText ? "agent_change_followup" : "agent_change_welcome_response");
          };
          // Do not set transfer badge on agent-change replay; reserve badge for real transfers only
          // Give session.update a brief moment to apply before replaying the user query
          setTimeout(scheduleReplay, 500);
        }
      }
    } catch {}
  }, [sessionStatus, selectedAgentName, selectedAgentConfigSet]);
  
  useEffect(() => {
    if (sessionStatus === 'CONNECTED' && sendClientEventRef.current && !sessionConfigured) {
      console.log('[VoiceChat] Configuring session for input audio transcription');
      
      // Enable input audio transcription
      sendClientEventRef.current({
        type: "session.update",
        session: {
          input_audio_transcription: {
            model: "whisper-1"
          }
        }
      });

      // Inject current agent instructions and tools into Realtime session
      try {
        if (selectedAgentConfigSet && selectedAgentName) {
          const currentAgent = selectedAgentConfigSet.find(a => a.name === selectedAgentName);
          if (currentAgent) {
            const downstream = (currentAgent.downstreamAgents && currentAgent.downstreamAgents.length > 0)
              ? `You can transfer users to these specialized agents if needed:\n${currentAgent.downstreamAgents.map((a: any) => `- ${a.name}: ${a.publicDescription}`).join('\n')}\n\nUse the transferAgents function to transfer users when appropriate.`
              : 'You cannot transfer users to other agents from this role.';
            // Include language preference in initial agent instructions based on baseLanguage
            const languageName = currentLanguage === 'th-TH' ? 'Thai' : currentLanguage === 'vi-VN' ? 'Vietnamese' : currentLanguage === 'ja-JP' ? 'Japanese' : currentLanguage === 'ko-KR' ? 'Korean' : currentLanguage === 'zh-CN' ? 'Chinese' : 'English';
            const isNonEnglish = currentLanguage !== 'en-US' || baseLanguage === 'th';
            console.log(`[VoiceChat-LANGUAGE] 🔍 Session config: currentLanguage=${currentLanguage}, baseLanguage=${baseLanguage}, languageName=${languageName}, isNonEnglish=${isNonEnglish}`);
            const languageInstructions = isNonEnglish ? `
CRITICAL: You MUST respond in ${languageName} language. The user interface is set to ${languageName}. 
- Always respond in ${languageName} from the start
- Greet the user in ${languageName}
- Do NOT use English unless specifically requested
- Maintain conversation in ${languageName} throughout the entire interaction

` : '';
            console.log(`[VoiceChat-LANGUAGE] 📝 Language instructions: ${languageInstructions.length > 0 ? 'ADDED' : 'NONE'}`);
            const instructions = `${languageInstructions}${currentAgent.instructions}\n\nYou are currently the \"${selectedAgentName}\" agent.\n\n${downstream}\n\nCurrent conversation context: You are communicating through voice/realtime channel.`;
            const tools = Array.isArray(currentAgent.tools) ? currentAgent.tools : [];
            const toolsToSend = tools.length > 0 ? tools : undefined;
            try {
              console.log('[VoiceRealtime] session.update instructions (preview):', instructions.slice(0, 220) + (instructions.length > 220 ? '…' : ''));
              console.log('[VoiceRealtime] session.update tools (names):', Array.isArray(toolsToSend) ? toolsToSend.map((t: any) => t.name).join(', ') : 'none');
              console.log('[VoiceRealtime] session.update FULL instructions:', instructions);
              console.log('[VoiceRealtime] session.update FULL tools:', typeof toolsToSend !== 'undefined' ? JSON.stringify(toolsToSend, null, 2) : 'none');
            } catch {}
            sendClientEventRef.current({
              type: "session.update",
              session: {
                instructions,
                // Realtime expects tools/functions defined at session; rely on agent-config tools only
                tools: toolsToSend,
                modalities: ["text", "audio"]
              }
            }, "inject_agent_instructions_and_tools");
            try { console.log(`[VoiceRealtime] Injected tools on connect: ${Array.isArray(toolsToSend) ? toolsToSend.map((t:any)=>t.name).join(', ') : 'none'}`); } catch {}
            
            // Send initial greeting in the correct language
            if (isNonEnglish) {
              setTimeout(() => {
                console.log(`[VoiceRealtime] Sending initial greeting in ${languageName}`);
                try { lastResponseCreateTsRef.current = Date.now(); } catch {}
                sendClientEventRef.current({ type: 'response.create' }, 'initial_greeting');
              }, 1000);
            }
          }
        }
      } catch {}

      setSessionConfigured(true);
    }
    
    // Reset configuration flag when disconnected
    if (sessionStatus === 'DISCONNECTED') {
      setSessionConfigured(false);
    }
  }, [sessionStatus, sessionConfigured]);

  // Handle push-to-talk
  const handlePTTStart = useCallback(() => {
    if (sessionStatus === 'CONNECTED') {
      setIsPTTActive(true);
      console.log('[VoiceChat] Starting voice input');
      try { (webRTCConnection as any).enableMic?.(); } catch {}
      // Start a fresh PTT turn
      pttTurnIdRef.current = crypto.randomUUID();
      pttHadAudioRef.current = false;
      turnUserItemIdRef.current = null;
      try {
        console.log('[VoiceRealtime] ▶ send: input_audio_buffer.clear');
        sendClientEvent({ type: 'input_audio_buffer.clear' });
      } catch {}
    }
  }, [sessionStatus]);

  const handlePTTEnd = useCallback(() => {
    if (isPTTActive) {
      setIsPTTActive(false);
      console.log('[VoiceChat] Ending voice input');
      // If no audio captured, disable mic and skip
      if (!pttHadAudioRef.current) {
        try { (webRTCConnection as any).disableMic?.(); } catch {}
        return;
      }
      // Flush small tail, then commit and create response
      setTimeout(() => {
        console.log('[VoiceRealtime] ▶ send: input_audio_buffer.commit');
        sendClientEvent({ type: 'input_audio_buffer.commit' });
        // Mark audio commit time for transcription latency
        try { lastAudioCommitTsRef.current = Date.now(); } catch {}
        if (!isResponseActiveRef.current && !useAgentPipeline) {
          console.log('[VoiceRealtime] ▶ send: response.create (PTT)');
          try { lastResponseCreateTsRef.current = Date.now(); } catch {}
          sendClientEvent({ type: 'response.create' });
        }
        setTimeout(() => { try { (webRTCConnection as any).disableMic?.(); } catch {} }, 50);
      }, 200);
    }
  }, [isPTTActive, sendClientEvent]);

  // Handle text input in voice mode (fallback)
  const handleTextInput = useCallback((text: string) => {
    if (sessionStatus === 'CONNECTED' && text.trim()) {
      const messageId = crypto.randomUUID().slice(0, 32);
      
      if (!useAgentPipeline) {
        // Send text message via realtime API
        console.log('[VoiceRealtime] ▶ send: conversation.item.create (user text):', text.trim());
        sendClientEvent({
          type: "conversation.item.create",
          item: {
            id: messageId,
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: text.trim() }]
          }
        });
        console.log('[VoiceRealtime] ▶ send: response.create (text)');
        sendClientEvent({ type: "response.create" });
      }
      
      // Add user message to local history
      const userMessage: UniversalMessage = {
        id: messageId,
        sessionId,
        timestamp: new Date().toISOString(),
        type: 'text',
        content: text.trim(),
        metadata: {
          source: 'user',
          channel: 'realtime',
          language: 'en'
        }
      };
      
      addMessage(userMessage);
      // Persist typed user text to backend immediately
      try {
        fetch('/api/log/messages', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
                                  session_id: dbSessionId,
            role: 'user',
            type: 'text',
            content: text.trim(),
            channel: 'realtime',
            meta: { is_internal: false }
          })
        }).catch(() => {});
      } catch {}

      // Run through agent pipeline like text mode (only when enabled)
      if (useAgentPipeline) {
        processVoiceMessageThroughAgent(userMessage).catch(() => {});
      }
    }
  }, [sessionStatus, sendClientEvent, sessionId, addMessage]);

  const getStatusColor = () => {
    switch (sessionStatus) {
      case 'CONNECTED': return 'text-orange-700';
      case 'CONNECTING': return 'text-amber-600';
      default: return 'text-red-700';
    }
  };

  const getStatusText = () => {
    switch (sessionStatus) {
      case 'CONNECTED': return 'Voice Ready';
      case 'CONNECTING': return 'Connecting...';
      default: return 'Disconnected';
    }
  };

  // Get channel info
  const getChannelInfo = (channel: string) => {
    switch (channel) {
      case 'normal':
        return { name: 'Text Chat', icon: CpuChipIcon, color: 'blue' };
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

  return (
    <div className="flex flex-col h-full min-h-0 bg-white rounded-lg shadow border border-gray-200">
      {/* Chat Header with Channel Switching */}
      <div className="flex items-center justify-between p-4 border-b border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            activeChannel === 'normal' ? 'bg-orange-700' :
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
              onClick={() => {
                if (confirm('Clear all messages? This cannot be undone.')) {
                  clearMessages();
                  // Reset tracking
                  createdMessageIds.current.clear();
                  processedTranscripts.current.clear();
                  processedAIResponses.current.clear();
                  lastConversationItemTime.current = 0;
                  console.log('[VoiceChat-TRACK] 🧹 Cleared all tracking state');
                }
              }}
              className="p-2 rounded-md bg-white text-gray-400 hover:text-red-600 transition-colors"
              title="Clear all messages"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}

          {/* Audio toggle */}
          <button
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className={`p-2 rounded-md border transition-colors ${
              isAudioEnabled 
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
          {(['normal', 'realtime', 'human'] as const).map((channel) => {
            const info = getChannelInfo(channel);
            const Icon = info.icon;
            return (
              <button
                key={channel}
                onClick={() => onChannelSwitch(channel)}
                className={`p-2 rounded-md transition-colors border ${
                  activeChannel === channel
                    ? 'bg-orange-100 text-orange-800 border-orange-300'
                    : 'bg-white/80 text-amber-700 border-orange-200 hover:text-orange-800 hover:bg-orange-50'
                }`}
                title={`Switch to ${info.name}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages Area fills remaining height */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4"
      >
        {sortedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-amber-800" style={{ minHeight: '300px' }}>
            <div className="text-4xl mb-4">🎤</div>
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
              className={`flex items-start space-x-3 ${
                message.metadata.source === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
              title={`id=${message.id}`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.metadata.source === 'user' 
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
              <div className={`flex-1 max-w-xs lg:max-w-md ${
                message.metadata.source === 'user' ? 'text-right' : 'text-left'
              }`}>
                <div
                  id={`bubble-${message.id}`}
                  data-bubble-id={message.id}
                  className={`inline-block p-3 rounded-lg relative ${
                  message.metadata.source === 'user'
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
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.metadata.channel === 'realtime' && message.metadata.source === 'user' && (
                    <span className="text-xs opacity-75 block mt-1">🎤 Voice input</span>
                  )}
                  {message.metadata.channel === 'realtime' && message.metadata.source === 'ai' && (
                    <span className="text-xs opacity-75 block mt-1">🔊 Voice response</span>
                  )}
                </div>
                <div className={`text-xs text-amber-700 mt-1 ${
                  message.metadata.source === 'user' ? 'text-right' : 'text-left'
                }`}>
                  {formatTime(message.timestamp)}
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
          return (
            <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: 120 }}>
              <button
                onMouseDown={isEnabled ? handlePTTStart : undefined}
                onMouseUp={isEnabled ? handlePTTEnd : undefined}
                onTouchStart={isEnabled ? handlePTTStart : undefined}
                onTouchEnd={isEnabled ? handlePTTEnd : undefined}
                disabled={!isEnabled}
                aria-disabled={!isEnabled}
                className={`w-16 h-16 rounded-full border-4 transition-all duration-200 ${
                  !isEnabled
                    ? 'bg-amber-100 border-amber-200 text-amber-600 cursor-not-allowed'
                    : isPTTActive
                      ? 'bg-red-600 border-red-700 scale-110 shadow-lg'
                      : 'bg-orange-600 border-orange-700 hover:bg-orange-700 hover:scale-105'
                }`}
                title={isEnabled ? 'Hold to talk' : (sessionStatus === 'CONNECTING' ? 'Connecting…' : 'Voice unavailable')}
              >
                <MicrophoneIcon className={`w-6 h-6 mx-auto ${!isEnabled ? 'text-amber-600' : 'text-white'}`} />
              </button>
              <p className="text-sm font-medium text-orange-900">{!isEnabled ? (sessionStatus === 'CONNECTING' ? 'Connecting…' : 'Voice Unavailable') : 'Press hold to talk'}</p>
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
    </div>
  );
} 