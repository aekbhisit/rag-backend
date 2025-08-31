"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useWebRTCConnection } from '@/app/hooks/useWebRTCConnection';
import { UniversalMessage } from '@/app/types';
import { useMessageHistory } from './MessageHistory';
import { MicrophoneIcon, SpeakerWaveIcon, SpeakerXMarkIcon, UserIcon, CpuChipIcon, UserGroupIcon, TrashIcon } from '@heroicons/react/24/outline';

interface VoiceChatInterfaceProps {
  sessionId: string;
  activeChannel: 'normal' | 'realtime' | 'human';
  onChannelSwitch: (channel: 'normal' | 'realtime' | 'human') => void;
  onVoiceResponse: (message: UniversalMessage) => void;
  // Agent integration props
  selectedAgentName?: string;
  selectedAgentConfigSet?: any[] | null;
  onAgentTransfer?: (agentName: string) => void;
}

export default function VoiceChatInterface({ 
  sessionId, 
  activeChannel,
  onChannelSwitch,
  onVoiceResponse,
  selectedAgentName = 'GPT-4o Voice',
  selectedAgentConfigSet = null,
  onAgentTransfer
}: VoiceChatInterfaceProps) {
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
  
  // Add duplicate transcription detection
  const processedTranscripts = useRef<Set<string>>(new Set());
  const lastTranscriptTime = useRef<number>(0);
  
  // Add unified message ID system to prevent duplicates
  const processedAIResponses = useRef<Set<string>>(new Set());
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
  // PTT-turn refs
  const pttTurnIdRef = useRef<string | null>(null);
  const pttHadAudioRef = useRef<boolean>(false);
  const turnUserItemIdRef = useRef<string | null>(null);
  const isResponseActiveRef = useRef<boolean>(false);
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
    
    const lowerText = text.toLowerCase().trim();
    
    // Thai language patterns
    const thaiPattern = /[\u0E00-\u0E7F]/;
    if (thaiPattern.test(text)) {
      return 'th-TH';
    }
    
    // Vietnamese language patterns
    const vietnamesePattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    if (vietnamesePattern.test(text)) {
      return 'vi-VN';
    }
    
    // Japanese language patterns
    const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    if (japanesePattern.test(text)) {
      return 'ja-JP';
    }
    
    // Korean language patterns
    const koreanPattern = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
    if (koreanPattern.test(text)) {
      return 'ko-KR';
    }
    
    // Chinese language patterns
    const chinesePattern = /[\u4E00-\u9FAF]/;
    if (chinesePattern.test(text)) {
      return 'zh-CN';
    }
    
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

      // Enhanced API call with agent context
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
      const assistantContent = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
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
      addMessage(aiMessage);
      onVoiceResponse(aiMessage);

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
    
    // Skip events that should be handled by useHandleServerEvent to prevent duplication
    const EVENTS_HANDLED_BY_SERVER_EVENT_HOOK = [
      'session.created',
      'output_audio_buffer.started', 
      'output_audio_buffer.stopped',
      'response.done',
      'response.output_item.done'
    ];
    
    if (EVENTS_HANDLED_BY_SERVER_EVENT_HOOK.includes(event.type)) {
      // console.debug('[VoiceChat] Skipping event handled by useHandleServerEvent:', event.type);
      return;
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
            agentName: selectedAgentName,
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
      // console.debug('[VoiceChat] 🔄 AI response delta:', event.delta);

      // Ensure we have a placeholder bound to the server item_id (idempotent)
      const rawItemId = (event as any).item_id || currentStreamingMessageId.current;
      const aliasId = rawItemId ? (aiItemAliasRef.current[rawItemId] || rawItemId) : null;
      const aiItemId = aliasId as string | null;
      if (aiItemId) {
        // If we already have a bubble for this response and it differs, alias this id to that bubble
        if (currentResponseBubbleIdRef.current && currentResponseBubbleIdRef.current !== aiItemId) {
          aiItemAliasRef.current[aiItemId] = currentResponseBubbleIdRef.current;
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
        const previous = messages.find(m => m.id === (aiItemId || currentStreamingMessageId.current));
        const updatedMessage: UniversalMessage = {
          id: (aiItemId || currentStreamingMessageId.current)!,
          sessionId,
          timestamp: previous?.timestamp || new Date().toISOString(),
          type: 'text',
          content: streamingContent.current,
          metadata: {
            source: 'ai',
            channel: 'realtime',
            language: 'en',
            agentName: selectedAgentName,
            originalEventType: event.type,
            isStreaming: true,
            streamSeq: String(currentStreamSeqRef.current),
            seq: (previous?.metadata as any)?.seq ?? ++messageSequenceRef.current
          }
        };
        updateMessage(updatedMessage);
      }
    }
    
    // Create AI placeholder with item_id as soon as it is known (idempotent)
    if (event.type === 'response.output_item.added' || event.type === 'response.content_part.added') {
      const aiItemId = (event as any).item?.id || (event as any).item_id;
      if (!aiItemId) return;
      // Only handle assistant message items; ignore other types
      const item = (event as any).item;
      const isAssistantMessage = item && item.type === 'message' && item.role === 'assistant';
      if (!isAssistantMessage) {
        return;
      }

      // If we already have a visible streaming bubble for this response, alias the new id to it to avoid a second bubble
      if (currentResponseBubbleIdRef.current && currentResponseBubbleIdRef.current !== aiItemId) {
        aiItemAliasRef.current[aiItemId] = currentResponseBubbleIdRef.current;
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
      
      console.log(`[VoiceChat-TRACK] 🟡 conversation.item.created EVENT - Role: ${role}, ItemID: ${itemId}, Text: "${text}", CurrentMessages: ${messages.length}`);
      
      // Only handle user messages (skip system and assistant)
      if (role === 'user' && itemId) {
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
        
        // Update session language if different from current
        if (detectedLanguage !== currentLanguage && detectedLanguage !== 'auto') {
          console.log(`[VoiceChat] Language changed from ${currentLanguage} to ${detectedLanguage}, updating session`);
          setCurrentLanguage(detectedLanguage);
          
          // Send session update to OpenAI API with new language
          sendClientEvent({
            type: "session.update", 
            session: {
              instructions: `You must respond in the same language as the user's input. The user just spoke in ${detectedLanguage === 'th-TH' ? 'Thai' : detectedLanguage === 'vi-VN' ? 'Vietnamese' : 'English'}. Always match the user's language.`,
              modalities: ["text", "audio"],
              input_audio_transcription: {
                model: "whisper-1"
              }
            }
          }, "language_update");
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
          
          // Realtime handles AI response; skip agent completions in voice mode
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
                break;
              }
            }
            if (!targetId) {
              // No existing message (no deltas). Create one using first item id or a new id
              const firstId = itemIds[0] || generateMessageId();
              const newId = aiItemAliasRef.current[firstId] || currentResponseBubbleIdRef.current || firstId;
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
                  agentName: selectedAgentName,
                  isStreaming: false,
                  seq: ++messageSequenceRef.current
                }
              });
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

  // State for dynamic language
  const [currentLanguage, setCurrentLanguage] = useState<string>('en-US');
  
  // Initialize WebRTC connection
  const webRTCConnection = useWebRTCConnection({
    isAudioPlaybackEnabled: isAudioEnabled,
    handleServerEvent,
    urlCodec: 'opus',
    urlModel: 'gpt-4o-realtime-preview-2024-12-17',
    language: currentLanguage // Use dynamic language
  });

  const {
    sessionStatus,
    connectToRealtime,
    sendClientEvent
  } = webRTCConnection;

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
      try { sendClientEvent({ type: 'input_audio_buffer.clear' }); } catch {}
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
        sendClientEvent({ type: 'input_audio_buffer.commit' });
        if (!isResponseActiveRef.current) {
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
      
      // Send text message via realtime API
      sendClientEvent({
        type: "conversation.item.create",
        item: {
          id: messageId,
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: text.trim() }]
        }
      });
      
      sendClientEvent({ type: "response.create" });
      
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
    }
  }, [sessionStatus, sendClientEvent, sessionId, addMessage]);

  const getStatusColor = () => {
    switch (sessionStatus) {
      case 'CONNECTED': return 'text-green-600';
      case 'CONNECTING': return 'text-yellow-600';
      default: return 'text-red-600';
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
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            activeChannel === 'normal' ? 'bg-blue-500' :
            activeChannel === 'realtime' ? 'bg-green-500' :
            'bg-purple-500'
          }`}></div>
          <h3 className="font-medium text-gray-800">
            {getChannelInfo(activeChannel).name}
          </h3>
          <span className={`text-sm ${getStatusColor()}`}>
            • {getStatusText()}
            {connectionError && (
              <span className="text-red-600 ml-1">• {connectionError}</span>
            )}
          </span>
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
            className={`p-2 rounded-md transition-colors ${
              isAudioEnabled 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
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
                className={`p-2 rounded-md transition-colors ${
                  activeChannel === channel
                    ? `bg-${info.color}-100 text-${info.color}-700`
                    : 'bg-white text-gray-400 hover:text-gray-600'
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
          <div className="flex flex-col items-center justify-center text-gray-600" style={{ minHeight: '300px' }}>
            <div className="text-4xl mb-4">🎤</div>
            <p className="text-lg font-medium mb-2 text-gray-700">Voice Chat Mode</p>
            <p className="text-sm text-center text-gray-600 mb-4">
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
                  ? 'bg-blue-500 text-white' 
                  : message.metadata.source === 'ai'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-500 text-white'
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
                  className={`inline-block p-3 rounded-lg ${
                  message.metadata.source === 'user'
                    ? 'bg-blue-500 text-white'
                    : message.type === 'system'
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-green-100 text-gray-900'
                }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.metadata.channel === 'realtime' && message.metadata.source === 'user' && (
                    <span className="text-xs opacity-75 block mt-1">🎤 Voice input</span>
                  )}
                  {message.metadata.channel === 'realtime' && message.metadata.source === 'ai' && (
                    <span className="text-xs opacity-75 block mt-1">🔊 Voice response</span>
                  )}
                </div>
                <div className={`text-xs text-gray-600 mt-1 ${
                  message.metadata.source === 'user' ? 'text-right' : 'text-left'
                }`}>
                  {formatTime(message.timestamp)}
                  {message.metadata.agentName && (
                    <span className="ml-2 text-gray-500">• {message.metadata.agentName}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Controls */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        {(() => {
          const isEnabled = sessionStatus === 'CONNECTED';
          return (
            <div className="flex flex-col items-center justify-center gap-2" style={{ minHeight: 96 }}>
              {/* Push-to-Talk Row: identical layout for enabled/disabled to avoid height jumps */}
              <div className="flex items-center justify-center space-x-6">
                <button
                  onMouseDown={isEnabled ? handlePTTStart : undefined}
                  onMouseUp={isEnabled ? handlePTTEnd : undefined}
                  onTouchStart={isEnabled ? handlePTTStart : undefined}
                  onTouchEnd={isEnabled ? handlePTTEnd : undefined}
                  disabled={!isEnabled}
                  aria-disabled={!isEnabled}
                  className={`w-16 h-16 rounded-full border-4 transition-all duration-200 ${
                    !isEnabled
                      ? 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed'
                      : isPTTActive
                        ? 'bg-red-500 border-red-600 scale-110 shadow-lg'
                        : 'bg-green-500 border-green-600 hover:bg-green-600 hover:scale-105'
                  }`}
                  title={isEnabled ? 'Hold to talk' : (sessionStatus === 'CONNECTING' ? 'Connecting…' : 'Voice unavailable')}
                >
                  <MicrophoneIcon className={`w-6 h-6 mx-auto ${!isEnabled ? 'text-gray-400' : 'text-white'}`} />
                </button>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-800">
                    {!isEnabled ? (sessionStatus === 'CONNECTING' ? 'Connecting…' : 'Voice Unavailable') : (isPTTActive ? 'Listening…' : 'Hold to Talk')}
                  </p>
                  <p className="text-xs text-gray-600">
                    {!isEnabled
                      ? (connectionError || 'Please wait while the voice service connects')
                      : (isPTTActive ? 'Release when finished' : 'Press and hold microphone')}
                  </p>
                </div>
              </div>
              {/* How to use hint - shown in both states for consistent height */}
              <div className="text-xs text-gray-500">
                <span className="hidden sm:inline">Tip:</span> Hold to speak • Release to send • Use text box below anytime
              </div>
            </div>
          );
        })()}
      </div>

      {/* Text Input */}
      <div className="p-4 border-t border-gray-200">
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
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-600 text-gray-900 placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={sessionStatus !== 'CONNECTED'}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
        
        {/* Status */}
        <div className="mt-2 text-xs text-gray-600 flex items-center justify-between">
          <span>
            Voice Chat • {sessionStatus === 'CONNECTED' ? 'Ready' : 'Connecting...'}
          </span>
          {sessionStatus === 'CONNECTED' && (
            <span className="text-green-700 font-medium">🎤 Voice & Text Ready</span>
          )}
        </div>
      </div>
    </div>
  );
} 