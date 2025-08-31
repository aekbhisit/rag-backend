"use client";

import React, { useState, useRef, useEffect } from 'react';
import { UniversalMessage } from '@/app/types';
import { PaperAirplaneIcon, MicrophoneIcon, UserIcon, CpuChipIcon, UserGroupIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useMessageHistory } from './MessageHistory';
import VoiceChatInterface from './VoiceChatInterface';

interface ChatInterfaceProps {
  sessionId: string;
  activeChannel: 'normal' | 'realtime' | 'human';
  onChannelSwitch: (channel: 'normal' | 'realtime' | 'human') => void;
  isProcessing: boolean;
}

export default function ChatInterface({ 
  sessionId, 
  activeChannel, 
  onChannelSwitch, 
  isProcessing 
}: ChatInterfaceProps) {
  const { messages, addMessage, clearMessages } = useMessageHistory(sessionId);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const generateMessageId = () => crypto.randomUUID().slice(0, 32);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    const userMessage: UniversalMessage = {
      id: generateMessageId(),
      sessionId,
      timestamp: new Date().toISOString(),
      type: 'text',
      content: content.trim(),
      metadata: { source: 'user', channel: activeChannel, language: 'en' }
    };
    addMessage(userMessage);
    setInputValue('');
    setIsLoading(true);
    setTimeout(scrollToBottom, 50);

    try {
      if (activeChannel === 'realtime') {
        const voiceMessage: UniversalMessage = {
          id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'system',
          content: 'Voice mode is not yet fully implemented. The text message has been processed in text mode for now. Please switch to "Text Chat" for full functionality.',
          metadata: { source: 'ai', channel: activeChannel, language: 'en' }
        };
        addMessage(voiceMessage);
        setIsLoading(false);
        return;
      }

      if (activeChannel === 'human') {
        const humanMessage: UniversalMessage = {
          id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'system',
          content: 'Your message has been forwarded to our human support team. A representative will respond shortly. (Human support integration is in development)',
          metadata: { source: 'ai', channel: activeChannel, language: 'en' }
        };
        addMessage(humanMessage);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: `You are a helpful AI assistant. You are currently communicating through the ${activeChannel} channel. Be concise but helpful.` },
            ...messages.slice(-10).map(msg => ({ role: msg.metadata.source === 'user' ? 'user' : 'assistant', content: msg.content })),
            { role: 'user', content: content.trim() }
          ],
          temperature: 0.7, max_tokens: 1000
        })
      });

      if (!response.ok) throw new Error(`API call failed: ${response.status}`);

      const data = await response.json();
      const assistantContent = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
      const aiMessage: UniversalMessage = {
        id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'text', content: assistantContent,
        metadata: { source: 'ai', channel: activeChannel, language: 'en', agentName: 'GPT-4o' }
      };
      addMessage(aiMessage);
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

  if (activeChannel === 'realtime') {
    return (
      <VoiceChatInterface sessionId={sessionId} activeChannel={activeChannel} onChannelSwitch={onChannelSwitch} onVoiceResponse={handleVoiceResponse} />
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className={`w-2.5 h-2.5 rounded-full ${activeChannel === 'normal' ? 'bg-blue-500' : 'bg-purple-500'}`} />
          <h3 className="text-sm font-medium text-gray-800">{getChannelInfo(activeChannel).name}</h3>
        </div>
        <div className="flex space-x-2">
          {messages.length > 0 && (
            <button
              onClick={() => { if (confirm('Clear all messages?')) clearMessages(); }}
              className="p-2 rounded-md bg-white text-gray-400 hover:text-red-600"
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
                onClick={() => onChannelSwitch(channel)}
                className={`p-2 rounded-md transition-colors ${activeChannel === channel ? `bg-${info.color}-100 text-${info.color}-700` : 'bg-white text-gray-400 hover:text-gray-600'}`}
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
          <div className="flex flex-col items-center justify-center text-gray-600" style={{ minHeight: '40vh' }}>
            <div className="text-3xl mb-3">{activeChannel === 'human' ? '👥' : '💬'}</div>
            <p className="text-sm text-center text-gray-600">
              {activeChannel === 'human' ? 'Your messages will be forwarded to human support agents.' : 'Send a message to begin chatting with the AI assistant'}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex items-start space-x-3 ${message.metadata.source === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.metadata.source === 'user' ? 'bg-blue-500 text-white' : message.metadata.source === 'ai' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                {message.metadata.source === 'user' ? <UserIcon className="w-4 h-4" /> : message.metadata.source === 'ai' ? <CpuChipIcon className="w-4 h-4" /> : <UserGroupIcon className="w-4 h-4" />}
              </div>
              <div className={`flex-1 max-w-xs lg:max-w-md ${message.metadata.source === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-3 rounded-lg ${message.metadata.source === 'user' ? 'bg-blue-500 text-white' : message.type === 'system' ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-900'}`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <div className={`text-xs text-gray-600 mt-1 ${message.metadata.source === 'user' ? 'text-right' : 'text-left'}`}>
                  {formatTime(message.timestamp)}{message.metadata.agentName && (<span className="ml-2 text-gray-500">• {message.metadata.agentName}</span>)}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center"><CpuChipIcon className="w-4 h-4" /></div>
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area pinned at bottom by flex */}
      <div className="border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="p-3">
          <div className="flex items-end space-x-3">
            <textarea
              ref={inputRef}
              rows={3}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={`Type your message... (${getChannelInfo(activeChannel).name})`}
              disabled={isLoading}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-600 text-gray-900 placeholder-gray-500 resize-none"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="h-10 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg shadow-sm hover:from-emerald-600 hover:to-emerald-700 hover:shadow focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              title="Send"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-1 text-xs text-gray-600 flex items-center justify-between">
            <span>Enter to send • Shift+Enter for newline</span>
            {isProcessing && (<span className="text-yellow-700 font-medium">Processing...</span>)}
          </div>
        </form>
      </div>
    </div>
  );
} 