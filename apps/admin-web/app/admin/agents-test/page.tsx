'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BACKEND_URL } from '../../../components/config';

type ChatRole = 'user' | 'assistant' | 'system' | 'function';

interface ChatMessage {
  role: ChatRole;
  content: string;
  function_name?: string;
  function_args?: any;
  function_result?: any;
  created_at?: string;
}

interface AgentItem {
  id: string;
  agent_key: string;
  name: string;
  public_description: string;
  is_enabled: boolean;
  is_default: boolean;
  icon?: string;
  theme?: string;
}

interface ConversationItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  agent_key?: string;
  metadata?: any;
}

export default function AgentsTestPage() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [selectedAgentKey, setSelectedAgentKey] = useState<string>('');
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const endRef = useRef<HTMLDivElement>(null);

  // Local storage helpers (keep test conversations/messages separate from master)
  const readLocalConversations = (): ConversationItem[] => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('agents-test.conversations') : null;
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  };
  const writeLocalConversations = (items: ConversationItem[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('agents-test.conversations', JSON.stringify(items));
  };
  const readLocalMessages = (conversationId: string): ChatMessage[] => {
    if (!conversationId) return [];
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(`agents-test.messages.${conversationId}`) : null;
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  };
  const writeLocalMessages = (conversationId: string, msgs: ChatMessage[]) => {
    if (typeof window === 'undefined' || !conversationId) return;
    localStorage.setItem(`agents-test.messages.${conversationId}`, JSON.stringify(msgs));
  };

  const tenantId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const v = localStorage.getItem('tenantId') || 'acc44cdb-8da5-4226-9569-1233a39f564f';
    return v;
  }, []);
  const userId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const v = localStorage.getItem('userId') || localStorage.getItem('userEmail') || 'test-user';
    return v || 'test-user';
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('isAuthenticated')) localStorage.setItem('isAuthenticated', 'true');
      if (!localStorage.getItem('userEmail')) localStorage.setItem('userEmail', 'test@example.com');
      if (!localStorage.getItem('userId')) localStorage.setItem('userId', 'test-user');
      if (!localStorage.getItem('tenantId')) localStorage.setItem('tenantId', 'acc44cdb-8da5-4226-9569-1233a39f564f');
    }
    loadAgents();
    loadConversations();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadAgents() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/agents`, { headers: { 'X-Tenant-ID': tenantId } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data: AgentItem[] = await res.json();
      const enabled = data.filter(a => a.is_enabled);
      setAgents(enabled);
      const def = enabled.find(a => a.is_default) || enabled[0];
      if (def) setSelectedAgentKey(def.agent_key);
    } catch (e: any) {
      setError(`Failed to load agents: ${e.message || String(e)}`);
    }
  }

  async function loadConversations() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/agents-test/conversations`, {
        headers: { 'X-Tenant-ID': tenantId, 'X-User-ID': userId }
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const items = await res.json();
      setConversations(items);
    } catch (e: any) {
      // Fallback to local
      const items = readLocalConversations();
      setConversations(items);
    }
  }

  async function loadMessages(conversationId: string) {
    const data = readLocalMessages(conversationId);
    setMessages(data);
  }

  async function createConversation() {
    if (!selectedAgentKey) return;
    const fallbackTitle = (() => {
      if (newTitle.trim()) return newTitle.trim();
      const ag = agents.find(a => a.agent_key === selectedAgentKey);
      const dateStr = new Date().toLocaleString();
      return `Test: ${ag?.name || selectedAgentKey} · ${dateStr}`;
    })();
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/agents-test/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
          'X-User-ID': userId,
        },
        body: JSON.stringify({ title: fallbackTitle, sessionId: `session_${Date.now()}`, agentKey: selectedAgentKey })
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const { conversationId } = await res.json();
      await loadConversations();
      const created = (await (async () => conversations.find(c => c.id === conversationId))()) || null;
      if (created) {
        setCurrentConversation(created);
        setMessages([]);
        writeLocalMessages(created.id, []);
      }
    } catch (e) {
      // fallback local create
      const id = `test_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const now = new Date().toISOString();
      const conv: ConversationItem = { id, title: fallbackTitle, status: 'active', created_at: now, updated_at: now, agent_key: selectedAgentKey, metadata: { source: 'agents-test' } } as any;
      const items = readLocalConversations();
      const next = [conv, ...items];
      writeLocalConversations(next);
      setConversations(next);
      setCurrentConversation(conv);
      setMessages([]);
      writeLocalMessages(id, []);
    }
    setNewTitle('');
  }

  async function onSelectConversation(conv: ConversationItem) {
    setCurrentConversation(conv);
    await loadMessages(conv.id);
  }

  async function send() {
    if (!inputMessage.trim() || !currentConversation) return;
    const msg: ChatMessage = { role: 'user', content: inputMessage, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, msg]);
    setInputMessage('');
    setLoading(true);
    try {
      // Call agent-specific test endpoint to use agent prompts/tools directly
      const res = await fetch(`${BACKEND_URL}/api/admin/agents-test/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
          'X-User-ID': userId,
        },
        body: JSON.stringify({
          message: msg.content,
          agentKey: currentConversation.agent_key || selectedAgentKey,
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      const assistant: ChatMessage = {
        role: 'assistant',
        content: data.message || '',
        function_name: undefined,
        function_args: undefined,
        function_result: undefined,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => {
        const next = [...prev, assistant];
        if (currentConversation) writeLocalMessages(currentConversation.id, next);
        return next;
      });
      if (Array.isArray(data.function_calls) && data.function_calls.length > 0) {
        data.function_calls.forEach((fc: any) => {
          const funcMsg: ChatMessage = { role: 'function', content: JSON.stringify(fc), function_name: fc.function_name, function_args: fc.function_args, created_at: new Date().toISOString() };
          setMessages(prev => {
            const next = [...prev, funcMsg];
            if (currentConversation) writeLocalMessages(currentConversation.id, next);
            return next;
          });
        });
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message || String(e)}` }]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="grid grid-cols-[320px_1fr] bg-gray-50 overflow-hidden" style={{ height: 'calc(100vh - 56px - 48px)' }}>
      <div className="bg-white border-r border-gray-200 flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <h1 className="text-xl font-semibold text-gray-900">Agents Test</h1>
          <p className="text-sm text-gray-600 mt-1">Test chat and tool calls per agent</p>
          {error && (
            <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-xs flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
            </div>
          )}
        </div>

        <div className="p-4 flex-shrink-0 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Select Agent</label>
              <span className="text-xs text-gray-500">{agents.length} available</span>
            </div>
            <div className="relative">
              <select
                value={selectedAgentKey}
                onChange={e => setSelectedAgentKey(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">Choose an agent...</option>
                {agents.map(a => (
                  <option key={a.agent_key} value={a.agent_key}>
                    {a.name}{a.is_default ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Enter title (optional)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button onClick={createConversation} disabled={!selectedAgentKey} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Add Conversation</button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 320px)' }}>
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Conversations</h3>
            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">{conversations.length}</span>
          </div>
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-600">No conversations yet</div>
          ) : (
            conversations.map(c => (
              <div key={c.id} onClick={() => onSelectConversation(c)} className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${currentConversation?.id === c.id ? 'bg-blue-50 border-blue-200' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 truncate">{c.title}</div>
                    <div className="text-xs text-gray-600 mt-1">{new Date(c.updated_at).toLocaleString()}</div>
                  </div>
                  {c.agent_key && (
                    <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full">{agents.find(a => a.agent_key === c.agent_key)?.name || c.agent_key}</span>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!confirm('Delete this conversation?')) return;
                      (async () => {
                        try {
                          const resp = await fetch(`${BACKEND_URL}/api/admin/agents-test/conversations/${c.id}`, { method: 'DELETE' });
                          if (!resp.ok) throw new Error('Delete failed');
                        } catch {}
                        setConversations(prev => prev.filter(x => x.id !== c.id));
                        if (currentConversation?.id === c.id) {
                          setCurrentConversation(null);
                          setMessages([]);
                        }
                      })();
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Delete conversation"
                    aria-label="Delete conversation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 56px - 48px)' }}>
        {currentConversation ? (
          <>
            <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{currentConversation.title}</h2>
                  <p className="text-sm text-gray-600">Created {new Date(currentConversation.created_at).toLocaleDateString()}</p>
                </div>
                {currentConversation.agent_key && (
                  <div className="bg-blue-50 px-3 py-1 rounded-full">
                    <span className="text-sm font-medium text-blue-700">Agent: {agents.find(a => a.agent_key === currentConversation.agent_key)?.name || currentConversation.agent_key}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100vh - 284px)' }}>
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">Send a message to test tool calls.</div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-3xl px-4 py-2 rounded-lg ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      <div className="text-sm font-medium mb-1">{m.role === 'user' ? 'You' : (m.role === 'function' ? 'Function' : 'Agent')}</div>
                      <div className="whitespace-pre-wrap break-words">
                        {m.role === 'function' ? (
                          <code className="text-xs block whitespace-pre-wrap break-words">{m.content}</code>
                        ) : (
                          m.content
                        )}
                      </div>
                      {m.function_name && (
                        <div className="mt-2 text-xs opacity-75">Function: {m.function_name}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      <span>AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
            <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
              <div className="flex space-x-4">
                <textarea value={inputMessage} onChange={e => setInputMessage(e.target.value)} onKeyDown={onKey} placeholder="Type your message... (Enter to send)" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" rows={2} disabled={loading} style={{ height: '60px' }} />
                <button onClick={send} disabled={!inputMessage.trim() || loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end">Send</button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Agents Test</h3>
              <p className="text-gray-600">Use the form on the left to add a new test conversation.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}


