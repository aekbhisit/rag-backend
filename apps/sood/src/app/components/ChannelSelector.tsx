"use client";

import React, { useState, useEffect } from 'react';

interface ChannelSelectorProps {
  activeChannel: string;
  onChannelChange: (channel: 'realtime' | 'normal' | 'human') => void;
  channelHealth: Record<string, boolean>;
  disabled?: boolean;
}

interface ChannelInfo {
  id: 'realtime' | 'normal' | 'human';
  name: string;
  description: string;
  icon: string;
  features: string[];
  recommended?: boolean;
}

const channels: ChannelInfo[] = [
  {
    id: 'normal',
    name: 'AI Assistant',
    description: 'Fast, cost-effective AI responses',
    icon: '🤖',
    features: ['Instant responses', 'Text only', 'Available 24/7'],
    recommended: true
  },
  {
    id: 'realtime',
    name: 'Voice Chat',
    description: 'Real-time voice conversation',
    icon: '🎙️',
    features: ['Voice & text', 'Real-time', 'Natural conversation']
  },
  {
    id: 'human',
    name: 'Human Support',
    description: 'Connect with a real person',
    icon: '👨‍💼',
    features: ['Human expertise', 'Complex issues', 'Personal touch']
  }
];

export default function ChannelSelector({ 
  activeChannel, 
  onChannelChange, 
  channelHealth, 
  disabled = false 
}: ChannelSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const getChannelStatus = (channelId: string) => {
    const isHealthy = channelHealth[channelId];
    if (isHealthy === undefined) return 'unknown';
    return isHealthy ? 'healthy' : 'unhealthy';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '🟢';
      case 'unhealthy': return '🔴';
      default: return '🟡';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return 'Available';
      case 'unhealthy': return 'Unavailable';
      default: return 'Checking...';
    }
  };

  const handleChannelSelect = (channelId: 'realtime' | 'normal' | 'human') => {
    if (disabled) return;
    
    const status = getChannelStatus(channelId);
    if (status === 'unhealthy') {
      // Show warning but allow selection (with fallback)
      const confirmed = window.confirm(
        `${channels.find(c => c.id === channelId)?.name} is currently unavailable. Would you like to try anyway? The system will automatically fall back to an available channel if needed.`
      );
      if (!confirmed) return;
    }
    
    onChannelChange(channelId);
    setIsExpanded(false);
  };

  const activeChannelInfo = channels.find(c => c.id === activeChannel);

  return (
    <div className="relative">
      {/* Channel Selector Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={disabled}
        className={`
          flex items-center space-x-3 p-3 bg-white border-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 min-w-[200px]
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-300 cursor-pointer'}
          ${isExpanded ? 'border-blue-500' : 'border-gray-200'}
        `}
      >
        <div className="flex items-center space-x-2">
          <span className="text-xl">{activeChannelInfo?.icon}</span>
          <span className="text-sm font-medium text-gray-700">
            {activeChannelInfo?.name}
          </span>
        </div>
        
        <div className="flex items-center space-x-2 ml-auto">
          <span className="text-xs">
            {getStatusIcon(getChannelStatus(activeChannel))}
          </span>
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Channel Options */}
      {isExpanded && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2 space-y-1">
            {channels.map((channel) => {
              const status = getChannelStatus(channel.id);
              const isActive = activeChannel === channel.id;
              const isAvailable = status === 'healthy';
              
              return (
                <div
                  key={channel.id}
                  className="relative"
                  onMouseEnter={() => setShowTooltip(channel.id)}
                  onMouseLeave={() => setShowTooltip(null)}
                >
                  <button
                    onClick={() => handleChannelSelect(channel.id)}
                    disabled={disabled}
                    className={`
                      w-full p-3 rounded-md text-left transition-all duration-150 border
                      ${isActive 
                        ? 'bg-blue-50 border-blue-200 text-blue-900' 
                        : 'bg-white border-transparent hover:bg-gray-50'
                      }
                      ${!isAvailable ? 'opacity-60' : ''}
                      ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <span className="text-xl mt-0.5">{channel.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">{channel.name}</span>
                            {channel.recommended && (
                              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{channel.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-1">
                        <div className="flex items-center space-x-1">
                          <span className="text-xs">{getStatusIcon(status)}</span>
                          <span className={`text-xs ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                            {getStatusText(status)}
                          </span>
                        </div>
                        {isActive && (
                          <span className="text-xs text-blue-600 font-medium">Active</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Tooltip */}
                  {showTooltip === channel.id && (
                    <div className="absolute left-full top-0 ml-2 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10 w-48">
                      <div className="font-medium mb-2">{channel.name} Features:</div>
                      <ul className="space-y-1">
                        {channel.features.map((feature, index) => (
                          <li key={index} className="flex items-center space-x-2">
                            <span className="text-green-400">✓</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="absolute top-3 -left-1 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 p-3 bg-gray-50 rounded-b-lg">
            <p className="text-xs text-gray-600 text-center">
              Channel automatically switches based on your message content
            </p>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
} 