"use client";

import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UniversalMessage } from '@/app/types';
import { PaperAirplaneIcon, MicrophoneIcon, UserIcon, CpuChipIcon, UserGroupIcon, TrashIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import { useMessageHistory } from './MessageHistory';
import VoiceChatInterface from './VoiceChatInterface';

import { allAgentSets, defaultAgentSetKey } from '@/app/agents';
import { createCollector } from '@/app/lib/conversationCollector';
import { getOrCreateDbSession } from '@/app/lib/sharedSessionManager';

interface ChatInterfaceProps {
  sessionId: string;
  activeChannel: 'normal' | 'realtime' | 'human';
  onChannelSwitch: (channel: 'normal' | 'realtime' | 'human') => void;
  isProcessing: boolean;
  agentSetKey?: string;
  agentName?: string;
  baseLanguage?: string; // Language from UI selector
}

export default function ChatInterface({ 
  sessionId, 
  activeChannel, 
  onChannelSwitch, 
  isProcessing,
  agentSetKey: providedAgentSetKey,
  agentName: providedAgentName,
  baseLanguage = 'en',
}: ChatInterfaceProps) {
  const { messages, addMessage, clearMessages } = useMessageHistory(sessionId);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localChannel, setLocalChannel] = useState<'normal' | 'realtime' | 'human'>(activeChannel);
  const [micEnabled, setMicEnabled] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Persist active agent across messages (updated on transfer)
  const [activeAgentSetKeyState, setActiveAgentSetKeyState] = useState<string>(providedAgentSetKey || defaultAgentSetKey);
  const [activeAgentNameState, setActiveAgentNameState] = useState<string | null>(providedAgentName || null);
  const [conversationId, setConversationId] = useState<string>('');

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
    setLocalChannel(activeChannel);
  }, [activeChannel]);

  // Auto-enable mic when entering voice mode; disable when leaving
  useEffect(() => {
    if (localChannel === 'realtime') setMicEnabled(true);
    else setMicEnabled(false);
  }, [localChannel]);

  // Simple: Get or create conversation ID using shared session manager
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const dbSessionId = await getOrCreateDbSession(sessionId, 'text');
        setConversationId(dbSessionId);
        console.log(`[ChatInterface] ✅ Using session: ${dbSessionId} for text mode`);
      } catch (err) {
        console.warn(`[ChatInterface] ❌ Failed to get session, using frontend session:`, err);
        setConversationId(sessionId);
      }
    };
    
    initializeSession();
  }, []); // Only run once on mount



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



  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !conversationId) return;
    
    // Clear input and set loading immediately to prevent duplicate calls
    setInputValue('');
    setIsLoading(true);
    
    const userMessage: UniversalMessage = {
      id: generateMessageId(),
      sessionId,
      timestamp: new Date().toISOString(),
      type: 'text',
      content: content.trim(),
      metadata: { source: 'user', channel: activeChannel, language: 'en' }
    };
    addMessage(userMessage);
    
    // Log user message to backend
    try {
      console.log(`[ChatInterface] 📝 Logging user message with conversation_id: ${conversationId}`);
      await fetch('/api/log/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: conversationId,
          role: 'user',
          type: 'text',
          content: content.trim(),
          channel: activeChannel,
          meta: { language: 'en', is_internal: false }
        })
      });
    } catch {}
    
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
        const humanMessage: UniversalMessage = {
          id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'system',
          content: 'Your message has been forwarded to our human support team (LINE). A representative will respond shortly.',
          metadata: { source: 'ai', channel: localChannel, language: 'en' }
        };
        addMessage(humanMessage);
        // Persist user message and forward notice to backend
        try {
          await fetch('/api/log/messages', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: conversationId,
              role: 'user',
              type: 'text',
              content: content.trim(),
              channel: localChannel,
              meta: { language: 'en', is_internal: false }
            })
          });
          await fetch('/api/log/messages', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: conversationId,
              role: 'system',
              type: 'system',
              content: humanMessage.content,
              channel: localChannel,
              meta: { language: 'en', is_internal: false }
            })
          });
        } catch {}
        // Forward user content to LINE via server push API (uses LINE_DEFAULT_TO if no recipient provided)
        try {
          await fetch('/api/line/push', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: content.trim() })
          });
        } catch (err) {
          const errMsg: UniversalMessage = {
            id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'system',
            content: 'We could not forward your message to LINE at the moment. Please try again.',
            metadata: { source: 'ai', channel: localChannel, language: 'en' }
          };
          addMessage(errMsg);
        }
        setIsLoading(false);
        return;
      }

      const t0 = Date.now();
      // Resolve agent config with injected transfer tools from config files
      const setKey = activeAgentSetKeyState || defaultAgentSetKey;
      const allInSet = allAgentSets[setKey] || [];
      const targetName = activeAgentNameState || (allInSet[0]?.name || 'welcomeAgent');
      const agentConfig = allInSet.find(a => a.name === targetName) || allInSet[0];
      const agentInstructions = agentConfig?.instructions || 'You are a helpful assistant.';
      const agentTools = Array.isArray(agentConfig?.tools) ? agentConfig!.tools : [];
      console.log(`[ChatInterface] 🚀 Calling agent-completions for agent: ${agentConfig?.name || targetName}`);
      console.log(`[ChatInterface] 🚀 Message count: ${messages.length}, Tools: ${agentTools.length}`);
      
      const response = await fetch('/api/chat/agent-completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          agentName: agentConfig?.name || targetName,
          agentSetKey: setKey,
          sessionId: conversationId,

          messages: [
            { role: 'system', content: agentInstructions },
            ...messages.slice(-10).map(msg => ({ role: msg.metadata.source === 'user' ? 'user' : 'assistant', content: msg.content })),
            { role: 'user', content: content.trim() }
          ],
          ...(agentTools.length > 0 ? { tools: agentTools } : {}),
          temperature: 0.7, max_tokens: 1000
        })
      });

      console.log(`[ChatInterface] 📡 Agent response status: ${response.status}`);
      if (!response.ok) {
        console.error(`[ChatInterface] ❌ Agent API call failed: ${response.status}`);
        throw new Error(`API call failed: ${response.status}`);
      }

      const data = await response.json();

      console.log(`[ChatInterface] 📥 Received response data:`, {
        hasChoices: !!data.choices?.length,
        hasMessage: !!data.choices?.[0]?.message,
        hasContent: !!data.choices?.[0]?.message?.content,
        hasToolCalls: !!data.choices?.[0]?.message?.tool_calls?.length,
        contentLength: data.choices?.[0]?.message?.content?.length || 0,
        toolCallsCount: data.choices?.[0]?.message?.tool_calls?.length || 0
      });
      
      const toolCalls = data.choices?.[0]?.message?.tool_calls;
      const assistantContentRaw = data.choices?.[0]?.message?.content;
      const assistantContent = (assistantContentRaw && String(assistantContentRaw).trim()) ? assistantContentRaw : '';
      
      console.log(`[ChatInterface] 🔄 Processing: assistantContent="${assistantContent.slice(0, 50)}...", toolCalls=${toolCalls?.length || 0}`);
      console.log(`[ChatInterface] 🔍 Tool calls raw data:`, toolCalls);
      console.log(`[ChatInterface] 🔍 About to check first transfer block - toolCalls exists: ${!!toolCalls}, length: ${toolCalls?.length || 0}`);

      // Handle transfer tool calls if present
      if (toolCalls && toolCalls.length > 0) {
        console.log(`[ChatInterface] ✅ Entering tool call handling block`);
        for (const toolCall of toolCalls) {
          console.log(`[ChatInterface] 🔍 Checking tool call: ${toolCall.function?.name}`);
          if (toolCall.function?.name === 'transferAgents') {
            console.log(`[ChatInterface] 🎯 Found transferAgents call, executing transfer logic`);
            try {
              const args = JSON.parse(toolCall.function.arguments || '{}');
              const destination = args.destination_agent || 'thaiResortGuide';
              const explain = args.rationale_for_transfer || 'Transferring to a more suitable agent.';
              console.log('[ChatInterface] 🧭 Transfer block start', {
                destination,
                explain,
                conversationId,
                activeAgentSetKeyState,
                activeAgentNameState
              });
              // Do not add a separate transfer bubble; we'll show icon atop next agent reply

              // Log internal transfer message for auditing (not user-visible)
              try {
                await fetch('/api/log/messages', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    session_id: conversationId,
                    role: 'system',
                    type: 'system',
                    content: `Internal transfer initiated to ${destination}. Rationale: ${explain}`,
                    channel: localChannel,
                    meta: {
                      is_internal: true,
                      source: 'transfer',
                      from_agent: agentConfig?.name || targetName,
                      to_agent: destination,
                      conversation_context: typeof args.conversation_context === 'string' ? args.conversation_context : undefined
                    }
                  })
                });
              } catch {}

              // Resolve destination agent across sets
              let nextSetKey = providedAgentSetKey || defaultAgentSetKey;
              let nextAgent = (allAgentSets[nextSetKey] || []).find(a => a.name === destination) || null;
              if (!nextAgent) {
                for (const [setKey, setAgents] of Object.entries(allAgentSets)) {
                  const found = setAgents.find(a => a.name === destination);
                  if (found) { nextAgent = found; nextSetKey = setKey; break; }
                }
              }
              console.log('[ChatInterface] 🧭 Resolved destination', {
                destination,
                nextSetKey,
                foundAgent: !!nextAgent,
                setAgents: (allAgentSets[nextSetKey] || []).map(a => a.name)
              });

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
                  console.log(`[ChatInterface] 🔁 Voice mode transfer to ${nextAgent.name} - getting initial response`);
                }
                // Continue to get response from the new agent (both text and voice mode)
                const nextInstructions = nextAgent.instructions || '';
                const nextTools = Array.isArray(nextAgent.tools) ? nextAgent.tools : [];
                console.log('[ChatInterface] 📤 Calling follow-up for destination agent', {
                  agentName: nextAgent.name,
                  nextSetKey,
                  followUserTextLength: followUserText.length,
                  hasTools: (nextTools.length > 0)
                });
                const follow = await fetch('/api/chat/agent-completions', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    model: 'gpt-4o',
                    agentName: nextAgent.name,
                    agentSetKey: nextSetKey,
                    sessionId: conversationId || sessionId,
          
                    messages: [
                      { role: 'system', content: `${nextInstructions}\n\nCurrent conversation context: You are communicating through the ${activeChannel} channel.` },
                      ...messages.slice(-10).map(msg => ({ role: msg.metadata.source === 'user' ? 'user' : 'assistant', content: msg.content })),
                      { role: 'user', content: followUserText }
                    ],
                    ...(nextTools.length > 0 ? { tools: nextTools } : {}),
                    temperature: 0.7, max_tokens: 1000
                  })
                });
                console.log('[ChatInterface] 📥 Follow-up response status', follow.status);
                if (follow.ok) {
                  const nextData = await follow.json();
                  console.log('[ChatInterface] 📥 Follow-up JSON received', {
                    hasChoices: !!nextData?.choices?.length,
                    hasMessage: !!nextData?.choices?.[0]?.message,
                    hasContent: !!nextData?.choices?.[0]?.message?.content,
                    hasToolCalls: !!nextData?.choices?.[0]?.message?.tool_calls?.length
                  });
  
                  const nextTextRaw = nextData.choices?.[0]?.message?.content;
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
                    console.log('[ChatInterface] 🔁 Destination agent returned tool calls; executing locally', nextToolCalls.map((t: any) => t?.function?.name));
                    try {
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
                      console.log('[ChatInterface] 📤 Calling second follow-up with tool outputs', { messageCount: convo.length });
                      const follow2 = await fetch('/api/chat/agent-completions', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          model: 'gpt-4o',
                          agentName: nextAgent.name,
                          agentSetKey: nextSetKey,
                          sessionId: conversationId || sessionId,
                
                          messages: convo,
                          ...(nextTools.length > 0 ? { tools: nextTools } : {}),
                          temperature: 0.7, max_tokens: 1000
                        })
                      });
                      console.log('[ChatInterface] 📥 Second follow-up status', follow2.status);
                      if (follow2.ok) {
                        const nextData2 = await follow2.json();

                        const nextTextRaw2 = nextData2.choices?.[0]?.message?.content;
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
              }
              console.log(`[ChatInterface] ✅ Transfer logic completed, setting loading=false and returning`);
              setIsLoading(false);
              return; // handled transfer path entirely
            } catch (err) {
              console.error('[ChatInterface] ❌ Transfer block error', err);
            }
          }
        }
      }

      console.log(`[ChatInterface] 🎯 Final processing: assistantContent exists=${!!assistantContent}, length=${assistantContent.length}`);
      if (!assistantContent || assistantContent.trim() === '') {
        console.log(`[ChatInterface] ⚠️ No assistant content to display - this might be the issue!`);
      }

      // Handle general tool calls (iterate: tool -> return to API -> (optional) tool -> return -> answer)
      if (toolCalls && toolCalls.length > 0) {
        console.log(`[ChatInterface] ⚡ Entering general tool system (this should NOT run if transfer was processed)`);
        try {
          const isTransfer = (tc: any) => tc?.function?.name === 'transferAgents';
          console.log(`[ChatInterface] 🔧 Tool calls detected:`, toolCalls.map((tc: any) => ({ name: tc?.function?.name, isTransfer: isTransfer(tc) })));
          let transferBackArgs: any | null = null;
          let navigateMainArgs: any | null = null;
          const executeToolCalls = async (tcList: any[], agent: any) => {
            const outputs: Array<{ role: 'tool'; content: string; tool_call_id: string }> = [];
            for (const tc of tcList) {
              if (!tc?.function?.name) continue;
              const fnName = tc.function.name as string;
              const fnArgs = (() => { try { return JSON.parse(tc.function.arguments || '{}'); } catch { return {}; } })();
              const impl = agent?.toolLogic && agent.toolLogic[fnName];
              if (typeof impl === 'function') {
                const result = await impl(fnArgs, [] as any);
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

          console.log(`[ChatInterface] 🔧 Tool execution loop: ${currentToolCalls?.length || 0} tool calls, iteration ${iterations}`);
          while (currentToolCalls && currentToolCalls.length && iterations < MAX_ITERATIONS) {
            const nonTransfer = currentToolCalls.filter(tc => !isTransfer(tc));
            console.log(`[ChatInterface] 🔧 Iteration ${iterations}: ${currentToolCalls.length} total calls, ${nonTransfer.length} non-transfer`);
            if (nonTransfer.length === 0) {
              console.log(`[ChatInterface] 🔧 No non-transfer tool calls, breaking loop`);
              break;
            }
            convo.push({ role: 'assistant', content: '', tool_calls: nonTransfer });
            const toolOutputs = await executeToolCalls(nonTransfer, agentConfig);
            console.log(`[ChatInterface] 🔧 Tool outputs received: ${toolOutputs.length} results`);
            convo.push(...toolOutputs);
            lastToolOutputs = toolOutputs;

            const follow = await fetch('/api/chat/agent-completions', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'gpt-4o',
                agentName: agentConfig?.name || targetName,
                agentSetKey: setKey,
                sessionId: conversationId || sessionId,
      
                messages: convo,
                ...(agentTools.length > 0 ? { tools: agentTools } : {}),
                temperature: 0.7, max_tokens: 1000
              })
            });
            console.log(`[ChatInterface] 🔧 Follow-up completion call status: ${follow.status}`);
            if (!follow.ok) {
              console.error(`[ChatInterface] 🔧 Follow-up call failed: ${follow.status}`);
              break;
            }
            const nextData = await follow.json();

            const nextTextRaw = nextData.choices?.[0]?.message?.content;
            const nextText = (nextTextRaw && String(nextTextRaw).trim()) ? nextTextRaw : '';
            const nextCalls = nextData.choices?.[0]?.message?.tool_calls || [];
            
            console.log(`[ChatInterface] 🔧 Follow-up response: hasText=${!!nextText}, textLength=${nextText.length}, hasMoreCalls=${nextCalls.length}`);

            if (nextText) {
              console.log(`[ChatInterface] ✅ Follow-up AI response: "${nextText.slice(0, 100)}..."`);
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
            console.log(`[ChatInterface] 🔧 Continuing iteration ${iterations} with ${nextCalls.length} new tool calls`);
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
              let nextAgent = (allAgentSets[nextSetKey] || []).find(a => a.name === 'welcomeAgent') || (allAgentSets[nextSetKey] || [])[0];
              if (nextAgent) {
                const nextInstructions = nextAgent.instructions || '';
                const nextTools = Array.isArray(nextAgent.tools) ? nextAgent.tools : [];
                const follow = await fetch('/api/chat/agent-completions', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    model: 'gpt-4o',
                    agentName: nextAgent.name,
                    agentSetKey: nextSetKey,
                    sessionId: conversationId || sessionId,
          
                    messages: [
                      { role: 'system', content: `${nextInstructions}\n\nYou have just received a transferred-back user from ${agentConfig?.name || 'previous agent'}. Welcome them back warmly, acknowledge prior context if provided, and ask how else you can help.` },
                      ...messages.slice(-10).map(msg => ({ role: msg.metadata.source === 'user' ? 'user' : 'assistant', content: msg.content })),
                      { role: 'user', content: typeof (transferBackArgs?.conversation_context) === 'string' && transferBackArgs.conversation_context.trim() ? transferBackArgs.conversation_context : 'User has returned to the main assistant.' }
                    ],
                    ...(nextTools.length > 0 ? { tools: nextTools } : {}),
                    temperature: 0.7, max_tokens: 1000
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
              let nextAgent = (allAgentSets[nextSetKey] || []).find(a => a.name === 'welcomeAgent') || (allAgentSets[nextSetKey] || [])[0];
              if (nextAgent) {
                const nextInstructions = nextAgent.instructions || '';
                const nextTools = Array.isArray(nextAgent.tools) ? nextAgent.tools : [];
                const follow = await fetch('/api/chat/agent-completions', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    model: 'gpt-4o',
                    agentName: nextAgent.name,
                    agentSetKey: nextSetKey,
                    sessionId: conversationId || sessionId,
          
                    messages: [
                      { role: 'system', content: `${nextInstructions}\n\nYou have just received a user who navigated to the main assistant from ${agentConfig?.name || 'previous agent'}. Welcome them back warmly and ask how else you can help.` },
                      ...messages.slice(-10).map(msg => ({ role: msg.metadata.source === 'user' ? 'user' : 'assistant', content: msg.content })),
                      { role: 'user', content: typeof (navigateMainArgs?.welcomeMessage) === 'string' && navigateMainArgs.welcomeMessage.trim() ? navigateMainArgs.welcomeMessage : 'User has navigated back to the main assistant.' }
                    ],
                    ...(nextTools.length > 0 ? { tools: nextTools } : {}),
                    temperature: 0.7, max_tokens: 1000
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
      console.log(`[ChatInterface] 🎯 Final processing: assistantContent exists=${!!assistantContent}, length=${assistantContent?.length || 0}`);
      if (assistantContent) {
        console.log(`[ChatInterface] ✅ Creating AI message with content: "${assistantContent.slice(0, 100)}..."`);
        const aiMessage: UniversalMessage = {
          id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'text', content: assistantContent,
          metadata: { source: 'ai', channel: localChannel, language: 'en', agentName: agentConfig?.name || targetName }
        };
        addMessage(aiMessage);
        console.log(`[ChatInterface] ✅ AI message added to chat with ID: ${aiMessage.id}`);
        
        // Log assistant response to backend
        try {
          await fetch('/api/log/messages', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: conversationId,
              role: 'assistant',
              type: 'text',
              content: assistantContent,
              channel: localChannel,
              meta: { agentName: agentConfig?.name || targetName, is_internal: false }
            })
          });
        } catch {}
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

  const getChannelInfo = (channel: string) => {
    switch (channel) {
      case 'normal': return { name: 'Text Chat', icon: CpuChipIcon, color: 'blue' };
      case 'realtime': return { name: 'Voice Chat', icon: MicrophoneIcon, color: 'green' };
      case 'human': return { name: 'Human Support', icon: UserGroupIcon, color: 'purple' };
      default: return { name: 'Unknown', icon: CpuChipIcon, color: 'gray' };
    }
  };

  const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const handleVoiceResponse = (message: UniversalMessage) => {
    console.log('[ChatInterface] Voice response received:', message.content);
  };

  // Proactively request mic permission when switching to realtime
  useEffect(() => {
    if (localChannel === 'realtime') {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
        }
      } catch {}
    }
  }, [localChannel]);

  if (localChannel === 'realtime') {
    return (
      <VoiceChatInterface
        sessionId={sessionId}
        activeChannel={'realtime'}
        onChannelSwitch={(channel) => { setLocalChannel(channel); try { onChannelSwitch(channel); } catch {} }}
        onVoiceResponse={handleVoiceResponse}
        selectedAgentName={activeAgentNameState || (allAgentSets[activeAgentSetKeyState]?.[0]?.name || 'welcomeAgent')}
        selectedAgentConfigSet={allAgentSets[activeAgentSetKeyState] || []}
        baseLanguage={baseLanguage}
        onAgentTransfer={(destination) => {
          // Resolve destination across all sets
          let nextSetKey = activeAgentSetKeyState;
          let nextAgent = (allAgentSets[nextSetKey] || []).find(a => a.name === destination) || null;
          if (!nextAgent) {
            for (const [setKey, setAgents] of Object.entries(allAgentSets)) {
              const found = setAgents.find(a => a.name === destination);
              if (found) { nextAgent = found; nextSetKey = setKey; break; }
            }
          }
          if (nextAgent) {
            setActiveAgentSetKeyState(nextSetKey);
            setActiveAgentNameState(nextAgent.name);
          }
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-gradient-to-b from-orange-50/50 to-amber-50/50">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 border-b border-orange-200/60 bg-gradient-to-r from-orange-50/90 to-amber-50/90">
        <div className="flex items-center space-x-2">
          <div className={`w-2.5 h-2.5 rounded-full ${localChannel === 'normal' ? 'bg-orange-700' : 'bg-red-800'}`} />
          <h3 className="text-sm font-medium text-orange-900">{getChannelInfo(localChannel).name}</h3>
        </div>
        <div className="flex space-x-2">
          {messages.length > 0 && (
            <button
              onClick={() => { if (confirm('Clear all messages?')) clearMessages(); }}
              className="p-2 rounded-md bg-white/80 text-amber-600 hover:text-red-700 hover:bg-white"
              title="Clear all messages"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
          {(['normal', 'realtime', 'human'] as const).map((channel) => {
            const info = getChannelInfo(channel);
            const Icon = info.icon;
            return (
              <button
                key={channel}
                onClick={() => { setLocalChannel(channel); try { onChannelSwitch(channel); } catch {} }}
                className={`p-2 rounded-md transition-colors ${
                  localChannel === channel 
                    ? 'bg-orange-100 text-orange-800 border border-orange-300' 
                    : 'bg-white/80 text-amber-700 hover:text-orange-800 hover:bg-orange-50'
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
            <div className="text-3xl mb-3">{activeChannel === 'human' ? '👥' : '💬'}</div>
            <p className="text-sm text-center text-amber-800">
              {activeChannel === 'human' ? 'Your messages will be forwarded to human support agents.' : 'Send a message to begin chatting with the AI assistant'}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex items-start space-x-3 ${message.metadata.source === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.metadata.source === 'user' 
                  ? 'bg-gradient-to-br from-orange-600 to-red-700 text-white shadow-md' 
                  : message.metadata.source === 'ai' 
                    ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white shadow-md' 
                    : 'bg-gradient-to-br from-neutral-600 to-stone-700 text-white shadow-md'
              }`}>
                {message.metadata.source === 'user' ? <UserIcon className="w-4 h-4" /> : message.metadata.source === 'ai' ? <CpuChipIcon className="w-4 h-4" /> : <UserGroupIcon className="w-4 h-4" />}
              </div>
              <div className={`flex-1 max-w-xs lg:max-w-md ${message.metadata.source === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-3 rounded-lg shadow-sm relative ${
                  message.metadata.source === 'user' 
                    ? 'bg-gradient-to-br from-orange-600 to-red-700 text-white' 
                    : message.type === 'system' 
                      ? 'bg-gradient-to-br from-amber-50 to-orange-100 text-amber-900 border border-amber-200' 
                      : 'bg-gradient-to-br from-orange-50 to-amber-100 text-orange-900 border border-orange-200'
                }`}>
                  {message.metadata?.mappedFrom?.startsWith('agent-transfer:') && (
                    <div className="absolute -top-4 left-0 flex items-center space-x-1 text-amber-900">
                      <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{message.metadata.mappedFrom.split(':')[1] || 'agent'}</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <div className={`text-xs text-amber-700 mt-1 ${message.metadata.source === 'user' ? 'text-right' : 'text-left'}`}>
                  {formatTime(message.timestamp)}{message.metadata.agentName && (<span className="ml-2 text-amber-600">• {message.metadata.agentName}</span>)}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-center justify-center shadow-md"><CpuChipIcon className="w-4 h-4" /></div>
            <div className="flex-1 max-w-xs lg:max-w-md">
              <div className="inline-block p-3 rounded-lg bg-gradient-to-br from-orange-50 to-amber-100 border border-orange-200 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-amber-700 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-amber-700 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-amber-700 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area pinned at bottom by flex */}
      <div className="border-t border-orange-200/60 bg-gradient-to-r from-orange-50/90 to-amber-50/90">
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
              className="flex-1 px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-transparent disabled:bg-orange-100 disabled:cursor-not-allowed disabled:text-amber-700 text-orange-900 placeholder-amber-600 resize-none bg-white/80"
            />
            <div className="inline-flex flex-col items-center space-y-2">
              {localChannel === ('realtime' as 'normal' | 'realtime' | 'human') && (
                <button
                  type="button"
                  onClick={() => setMicEnabled((v) => !v)}
                  className={`h-10 px-4 rounded-lg shadow-md border focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:outline-none transition-all flex items-center justify-center ${
                    micEnabled
                      ? 'bg-gradient-to-r from-orange-700 to-red-800 border-red-900 text-white hover:from-orange-800 hover:to-red-900'
                      : 'bg-gradient-to-r from-orange-100 to-amber-200 border-amber-300 text-amber-900 hover:from-orange-200 hover:to-amber-300'
                  }`}
                  title={micEnabled ? 'Microphone enabled' : 'Microphone disabled'}
                  aria-pressed={micEnabled}
                >
                  {micEnabled ? (
                    <MicrophoneIcon className="w-5 h-5" />
                  ) : (
                    <span className="relative inline-block w-5 h-5" aria-hidden>
                      <MicrophoneIcon className="w-5 h-5" />
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="block w-5 h-[2px] bg-red-600 rotate-45 rounded-sm"></span>
                      </span>
                    </span>
                  )}
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="h-10 px-4 bg-gradient-to-r from-orange-700 to-red-800 text-white rounded-lg shadow-md hover:from-orange-800 hover:to-red-900 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:outline-none disabled:bg-neutral-400 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                title="Send"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="mt-1 text-xs text-amber-700 flex items-center justify-between">
            <span>Enter to send • Shift+Enter for newline</span>
            {isProcessing && (<span className="text-orange-800 font-medium">Processing...</span>)}
          </div>
        </form>
      </div>
    </div>
  );
} 