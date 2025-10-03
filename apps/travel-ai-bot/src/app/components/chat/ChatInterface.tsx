"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UniversalMessage } from '@/app/types';
import { PaperAirplaneIcon, UserIcon, CpuChipIcon, UserGroupIcon, TrashIcon, ArrowsRightLeftIcon, MapPinIcon, TruckIcon, HomeIcon, ShieldCheckIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { useMessageHistory } from './MessageHistory';
import HumanChatInterface from './HumanChatInterface';
import VoiceChatInterface from './VoiceChatInterface';

import { allAgentSets, defaultAgentSetKey } from '@/app/agents';
import { useDbAgentSets } from '@/app/hooks/useDbAgentSets';
import { getOrCreateDbSession, clearCurrentSession } from '@/app/lib/sharedSessionManager';
import { useTenantAiConfig } from '@/app/hooks/useTenantAiConfig';
import { TextStreamTransport } from '@/app/lib/textstream/transport';
import { buildTextStreamUrl } from '@/app/lib/textstream/sessionAuth';
import { TextResponseMerger } from '@/app/lib/textstream/responseQueue';
import { logMessage } from '@/app/lib/loggerClient';
import { callAgentCompletions } from '@/app/lib/callCompletions';
import { useContentExtraction, ExtractedContent } from '@/app/hooks/useContentExtraction';
import { getApiUrl } from '@/app/lib/apiHelper';

// Custom microphone icon component
const MicrophoneIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
  </svg>
);

interface ChatInterfaceProps {
  sessionId: string;
  activeChannel: 'normal' | 'realtime' | 'human' | 'line';
  onChannelSwitch: (channel: 'normal' | 'realtime' | 'human') => void;
  isProcessing: boolean;
  agentSetKey?: string;
  agentName?: string;
  baseLanguage?: string; // Language from UI selector
  // Bubble agent selection to page (updates header select label)
  onAgentSelected?: (setKey: string, agentName: string) => void;
}

