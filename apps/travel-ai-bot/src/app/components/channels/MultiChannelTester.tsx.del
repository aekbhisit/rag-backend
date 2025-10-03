"use client";

import React, { useState } from 'react';
import { useMultiChannelCommunication } from '@/app/hooks/useMultiChannelCommunication';

interface MultiChannelTesterProps {
  sessionId: string;
  language: string;
  sendClientEvent?: (eventObj: any, eventNameSuffix?: string) => void;
  sessionStatus?: string;
}

export default function MultiChannelTester({ 
  sessionId, 
  language, 
  sendClientEvent, 
  sessionStatus 
}: MultiChannelTesterProps) {
  const [testMessage, setTestMessage] = useState<string>('');
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const {
    channelManager,
    activeChannel,
    isInitialized,
    sendUniversalMessage,
    switchToChannel,
    getChannelHealth,
    getChannelCapabilities,
    getTransferStats,
    updateUserPreferences,
    conversationContext
  } = useMultiChannelCommunication({
    sessionId,
    language,
    sendClientEvent,
    sessionStatus
  });
  
  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  
  const handleSendMessage = async () => {
    if (!testMessage.trim()) return;
    
    try {
      addTestResult(`Sending message: "${testMessage}"`);
      const response = await sendUniversalMessage(testMessage, 'text');
      addTestResult(`Response: "${response.content}"`);
      addTestResult(`Channel used: ${response.metadata.channel}`);
      setTestMessage('');
    } catch (error) {
      addTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleChannelSwitch = async (channel: 'realtime' | 'normal' | 'human') => {
    try {
      addTestResult(`Switching to ${channel} channel...`);
      await switchToChannel(channel, 'manual_test');
      addTestResult(`Successfully switched to ${channel} channel`);
    } catch (error) {
      addTestResult(`Channel switch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const testAutoRouting = async () => {
    const testMessages = [
      'Hello, how are you?', // Should go to normal API
      'I want to speak to a human', // Should route to human channel
      'Can you help me with API integration?', // Should stay on normal (technical)
    ];
    
    // Enable auto-routing
    updateUserPreferences({ preferredChannel: 'auto' });
    addTestResult('Enabled auto-routing, testing different message types...');
    
    for (const msg of testMessages) {
      try {
        addTestResult(`Testing: "${msg}"`);
        const response = await sendUniversalMessage(msg, 'text');
        addTestResult(`Response channel: ${response.metadata.channel}`);
        
        // Wait a bit between messages
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        addTestResult(`Error with "${msg}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };
  
  const getSystemStatus = () => {
    const health = getChannelHealth();
    const capabilities = getChannelCapabilities();
    const stats = getTransferStats();
    
    return {
      health,
      capabilities,
      stats,
      activeChannel,
      isInitialized,
      historyLength: conversationContext?.history.length || 0
    };
  };
  
  if (!isInitialized) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">🔄 Initializing multi-channel system...</p>
        <p className="text-sm text-yellow-600">Session: {sessionId}</p>
      </div>
    );
  }
  
  const systemStatus = getSystemStatus();
  
  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🔄 Multi-Channel Communication Tester</h3>
      
      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900">Status</h4>
          <p className="text-sm text-blue-700">Active: {activeChannel}</p>
          <p className="text-sm text-blue-700">History: {systemStatus.historyLength} messages</p>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-900">Channel Health</h4>
          {Object.entries(systemStatus.health).map(([channel, isHealthy]) => (
            <p key={channel} className="text-sm text-green-700">
              {channel}: {isHealthy ? '✅' : '❌'}
            </p>
          ))}
        </div>
        
        <div className="p-3 bg-purple-50 rounded-lg">
          <h4 className="font-medium text-purple-900">Transfer Stats</h4>
          <p className="text-sm text-purple-700">
            Total: {systemStatus.stats?.totalTransfers || 0}
          </p>
          <p className="text-sm text-purple-700">
            Success: {systemStatus.stats?.successfulTransfers || 0}
          </p>
        </div>
      </div>
      
      {/* Message Sender */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-2">Send Test Message</h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Enter test message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            disabled={!testMessage.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
      
      {/* Channel Controls */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-2">Channel Controls</h4>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => handleChannelSwitch('normal')}
            className={`px-3 py-1 rounded-md text-sm ${
              activeChannel === 'normal' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Normal API
          </button>
          <button
            onClick={() => handleChannelSwitch('realtime')}
            className={`px-3 py-1 rounded-md text-sm ${
              activeChannel === 'realtime' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Realtime
          </button>
          <button
            onClick={() => handleChannelSwitch('human')}
            className={`px-3 py-1 rounded-md text-sm ${
              activeChannel === 'human' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Human Support
          </button>
        </div>
        <button
          onClick={testAutoRouting}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
        >
          Test Auto-Routing
        </button>
      </div>
      
      {/* Test Results */}
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Test Results</h4>
        <div className="h-48 overflow-y-auto bg-gray-50 border border-gray-200 rounded-md p-3">
          {testResults.length === 0 ? (
            <p className="text-gray-500 text-sm">No test results yet. Send a message to start testing.</p>
          ) : (
            testResults.map((result, index) => (
              <p key={index} className="text-sm text-gray-700 mb-1 font-mono">
                {result}
              </p>
            ))
          )}
        </div>
        <button
          onClick={() => setTestResults([])}
          className="mt-2 px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
        >
          Clear Results
        </button>
      </div>
    </div>
  );
} 