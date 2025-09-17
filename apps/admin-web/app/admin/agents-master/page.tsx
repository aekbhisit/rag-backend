'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BACKEND_URL } from '../../../components/config';

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  function_name?: string;
  function_args?: any;
  function_result?: any;
  tokens_used?: number;
  created_at?: string;
}

interface FunctionCallLog {
  id: string;
  function_name: string;
  function_args: any;
  status: 'pending' | 'executing' | 'completed' | 'error';
  result?: any;
  error?: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  agent_key?: string;
}

interface Agent {
  id: string;
  agent_key: string;
  name: string;
  public_description: string;
  is_enabled: boolean;
  is_default: boolean;
  icon?: string;
  theme?: string;
}

interface AiConfig {
  apiKey: string;
  model: string;
  provider: string;
  maxTokens: number;
  temperature: number;
}

export default function AgentsMasterPage() {
  console.log('AgentsMasterPage: Component rendering');
  
  // Add error boundary
  React.useEffect(() => {
    console.log('AgentsMasterPage: Component mounted');
    return () => {
      console.log('AgentsMasterPage: Component unmounted');
    };
  }, []);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState('');
  const [selectedAgentKey, setSelectedAgentKey] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [functionCallLogs, setFunctionCallLogs] = useState<FunctionCallLog[]>([]);
  const [isExecutingFunctions, setIsExecutingFunctions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  useEffect(() => {
    const initializeApp = async () => {
      // Set default values for development if not already set
      if (typeof window !== 'undefined') {
        if (!localStorage.getItem('tenantId')) {
          localStorage.setItem('tenantId', 'acc44cdb-8da5-4226-9569-1233a39f564f');
        }
        if (!localStorage.getItem('userId') && !localStorage.getItem('userEmail')) {
          localStorage.setItem('userId', 'test-user');
        }
        // Set authentication for development
        if (!localStorage.getItem('isAuthenticated')) {
          localStorage.setItem('isAuthenticated', 'true');
        }
        if (!localStorage.getItem('userEmail')) {
          localStorage.setItem('userEmail', 'test@example.com');
        }
      }
      
      try {
        await loadConversations();
        await loadAiConfig();
        await loadAgents();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setError(`Failed to initialize: ${error}`);
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId') || 'acc44cdb-8da5-4226-9569-1233a39f564f';
      const userId = localStorage.getItem('userId') || localStorage.getItem('userEmail') || 'test-user';
      
      console.log('Loading conversations with:', { tenantId, userId, backendUrl: BACKEND_URL });
      
      const response = await fetch(`${BACKEND_URL}/api/admin/agents-master/conversations`, {
        headers: {
          'X-Tenant-ID': tenantId,
          'X-User-ID': userId,
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Conversations loaded:', data);
        console.log('Current agents state when loading conversations:', agents);
        setConversations(data);
      } else {
        console.error('Failed to load conversations:', response.status, response.statusText);
        setError(`Failed to load conversations: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setError(`Failed to load conversations: ${error}`);
    }
  };

  const loadAiConfig = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId') || 'acc44cdb-8da5-4226-9569-1233a39f564f';
      
      const response = await fetch(`${BACKEND_URL}/api/admin/agents-master/config`, {
        headers: {
          'X-Tenant-ID': tenantId,
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAiConfig(data);
      } else {
        console.error('Failed to load AI config:', response.status, response.statusText);
        setError(`Failed to load AI config: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
      setError(`Failed to load AI config: ${error}`);
    }
  };

  const loadAgents = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId') || 'acc44cdb-8da5-4226-9569-1233a39f564f';
      
      const response = await fetch(`${BACKEND_URL}/api/admin/agents`, {
        headers: {
          'X-Tenant-ID': tenantId,
        }
      });
      if (response.ok) {
        const data = await response.json();
        const enabledAgents = data.filter((agent: Agent) => agent.is_enabled);
        console.log('Agents loaded:', enabledAgents);
        setAgents(enabledAgents);
        
        // Set default agent as pre-selected
        const defaultAgent = enabledAgents.find((agent: Agent) => agent.is_default);
        if (defaultAgent) {
          setSelectedAgentKey(defaultAgent.agent_key);
        } else if (enabledAgents.length > 0) {
          setSelectedAgentKey(enabledAgents[0].agent_key);
        }
      } else {
        console.error('Failed to load agents:', response.status, response.statusText);
        setError(`Failed to load agents: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
      setError(`Failed to load agents: ${error}`);
    }
  };

  const createNewConversation = async () => {
    if (!newConversationTitle.trim() || !selectedAgentKey) return;

    try {
      const tenantId = localStorage.getItem('tenantId') || 'acc44cdb-8da5-4226-9569-1233a39f564f';
      const userId = localStorage.getItem('userId') || localStorage.getItem('userEmail') || 'test-user';
      
      const response = await fetch(`${BACKEND_URL}/api/admin/agents-master/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
          'X-User-ID': userId,
        },
        body: JSON.stringify({
          title: newConversationTitle,
          sessionId: `session_${Date.now()}`,
          agentKey: selectedAgentKey
        })
      });

      if (response.ok) {
        const data = await response.json();
        await loadConversations();
        setNewConversationTitle('');
        // Don't reset selectedAgentKey - keep the current selection for future conversations
        setShowNewConversation(false);
        
        // Load the new conversation
        const newConversation = conversations.find(c => c.id === data.conversationId);
        if (newConversation) {
          setCurrentConversation(newConversation);
          loadConversationMessages(newConversation.id);
        }
      } else {
        console.error('Failed to create conversation:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/agents-master/conversations/${conversationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const tenantId = localStorage.getItem('tenantId') || 'acc44cdb-8da5-4226-9569-1233a39f564f';
      const userId = localStorage.getItem('userId') || localStorage.getItem('userEmail') || 'test-user';
      
      const response = await fetch(`${BACKEND_URL}/api/admin/agents-master/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'X-Tenant-ID': tenantId,
          'X-User-ID': userId,
        }
      });

      if (response.ok) {
        // Remove from local state
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        
        // If this was the current conversation, clear it
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(null);
          setMessages([]);
        }
      } else {
        console.error('Failed to delete conversation:', response.status, response.statusText);
        setError(`Failed to delete conversation: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      setError(`Failed to delete conversation: ${error}`);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentConversation) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    // Clear previous function call logs
    setFunctionCallLogs([]);
    setIsExecutingFunctions(false);

    try {
      const tenantId = localStorage.getItem('tenantId') || 'acc44cdb-8da5-4226-9569-1233a39f564f';
      const userId = localStorage.getItem('userId') || localStorage.getItem('userEmail') || 'test-user';
      
      const response = await fetch(`${BACKEND_URL}/api/admin/agents-master/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
          'X-User-ID': userId,
        },
        body: JSON.stringify({
          conversationId: currentConversation.id,
          message: inputMessage,
          agentKey: currentConversation.agent_key
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Create assistant message
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.message || "I'm here to help you manage agents, prompts, and tools. What would you like to do?",
          created_at: new Date().toISOString()
        };

        // If there's a function call, add it to the message
        if (data.function_call) {
          assistantMessage.function_name = data.function_call.name;
          assistantMessage.function_args = data.function_call.arguments;
        }

        // If there's a function result, add it to the message
        if (data.function_result) {
          assistantMessage.function_result = data.function_result;
        }

        setMessages(prev => [...prev, assistantMessage]);

        // If there was a function call, also add a function message
        if (data.function_result) {
          const functionMessage: ChatMessage = {
            role: 'function',
            content: JSON.stringify(data.function_result),
            function_name: data.function_call?.name,
            function_args: data.function_call?.arguments,
            function_result: data.function_result,
            created_at: new Date().toISOString()
          };
          setMessages(prev => [...prev, functionMessage]);
        }

        // Process function call logs if available
        if (data.function_calls && Array.isArray(data.function_calls)) {
          // Deduplicate function calls based on function name and arguments
          const uniqueFunctionCalls = data.function_calls.reduce((acc: any[], fc: any) => {
            const key = `${fc.function_name}_${JSON.stringify(fc.function_args)}`;
            const existing = acc.find(item => 
              `${item.function_name}_${JSON.stringify(item.function_args)}` === key
            );
            
            if (!existing) {
              acc.push(fc);
            } else if (fc.status === 'completed' && existing.status !== 'completed') {
              // Update with completed status if we have a better result
              const index = acc.indexOf(existing);
              acc[index] = fc;
            }
            
            return acc;
          }, []);
          
          const logs: FunctionCallLog[] = uniqueFunctionCalls.map((fc: any, index: number) => ({
            id: `fc_${fc.function_name}_${Date.now()}_${index}`,
            function_name: fc.function_name,
            function_args: fc.function_args,
            status: fc.status as FunctionCallLog['status'],
            result: fc.function_result,
            timestamp: new Date()
          }));
          
          setFunctionCallLogs(logs);
          setIsExecutingFunctions(false);
          
          // If there are function calls, show executing state
          if (logs.length > 0) {
            setIsExecutingFunctions(true);
          }
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to send message:', response.status, errorData);
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `Error: ${errorData.error || 'Failed to send message'}`,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addFunctionCallLog = (functionName: string, functionArgs: any, status: FunctionCallLog['status'], result?: any, error?: string) => {
    const log: FunctionCallLog = {
      id: `${functionName}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      function_name: functionName,
      function_args: functionArgs,
      status,
      result,
      error,
      timestamp: new Date()
    };
    
    setFunctionCallLogs(prev => [...prev, log]);
  };

  const updateFunctionCallLog = (id: string, updates: Partial<FunctionCallLog>) => {
    setFunctionCallLogs(prev => prev.map(log => 
      log.id === id ? { ...log, ...updates } : log
    ));
  };

  const selectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    loadConversationMessages(conversation.id);
    setError(null); // Clear any previous errors
  };

  const clearError = () => {
    setError(null);
  };

  if (!isInitialized) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Agents Master...</p>
          <p className="text-xs text-gray-500 mt-2">Debug: isInitialized = {String(isInitialized)}</p>
        </div>
      </div>
    );
  }

  try {
    return (
    <div className="grid grid-cols-[320px_1fr] bg-gray-50 overflow-hidden" style={{ height: 'calc(100vh - 56px - 48px)' }}>
      {/* Sidebar */}
      <div className="bg-white border-r border-gray-200 flex flex-col h-full min-h-0">
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <h1 className="text-xl font-semibold text-gray-900">Agents Master</h1>
          <p className="text-sm text-gray-600 mt-1">AI-powered agent management</p>
          {error && (
            <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-xs flex justify-between items-center">
              <span>{error}</span>
              <button onClick={clearError} className="text-red-500 hover:text-red-700">
                ×
              </button>
            </div>
          )}
        </div>

        {/* Create Conversation (inline) */}
        <div className="p-4 flex-shrink-0 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Agent</label>
            <div className="relative">
              <select
                value={selectedAgentKey}
                onChange={(e) => setSelectedAgentKey(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">Choose an agent...</option>
                {agents.map((agent) => (
                  <option key={agent.agent_key} value={agent.agent_key}>
                    {agent.name} {agent.is_default ? '(Default)' : ''}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Conversation Title</label>
            <input
              type="text"
              value={newConversationTitle}
              onChange={(e) => setNewConversationTitle(e.target.value)}
              placeholder="Enter conversation title..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && createNewConversation()}
            />
          </div>

          <button
            onClick={createNewConversation}
            disabled={!newConversationTitle.trim() || !selectedAgentKey}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add Conversation
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Conversations</h3>
              <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                {conversations.length}
              </span>
            </div>
          </div>
          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">No conversations yet</h3>
              <p className="text-sm text-gray-500 mb-4">Start your first conversation to improve an agent</p>
              <button
                onClick={() => setShowNewConversation(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Create Conversation
              </button>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${
                  currentConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => selectConversation(conversation)}
                  >
                    <h3 className="font-medium text-gray-900 truncate">{conversation.title}</h3>
                    <div className="flex items-center space-x-3 mt-2">
                      <p className="text-sm text-gray-500">
                        {new Date(conversation.updated_at).toLocaleDateString()}
                      </p>
                      {conversation.agent_key && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className="text-xs font-medium text-blue-600">
                            {(() => {
                              const agent = agents.find(a => a.agent_key === conversation.agent_key);
                              console.log('Agent lookup:', { 
                                conversationAgentKey: conversation.agent_key, 
                                agents: agents, 
                                foundAgent: agent 
                              });
                              return agent?.name || conversation.agent_key;
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to delete "${conversation.title}"?`)) {
                        deleteConversation(conversation.id);
                      }
                    }}
                    className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Delete conversation"
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

        {/* AI Config Info */}
        {aiConfig && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <h4 className="text-sm font-medium text-gray-900 mb-2">AI Configuration</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Provider: {aiConfig.provider}</div>
              <div>Model: {aiConfig.model}</div>
              <div>Max Tokens: {aiConfig.maxTokens}</div>
            </div>
          </div>
        )}
        
        {/* Development Mode Indicator */}
        <div className="p-4 border-t border-gray-200 bg-yellow-50 flex-shrink-0">
          <div className="text-xs text-yellow-700">
            <div className="font-medium">Development Mode</div>
                            <div>Tenant: {localStorage.getItem('tenantId') || 'acc44cdb-8da5-4226-9569-1233a39f564f'}</div>
            <div>User: {localStorage.getItem('userId') || localStorage.getItem('userEmail') || 'test-user'}</div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 56px - 48px)' }}>
        {currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{currentConversation.title}</h2>
                  <p className="text-sm text-gray-600">
                    Created {new Date(currentConversation.created_at).toLocaleDateString()}
                  </p>
                </div>
                {currentConversation.agent_key && (
                  <div className="bg-blue-50 px-3 py-1 rounded-full">
                    <span className="text-sm font-medium text-blue-700">
                      Agent: {agents.find(a => a.agent_key === currentConversation.agent_key)?.name || currentConversation.agent_key}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100vh - 284px)' }}>
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <p>Start a conversation to manage your agents, prompts, and tools.</p>
                  <p className="text-sm mt-2">Try asking: "Create a new customer service agent"</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-3xl px-4 py-2 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">
                        {message.role === 'user' ? 'You' : 'AI Assistant'}
                      </div>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      {message.function_name && (
                        <div className="mt-2 text-xs opacity-75">
                          Function: {message.function_name}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {/* Function Call Logs */}
              {functionCallLogs.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                    🔧 Function Execution Summary
                  </div>
                  
                  {/* Summary Card */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-green-900">
                        Task Completed Successfully
                      </span>
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        ✅ {functionCallLogs.length} Functions Executed
                      </span>
                    </div>
                    <div className="text-xs text-green-700">
                      The AI has successfully completed your request using the following functions:
                    </div>
                  </div>
                  
                  {/* Function Details */}
                  {functionCallLogs.map((log) => (
                    <div key={log.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {log.function_name === 'get_prompt' ? '📖 Read Prompt' :
                             log.function_name === 'update_prompt' ? '✏️ Update Prompt' :
                             log.function_name === 'add_tool_to_agent' ? '🔧 Add Tool' :
                             log.function_name}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            log.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            log.status === 'executing' ? 'bg-blue-100 text-blue-800' :
                            log.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {log.status === 'pending' ? '⏳ Pending' :
                             log.status === 'executing' ? '🔄 Executing' :
                             log.status === 'completed' ? '✅ Completed' :
                             '❌ Error'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {/* Simplified Arguments Display */}
                      <div className="text-xs text-gray-600 mb-2">
                        <strong>Action:</strong> {
                          log.function_name === 'get_prompt' ? `Read prompt for agent: ${log.function_args.agent_key || 'N/A'}` :
                          log.function_name === 'update_prompt' ? `Update prompt for agent: ${log.function_args.agent_key || 'N/A'}` :
                          log.function_name === 'add_tool_to_agent' ? `Add tool to agent: ${log.function_args.agent_key || 'N/A'}` :
                          `Execute ${log.function_name}`
                        }
                      </div>
                      
                      {/* Success/Error Summary */}
                      {log.status === 'completed' && log.result && (
                        <div className="text-xs text-gray-600 mb-2">
                          {log.result.success ? (
                            <span className="text-green-600">✅ Successfully completed</span>
                          ) : log.result.error ? (
                            <span className="text-red-600">❌ Error: {log.result.error}</span>
                          ) : (
                            <span className="text-blue-600">ℹ️ Information retrieved</span>
                          )}
                        </div>
                      )}
                      
                      {/* Test Results Display */}
                      {log.status === 'completed' && log.result && log.result.test_summary && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                          <div className="font-medium text-blue-900 mb-1">🧪 Test Results:</div>
                          <div className="text-blue-800 whitespace-pre-line">
                            {log.result.test_summary}
                          </div>
                        </div>
                      )}
                      
                      {log.status === 'error' && log.error && (
                        <div className="text-xs text-red-600">
                          <strong>Error:</strong> {log.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      <span>{isExecutingFunctions ? 'Executing functions...' : 'AI is thinking...'}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
              <div className="flex space-x-4">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here... (Press Enter to send)"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={2}
                  disabled={isLoading}
                  style={{ height: '60px' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Agents Master</h3>
              <p className="text-gray-600">
                Use the form on the left to add a new conversation.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal removed - inline form is used instead */}
    </div>
    );
  } catch (error) {
    console.error('AgentsMasterPage: Error rendering component:', error);
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-600 mb-4">Error Loading Agents Master</h1>
          <p className="text-gray-600 mb-4">An error occurred while loading the page.</p>
          <pre className="text-xs text-gray-500 bg-gray-100 p-2 rounded overflow-auto max-w-md">
            {error instanceof Error ? error.message : String(error)}
          </pre>
        </div>
      </div>
    );
  }
}