export default function ChatInterface({ 
  sessionId, 
  activeChannel, 
  onChannelSwitch, 
  isProcessing,
  agentSetKey: providedAgentSetKey,
  agentName: providedAgentName,
  baseLanguage = 'en',
  onAgentSelected,
}: ChatInterfaceProps) {
  const { agentSets: dbAgentSets, loading: agentSetsLoading } = useDbAgentSets();
  const dynamicAgentSets = Object.keys(dbAgentSets).length > 0 ? dbAgentSets : allAgentSets;
  const { messages, addMessage, clearMessages, updateMessage } = useMessageHistory(sessionId);
  const { config: tenantAiConfig } = useTenantAiConfig();
  const { extractContent } = useContentExtraction();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localChannel, setLocalChannel] = useState<'normal' | 'realtime' | 'human'>(
    activeChannel === 'line' ? 'normal' : activeChannel
  );
  const HUMAN_MODE_ENABLED = typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_HUMAN_MODE_ENABLED === 'true');
  const channelOptions = (HUMAN_MODE_ENABLED ? (['normal', 'realtime', 'human'] as const) : (['normal', 'realtime'] as const));

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sseTransportRef = useRef<TextStreamTransport | null>(null);
  const currentStreamingMessageIdRef = useRef<string | null>(null);
  const currentPlaceholderRef = useRef<UniversalMessage | null>(null);
  const suppressSseRef = useRef<boolean>(false);
  const lastUserTextRef = useRef<string>('');
  const sseServerLoggedRef = useRef<boolean>(false);
  const loggedAssistantKeysRef = useRef<Set<string>>(new Set());
  const shouldLogOnce = useCallback((store: React.MutableRefObject<Set<string>>, key: string) => {
    try {
      const k = key.trim();
      if (!k) return false;
      if (store.current.has(k)) return false;
      if (store.current.size > 200) store.current.clear();
      store.current.add(k);
      return true;
    } catch { return true; }
  }, []);

  // Persist active agent across messages (updated on transfer)
  const [activeAgentSetKeyState, setActiveAgentSetKeyState] = useState<string>(providedAgentSetKey || defaultAgentSetKey);
  const [activeAgentNameState, setActiveAgentNameState] = useState<string | null>(providedAgentName || null);

  // Get user's current location
  const [userLocation, setUserLocation] = useState<{ lat: number; long: number } | null>(null);
  const [conversationId, setConversationId] = useState<string>('');

  // Request user location
  const requestLocation = useCallback(async (): Promise<{ lat: number; long: number } | null> => {
    if (userLocation) return userLocation;
    
    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        const location = await new Promise<{ lat: number; long: number }>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, long: pos.coords.longitude }),
            (error) => {
              console.warn('[ChatInterface] Location access denied or failed:', error);
              reject(error);
            },
            { timeout: 10000, enableHighAccuracy: false }
          );
        });
        setUserLocation(location);
        return location;
      }
    } catch (error) {
      console.warn('[ChatInterface] Location request failed:', error);
    }
    return null;
  }, [userLocation]);

  // Smooth scroll to bottom
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep local channel in sync with parent prop changes
  useEffect(() => {
    if (activeChannel === 'line') {
      setLocalChannel('normal'); // Map 'line' to 'normal'
    } else {
      setLocalChannel(activeChannel);
    }
  }, [activeChannel]);

  // Do not auto-enable mic on channel switch; user must trigger mic explicitly
  useEffect(() => {
    // Intentionally no-op to avoid implicit mic activation
  }, [localChannel]);

  // Simple: Get or create conversation ID using shared session manager
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const dbSessionId = await getOrCreateDbSession(sessionId, 'text');
        setConversationId(dbSessionId);
        
      } catch (err) {
        console.warn(`[ChatInterface] ❌ Failed to get session, using frontend session:`, err);
        setConversationId(sessionId);
      }
    };
    
    initializeSession();
  }, []); // Only run once on mount

  // Reset assistant dedup when conversation changes
  useEffect(() => {
    try { loggedAssistantKeysRef.current.clear(); } catch {}
  }, [conversationId]);

  // Handle browser close/refresh - end session
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (conversationId) {
        // Use sendBeacon for reliable delivery even when page is closing
        // Note: sendBeacon doesn't support custom headers, so we'll use a different approach
        const formData = new FormData();
        formData.append('tenantId', process.env.TENANT_ID || '00000000-0000-0000-0000-000000000000');
        navigator.sendBeacon(getApiUrl('/api/admin/sessions/' + encodeURIComponent(conversationId) + '/end'), formData);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [conversationId]);



  // NOTE: Removed inappropriate admin API calls from frontend
  // Backend should handle session/message logging internally in chat API endpoints
  // Frontend should NOT call admin APIs directly

  const generateMessageId = () => {
    try {
      if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
        return (crypto as any).randomUUID().slice(0, 32);
      }
    } catch {}
    return uuidv4().replace(/-/g, '').slice(0, 32);
  };

  // Get agent-specific icon
  const getAgentIcon = (agentName?: string) => {
    switch (agentName) {
      case 'placeGuide':
        return MapPinIcon;
      case 'tourTaxi':
        return TruckIcon;
      case 'thaiResortGuide':
        return HomeIcon;
      case 'authentication':
      case 'frontDeskAuthentication':
        return ShieldCheckIcon;
      case 'welcomeAgent':
      default:
        return CpuChipIcon; // Default for text mode
    }
  };

  // Channel display info
  const getChannelInfo = (channel: string) => {
    switch (channel) {
      case 'normal': return { name: 'Text Chat', icon: ChatBubbleLeftRightIcon, color: 'blue' };
      case 'realtime': return { name: 'Voice Chat', icon: MicrophoneIcon, color: 'green' };
      case 'human': return { name: 'Human Support', icon: UserGroupIcon, color: 'purple' };
      default: return { name: 'Unknown', icon: CpuChipIcon, color: 'gray' };
    }
  };

  // Time formatter
  const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Debug helpers
  const preview = (text: unknown, max = 200) => {
    const str = typeof text === 'string' ? text : JSON.stringify(text);
    if (!str) return '';
    return str.length > max ? `${str.slice(0, max)}…` : str;
  };

  // Client-side content extraction function
  const extractContentFromDOM = async (scope: string, limit: number, detail: boolean): Promise<ExtractedContent[]> => {
    console.log(`[ExtractContentFromDOM] Extracting content for scope: ${scope}, limit: ${limit}, detail: ${detail}`);
    return extractContent(scope, limit, detail);
  };

  // Handle UI tool execution from SSE
  const handleUIToolExecution = async (toolName: string, args: any) => {
    console.log(`[UI Tool Execution] Executing ${toolName} with args:`, args);
    
    // Get agent configuration for this tool execution
    const setKey = activeAgentSetKeyState || defaultAgentSetKey;
    const allInSet = dynamicAgentSets[setKey] || [];
    const targetName = activeAgentNameState || (allInSet[0]?.name || 'welcomeAgent');
    const agentConfig = allInSet.find((a: { name: string }) => a.name === targetName) || allInSet[0];
    
    try {
      if (toolName === 'navigate') {
        const { uri } = args;
        if (uri && typeof uri === 'string') {
          console.log(`[UI Tool Execution] Navigating to: ${uri}`);
          
          // Update URL with content parameter
          const url = new URL(window.location.href);
          const params = new URLSearchParams(url.search);
          params.delete('content');
          const query = params.toString();
          const next = `${url.origin}${url.pathname}${query ? `?${query}&` : '?'}content=${uri}${url.hash || ''}`;
          
          console.log('[UI Tool Execution] Updating URL to:', next);
          window.history.pushState({}, '', next);
          
          // Dispatch a custom event to notify the travel page component
          window.dispatchEvent(new CustomEvent('navigate', { detail: { uri } }));
          
          console.log('[UI Tool Execution] Navigation completed successfully');
        } else {
          console.error('[UI Tool Execution] Invalid URI for navigation:', uri);
        }
      } else if (toolName === 'extractContent') {
        const { scope, limit = 10, detail = false } = args;
        console.log(`[UI Tool Execution] Extracting content for scope: ${scope}`);
        // Prevent current SSE reply from finalizing; we'll replace with follow-up
        suppressSseRef.current = true;
        
        const extracted = await extractContentFromDOM(scope, limit, detail);
        console.log('[UI Tool Execution] Content extracted:', extracted);
        
        // Send the extracted content back to the model for processing
        // This allows the model to provide a proper response based on the extracted content
        try {
          // Get the current page from URL to provide context
          const urlParams = new URLSearchParams(window.location.search);
          const currentPage = urlParams.get('content') || window.location.pathname;
          
          // Format the extracted content for the model
          const extractedContentText = extracted.map(item => 
            `${item.title ? `${item.title}: ` : ''}${item.content}`
          ).join('\n');
          
          // Send the extracted content to backend silently (no chat bubble)
          await fetch('/services/chat/agent-completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentName: agentConfig?.name || 'welcomeAgent',
              agentKey: agentConfig?.key || 'welcomeAgent',
              agentSetKey: setKey,
              sessionId: conversationId || sessionId,
              channel: localChannel,
              // Build neutral follow-up using the user's last utterance + page data
              userText: `${lastUserTextRef.current || ''}\n\ndata extracted from ${currentPage}:\n${extractedContentText}`.trim()
            })
          })
          .then(async (res) => {
            if (!res.ok) return;
            // Suppress SSE stream and display follow-up response as final
            suppressSseRef.current = true;
            const data = await res.json();
            const text = data?.choices?.[0]?.message?.content || '';
            if (text && currentPlaceholderRef.current) {
              const finalized: UniversalMessage = {
                ...currentPlaceholderRef.current,
                content: text,
                metadata: { ...currentPlaceholderRef.current.metadata, isStreaming: false }
              } as UniversalMessage;
              updateMessage(finalized);
              currentPlaceholderRef.current = null;
              setIsLoading(false);
            }
          })
          .catch(() => {});
          
        } catch (error) {
          console.error('[UI Tool Execution] Error processing extracted content:', error);
        }
      } else if (toolName === 'selectItem') {
        const { itemType, index } = args;
        console.log(`[UI Tool Execution] Selecting item: ${itemType} at index ${index}`);
        
        // Implement item selection logic here
        // This could involve highlighting items, opening modals, etc.
      } else {
        console.warn(`[UI Tool Execution] Unknown UI tool: ${toolName}`);
      }
    } catch (error) {
      console.error(`[UI Tool Execution] Error executing ${toolName}:`, error);
    }
  };



  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !conversationId) return;
    
    // Clear input and set loading immediately to prevent duplicate calls
    setInputValue('');
    setIsLoading(true);
    // Reset SSE suppression for a fresh turn
    suppressSseRef.current = false;
    
    const userMessage: UniversalMessage = {
      id: generateMessageId(),
      sessionId,
      timestamp: new Date().toISOString(),
      type: 'text',
      content: content.trim(),
      metadata: { source: 'user', channel: activeChannel, language: 'en' }
    };
    addMessage(userMessage);
    lastUserTextRef.current = content.trim();
    
    // Log user message to backend
    await logMessage({ sessionId: conversationId, role: 'user', type: 'text', content: content.trim(), channel: activeChannel, meta: { language: 'en' } });
    
    setTimeout(scrollToBottom, 50);

    try {
      const channel = localChannel;
      if (channel === 'realtime') {
        const voiceMessage: UniversalMessage = {
          id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'system',
          content: 'Voice mode is not yet fully implemented. The text message has been processed in text mode for now. Please switch to "Text Chat" for full functionality.',
          metadata: { source: 'ai', channel: channel, language: 'en' }
        };
        addMessage(voiceMessage);
        setIsLoading(false);
        return;
      }

      if (localChannel === 'human') {
        // Human flow handled by HumanChatInterface; do not process here
        setIsLoading(false);
        return;
      }

      // === New SSE streaming path for text mode ===
      const TEXT_SSE_ENABLED = typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_TEXT_SSE_ENABLED === 'true');
      if (localChannel === 'normal' && TEXT_SSE_ENABLED) {
        try { sseTransportRef.current?.close(); } catch {}

        // Resolve current agent config to pass agent key/name
        const setKey = activeAgentSetKeyState || defaultAgentSetKey;
        const allInSet = dynamicAgentSets[setKey] || [];
        const targetName = activeAgentNameState || (allInSet[0]?.name || 'welcomeAgent');
        const agentConfig = allInSet.find((a: { name: string }) => a.name === targetName) || allInSet[0];
        console.log('[SSE] ▶ start', { setKey, agentName: agentConfig?.name, agentKey: agentConfig?.key });

        // Request location if not already available (for place-related queries)
        let location = null;
        if (content.toLowerCase().includes('ใกล้') || content.toLowerCase().includes('near') || content.toLowerCase().includes('cafe') || content.toLowerCase().includes('restaurant') || content.toLowerCase().includes('place')) {
          location = await requestLocation();
          console.log('[ChatInterface] 📍 Location requested for place query:', location);
        }

        // Create AI streaming placeholder after location request
        const phId = `ai-stream-${generateMessageId()}`;
        const placeholder: UniversalMessage = {
          id: phId,
          sessionId,
          timestamp: new Date().toISOString(),
          type: 'text',
          content: '',
          metadata: {
            source: 'ai',
            channel: 'normal',
            language: baseLanguage,
            isStreaming: true,
            agentName: activeAgentNameState || agentConfig?.name || 'welcomeAgent'
          } as any
        };
        addMessage(placeholder);
        currentStreamingMessageIdRef.current = phId;
        currentPlaceholderRef.current = placeholder;

        const merger = new TextResponseMerger();
        
        // Get the current page from URL params or pathname
        const urlParams = new URLSearchParams(window.location.search);
        const currentPage = urlParams.get('content') || window.location.pathname;
        console.log('[ChatInterface] Current page detected:', currentPage);
        
        const url = buildTextStreamUrl({
          sessionId: conversationId || sessionId,
          agentSetKey: setKey,
          agentName: agentConfig?.name,
          agentKey: agentConfig?.key,
          language: baseLanguage,
          text: content.trim(),
          lat: location?.lat,
          long: location?.long,
          currentPage: currentPage
        });

        const transport = new TextStreamTransport({
          onOpen: () => {
            console.log('[SSE] ✔ open', { url });
          },
          onError: (e) => {
            console.error('[ChatInterface] SSE error', e);
            const errMsg: UniversalMessage = {
              id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'system',
              content: 'Sorry, there was a streaming error. Please try again.',
              metadata: { source: 'ai', channel: 'normal', language: 'en' }
            };
            addMessage(errMsg);
            setIsLoading(false);
          },
          onResponseStart: () => {
            console.log('[SSE] event: response_start');
            try { sseServerLoggedRef.current = false; } catch {}
            // already created placeholder
          },
          onDelta: (delta) => {
            if (suppressSseRef.current) return;
            console.debug('[SSE] event: delta', preview(delta));
            const merged = merger.append(delta);
            const existing = {
              ...(currentPlaceholderRef.current || placeholder),
              content: merged,
              metadata: { ...((currentPlaceholderRef.current || placeholder).metadata), isStreaming: true }
            } as UniversalMessage;
            updateMessage(existing);
            currentPlaceholderRef.current = existing;
          },
          onResponseDone: async (finalText, agentName) => {
            if (suppressSseRef.current) {
              setIsLoading(false);
              return;
            }
            console.log('[SSE] event: response_done', { agentName, text: preview(finalText) });
            const existing = {
              ...(currentPlaceholderRef.current || placeholder),
              content: finalText,
              metadata: { ...((currentPlaceholderRef.current || placeholder).metadata), isStreaming: false, agentName: agentName || (activeAgentNameState || 'welcomeAgent') }
            } as UniversalMessage;
            updateMessage(existing);
            currentPlaceholderRef.current = null;
            setIsLoading(false);
            // Log assistant response to backend unless server already logged via agent-completions
            if (!sseServerLoggedRef.current) {
              const key = `${conversationId}|assistant|${(finalText || '').trim()}`;
              if (shouldLogOnce(loggedAssistantKeysRef, key)) {
                await logMessage({ sessionId: conversationId, role: 'assistant', type: 'text', content: (finalText || '').trim(), channel: 'normal', meta: { agentName: agentName || (activeAgentNameState || '') } });
              }
            }
          },
          onAgentTransfer: (name) => {
            console.log('[SSE] event: agent_transfer', { agentName: name });
            // Future: update active agent from SSE event
            setActiveAgentNameState(name);
            try { onAgentSelected?.(activeAgentSetKeyState, name); } catch {}
          },
          onDebug: (info: any) => {
            try {
              if (info?.type === 'tools') {
                console.log('[SSE][debug] tools', info);
              } else if (info?.type === 'tool_call_delta') {
                console.log('[SSE][debug] tool_call_delta', info);
              } else if (info?.type === 'tool_calls_summary') {
                console.log('[SSE][debug] tool_calls_summary', info);
              } else if (info?.type === 'agent_completions_start' || info?.type === 'agent_completions_result' || info?.type === 'agent_completions_error') {
                console.log('[SSE][debug] agent_completions', info);
                if (info?.type === 'agent_completions_result') { sseServerLoggedRef.current = true; }
              } else if (info?.type === 'ui_tool_execute') {
                console.log('[SSE][debug] ui_tool_execute', info);
                // Execute UI tool on client side
                handleUIToolExecution(info.toolName, info.args);
              } else {
                console.log('[SSE][debug]', info);
              }
            } catch {}
          }
        });
        sseTransportRef.current = transport;
        transport.open(url);
        return;
      }

      // Resolve agent config from DB-provided set
      const setKey = activeAgentSetKeyState || defaultAgentSetKey;
      const allInSet = dynamicAgentSets[setKey] || [];
      const targetName = activeAgentNameState || (allInSet[0]?.name || '');
      const agentConfig = allInSet.find((a: { name: string }) => a.name === targetName) || allInSet[0];
      const agentInstructions = agentConfig?.instructions || 'You are a helpful assistant.';
      let agentTools = Array.isArray(agentConfig?.tools) ? agentConfig!.tools : [];
      
      
      // Tools are DB-driven; avoid client-side injection
      const isFirstTurn = messages.length === 0 || !messages.some(m => m.metadata.source !== 'user');
      let mergedTools = [...(agentTools || [])];
      // Do not set tool_choice based on specific agent names

      console.log('[CMP] ▶ request', { setKey, agentName: agentConfig?.name || targetName, tools: (agentTools || []).map((t: any) => t?.function?.name).filter(Boolean) });
      const data = await callAgentCompletions({
        model: tenantAiConfig?.model || 'gpt-4o',
        agentName: agentConfig?.name || targetName,
        agentKey: agentConfig?.key || agentConfig?.name || targetName,
        agentSetKey: setKey,
        sessionId: conversationId,
        messages: [
          { role: 'system', content: agentInstructions },
          ...messages.slice(-10).map(msg => ({ role: msg.metadata.source === 'user' ? 'user' : 'assistant', content: msg.content })),
          { role: 'user', content: content.trim() }
        ],
        tools: mergedTools,
        temperature: tenantAiConfig?.temperature,
        max_tokens: tenantAiConfig?.maxTokens
      });

      
      
      const toolCalls = data.choices?.[0]?.message?.tool_calls;
      const assistantContentRaw = data.choices?.[0]?.message?.content;
      console.log('[CMP] ◀ response', { text: preview(assistantContentRaw), toolCalls: (toolCalls || []).map((tc: any) => tc?.function?.name) });
      const assistantContent = (assistantContentRaw && String(assistantContentRaw).trim()) ? assistantContentRaw : '';
      
      

      // Handle transfer tool calls if present
      if (toolCalls && toolCalls.length > 0) {
        
        for (const toolCall of toolCalls) {
          
          if (toolCall.function?.name && String(toolCall.function.name).startsWith('transfer_to_')) {
            console.log('[TOOL] transfer', { name: toolCall.function.name, args: preview(toolCall.function.arguments) });
            try {
              const fnName = String(toolCall.function.name);
              const destination = fnName.replace('transfer_to_', '');
              const args = (() => { try { return JSON.parse(toolCall.function.arguments || '{}'); } catch { return {}; } })();
              const explain = args.rationale_for_transfer || 'Transferring to a more suitable agent.';
              
              // Do not add a separate transfer bubble; we'll show icon atop next agent reply

              // Log internal transfer message for auditing (not user-visible)
              try {
                const meta: any = {
                  is_internal: true,
                  source: 'transfer',
                  from_agent: agentConfig?.name || targetName,
                  to_agent: destination,
                  conversation_context: typeof args.conversation_context === 'string' ? args.conversation_context : undefined
                };
                const { logMessage } = await import('@/app/lib/loggerClient');
                await logMessage({ sessionId: conversationId, role: 'system', type: 'system', content: `Internal transfer initiated to ${destination}. Rationale: ${explain}`, channel: localChannel, meta });
              } catch {}

              // Resolve destination agent across sets
              let nextSetKey = providedAgentSetKey || defaultAgentSetKey;
              let nextAgent = (dynamicAgentSets[nextSetKey] || []).find((a: { name: string }) => a.name === destination) || null;
              if (!nextAgent) {
                for (const [setKey, setAgents] of (Object.entries(dynamicAgentSets) as Array<[string, Array<{ name: string }>] >)) {
                  const found = setAgents.find((a) => a.name === destination);
                  if (found) { nextAgent = found; nextSetKey = setKey; break; }
                }
              }
              

              // Compose follow-up request for the destination agent
              const followUserText = (typeof args.conversation_context === 'string' && args.conversation_context.trim())
                ? args.conversation_context
                : content.trim();

              if (nextAgent) {
                // In voice mode (realtime), set new agent and trigger a follow-up response
                if (localChannel === 'realtime') {
                  setActiveAgentSetKeyState(nextSetKey);
                  setActiveAgentNameState(nextAgent.name);
                  // Still need to get a response from the new agent in voice mode
                  
                }
                // Continue to get response from the new agent (both text and voice mode)
                const nextInstructions = nextAgent.instructions || '';
                const nextTools = Array.isArray(nextAgent.tools) ? nextAgent.tools : [];
                
                console.log('[CMP] ▶ follow-up for destination agent', { agent: nextAgent.name, tools: (nextTools || []).map((t: any) => t?.function?.name).filter(Boolean) });
                const follow = await fetch('/api/chat/agent-completions', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    model: tenantAiConfig?.model || 'gpt-4o',
                    agentName: nextAgent.name,
                    agentKey: nextAgent.key || nextAgent.name,
                    agentSetKey: nextSetKey,
                    sessionId: conversationId || sessionId,
          
                    messages: [
                      { role: 'system', content: `${nextInstructions}\n\nCurrent conversation context: You are communicating through the ${activeChannel} channel.` },
                      ...messages.slice(-10).map(msg => ({ role: msg.metadata.source === 'user' ? 'user' : 'assistant', content: msg.content })),
                      { role: 'user', content: followUserText }
                    ],
                    ...(nextTools.length > 0 ? { tools: nextTools } : {}),
                    temperature: tenantAiConfig?.temperature || 0.7, max_tokens: tenantAiConfig?.maxTokens || 4000
                  })
                });
                
                if (follow.ok) {
                  const nextData = await follow.json();
                  
  
                  const nextTextRaw = nextData.choices?.[0]?.message?.content;
                  console.log('[CMP] ◀ follow-up response', { text: preview(nextTextRaw), toolCalls: (nextData.choices?.[0]?.message?.tool_calls || []).map((tc: any) => tc?.function?.name) });
                  const nextText = (nextTextRaw && String(nextTextRaw).trim()) ? nextTextRaw : '';
                  const nextToolCalls = nextData.choices?.[0]?.message?.tool_calls;
                  if (nextText) {
                    const nextMsg: UniversalMessage = {
                      id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'text', content: nextText,
                      // Only mark mappedFrom if this was a genuine transfer (not initial welcome)
                      metadata: { source: 'ai', channel: localChannel, language: 'en', agentName: nextAgent.name, ...(destination ? { mappedFrom: `agent-transfer:${destination}` } : {}) }
                    };
                    addMessage(nextMsg);
                  } else if (nextToolCalls && nextToolCalls.length > 0) {
                    
                    try {
                      const executedToolMessages: Array<{ role: 'tool'; content: string; tool_call_id: string }> = [];
                      for (const tc of nextToolCalls) {
                        if (!tc?.function?.name) continue;
                        const fnName = tc.function.name as string;
                        const fnArgs = (() => { try { return JSON.parse(tc.function.arguments || '{}'); } catch { return {}; } })();
                        console.log('[TOOL] exec', { name: fnName, args: preview(fnArgs) });
                        const impl = nextAgent?.toolLogic && nextAgent.toolLogic[fnName];
                        if (typeof impl === 'function') {
                          const result = await impl(fnArgs, [] as any);
                          console.log('[TOOL] result', preview(result));
                          executedToolMessages.push({ role: 'tool', content: JSON.stringify(result ?? {}), tool_call_id: tc.id });
                        }
                      }
                      // 1) Prefer explicit fallback text from tools
                      if (executedToolMessages.length > 0) {
                        const first = JSON.parse(executedToolMessages[0].content || '{}');
                        if (typeof first?.fallbackText === 'string' && first.fallbackText.trim()) {
                          const nextMsg: UniversalMessage = {
                            id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'text', content: first.fallbackText,
                            metadata: { source: 'ai', channel: localChannel, language: 'en', agentName: nextAgent.name, mappedFrom: `agent-transfer:${destination}` }
                          };
                          addMessage(nextMsg);
                          setIsLoading(false);
                          return;
                        }
                      }
                      // 2) If no fallback text, perform a follow-up completion with tool outputs
                      const convo: any[] = [
                        { role: 'system', content: nextInstructions },
                        ...messages.slice(-10).map(msg => ({ role: msg.metadata.source === 'user' ? 'user' : 'assistant', content: msg.content })),
                        { role: 'user', content: followUserText },
                        { role: 'assistant', content: '', tool_calls: nextToolCalls },
                        ...executedToolMessages,
                      ];
                      
                      console.log('[CMP] ▶ follow-up after tools', { agent: nextAgent.name });
                      const follow2 = await fetch('/api/chat/agent-completions', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          model: tenantAiConfig?.model || 'gpt-4o',
                          agentName: nextAgent.name,
                          agentKey: nextAgent.key || nextAgent.name,
                          agentSetKey: nextSetKey,
                          sessionId: conversationId || sessionId,
                
                          messages: convo,
                          ...(nextTools.length > 0 ? { tools: nextTools } : {}),
                          temperature: tenantAiConfig?.temperature || 0.7, max_tokens: tenantAiConfig?.maxTokens || 4000
                        })
                      });
                      
                      if (follow2.ok) {
                        const nextData2 = await follow2.json();

                        const nextTextRaw2 = nextData2.choices?.[0]?.message?.content;
                        console.log('[CMP] ◀ follow-up after tools response', { text: preview(nextTextRaw2) });
                        const nextText2 = (nextTextRaw2 && String(nextTextRaw2).trim()) ? nextTextRaw2 : '';
                        if (nextText2) {
                          const nextMsg: UniversalMessage = {
                            id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'text', content: nextText2,
                            metadata: { source: 'ai', channel: localChannel, language: 'en', agentName: nextAgent.name, mappedFrom: `agent-transfer:${destination}` }
                          };
                          addMessage(nextMsg);
                          setIsLoading(false);
                          return;
                        }
                      }
                    } catch (err) {
                      console.warn('[ChatInterface] follow transfer tool handling failed', err);
                    }
                  }
                } else {
                  try { const errText = await follow.text(); console.warn('[ChatInterface] ⚠️ Follow-up not ok', follow.status, errText); } catch {}
                }
                // Persist new active agent for subsequent user messages
                setActiveAgentSetKeyState(nextSetKey);
                setActiveAgentNameState(nextAgent.name);
                
                // Send initial message from new agent after transfer
                setTimeout(() => {
                  try {
                    
                    
                    // Create a system message to introduce the new agent
                    const initialMessage: UniversalMessage = {
                      id: generateMessageId(),
                      sessionId,
                      timestamp: new Date().toISOString(),
                      type: 'system',
                      content: `Hello! I'm now your ${nextAgent.name} assistant. How can I help you today?`,
                      metadata: {
                        source: 'ai',
                        channel: localChannel,
                        language: 'en',
                        agentName: nextAgent.name
                      }
                    };
                    
                    addMessage(initialMessage);
                    
                    
                  } catch (error) {
                    console.error('[ChatInterface] ❌ Failed to send initial message from transferred agent:', error);
                  }
                }, 1000); // Delay to ensure the follow-up response is processed first
              }
              
              setIsLoading(false);
              return; // handled transfer path entirely
            } catch (err) {
              console.error('[ChatInterface] ❌ Transfer block error', err);
            }
          }
        }
      }

      
      if (!assistantContent || assistantContent.trim() === '') {
        
      }

      // Handle general tool calls (iterate: tool -> return to API -> (optional) tool -> return -> answer)
      if (toolCalls && toolCalls.length > 0) {
        
        try {
          const isTransfer = (tc: any) => typeof tc?.function?.name === 'string' && tc.function.name.startsWith('transfer_to_');
          
          let transferBackArgs: any | null = null;
          let navigateMainArgs: any | null = null;
          const executeToolCalls = async (tcList: any[], agent: any) => {
            const outputs: Array<{ role: 'tool'; content: string; tool_call_id: string }> = [];
            for (const tc of tcList) {
              if (!tc?.function?.name) continue;
              const fnName = tc.function.name as string;
              let fnArgs = (() => { try { return JSON.parse(tc.function.arguments || '{}'); } catch { return {}; } })();
              console.log('[TOOL] exec', { name: fnName, args: preview(fnArgs) });
              
              // Do not inject location based on function name; handler will manage lat/long if needed
              
              
              
              let impl = agent?.toolLogic && agent.toolLogic[fnName];
              if (typeof impl !== 'function') {
                try {
                  // Fallback to local UI handlers for core UI tools (e.g., navigate)
                  const { UI_HANDLERS } = await import('@/app/agents/core/functions/handlers/ui');
                  impl = (UI_HANDLERS as any)[fnName];
                  
                } catch (e) {
                  console.warn('[ChatInterface] ⚠️ Failed loading UI_HANDLERS fallback', e);
                }
              }
              if (typeof impl === 'function') {
                let result;
                
                // Special handling for extractContent - needs client-side DOM access
                if (fnName === 'extractContent') {
                  console.log('[TOOL] extractContent - triggering client-side extraction');
                  result = {
                    success: true,
                    scope: fnArgs.scope,
                    limit: fnArgs.limit || 10,
                    detail: fnArgs.detail || false,
                    action: 'extract_from_dom',
                    message: 'Content extraction will be handled by the frontend',
                    content: [] as ExtractedContent[],
                    error: undefined as string | undefined
                  };
                  
                  // Trigger client-side extraction
                  try {
                    const extractedContent = await extractContentFromDOM(fnArgs.scope, fnArgs.limit || 10, fnArgs.detail || false);
                    result.content = extractedContent;
                    result.success = true;
                    console.log('[TOOL] extractContent result', { extracted: extractedContent.length, content: extractedContent });
                  } catch (error) {
                    console.error('[TOOL] extractContent error:', error);
                    result.success = false;
                    result.error = String(error);
                  }
                } else {
                  result = await impl(fnArgs, [] as any);
                }
                
                console.log('[TOOL] result', preview(result));
                
                outputs.push({ role: 'tool', content: JSON.stringify(result ?? {}), tool_call_id: tc.id });
                // If agent decided to transfer back, reset active agent to default
                if (fnName === 'transferBack') {
                  setActiveAgentSetKeyState(defaultAgentSetKey);
                  setActiveAgentNameState('welcomeAgent');
                  transferBackArgs = fnArgs;
                }
                // If agent navigates to main within its UI, treat as returning to main assistant in chat context
                if (fnName === 'navigateToMain') {
                  setActiveAgentSetKeyState(defaultAgentSetKey);
                  setActiveAgentNameState('welcomeAgent');
                  navigateMainArgs = fnArgs;
                }
              }
            }
            return outputs;
          };

          const baseMessages: any[] = [
            { role: 'system', content: agentInstructions },
            ...messages.slice(-10).map(msg => ({ role: msg.metadata.source === 'user' ? 'user' : 'assistant', content: msg.content })),
            { role: 'user', content: content.trim() }
          ];

          let convo = baseMessages.slice();
          let currentToolCalls: any[] = toolCalls;
          let iterations = 0;
          const MAX_ITERATIONS = 3;
          let lastToolOutputs: Array<{ role: 'tool'; content: string; tool_call_id: string }> = [];

          
          while (currentToolCalls && currentToolCalls.length && iterations < MAX_ITERATIONS) {
            const nonTransfer = currentToolCalls.filter(tc => !isTransfer(tc));
            
            if (nonTransfer.length === 0) {
              
              break;
            }
            convo.push({ role: 'assistant', content: '', tool_calls: nonTransfer });
            const toolOutputs = await executeToolCalls(nonTransfer, agentConfig);
            
            convo.push(...toolOutputs);
            lastToolOutputs = toolOutputs;

            const follow = await fetch('/api/chat/agent-completions', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: tenantAiConfig?.model || 'gpt-4o',
                agentName: agentConfig?.name || targetName,
                agentSetKey: setKey,
                sessionId: conversationId || sessionId,
      
                messages: convo,
                ...(agentTools.length > 0 ? { tools: agentTools } : {}),
                temperature: tenantAiConfig?.temperature || 0.7, max_tokens: tenantAiConfig?.maxTokens || 4000
              })
            });
            
            if (!follow.ok) {
              console.error(`[ChatInterface] 🔧 Follow-up call failed: ${follow.status}`);
              break;
            }
            const nextData = await follow.json();

            const nextTextRaw = nextData.choices?.[0]?.message?.content;
            const nextText = (nextTextRaw && String(nextTextRaw).trim()) ? nextTextRaw : '';
            const nextCalls = nextData.choices?.[0]?.message?.tool_calls || [];
            
            

            if (nextText) {
              
              const nextMsg: UniversalMessage = {
                id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'text', content: nextText,
                metadata: { source: 'ai', channel: localChannel, language: 'en', agentName: agentConfig?.name || targetName }
              };
              addMessage(nextMsg);
              setIsLoading(false);
              return;
            }

            currentToolCalls = nextCalls;
            iterations++;
            
          }

          // If a transferBack occurred, immediately ask the default agent to send a welcome-back message
          if (transferBackArgs) {
            // In voice mode (realtime), skip text follow-up; rely on Realtime welcome-back
            if (localChannel === 'realtime') {
              setIsLoading(false);
              return;
            }
            try {
              let nextSetKey = defaultAgentSetKey;
              let nextAgent = (dynamicAgentSets[nextSetKey] || []).find((a: { name: string }) => a.name === 'welcomeAgent') || (dynamicAgentSets[nextSetKey] || [])[0];
              if (nextAgent) {
                const nextInstructions = nextAgent.instructions || '';
                const nextTools = Array.isArray(nextAgent.tools) ? nextAgent.tools : [];
                const follow = await fetch('/api/chat/agent-completions', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    model: tenantAiConfig?.model || 'gpt-4o',
                    agentName: nextAgent.name,
                    agentKey: nextAgent.key || nextAgent.name,
                    agentSetKey: nextSetKey,
                    sessionId: conversationId || sessionId,
          
                    messages: [
                      { role: 'system', content: `${nextInstructions}\n\nYou have just received a transferred-back user from ${agentConfig?.name || 'previous agent'}. Welcome them back warmly, acknowledge prior context if provided, and ask how else you can help.` },
                      ...messages.slice(-10).map(msg => ({ role: msg.metadata.source === 'user' ? 'user' : 'assistant', content: msg.content })),
                      { role: 'user', content: typeof (transferBackArgs?.conversation_context) === 'string' && transferBackArgs.conversation_context.trim() ? transferBackArgs.conversation_context : 'User has returned to the main assistant.' }
                    ],
                    ...(nextTools.length > 0 ? { tools: nextTools } : {}),
                    temperature: tenantAiConfig?.temperature || 0.7, max_tokens: tenantAiConfig?.maxTokens || 4000
                  })
                });
                if (follow.ok) {
                  const nextData = await follow.json();
                  const nextTextRaw = nextData.choices?.[0]?.message?.content;
                  const nextText = (nextTextRaw && String(nextTextRaw).trim()) ? nextTextRaw : '';
                  const nextToolCalls = nextData.choices?.[0]?.message?.tool_calls;
                  if (nextText) {
                    const nextMsg: UniversalMessage = {
                      id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'text', content: nextText,
                      metadata: { source: 'ai', channel: activeChannel, language: 'en', agentName: nextAgent.name, mappedFrom: `agent-transfer:transferBack` }
                    };
                    addMessage(nextMsg);
                    setIsLoading(false);
                    return;
                  } else if (nextToolCalls && nextToolCalls.length > 0) {
                    // Execute any immediate tool calls from welcome agent (rare)
                    const executedToolMessages: Array<{ role: 'tool'; content: string; tool_call_id: string }> = [];
                    for (const tc of nextToolCalls) {
                      if (!tc?.function?.name) continue;
                      const fnName = tc.function.name as string;
                      const fnArgs = (() => { try { return JSON.parse(tc.function.arguments || '{}'); } catch { return {}; } })();
                      const impl = nextAgent?.toolLogic && nextAgent.toolLogic[fnName];
                      if (typeof impl === 'function') {
                        const result = await impl(fnArgs, [] as any);
                        executedToolMessages.push({ role: 'tool', content: JSON.stringify(result ?? {}), tool_call_id: tc.id });
                      }
                    }
                    if (executedToolMessages.length > 0) {
                      const first = JSON.parse(executedToolMessages[0].content || '{}');
                      if (typeof first?.fallbackText === 'string' && first.fallbackText.trim()) {
                        const nextMsg: UniversalMessage = {
                          id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'text', content: first.fallbackText,
                          metadata: { source: 'ai', channel: activeChannel, language: 'en', agentName: nextAgent.name, mappedFrom: `agent-transfer:transferBack` }
                        };
                        addMessage(nextMsg);
                        setIsLoading(false);
                        return;
                      }
                    }
                  }
                }
              }
            } catch {}
            setIsLoading(false);
            return;
          }

          // If agent called navigateToMain (UI intent), also trigger welcomeAgent follow-up for consistency
          if (navigateMainArgs) {
            // In voice mode (realtime), skip text follow-up; rely on Realtime welcome-back
            if (localChannel === 'realtime') {
              setIsLoading(false);
              return;
            }
            try {
              let nextSetKey = defaultAgentSetKey;
              let nextAgent = (dynamicAgentSets[nextSetKey] || []).find((a: { name: string }) => a.name === 'welcomeAgent') || (dynamicAgentSets[nextSetKey] || [])[0];
              if (nextAgent) {
                const nextInstructions = nextAgent.instructions || '';
                const nextTools = Array.isArray(nextAgent.tools) ? nextAgent.tools : [];
                const follow = await fetch('/api/chat/agent-completions', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    model: tenantAiConfig?.model || 'gpt-4o',
                    agentName: nextAgent.name,
                    agentKey: nextAgent.key || nextAgent.name,
                    agentSetKey: nextSetKey,
                    sessionId: conversationId || sessionId,
          
                    messages: [
                      { role: 'system', content: `${nextInstructions}\n\nYou have just received a user who navigated to the main assistant from ${agentConfig?.name || 'previous agent'}. Welcome them back warmly and ask how else you can help.` },
                      ...messages.slice(-10).map(msg => ({ role: msg.metadata.source === 'user' ? 'user' : 'assistant', content: msg.content })),
                      { role: 'user', content: typeof (navigateMainArgs?.welcomeMessage) === 'string' && navigateMainArgs.welcomeMessage.trim() ? navigateMainArgs.welcomeMessage : 'User has navigated back to the main assistant.' }
                    ],
                    ...(nextTools.length > 0 ? { tools: nextTools } : {}),
                    temperature: tenantAiConfig?.temperature || 0.7, max_tokens: tenantAiConfig?.maxTokens || 4000
                  })
                });
                if (follow.ok) {
                  const nextData = await follow.json();
                  const nextTextRaw = nextData.choices?.[0]?.message?.content;
                  const nextText = (nextTextRaw && String(nextTextRaw).trim()) ? nextTextRaw : '';
                  const nextToolCalls = nextData.choices?.[0]?.message?.tool_calls;
                  if (nextText) {
                    const nextMsg: UniversalMessage = {
                      id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'text', content: nextText,
                      metadata: { source: 'ai', channel: activeChannel, language: 'en', agentName: nextAgent.name, mappedFrom: `agent-transfer:navigateToMain` }
                    };
                    addMessage(nextMsg);
                    setIsLoading(false);
                    return;
                  } else if (nextToolCalls && nextToolCalls.length > 0) {
                    const executedToolMessages: Array<{ role: 'tool'; content: string; tool_call_id: string }> = [];
                    for (const tc of nextToolCalls) {
                      if (!tc?.function?.name) continue;
                      const fnName = tc.function.name as string;
                      const fnArgs = (() => { try { return JSON.parse(tc.function.arguments || '{}'); } catch { return {}; } })();
                      const impl = nextAgent?.toolLogic && nextAgent.toolLogic[fnName];
                      if (typeof impl === 'function') {
                        const result = await impl(fnArgs, [] as any);
                        executedToolMessages.push({ role: 'tool', content: JSON.stringify(result ?? {}), tool_call_id: tc.id });
                      }
                    }
                    if (executedToolMessages.length > 0) {
                      const first = JSON.parse(executedToolMessages[0].content || '{}');
                      if (typeof first?.fallbackText === 'string' && first.fallbackText.trim()) {
                        const nextMsg: UniversalMessage = {
                          id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'text', content: first.fallbackText,
                          metadata: { source: 'ai', channel: activeChannel, language: 'en', agentName: nextAgent.name, mappedFrom: `agent-transfer:navigateToMain` }
                        };
                        addMessage(nextMsg);
                        setIsLoading(false);
                        return;
                      }
                    }
                  }
                }
              }
            } catch {}
            setIsLoading(false);
            return;
          }

          if (lastToolOutputs.length > 0) {
            const first = JSON.parse(lastToolOutputs[0].content || '{}');
            if (typeof first?.fallbackText === 'string' && first.fallbackText.trim()) {
              const nextMsg: UniversalMessage = {
                id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'text', content: first.fallbackText,
                metadata: { source: 'ai', channel: localChannel, language: 'en', agentName: agentConfig?.name || targetName }
              };
              addMessage(nextMsg);
              setIsLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn('[ChatInterface] tool call handling failed', err);
        }

      }
      
      if (assistantContent) {
        
        const aiMessage: UniversalMessage = {
          id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'text', content: assistantContent,
          metadata: { source: 'ai', channel: localChannel, language: 'en', agentName: agentConfig?.name || targetName }
        };
        addMessage(aiMessage);
      } else {
        console.log(`[ChatInterface] ⚠️ No assistant content to display - this might be the issue!`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: UniversalMessage = {
        id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'system',
        content: 'Sorry, there was an error processing your message. Please try again.',
        metadata: { source: 'ai', channel: activeChannel, language: 'en' }
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && inputValue.trim()) sendMessage(inputValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Prevent form submission since we're handling it here
      e.stopPropagation();
      if (!isLoading && inputValue.trim()) sendMessage(inputValue);
    }
  };

  

  const handleVoiceResponse = (message: UniversalMessage) => {
    console.log('[ChatInterface] Voice response received:', message.content);
  };

  // Do not proactively request mic permission; defer to explicit user action
  useEffect(() => {
    // Intentionally no-op to prevent unexpected permission prompts
  }, [localChannel]);

  // No longer needed - API key is now retrieved from tenant config

  // Memoize callback functions to prevent re-renders
  const handleChannelSwitch = useCallback((channel: 'normal' | 'realtime' | 'human') => {
    setLocalChannel(channel);
    try {
      onChannelSwitch(channel);
    } catch {}
  }, [onChannelSwitch]);

  const handleAgentTransfer = useCallback((destination: string) => {
    // Resolve destination across all sets
    let nextSetKey = activeAgentSetKeyState;
    let nextAgent = (dynamicAgentSets[nextSetKey] || []).find((a: { name: string }) => a.name === destination) || null;
    if (!nextAgent) {
      for (const [setKey, setAgents] of (Object.entries(dynamicAgentSets) as Array<[string, Array<{ name: string }>] >)) {
        const found = setAgents.find((a) => a.name === destination);
        if (found) { nextAgent = found; nextSetKey = setKey; break; }
      }
    }
    if (nextAgent) {
      setActiveAgentSetKeyState(nextSetKey);
      setActiveAgentNameState(nextAgent.name);
      try { onAgentSelected?.(nextSetKey, nextAgent.name); } catch {}
    }
  }, [activeAgentSetKeyState, dynamicAgentSets]);

  if (localChannel === 'realtime') {
    const selectedAgentName = activeAgentNameState || (dynamicAgentSets[activeAgentSetKeyState]?.[0]?.name || 'welcomeAgent');
    const selectedAgentConfigSet = dynamicAgentSets[activeAgentSetKeyState] || [];

    // Don't render VoiceChatInterface until agent sets are loaded to prevent multiple initializations
    if (agentSetsLoading || selectedAgentConfigSet.length === 0) {
      return (
        <div className="flex flex-col h-full min-h-0 bg-white rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-lg font-medium text-gray-600">Loading Voice Chat...</p>
              <p className="text-sm text-gray-500">Initializing AI agents</p>
            </div>
          </div>
        </div>
      );
    }

    // VoiceChatInterface initialization handled silently

    return (
      <VoiceChatInterface
        sessionId={sessionId}
        activeChannel={'realtime'}
        onChannelSwitch={handleChannelSwitch}
        onVoiceResponse={handleVoiceResponse}
        baseLanguage={baseLanguage}
        selectedAgentConfigSet={selectedAgentConfigSet}
        // Optional override props for backward compatibility
        selectedAgentName={selectedAgentName}
        onAgentTransfer={handleAgentTransfer}
      />
    );
  }

  if (localChannel === 'human') {
    return (
      <HumanChatInterface
        sessionId={sessionId}
        messages={messages}
        addMessage={addMessage}
        clearMessages={clearMessages}
        isProcessing={isProcessing}
        baseLanguage={baseLanguage}
        activeChannel={'human'}
        onChannelSwitch={handleChannelSwitch}
      />
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-white rounded-lg shadow border border-gray-200">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${localChannel === 'normal' ? 'bg-orange-700' : 'bg-orange-700'}`} />
          <h3 className="font-medium text-gray-800">{getChannelInfo(localChannel).name}</h3>
        </div>
        <div className="flex space-x-2">
          {messages.length > 0 && (
            <button
              onClick={async () => {
                try { if (!confirm('Clear all messages and start a new session?')) return; } catch { return; }
                try { sseTransportRef.current?.close(); } catch {}
                
                // End the current session in the database
                try {
                  console.log('[ChatInterface] Trash button clicked, conversationId:', conversationId);
                  if (conversationId) {
                    console.log('[ChatInterface] Calling session end API for:', conversationId);
                    const response = await fetch(getApiUrl('/api/admin/sessions/' + encodeURIComponent(conversationId) + '/end'), {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'X-Tenant-ID': process.env.TENANT_ID || '00000000-0000-0000-0000-000000000000'
                      }
                    });
                    const result = await response.json();
                    console.log('[ChatInterface] Session end API response:', response.status, result);
                    if (response.ok) {
                      console.log('[ChatInterface] Current session ended successfully:', conversationId);
                    } else {
                      console.error('[ChatInterface] Failed to end session:', result);
                    }
                  } else {
                    console.warn('[ChatInterface] No conversationId to end');
                  }
                } catch (err) {
                  console.error('[ChatInterface] Failed to end current session:', err);
                }
                
                clearMessages();
                try { clearCurrentSession(); } catch {}
                try {
                  const newId = await getOrCreateDbSession(sessionId, 'text');
                  setConversationId(newId);
                } catch {
                  setConversationId(sessionId);
                }
                setActiveAgentSetKeyState(providedAgentSetKey || defaultAgentSetKey);
                setActiveAgentNameState(providedAgentName || null);
              }}
              className="p-2 rounded-md bg-white text-gray-400 hover:text-red-600 transition-colors"
              title="Clear all messages and start a new session"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
          {channelOptions.map((channel) => {
            const info = getChannelInfo(channel);
            const Icon = info.icon;
            const isActive = localChannel === channel;
            return (
              <button
                key={channel}
                onClick={() => { setLocalChannel(channel); try { onChannelSwitch(channel); } catch {} }}
                className={`p-2 rounded-md transition-colors border ${isActive
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

      {/* Messages Area fills available height */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-amber-800" style={{ minHeight: '40vh' }}>
            <div className="text-3xl mb-3">
              {activeChannel === 'human' ? (
                <UserGroupIcon className="w-12 h-12 mx-auto text-amber-600" />
              ) : (
                <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto text-amber-600" />
              )}
            </div>
            <p className="text-sm text-center text-amber-800">
              {activeChannel === 'human' ? 'Your messages will be forwarded to human support agents.' : 'Send a message to begin chatting with the AI assistant'}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex items-start space-x-3 ${message.metadata.source === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md`} style={{ backgroundImage: 'linear-gradient(to bottom right, var(--ta-icon-from), var(--ta-icon-to))', color: 'var(--ta-on-accent)' }}>
                {message.metadata.source === 'user' ? <UserIcon className="w-4 h-4" /> : message.metadata.source === 'ai' ? (
                  (() => {
                    const IconComponent = getAgentIcon(message.metadata.agentName as string);
                    return <IconComponent className="w-4 h-4" />;
                  })()
                ) : <UserGroupIcon className="w-4 h-4" />}
              </div>
              <div className={`flex-1 max-w-xs lg:max-w-md ${message.metadata.source === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-3 rounded-lg shadow-sm relative`} style={
                  message.metadata.source === 'user' 
                    ? { backgroundImage: 'linear-gradient(to bottom right, var(--ta-btn-from), var(--ta-btn-to))', color: 'var(--ta-on-accent)' }
                    : message.type === 'system' 
                      ? { backgroundImage: 'linear-gradient(to bottom right, var(--ta-panel-from), var(--ta-panel-to))', color: 'var(--ta-muted)', border: '1px solid var(--ta-border)' }
                      : { backgroundImage: 'linear-gradient(to bottom right, var(--ta-card-from), var(--ta-card-to))', color: 'var(--ta-text)', border: '1px solid var(--ta-card-border)' }
                }>
                  {message.metadata?.mappedFrom?.startsWith('agent-transfer:') && (
                    <div className="absolute -top-4 left-0 flex items-center space-x-1" style={{ color: 'var(--ta-muted)' }}>
                      <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{message.metadata.mappedFrom.split(':')[1] || 'agent'}</span>
                    </div>
                  )}
                  {((message.metadata as any)?.isStreaming) ? (
                    <div>
                      {(message.content || '').trim().length > 0 && (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                      <div className="flex items-center space-x-1 mt-1" aria-label="loading">
                        <span className="inline-block w-2 h-2 rounded-full animate-bounce" style={{ background: '#a16207' }} />
                        <span className="inline-block w-2 h-2 rounded-full animate-bounce" style={{ background: '#a16207', animationDelay: '0.1s' }} />
                        <span className="inline-block w-2 h-2 rounded-full animate-bounce" style={{ background: '#a16207', animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                <div className={`text-xs mt-1 ${message.metadata.source === 'user' ? 'text-right' : 'text-left'}`} style={{ color: 'var(--ta-muted)' }}>
                  {formatTime(message.timestamp)}
                  {(() => {
                    const ch = (message.metadata as any)?.channel || 'normal';
                    const Icon = getChannelInfo(ch).icon;
                    return <Icon className="w-3.5 h-3.5 inline ml-1 align-text-bottom" />;
                  })()}
                  {message.metadata.agentName && (
                    <span className="ml-2" style={{ color: 'var(--ta-muted)' }}>• {message.metadata.agentName}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-center justify-center shadow-md">
              {(() => {
                const IconComponent = getAgentIcon(activeAgentNameState || 'welcomeAgent');
                return <IconComponent className="w-4 h-4" />;
              })()}
            </div>
            <div className="flex-1 max-w-xs lg:max-w-md">
              <div className="inline-block p-3 rounded-lg bg-gradient-to-br from-orange-50 to-amber-100 border border-orange-200 shadow-sm">
                <div className="flex items-center space-x-1" aria-label="loading">
                  <span className="inline-block w-2 h-2 rounded-full animate-bounce" style={{ background: '#a16207' }} />
                  <span className="inline-block w-2 h-2 rounded-full animate-bounce" style={{ background: '#a16207', animationDelay: '0.1s' }} />
                  <span className="inline-block w-2 h-2 rounded-full animate-bounce" style={{ background: '#a16207', animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area pinned at bottom by flex */}
      <div className="" style={{ borderTop: '1px solid var(--ta-border)', backgroundImage: 'linear-gradient(to right, var(--ta-panel-from), var(--ta-panel-to))' }}>
        <form onSubmit={handleSubmit} className="p-3">
          <div className="flex items-end space-x-3">
            <textarea
              ref={inputRef}
              rows={3}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={`Type your message... (${getChannelInfo(localChannel).name})`}
              disabled={isLoading}
              className="flex-1 px-3 py-2 rounded-lg focus:ring-2 disabled:cursor-not-allowed resize-none"
              style={{ border: '1px solid var(--ta-border)', background: 'rgba(255,255,255,0.8)', color: 'var(--ta-text)' }}
            />
            <div className="inline-flex flex-col items-center space-y-2">
              {/* Mic toggle removed from text UI; voice handled in VoiceChatInterface */}
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="h-10 px-4 text-white rounded-lg shadow-md hover:shadow-lg focus-visible:ring-2 focus-visible:outline-none disabled:bg-neutral-400 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                style={{ backgroundImage: 'linear-gradient(to right, var(--ta-btn-from), var(--ta-btn-to))' }}
                title="Send"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="mt-1 text-xs flex items-center justify-between" style={{ color: 'var(--ta-muted)' }}>
            <span>Enter to send • Shift+Enter for newline</span>
            {isProcessing && (<span className="font-medium" style={{ color: 'var(--ta-link)' }}>Processing...</span>)}
          </div>
        </form>
      </div>
    </div>
  );
}

<style>{`
@keyframes vcPulse {
  0% { opacity: .25; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-1px); }
  100% { opacity: .25; transform: translateY(0); }
}
`}</style> 