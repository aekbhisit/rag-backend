"use client";

import React, { useState, useEffect } from 'react';

interface ChannelTransferNotificationProps {
  isVisible: boolean;
  fromChannel: string;
  toChannel: string;
  reason: string;
  onDismiss: () => void;
  onUndo?: () => void;
  autoHideDelay?: number;
}

interface ChannelDisplayInfo {
  name: string;
  icon: string;
  color: string;
}

const channelInfo: Record<string, ChannelDisplayInfo> = {
  normal: { name: 'AI Assistant', icon: '🤖', color: 'blue' },
  realtime: { name: 'Voice Chat', icon: '🎙️', color: 'purple' },
  human: { name: 'Human Support', icon: '👨‍💼', color: 'green' }
};

export default function ChannelTransferNotification({
  isVisible,
  fromChannel,
  toChannel,
  reason,
  onDismiss,
  onUndo,
  autoHideDelay = 8000
}: ChannelTransferNotificationProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(autoHideDelay / 1000);

  const fromInfo = channelInfo[fromChannel];
  const toInfo = channelInfo[toChannel];

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      setTimeLeft(autoHideDelay / 1000);

      // Auto-hide timer
      const autoHideTimer = setTimeout(() => {
        handleDismiss();
      }, autoHideDelay);

      // Countdown timer
      const countdownInterval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearTimeout(autoHideTimer);
        clearInterval(countdownInterval);
      };
    }
  }, [isVisible, autoHideDelay]);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onDismiss();
    }, 300); // Wait for animation to complete
  };

  const handleUndo = () => {
    if (onUndo) {
      onUndo();
      handleDismiss();
    }
  };

  const getReasonIcon = (reason: string) => {
    if (reason.includes('human') || reason.includes('staff')) return '👋';
    if (reason.includes('voice') || reason.includes('audio')) return '🎤';
    if (reason.includes('error') || reason.includes('failed')) return '⚠️';
    if (reason.includes('automatic') || reason.includes('auto')) return '🔄';
    if (reason.includes('manual') || reason.includes('user')) return '👆';
    return '📝';
  };

  const getReasonColor = (reason: string) => {
    if (reason.includes('error') || reason.includes('failed')) return 'bg-red-50 border-red-200';
    if (reason.includes('manual') || reason.includes('user')) return 'bg-blue-50 border-blue-200';
    return 'bg-green-50 border-green-200';
  };

  const formatReason = (reason: string) => {
    // Convert reason codes to user-friendly messages
    const reasonMap: Record<string, string> = {
      'human_request': 'You requested human assistance',
      'voice_input': 'Voice input detected',
      'manual': 'Manually switched by user',
      'auto_routing': 'Automatically routed based on content',
      'technical_content': 'Technical content detected',
      'complex_query': 'Complex query requiring expertise',
      'error_fallback': 'Previous channel unavailable',
      'health_check_failed': 'Channel health check failed'
    };

    return reasonMap[reason] || reason;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div 
        className={`
          max-w-sm bg-white border-2 rounded-lg shadow-lg transition-all duration-300 transform
          ${isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
          ${getReasonColor(reason)}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getReasonIcon(reason)}</span>
            <span className="font-medium text-gray-900">Channel Switched</span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Channel Transfer Visual */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col items-center">
              <span className="text-2xl mb-1">{fromInfo?.icon || '❓'}</span>
              <span className="text-xs text-gray-600 text-center">{fromInfo?.name || 'Unknown'}</span>
            </div>
            
            <div className="flex-1 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
            
            <div className="flex flex-col items-center">
              <span className="text-2xl mb-1">{toInfo?.icon || '❓'}</span>
              <span className="text-xs text-gray-600 text-center">{toInfo?.name || 'Unknown'}</span>
            </div>
          </div>

          {/* Reason */}
          <div className="mb-3">
            <p className="text-sm text-gray-700 text-center">
              {formatReason(reason)}
            </p>
          </div>

          {/* Auto-hide countdown */}
          <div className="flex items-center justify-center mb-3">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
              <span>Auto-hide in {timeLeft}s</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {onUndo && (
              <button
                onClick={handleUndo}
                className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Switch Back
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <div 
            className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
            style={{ 
              width: `${(timeLeft / (autoHideDelay / 1000)) * 100}%`,
              transition: timeLeft === 0 ? 'none' : undefined
            }}
          ></div>
        </div>
      </div>
    </div>
  );
} 