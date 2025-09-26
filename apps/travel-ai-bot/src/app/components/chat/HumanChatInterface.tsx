"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { UniversalMessage } from '@/app/types';
import { PaperAirplaneIcon, UserIcon, UserGroupIcon, CpuChipIcon, TrashIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

interface HumanChatInterfaceProps {
  sessionId: string;
  messages: UniversalMessage[];
  addMessage: (m: UniversalMessage) => void;
  clearMessages: () => void;
  isProcessing: boolean;
  baseLanguage?: string;
  activeChannel: 'human';
  onChannelSwitch: (channel: 'normal' | 'realtime' | 'human') => void;
}

export default function HumanChatInterface({ sessionId, messages, addMessage, clearMessages, isProcessing, baseLanguage = 'en', activeChannel, onChannelSwitch }: HumanChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const t = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(t);
  }, [messages]);

  const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const generateMessageId = () => {
    try { if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') { return (crypto as any).randomUUID().slice(0, 32); } } catch {}
    return Math.random().toString(36).slice(2, 34);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setIsLoading(true);

    const userMessage: UniversalMessage = {
      id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'text', content: text,
      metadata: { source: 'user', channel: 'human', language: baseLanguage }
    };
    addMessage(userMessage);

    const ack: UniversalMessage = {
      id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'system',
      content: 'Your message has been forwarded to our human support team (LINE). A representative will respond shortly.',
      metadata: { source: 'ai', channel: 'human', language: baseLanguage }
    };
    addMessage(ack);

    try {
      await fetch('/api/log/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId, role: 'user', type: 'text', content: text, channel: 'human', meta: { language: baseLanguage, is_internal: false } }) });
      await fetch('/api/log/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId, role: 'system', type: 'system', content: ack.content, channel: 'human', meta: { language: baseLanguage, is_internal: false } }) });
    } catch {}

    try {
      await fetch('/api/line/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    } catch {
      const errMsg: UniversalMessage = { id: generateMessageId(), sessionId, timestamp: new Date().toISOString(), type: 'system', content: 'We could not forward your message to LINE at the moment. Please try again.', metadata: { source: 'ai', channel: 'human', language: baseLanguage } };
      addMessage(errMsg);
    }

    setInputValue('');
    setIsLoading(false);
  };

  const getChannelInfo = (channel: string) => {
    switch (channel) {
      case 'human': return { name: 'Human Support', icon: UserGroupIcon, color: 'purple' };
      default: return { name: 'Unknown', icon: CpuChipIcon, color: 'gray' };
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0" style={{ backgroundImage: 'linear-gradient(to bottom, var(--ta-panel-from), var(--ta-panel-to))' }}>
      <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid var(--ta-border)', backgroundImage: 'linear-gradient(to right, var(--ta-panel-from), var(--ta-panel-to))' }}>
        <div className="flex items-center space-x-2">
          <div className={`w-2.5 h-2.5 rounded-full`} style={{ background: 'var(--ta-link)' }} />
          <h3 className="text-sm font-medium" style={{ color: 'var(--ta-text)' }}>{getChannelInfo('human').name}</h3>
        </div>
        <div className="flex space-x-2">
          {messages.length > 0 && (
            <button onClick={() => { if (confirm('Clear all messages?')) clearMessages(); }} className="p-2 rounded-md" style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--ta-muted)', border: '1px solid var(--ta-border)' }} title="Clear all messages">
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-amber-800" style={{ minHeight: '40vh' }}>
            <div className="text-3xl mb-3">
              <UserGroupIcon className="w-12 h-12 mx-auto text-amber-600" />
            </div>
            <p className="text-sm text-center text-amber-800">Your messages will be forwarded to human support agents.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex items-start space-x-3 ${message.metadata.source === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md`} style={{ backgroundImage: 'linear-gradient(to bottom right, var(--ta-icon-from), var(--ta-icon-to))', color: 'var(--ta-on-accent)' }}>
                {message.metadata.source === 'user' ? <UserIcon className="w-4 h-4" /> : <UserGroupIcon className="w-4 h-4" />}
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
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <div className={`text-xs mt-1 ${message.metadata.source === 'user' ? 'text-right' : 'text-left'}`} style={{ color: 'var(--ta-muted)' }}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="" style={{ borderTop: '1px solid var(--ta-border)', backgroundImage: 'linear-gradient(to right, var(--ta-panel-from), var(--ta-panel-to))' }}>
        <form onSubmit={handleSubmit} className="p-3">
          <div className="flex items-end space-x-3">
            <textarea
              rows={3}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Type your message... (Human Support)`}
              disabled={isLoading}
              className="flex-1 px-3 py-2 rounded-lg focus:ring-2 disabled:cursor-not-allowed resize-none"
              style={{ border: '1px solid var(--ta-border)', background: 'rgba(255,255,255,0.8)', color: 'var(--ta-text)' }}
            />
            <button type="submit" disabled={isLoading || !inputValue.trim()} className="h-10 px-4 text-white rounded-lg shadow-md hover:shadow-lg focus-visible:ring-2 focus-visible:outline-none disabled:bg-neutral-400 disabled:cursor-not-allowed transition-all flex items-center justify-center" style={{ backgroundImage: 'linear-gradient(to right, var(--ta-btn-from), var(--ta-btn-to))' }} title="Send">
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
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


