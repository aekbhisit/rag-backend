"use client";

import React, { useState, useEffect } from "react";
import { useConfiguration } from "@/app/lib/config";
import { LanguageProvider, useLanguage } from "@/app/contexts/LanguageContext";
import { SessionRegistryProvider } from "@/app/contexts/SessionRegistryContext";
import { EventProvider } from "@/app/contexts/EventContext";
import ChatInterface from "@/app/components/chat/ChatInterface";
import { usePersistedChannel } from "@/app/hooks/usePersistedChannel";

// Inner component that uses the language context
function IntegratedChatAppContent() {
  // Configuration
  const { config, isDevelopmentMode } = useConfiguration();
  
  // Use language from context
  const { language } = useLanguage();

  // Session management - avoid hydration mismatch
  const [sessionId, setSessionId] = useState<string>('');
  const [environment, setEnvironment] = useState<string>('');
  const [activeChannel, setActiveChannel] = usePersistedChannel('normal');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Set session ID and environment after component mounts to avoid hydration mismatch
  useEffect(() => {
    setSessionId(`integrated-session-${Date.now()}`);
    setEnvironment(typeof window !== 'undefined' ? 'Client' : 'Server');
  }, []);
  
  // Simple constants for testing
  const isInitialized = true;
  
  // Handle channel switching
  const handleChannelSwitch = (newChannel: 'normal' | 'realtime' | 'human') => {
    setActiveChannel(newChannel);
    setIsProcessing(true);
    
    // Simulate processing time for channel switch
    setTimeout(() => {
      setIsProcessing(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Multi-Channel AI Assistant
              </h1>
              <span className="text-sm text-gray-600">
                Integrated Communication System
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* System Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isInitialized ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-700">
                  {isInitialized ? 'System Ready' : 'Initializing'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              System Status
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-800">Session ID:</span>
                <span className="ml-2 text-gray-700">{sessionId || 'Generating...'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-800">Active Channel:</span>
                <span className="ml-2 text-gray-700">{activeChannel}</span>
              </div>
              <div>
                <span className="font-medium text-gray-800">Language:</span>
                <span className="ml-2 text-gray-700">{language}</span>
              </div>
              <div>
                <span className="font-medium text-gray-800">Development Mode:</span>
                <span className="ml-2 text-gray-700">{isDevelopmentMode() ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
          
          {/* Integrated Chat Area */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Chat Interface
              </h3>
              <div className="h-[600px]">
                <ChatInterface
                  sessionId={sessionId}
                  activeChannel={activeChannel}
                  onChannelSwitch={handleChannelSwitch}
                  isProcessing={isProcessing}
                />
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
                <span className="font-medium text-gray-800">Default Channel:</span>
                <div className="text-gray-700">{config.system.defaultChannel}</div>
              </div>
              <div>
                <span className="font-medium text-gray-800">Auto Routing:</span>
                <div className="text-gray-700">{config.system.autoRoutingEnabled ? 'Enabled' : 'Disabled'}</div>
              </div>
              <div>
                <span className="font-medium text-gray-800">Theme:</span>
                <div className="text-gray-700">{config.ui.theme}</div>
              </div>
              <div>
                <span className="font-medium text-gray-800">Debug Mode:</span>
                <div className="text-gray-700">{config.ui.showDebugInfo ? 'On' : 'Off'}</div>
              </div>
            </div>
          </div>

          {/* Debug Information */}
          {config.ui.showDebugInfo && (
            <div className="bg-gray-900 text-green-300 p-4 rounded-lg font-mono text-sm">
              <h4 className="text-gray-100 font-semibold mb-2">Debug Information</h4>
              <div className="space-y-1">
                <div>Session ID: {sessionId || 'Generating...'}</div>
                <div>System Initialized: {isInitialized ? 'Yes' : 'No'}</div>
                <div>Active Channel: {activeChannel}</div>
                <div>Auto-routing: {config.system.autoRoutingEnabled ? 'Enabled' : 'Disabled'}</div>
                <div>Language: {language}</div>
                <div>Environment: {environment || 'Loading...'}</div>
                <div>Default Channel: {config.system.defaultChannel}</div>
                <div>Status: Simplified Version - Ready for Enhancement</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main wrapper component with providers
export default function IntegratedChatApp() {
  return (
    <LanguageProvider>
      <SessionRegistryProvider>
        <EventProvider>
          <IntegratedChatAppContent />
        </EventProvider>
      </SessionRegistryProvider>
    </LanguageProvider>
  );
} 