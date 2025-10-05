"use client";

import React, { useState, useEffect } from 'react';

interface ChannelStatusIndicatorProps {
  activeChannel: string;
  channelHealth: Record<string, boolean>;
  isProcessing?: boolean;
  lastActivity?: string;
  messageCount?: number;
}

interface ChannelInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const channelInfo: Record<string, ChannelInfo> = {
  normal: {
    id: 'normal',
    name: 'AI Assistant',
    icon: '🤖',
    color: 'blue'
  },
  realtime: {
    id: 'realtime',
    name: 'Voice Chat',
    icon: '🎙️',
    color: 'purple'
  },
  human: {
    id: 'human',
    name: 'Human Support',
    icon: '👨‍💼',
    color: 'green'
  }
};

export default function ChannelStatusIndicator({
  activeChannel,
  channelHealth,
  isProcessing = false,
  lastActivity,
  messageCount = 0
}: ChannelStatusIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  const currentChannel = channelInfo[activeChannel];
  const isHealthy = channelHealth[activeChannel];

  // Trigger pulse animation when processing
  useEffect(() => {
    if (isProcessing) {
      setPulseAnimation(true);
      const timer = setTimeout(() => setPulseAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isProcessing]);

  const getStatusColor = () => {
    if (isProcessing) return 'animate-pulse bg-yellow-100 border-yellow-300';
    if (isHealthy === false) return 'bg-red-100 border-red-300';
    if (isHealthy === true) return 'bg-green-100 border-green-300';
    return 'bg-gray-100 border-gray-300';
  };

  const getStatusIcon = () => {
    if (isProcessing) return '⚡';
    if (isHealthy === false) return '❌';
    if (isHealthy === true) return '✅';
    return '⏳';
  };

  const getStatusText = () => {
    if (isProcessing) return 'Processing...';
    if (isHealthy === false) return 'Offline';
    if (isHealthy === true) return 'Online';
    return 'Checking...';
  };

  const formatLastActivity = (timestamp?: string) => {
    if (!timestamp) return 'No recent activity';
    
    const now = new Date();
    const activity = new Date(timestamp);
    const diffMs = now.getTime() - activity.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  if (!currentChannel) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <span className="text-sm">Unknown channel</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Main Status Indicator */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`
          flex items-center space-x-3 p-2 rounded-lg border-2 transition-all duration-200 hover:shadow-sm
          ${getStatusColor()}
          ${pulseAnimation ? 'animate-pulse' : ''}
        `}
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">{currentChannel.icon}</span>
          <div className="flex flex-col items-start">
            <span className="text-xs font-medium text-gray-700">
              {currentChannel.name}
            </span>
            <div className="flex items-center space-x-1">
              <span className="text-xs">{getStatusIcon()}</span>
              <span className="text-xs text-gray-600">{getStatusText()}</span>
            </div>
          </div>
        </div>

        {/* Activity Indicator */}
        {isProcessing && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        )}

        {/* Message Count Badge */}
        {messageCount > 0 && (
          <div className="flex items-center justify-center w-5 h-5 bg-blue-500 text-white text-xs rounded-full">
            {messageCount > 99 ? '99+' : messageCount}
          </div>
        )}

        {/* Expand Icon */}
        <svg 
          className={`w-3 h-3 text-gray-400 transition-transform ${showDetails ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Detailed Status Panel */}
      {showDetails && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[280px]">
          <div className="space-y-3">
            {/* Channel Info */}
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{currentChannel.icon}</span>
              <div>
                <h3 className="font-medium text-gray-900">{currentChannel.name}</h3>
                <p className="text-sm text-gray-600">Active communication channel</p>
              </div>
            </div>

            {/* Status Details */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{getStatusIcon()}</span>
                  <span className={`text-sm font-medium ${
                    isHealthy ? 'text-green-600' : 
                    isHealthy === false ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {getStatusText()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Messages:</span>
                <span className="text-sm font-medium text-gray-900">{messageCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Activity:</span>
                <span className="text-sm text-gray-900">{formatLastActivity(lastActivity)}</span>
              </div>
            </div>

            {/* Channel Health Overview */}
            <div className="border-t border-gray-100 pt-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">All Channels</h4>
              <div className="space-y-1">
                {Object.entries(channelInfo).map(([id, info]) => (
                  <div key={id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{info.icon}</span>
                      <span className="text-sm text-gray-600">{info.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs">
                        {channelHealth[id] === true ? '🟢' : 
                         channelHealth[id] === false ? '🔴' : '🟡'}
                      </span>
                      {id === activeChannel && (
                        <span className="text-xs text-blue-600 font-medium">Active</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-blue-600">Processing your message...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDetails && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDetails(false)}
        />
      )}
    </div>
  );
} 