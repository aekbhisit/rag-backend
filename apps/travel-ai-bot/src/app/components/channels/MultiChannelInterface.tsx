"use client";

import React, { useState, useEffect } from 'react';
import ChannelSelector from './ChannelSelector';
import ChannelStatusIndicator from './ChannelStatusIndicator';
import ChannelTransferNotification from './ChannelTransferNotification';
import ChannelPreferences, { ChannelPreferencesData } from './ChannelPreferences';
import { useMultiChannelCommunication } from '@/app/hooks/useMultiChannelCommunication';

interface MultiChannelInterfaceProps {
  sessionId: string;
  onMessageSent?: (message: string) => void;
  onResponseReceived?: (response: string) => void;
  initialChannel?: 'normal' | 'realtime' | 'human';
  disabled?: boolean;
}

const defaultPreferences: ChannelPreferencesData = {
  preferredChannel: 'auto',
  autoRouting: true,
  notifications: {
    channelSwitches: true,
    staffAssignment: true,
    errors: true
  },
  language: 'en-US',
  expertise: [],
  accessibilityMode: false,
  voiceSettings: {
    enabled: true,
    autoStart: false,
    pushToTalk: false
  }
};

export default function MultiChannelInterface({
  sessionId,
  onMessageSent,
  onResponseReceived,
  initialChannel = 'normal',
  disabled = false
}: MultiChannelInterfaceProps) {
  const [preferences, setPreferences] = useState<ChannelPreferencesData>(defaultPreferences);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showTransferNotification, setShowTransferNotification] = useState(false);
  const [transferInfo, setTransferInfo] = useState<{
    from: string;
    to: string;
    reason: string;
  } | null>(null);
  const [lastTransferTime, setLastTransferTime] = useState<string>();

  // Load preferences from localStorage
  useEffect(() => {
    const savedPrefs = localStorage.getItem('multiChannelPreferences');
    if (savedPrefs) {
      try {
        setPreferences(JSON.parse(savedPrefs));
      } catch (error) {
        console.warn('Failed to load preferences:', error);
      }
    }
  }, []);

  const {
    activeChannel,
    channelHealth,
    isProcessing,
    messageHistory,
    sendMessage,
    switchChannel,
    getChannelStatus
  } = useMultiChannelCommunication({
    sessionId,
    language: preferences.language,
    initialChannel: preferences.preferredChannel === 'auto' ? initialChannel : preferences.preferredChannel as any,
    autoRouting: preferences.autoRouting,
    onChannelSwitch: (from, to, reason) => {
      setTransferInfo({ from, to, reason });
      setLastTransferTime(new Date().toISOString());
      
      if (preferences.notifications.channelSwitches) {
        setShowTransferNotification(true);
      }
    },
    onError: (error) => {
      if (preferences.notifications.errors) {
        console.error('Multi-channel error:', error);
        // You could show an error notification here
      }
    }
  });

  const handleMessageSend = async (message: string) => {
    try {
      await sendMessage(message);
      onMessageSent?.(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleChannelChange = (newChannel: 'realtime' | 'normal' | 'human') => {
    switchChannel(newChannel, 'manual');
  };

  const handlePreferencesSave = (newPreferences: ChannelPreferencesData) => {
    setPreferences(newPreferences);
    localStorage.setItem('multiChannelPreferences', JSON.stringify(newPreferences));
    
    // Apply language change
    if (newPreferences.language !== preferences.language) {
      // You might want to reinitialize the communication system with new language
    }
  };

  const handleUndoTransfer = () => {
    if (transferInfo) {
      switchChannel(transferInfo.from as any, 'manual_undo');
    }
  };

  const getLastActivity = () => {
    if (messageHistory.length > 0) {
      return messageHistory[messageHistory.length - 1].timestamp;
    }
    return lastTransferTime;
  };

  return (
    <div className="w-full space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <ChannelSelector
            activeChannel={activeChannel}
            onChannelChange={handleChannelChange}
            channelHealth={channelHealth}
            disabled={disabled}
          />
          
          <ChannelStatusIndicator
            activeChannel={activeChannel}
            channelHealth={channelHealth}
            isProcessing={isProcessing}
            lastActivity={getLastActivity()}
            messageCount={messageHistory.length}
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPreferences(true)}
            disabled={disabled}
            className={`
              p-2 rounded-lg border transition-colors
              ${disabled 
                ? 'border-gray-200 text-gray-400 cursor-not-allowed' 
                : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800'
              }
            `}
            title="Communication Preferences"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Health Indicator */}
          <div className="flex items-center space-x-1">
            <div className={`w-3 h-3 rounded-full ${
              Object.values(channelHealth).every(Boolean) ? 'bg-green-500' :
              Object.values(channelHealth).some(Boolean) ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className="text-xs text-gray-500">
              {Object.values(channelHealth).filter(Boolean).length}/{Object.keys(channelHealth).length} healthy
            </span>
          </div>
        </div>
      </div>

      {/* Channel Information Panel */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Current Channel:</span>
              <span className="font-medium text-gray-900">
                {activeChannel === 'normal' ? '🤖 AI Assistant' :
                 activeChannel === 'realtime' ? '🎙️ Voice Chat' :
                 activeChannel === 'human' ? '👨‍💼 Human Support' : 'Unknown'}
              </span>
            </div>
            {isProcessing && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-600">Processing...</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>Session: {sessionId.substring(0, 8)}...</span>
            <span>Messages: {messageHistory.length}</span>
            {preferences.autoRouting && (
              <span className="flex items-center space-x-1">
                <span>🔄</span>
                <span>Auto-routing</span>
              </span>
            )}
          </div>
        </div>

        {/* Channel Capabilities */}
        <div className="mt-3 flex items-center space-x-4 text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <span>💬</span>
            <span>Text messages</span>
          </div>
          {(activeChannel === 'realtime' && preferences.voiceSettings.enabled) && (
            <div className="flex items-center space-x-1">
              <span>🎤</span>
              <span>Voice communication</span>
            </div>
          )}
          {activeChannel === 'human' && (
            <div className="flex items-center space-x-1">
              <span>👋</span>
              <span>Human assistance</span>
            </div>
          )}
          {preferences.autoRouting && (
            <div className="flex items-center space-x-1">
              <span>🧠</span>
              <span>Smart routing</span>
            </div>
          )}
        </div>
      </div>

      {/* Transfer Notification */}
      {showTransferNotification && transferInfo && (
        <ChannelTransferNotification
          isVisible={showTransferNotification}
          fromChannel={transferInfo.from}
          toChannel={transferInfo.to}
          reason={transferInfo.reason}
          onDismiss={() => setShowTransferNotification(false)}
          onUndo={transferInfo.reason !== 'manual' ? handleUndoTransfer : undefined}
          autoHideDelay={8000}
        />
      )}

      {/* Preferences Modal */}
      <ChannelPreferences
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        preferences={preferences}
        onSave={handlePreferencesSave}
      />

      {/* Message Interface Integration Point */}
      <div className="border-t border-gray-200 pt-4">
        <div className="text-sm text-gray-500 text-center">
          🔌 Integration Point: Your chat interface components go here
        </div>
        <div className="mt-2 text-xs text-gray-400 text-center">
          Use the `handleMessageSend` function to send messages through the multi-channel system
        </div>
      </div>
    </div>
  );
} 