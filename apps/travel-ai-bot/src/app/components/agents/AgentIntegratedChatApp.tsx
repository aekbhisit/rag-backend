"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useConfiguration } from "@/app/lib/config";
import { LanguageProvider, useLanguage } from "@/app/contexts/LanguageContext";
import { SessionRegistryProvider } from "@/app/contexts/SessionRegistryContext";
import { EventProvider } from "@/app/contexts/EventContext";
import { TranscriptProvider } from "@/app/contexts/TranscriptContext";
import AgentChatInterface from "../chat/AgentChatInterface";
import { useAgentSelection } from "@/app/hooks/useAgentSelection";
import { useDbAgentSets } from "@/app/hooks/useDbAgentSets";
import { ActionProvider } from "@/botActionFramework/ActionContext";
import { useActionContext, ActionType } from "@/botActionFramework";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { usePersistedChannel } from "@/app/hooks/usePersistedChannel";

// Inner component that uses the language context and agent selection
function AgentIntegratedChatAppContent() {
  const { agentSets: allAgentSets, defaultSetKey: dbDefault, loading: dbLoading } = useDbAgentSets();
  const searchParams = useSearchParams();
  const [contentPath, setContentPath] = useState<string | null>(null);
  // Register global navigation handler to real pages like /travel/:slug
  const router = useRouter();
  const actionCtx = ((): any => {
    try { return require("@/botActionFramework"); } catch { return null; }
  })();
  const actionContextHook = useActionContext();
  useEffect(() => {
    actionContextHook.registerAction(
      ActionType.NAVIGATE_PAGE,
      'router-travel-navigate',
      async (payload: any) => {
        try {
          if (payload?.pageName === 'travel') {
            const slug = payload?.pageParams?.slug || payload?.slug;
            const path = payload?.path;
            const segments = payload?.segments;
            if (typeof path === 'string' && path.startsWith('/travel')) {
              // Prefer partial render via query param (raw, not encoded)
              const url = new URL(window.location.href);
              const params = new URLSearchParams(url.search);
              params.delete('content');
              const query = params.toString();
              const next = `${url.origin}${url.pathname}${query ? `?${query}&` : '?'}content=${path}${url.hash || ''}`;
              window.history.pushState({}, '', next);
              setContentPath(path);
              return { success: true, message: `Set content=${path}` };
            }
            if (Array.isArray(segments) && segments.length > 0) {
              const route = `/travel/${segments.map((s: string) => encodeURIComponent(s)).join('/')}`;
              const url = new URL(window.location.href);
              const params = new URLSearchParams(url.search);
              params.delete('content');
              const query = params.toString();
              const next = `${url.origin}${url.pathname}${query ? `?${query}&` : '?'}content=${route}${url.hash || ''}`;
              window.history.pushState({}, '', next);
              setContentPath(route);
              return { success: true, message: `Set content=${route}` };
            }
            if (typeof slug === 'string' && slug) {
              const route = `/travel/${slug}`;
              const url = new URL(window.location.href);
              const params = new URLSearchParams(url.search);
              params.delete('content');
              const query = params.toString();
              const next = `${url.origin}${url.pathname}${query ? `?${query}&` : '?'}content=${route}${url.hash || ''}`;
              window.history.pushState({}, '', next);
              setContentPath(route);
              return { success: true, message: `Set content=${route}` };
            }
          }
        } catch (e: any) {
          return { success: false, error: e?.message || 'Navigation error' };
        }
        return { success: false, error: 'Unsupported NAVIGATE_PAGE payload' };
      }
    );
    return () => {
      actionContextHook.unregisterAction(ActionType.NAVIGATE_PAGE, 'router-travel-navigate');
    };
  }, [actionContextHook, router]);

  // React to URL changes to update embedded content
  useEffect(() => {
    const url = new URL(window.location.href);
    const c = url.searchParams.get('content');
    setContentPath(c);
  }, [searchParams]);
  const mountCountRef = useRef(0);
  
  // Configuration
  const { config, isDevelopmentMode } = useConfiguration();
  
  // Use language from context
  const { language } = useLanguage();

  // Agent selection hook
  console.log('[AgentIntegratedChatApp] About to call useAgentSelection...');
  const {
    selectedAgentName,
    setSelectedAgentName,
    selectedAgentConfigSet,
    agentSetKey,
    handleAgentChange,
    handleSelectedAgentChange,
  } = useAgentSelection();
  console.log('[AgentIntegratedChatApp] useAgentSelection returned:', { selectedAgentName, agentSetKey, hasConfigSet: !!selectedAgentConfigSet });

  // Session management - SSR-safe approach
  const [activeChannel, setActiveChannel] = usePersistedChannel('normal');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // SSR-safe session ID generation - start with empty string to match server
  const [sessionId, setSessionId] = useState<string>('');
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Generate session ID only after hydration to prevent SSR/client mismatch
  useEffect(() => {
    // Increment mount count only after hydration
    mountCountRef.current += 1;
    console.log(`[AgentIntegratedChatApp] Component mounting... (mount #${mountCountRef.current})`);
    console.log('[AgentIntegratedChatApp] 🔄 Hydration effect - generating session ID...');
    
    // Check if we have a cached session ID in localStorage (client-side only)
    let cachedSessionId: string | null = null;
    try {
      if (typeof window !== 'undefined') {
        cachedSessionId = localStorage.getItem('agent_session_id');
        const cacheTime = localStorage.getItem('agent_session_time');
        
        // Check if cached session is still valid (less than 5 minutes old)
        if (cachedSessionId && cacheTime) {
          const timeDiff = Date.now() - parseInt(cacheTime);
          if (timeDiff < 5 * 60 * 1000) { // 5 minutes
            console.log('[AgentIntegratedChatApp] 🚀 Using cached session ID from localStorage:', cachedSessionId);
            setSessionId(cachedSessionId);
            setIsHydrated(true);
            return;
          } else {
            console.log('[AgentIntegratedChatApp] ⏰ Cached session ID expired, generating new one');
          }
        }
      }
    } catch (e) {
      console.warn('[AgentIntegratedChatApp] Could not access localStorage:', e);
    }
    
    // Generate new session ID as UUID
    const newSessionId = crypto.randomUUID();
    console.log('[AgentIntegratedChatApp] 🆕 Generated new session ID:', newSessionId);
    
    // Cache it in localStorage for future use
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('agent_session_id', newSessionId);
        localStorage.setItem('agent_session_time', Date.now().toString());
      }
    } catch (e) {
      console.warn('[AgentIntegratedChatApp] Could not cache session ID:', e);
    }
    
    setSessionId(newSessionId);
    setIsHydrated(true);
  }, []); // Only run once after mount
  
  // Environment detection - only for debugging, not used in render
  const [environment, setEnvironment] = useState<string>('');
  
  useEffect(() => {
    setEnvironment(typeof window !== 'undefined' ? 'Client' : 'Server');
    console.log('[AgentIntegratedChatApp] 🌍 Environment detected after hydration');
  }, []);

  // Update agent configuration set when agent set key changes (for smooth transfers)
  // Memoized to prevent unnecessary effect runs
  const transferEffectDeps = useMemo(() => ({ agentSetKey, hasSelectedAgentConfigSet: !!selectedAgentConfigSet }), [agentSetKey, selectedAgentConfigSet]);
  
  useEffect(() => {
    console.log('[AgentIntegratedChatApp] Transfer effect triggered:', transferEffectDeps);
    
    if (agentSetKey && allAgentSets[agentSetKey] && !selectedAgentConfigSet) {
      // This handles cases where the agent set was changed programmatically
      const newAgentSet = allAgentSets[agentSetKey];
      if (newAgentSet !== selectedAgentConfigSet) {
        // The useAgentSelection hook should handle this, but this is a fallback
        console.log(`[AgentTransfer] Agent set updated to: ${agentSetKey}`);
      }
    }
  }, [transferEffectDeps.agentSetKey]); // Only depend on agentSetKey to prevent loops
  
  // System is initialized when we have an agent selected AND session ID is ready
  // During transfers, keep showing as initialized to prevent "Initializing..." flash
  const isInitialized = useMemo(() => {
    const initialized = !!selectedAgentName && !!selectedAgentConfigSet && !!sessionId && isHydrated;
    console.log('[AgentIntegratedChatApp] Initialization state computed:', {
      selectedAgentName,
      hasSelectedAgentConfigSet: !!selectedAgentConfigSet,
      hasSessionId: !!sessionId,
      isHydrated,
      isInitialized: initialized
    });
    return initialized;
  }, [selectedAgentName, selectedAgentConfigSet, sessionId, isHydrated]);
  
  // Handle channel switching - memoized to prevent recreation
  const handleChannelSwitch = useMemo(() => (newChannel: 'normal' | 'realtime' | 'human' | 'line') => {
    console.log('[AgentIntegratedChatApp] 📡 Channel switch to:', newChannel);
    setActiveChannel(newChannel);
    setIsProcessing(true);
    
    // Simulate processing time for channel switch
    setTimeout(() => {
      setIsProcessing(false);
    }, 1000);
  }, []);
  // Persisted setter comes from hook; keep stable deps

  // Handle cross-agent-set transfers - memoized to prevent recreation
  const handleAgentSetChange = useMemo(() => (newAgentSetKey: string, newAgentName: string) => {
    console.log(`[AgentIntegratedChatApp] Cross-agent-set transfer to ${newAgentSetKey}:${newAgentName}`);
    
    // Update URL parameters
    const url = new URL(window.location.toString());
    url.searchParams.set("agentConfig", newAgentSetKey);
    if (newAgentName !== newAgentSetKey) {
      url.searchParams.set("agent", newAgentName);
    } else {
      url.searchParams.delete("agent");
    }
    window.history.pushState({}, "", url.toString());
    
    // Update state - this will trigger useAgentSelection to update
    // The useAgentSelection hook will detect the URL change and update accordingly
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  // Get current agent - memoized to prevent unnecessary computations
  const currentAgent = useMemo(() => {
    const agent = selectedAgentConfigSet?.find(a => a.name === selectedAgentName);
    console.log('[AgentIntegratedChatApp] 🤖 Current agent computed:', agent?.name || 'none');
    return agent;
  }, [selectedAgentConfigSet, selectedAgentName]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                AI Agent Chat System
              </h1>
              <span className="text-sm text-gray-800">
                Multi-Agent Communication Platform
              </span>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Agent Selection */}
              <div className="flex items-center space-x-4">
                {/* Scenario Selector */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-900">Scenario:</label>
                  <select
                    value={agentSetKey}
                    onChange={handleAgentChange}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.keys(allAgentSets).map((agentKey) => (
                      <option key={agentKey} value={agentKey}>
                        {agentKey}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Agent Selector */}
                {selectedAgentConfigSet && (
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-900">Agent:</label>
                    <select
                      value={selectedAgentName}
                      onChange={handleSelectedAgentChange}
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {selectedAgentConfigSet.map((agent) => (
                        <option key={agent.name} value={agent.name}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* System Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isInitialized ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span className="text-sm text-gray-900 font-medium">
                  {isInitialized ? 'Agent Ready' : 'Initializing...'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Agent Status Card */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Agent Status
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-800">Session ID:</span>
                <span className="ml-2 text-gray-900">
                  {isHydrated ? (sessionId || 'Generating...') : 'Initializing...'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-900">Active Agent:</span>
                <span className="ml-2 text-gray-800">{selectedAgentName || 'None'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">Agent Set:</span>
                <span className="ml-2 text-gray-800">{agentSetKey}</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">Channel:</span>
                <span className="ml-2 text-gray-800">{activeChannel}</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">Language:</span>
                <span className="ml-2 text-gray-800">{language}</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">Tools Available:</span>
                <span className="ml-2 text-gray-800">{currentAgent?.tools?.length || 0}</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">Transfer Enabled:</span>
                <span className="ml-2 text-gray-800">
                  {currentAgent?.downstreamAgents?.length ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-900">Development Mode:</span>
                <span className="ml-2 text-gray-800">{isDevelopmentMode() ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Agent Description Card */}
          {currentAgent && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Current Agent: {currentAgent.name}</h4>
              <p className="text-sm text-blue-800">
                {currentAgent.publicDescription || 'No description available'}
              </p>
              {currentAgent.downstreamAgents && currentAgent.downstreamAgents.length > 0 && (
                <div className="mt-3">
                  <span className="text-sm font-medium text-blue-900">Can transfer to: </span>
                  <span className="text-sm text-blue-700">
                    {currentAgent.downstreamAgents.map(agent => agent.name).join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Agent Chat Interface */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Agent Chat Interface
              </h3>
              <div className="h-[600px]">
                {isInitialized ? (
                  <AgentChatInterface
                    sessionId={sessionId}
                    activeChannel={activeChannel}
                    onChannelSwitch={handleChannelSwitch}
                    isProcessing={isProcessing}
                    selectedAgentName={selectedAgentName}
                    selectedAgentConfigSet={selectedAgentConfigSet}
                    onAgentChange={setSelectedAgentName}
                    onAgentSetChange={handleAgentSetChange}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-4">🤖</div>
                      <p className="text-lg font-medium">Initializing Agent System...</p>
                      <p className="text-sm">
                        {!sessionId ? 'Generating session...' : 
                         !selectedAgentName ? 'Loading agent...' : 
                         'Setting up interface...'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Configuration Status Panel */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              System Configuration
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-900">Default Channel:</span>
                <div className="text-gray-800">{config.system.defaultChannel}</div>
              </div>
              <div>
                <span className="font-medium text-gray-900">Auto Routing:</span>
                <div className="text-gray-800">{config.system.autoRoutingEnabled ? 'Enabled' : 'Disabled'}</div>
              </div>
              <div>
                <span className="font-medium text-gray-900">Theme:</span>
                <div className="text-gray-800">{config.ui.theme}</div>
              </div>
              <div>
                <span className="font-medium text-gray-900">Debug Mode:</span>
                <div className="text-gray-800">{config.ui.showDebugInfo ? 'On' : 'Off'}</div>
              </div>
            </div>
          </div>

          {/* Debug Information */}
          {config.ui.showDebugInfo && (
            <div className="bg-gray-900 text-green-300 p-4 rounded-lg font-mono text-sm">
              <h4 className="text-gray-100 font-semibold mb-2">Debug Information</h4>
              <div className="space-y-1">
                <div>Session ID: {isHydrated ? (sessionId || 'Generating...') : 'Initializing...'}</div>
                <div>Agent Initialized: {isInitialized ? 'Yes' : 'No'}</div>
                <div>Selected Agent: {selectedAgentName || 'None'}</div>
                <div>Agent Set: {agentSetKey}</div>
                <div>Active Channel: {activeChannel}</div>
                <div>Auto-routing: {config.system.autoRoutingEnabled ? 'Enabled' : 'Disabled'}</div>
                <div>Language: {language}</div>
                <div>Environment: {environment || 'Loading...'}</div>
                <div>Agent Tools: {currentAgent?.tools?.length || 0}</div>
                <div>Transfer Options: {currentAgent?.downstreamAgents?.length || 0}</div>
                <div>Hydrated: {isHydrated ? 'Yes' : 'No'}</div>
                <div>Mount Count: {mountCountRef.current || 'Initializing...'}</div>
                <div>Status: Agent Integration Active</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main wrapper component with providers
export default function AgentIntegratedChatApp() {
  return (
    <LanguageProvider>
      <SessionRegistryProvider>
        <EventProvider>
          <TranscriptProvider>
            <ActionProvider>
              <Suspense fallback={
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-lg font-medium">Loading...</p>
                  </div>
                </div>
              }>
                <AgentIntegratedChatAppContent />
              </Suspense>
            </ActionProvider>
          </TranscriptProvider>
        </EventProvider>
      </SessionRegistryProvider>
    </LanguageProvider>
  );
} 