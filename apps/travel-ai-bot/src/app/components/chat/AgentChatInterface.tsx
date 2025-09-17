"use client";

import React, { useState, useRef, useEffect } from 'react';
import { UniversalMessage, AgentConfig } from '@/app/types';
import { PaperAirplaneIcon, MicrophoneIcon, UserIcon, CpuChipIcon, UserGroupIcon, TrashIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useMessageHistory } from './MessageHistory';
import VoiceChatInterface from './VoiceChatInterface';
import { getBotActionFunctionDefinitions, isBotAction as isBotUIAction, handleFunctionCall as handleBotUIFunctionCall } from '@/botActionFramework';

interface AgentChatInterfaceProps {
  sessionId: string;
  activeChannel: 'normal' | 'realtime' | 'human' | 'line';
  onChannelSwitch: (channel: 'normal' | 'realtime' | 'human' | 'line') => void;
  isProcessing: boolean;
  selectedAgentName: string;
  selectedAgentConfigSet: AgentConfig[] | null;
  onAgentChange: (agentName: string) => void;
  onAgentSetChange?: (agentSetKey: string, agentName: string) => void;
}

export default function AgentChatInterface({ 
  sessionId, 
  activeChannel, 
  onChannelSwitch, 
  isProcessing,
  selectedAgentName,
  selectedAgentConfigSet,
  onAgentChange,
  onAgentSetChange
}: AgentChatInterfaceProps) {
  const { messages, addMessage, clearMessages } = useMessageHistory(sessionId);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Smooth scroll to bottom
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

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Note: Removed auto-switch behavior to allow voice mode in standalone agent interface

  // Generate message ID
  const generateMessageId = () => {
    return crypto.randomUUID().slice(0, 32);
  };

  // Get current agent
  const currentAgent = selectedAgentConfigSet?.find(a => a.name === selectedAgentName);

  // Use server-provided instructions only (avoid duplicate prompt fetches)
  const [systemInstructions, setSystemInstructions] = useState<string>(currentAgent?.instructions || '');
  useEffect(() => {
    setSystemInstructions(currentAgent?.instructions || '');
  }, [currentAgent?.instructions]);

  // Handle agent transfer (including cross-agent-set transfers)
  const handleAgentTransfer = (targetAgentName: string) => {
    console.log(`[AgentChatInterface] Starting transfer to ${targetAgentName}`);
    
    // First check if target agent is in current agent set
    let targetAgent = selectedAgentConfigSet?.find(a => a.name === targetAgentName);
    let targetAgentSetKey: string | null = null;
    
    // If not found in current set, check all agent sets for cross-agent-set transfer
    if (!targetAgent) {
      console.log(`[AgentChatInterface] Target agent not in current set, checking all agent sets...`);
      
      // Import allAgentSets to find the target agent
      import('@/app/agents').then(({ allAgentSets }) => {
        const typedAllAgentSets = allAgentSets as Record<string, AgentConfig[]>;
        for (const [setKey, agentSet] of Object.entries(typedAllAgentSets)) {
          const foundAgent = agentSet.find(a => a.name === targetAgentName);
          if (foundAgent) {
            targetAgent = foundAgent;
            targetAgentSetKey = setKey;
            console.log(`[AgentChatInterface] Found target agent ${targetAgentName} in set ${setKey}`);
            break;
          }
        }
        
        if (targetAgent && targetAgentSetKey) {
          executeTransfer(targetAgentName, targetAgentSetKey);
        } else {
          console.error(`[AgentChatInterface] Target agent ${targetAgentName} not found in any agent set`);
        }
      });
      return;
    } else {
      console.log(`[AgentChatInterface] Target agent found in current set:`, targetAgent.name);
      executeTransfer(targetAgentName, null);
    }
    
    function executeTransfer(agentName: string, agentSetKey: string | null) {
      // Add transfer message
      const transferMessage: UniversalMessage = {
        id: generateMessageId(),
        sessionId,
        timestamp: new Date().toISOString(),
        type: 'system',
        content: `Transferring you to ${agentName}. Please wait...`,
        metadata: {
          source: 'ai',
          channel: activeChannel,
          language: 'en',
          agentName: selectedAgentName
        }
      };
      
      addMessage(transferMessage);
      
      // Execute transfer with shorter delay
      setTimeout(() => {
        console.log(`[AgentChatInterface] Executing agent change to ${agentName}`);
        
        // Handle cross-agent-set transfer
        if (agentSetKey && onAgentSetChange) {
          console.log(`[AgentChatInterface] Cross-agent-set transfer to ${agentSetKey}:${agentName}`);
          onAgentSetChange(agentSetKey, agentName);
        } else {
          // Same agent set transfer
          onAgentChange(agentName);
        }
        
        // No automatic welcome message - agent will respond when user sends a message
      }, 1000); // Reduced transfer delay
    }
  };

  // Enhanced message sending with agent context
  const sendMessage = async (content: string) => {
    if (!content.trim() || !currentAgent || isLoading) return;

    // Clear input and set loading immediately to prevent duplicate calls
    setInputValue('');
    setIsLoading(true);

    // Create user message
    const userMessage: UniversalMessage = {
      id: generateMessageId(),
      sessionId,
      timestamp: new Date().toISOString(),
      type: 'text',
      content: content.trim(),
      metadata: {
        source: 'user',
        channel: activeChannel,
        language: 'en',
        agentName: selectedAgentName
      }
    };

    // Add user message to chat
    addMessage(userMessage);
    
    // Scroll to bottom immediately to show user message
    setTimeout(scrollToBottom, 50);

    try {
      // Simple keyword trigger: open Taxi page
      if (/\b(taxi|want taxi|เรียกแท็กซี่|อยากได้แท็กซี่)\b/i.test(content)) {
        try {
          await handleBotUIFunctionCall({
            name: 'navigatePage',
            arguments: JSON.stringify({ pageName: 'taxi' })
          } as any);
        } catch {}
      }

      // Check if this is realtime/voice mode
      if (activeChannel === 'realtime') {
        const voiceMessage: UniversalMessage = {
          id: generateMessageId(),
          sessionId,
          timestamp: new Date().toISOString(),
          type: 'system',
          content: 'Voice mode with agent integration is coming soon. For now, your message has been processed in text mode.',
          metadata: {
            source: 'ai',
            channel: activeChannel,
            language: 'en',
            agentName: selectedAgentName
          }
        };
        
        addMessage(voiceMessage);
        setIsLoading(false);
        return;
      }

      // Handle human support mode
      if (activeChannel === 'human') {
        const humanMessage: UniversalMessage = {
          id: generateMessageId(),
          sessionId,
          timestamp: new Date().toISOString(),
          type: 'system',
          content: `Your message has been forwarded to our human support team via ${selectedAgentName}. A representative will respond shortly.`,
          metadata: {
            source: 'ai',
            channel: activeChannel,
            language: 'en',
            agentName: selectedAgentName
          }
        };
        
        addMessage(humanMessage);
        setIsLoading(false);
        return;
      }

      // Enhanced API call with agent context
      const requestBody: any = {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `${systemInstructions}

You are currently the "${selectedAgentName}" agent. 

${currentAgent.downstreamAgents && currentAgent.downstreamAgents.length > 0 ? 
  `You can transfer users to these specialized agents if needed:
${currentAgent.downstreamAgents.map(agent => `- ${agent.name}: ${agent.publicDescription}`).join('\n')}

Use the transferAgents function to transfer users when appropriate.` : 
  'You cannot transfer users to other agents from this role.'
}

Current conversation context: You are communicating through the ${activeChannel} channel.`
          },
          ...messages.slice(-10).map(msg => ({
            role: msg.metadata.source === 'user' ? 'user' : 'assistant',
            content: msg.content
          })),
          {
            role: 'user',
            content: content.trim()
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        agentName: selectedAgentName,
        sessionId: sessionId
      };

      // Add agent tools and Bot Action Framework functions
      const botActionTools = getBotActionFunctionDefinitions?.() || [];
      if (currentAgent.tools && currentAgent.tools.length > 0) {
        requestBody.tools = [...currentAgent.tools, ...botActionTools];
      } else {
        requestBody.tools = [...botActionTools];
      }

      const response = await fetch('/api/chat/agent-completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...requestBody, channel: activeChannel })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

             const data = await response.json();
       const assistantContent = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
       const toolCalls = data.choices?.[0]?.message?.tool_calls;

      // Create and add AI response message first (before handling transfers)
      const aiMessage: UniversalMessage = {
        id: generateMessageId(),
        sessionId,
        timestamp: new Date().toISOString(),
        type: 'text',
        content: assistantContent,
        metadata: {
          source: 'ai',
          channel: activeChannel,
          language: 'en',
          agentName: selectedAgentName
        }
      };

      // Add AI response to chat
      addMessage(aiMessage);
      
      // Persist AI response (before handling transfers)
      try {
        await fetch('/api/log/messages', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            role: 'assistant',
            type: 'text',
            content: assistantContent,
            channel: activeChannel,
            meta: { agentName: selectedAgentName }
          })
        });
      } catch {}

      // Handle function calls (transfer + bot UI actions)
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
                  channel: activeChannel,
                  language: 'en',
                  agentName: selectedAgentName
                }
              };
              
              addMessage(transferMessage);
              
              // Execute transfer
              setTimeout(() => {
                handleAgentTransfer(destination_agent);
              }, 1000);
              
              setIsLoading(false);
              return;
            } catch (error) {
              console.error('Error parsing transferAgents arguments:', error);
            }
          }

          // Execute agent tool logic locally if available (e.g., placeKnowledgeSearch)
          try {
            const fnName = toolCall.function.name;
            if (currentAgent?.toolLogic && currentAgent.toolLogic[fnName]) {
              const args = JSON.parse(toolCall.function.arguments || '{}');
              const fn = currentAgent.toolLogic[fnName];
              const fnResult = await fn(args, []);
              // Attempt to display content via Bot Action Framework if results provided
              try {
                if (fnName === 'placeKnowledgeSearch' || fnName === 'knowledgeSearch') {
                  const items = fnResult?.results || fnResult?.places || [];
                  if (Array.isArray(items) && items.length > 0) {
                    await handleBotUIFunctionCall({
                      name: 'filterContent',
                      arguments: JSON.stringify({ filters: { items }, contentType: 'places', replace: true })
                    } as any);
                    // Optionally highlight the first item
                    const first = items[0];
                    if (first && (first.id || first.place_id)) {
                      const placeId = String(first.id || first.place_id);
                      await handleBotUIFunctionCall({
                        name: 'switchView',
                        arguments: JSON.stringify({ viewMode: 'highlight', contentType: 'places', placeId })
                      } as any);
                    }
                  }
                }
              } catch (e) {
                console.warn('[AgentChatInterface] Failed to project tool result to UI', e);
              }
              continue;
            }
          } catch (err) {
            console.warn('[AgentChatInterface] Tool logic execution failed', err);
          }

          // Route Bot Action Framework functions to UI handlers
          try {
            const fnName = toolCall.function.name;
            if (isBotUIAction(fnName)) {
              await handleBotUIFunctionCall({
                name: fnName,
                call_id: toolCall.id,
                arguments: toolCall.function.arguments,
              });
              // Continue processing other tool calls
              continue;
            }
          } catch (err) {
            console.warn('[AgentChatInterface] Bot UI action handling failed', err);
          }
        }
      }

      // Check for text-based transfer request (fallback)
      if (assistantContent && assistantContent.includes('TRANSFER_TO:')) {
        const transferMatch = assistantContent.match(/TRANSFER_TO:\s*(\w+)/);
        if (transferMatch) {
          const targetAgentName = transferMatch[1];
          const explanation = assistantContent.replace(/TRANSFER_TO:\s*\w+\s*/, '').trim();
          
          // Create transfer explanation message
          const transferExplanation: UniversalMessage = {
            id: generateMessageId(),
            sessionId,
            timestamp: new Date().toISOString(),
            type: 'text',
            content: explanation || `I think ${targetAgentName} would be better suited to help you with this request.`,
            metadata: {
              source: 'ai',
              channel: activeChannel,
              language: 'en',
              agentName: selectedAgentName
            }
          };

          addMessage(transferExplanation);
          
          // Initiate transfer
          setTimeout(() => {
            handleAgentTransfer(targetAgentName);
          }, 1000);
          
          setIsLoading(false);
          return;
        }
      }

      // AI response message already created and logged above

      // If channel is LINE, push the AI response to the configured LINE user
      if (activeChannel === 'line') {
        try {
          await fetch('/api/line/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: assistantContent })
          });
        } catch (err) {
          console.warn('[AgentChatInterface] LINE push failed', err);
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Create error message
      const errorMessage: UniversalMessage = {
        id: generateMessageId(),
        sessionId,
        timestamp: new Date().toISOString(),
        type: 'system',
        content: 'Sorry, there was an error processing your message. Please try again.',
        metadata: {
          source: 'ai',
          channel: activeChannel,
          language: 'en',
          agentName: selectedAgentName
        }
      };

      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && inputValue.trim()) {
      sendMessage(inputValue);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
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
      case 'line':
        return { name: 'LINE', icon: UserGroupIcon, color: 'emerald' };
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

  // Handle voice responses from voice interface
  const handleVoiceResponse = (message: UniversalMessage) => {
    // Voice messages are already added to the message history by VoiceChatInterface
    // This callback can be used for additional processing if needed
    console.log('[AgentChatInterface] Voice response received:', message.content);
  };

  // If realtime channel is selected, use voice interface
  if (activeChannel === 'realtime') {
    return (
      <VoiceChatInterface
        sessionId={sessionId}
        activeChannel={activeChannel}
        onChannelSwitch={onChannelSwitch}
        onVoiceResponse={handleVoiceResponse}
        selectedAgentName={selectedAgentName}
        selectedAgentConfigSet={selectedAgentConfigSet}
        onAgentTransfer={handleAgentTransfer}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow border border-gray-200">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            activeChannel === 'normal' ? 'bg-blue-500' : 'bg-purple-500'
          }`}></div>
          <h3 className="font-medium text-gray-800">
            {getChannelInfo(activeChannel).name} - {selectedAgentName}
          </h3>
          {currentAgent?.downstreamAgents && currentAgent.downstreamAgents.length > 0 && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Transfer Available
            </span>
          )}
        </div>
        
        {/* Channel Switch Buttons and Actions */}
        <div className="flex space-x-2">
          {/* Clear messages button */}
          {messages.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all messages? This cannot be undone.')) {
                  clearMessages();
                }
              }}
              className="p-2 rounded-md bg-white text-gray-400 hover:text-red-600 transition-colors"
              title="Clear all messages"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
          
          {/* Channel Switch Buttons */}
          {(['normal', 'realtime', 'human', 'line'] as const).map((channel) => {
            const info = getChannelInfo(channel);
            const Icon = info.icon;
            
            return (
              <button
                key={channel}
                onClick={() => {
                  console.log(`[AgentChatInterface] Channel switch clicked: ${channel}`);
                  console.log(`[AgentChatInterface] Current channel: ${activeChannel}`);
                  onChannelSwitch(channel);
                }}
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

      {/* Transfer Options */}
      {currentAgent?.downstreamAgents && currentAgent.downstreamAgents.length > 0 && (
        <div className="p-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center space-x-2 text-sm">
            <span className="font-medium text-blue-900">Quick Transfer:</span>
            {currentAgent.downstreamAgents.map((agent) => (
              <button
                key={agent.name}
                onClick={() => handleAgentTransfer(agent.name)}
                className="flex items-center space-x-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md transition-colors"
                title={agent.publicDescription}
              >
                <span>{agent.name}</span>
                <ArrowRightIcon className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
        style={{ maxHeight: 'calc(600px - 180px)' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-600" style={{ minHeight: '350px' }}>
            <div className="text-4xl mb-4">
              {activeChannel === 'human' ? '👥' : '🤖'}
            </div>
            <p className="text-lg font-medium mb-2 text-gray-700">
              Chat with {selectedAgentName}
            </p>
            <p className="text-sm text-center text-gray-600 max-w-md">
              {currentAgent?.publicDescription || 'Start a conversation with this AI agent'}
            </p>
            {currentAgent?.downstreamAgents && currentAgent.downstreamAgents.length > 0 && (
              <p className="text-xs text-blue-600 mt-2">
                This agent can transfer you to: {currentAgent.downstreamAgents.map(a => a.name).join(', ')}
              </p>
            )}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.metadata.source === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
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
                  <CpuChipIcon className="w-4 h-4" />
                ) : (
                  <UserGroupIcon className="w-4 h-4" />
                )}
              </div>

              {/* Message Bubble */}
              <div className={`flex-1 max-w-xs lg:max-w-md ${
                message.metadata.source === 'user' ? 'text-right' : 'text-left'
              }`}>
                <div className={`inline-block p-3 rounded-lg ${
                  message.metadata.source === 'user'
                    ? 'bg-blue-500 text-white'
                    : message.type === 'system'
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                                     <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
              <CpuChipIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 max-w-xs lg:max-w-md">
              <div className="inline-block p-3 rounded-lg bg-gray-100">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${selectedAgentName}... (${getChannelInfo(activeChannel).name})`}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-600 text-gray-900 placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </form>
        
        {/* Channel and agent status */}
        <div className="mt-2 text-xs text-gray-600 flex items-center justify-between">
          <span>
            Agent: {selectedAgentName} • Channel: {getChannelInfo(activeChannel).name}
          </span>
          {isProcessing && (
            <span className="text-yellow-700 font-medium">Processing...</span>
          )}
        </div>
      </div>
    </div>
  );
} 