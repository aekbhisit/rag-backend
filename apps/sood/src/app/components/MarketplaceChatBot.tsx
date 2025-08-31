"use client";

import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, UserIcon, ComputerDesktopIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface MarketplaceChatBotProps {
  className?: string;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

const MarketplaceChatBot: React.FC<MarketplaceChatBotProps> = ({ 
  className = '',
  isMinimized = false,
  onToggleMinimize
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with static message after component mounts to prevent hydration mismatch
  useEffect(() => {
    setMessages([{
      id: '1',
      text: 'Hello! I\'m your ticket marketplace assistant. I can help you find events, get price information, or answer questions about tickets. How can I help you today?',
      sender: 'bot',
      timestamp: new Date()
    }]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickSuggestions = [
    "Find Taylor Swift concerts",
    "Show me sports events under $200",
    "What's happening this weekend?",
    "Broadway shows in NYC"
  ];

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const botResponse = generateBotResponse(text.trim());
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const generateBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('taylor swift') || lowerMessage.includes('concert')) {
      return "I found several Taylor Swift concerts! The Eras Tour is happening at MetLife Stadium on Dec 15th starting at $450. Would you like me to show you more details or help you find tickets?";
    }
    
    if (lowerMessage.includes('sports') || lowerMessage.includes('basketball') || lowerMessage.includes('football')) {
      return "Great! I can show you sports events. Lakers vs Warriors is coming up at Crypto.com Arena for $275. I can also filter by price range - what's your budget?";
    }
    
    if (lowerMessage.includes('weekend') || lowerMessage.includes('this week')) {
      return "This weekend we have Hamilton on Broadway ($350), Lakers vs Warriors ($275), and several comedy shows. Would you like me to show you the full weekend schedule?";
    }
    
    if (lowerMessage.includes('broadway') || lowerMessage.includes('theater') || lowerMessage.includes('nyc')) {
      return "Broadway shows are amazing! Hamilton is playing at Richard Rodgers Theatre with orchestra seats available for $350. I can also show you other Broadway shows or help filter by price and date.";
    }
    
    if (lowerMessage.includes('price') || lowerMessage.includes('cheap') || lowerMessage.includes('budget')) {
      return "I can help you find tickets within your budget! What price range are you looking for? I can filter events from $50 to $1000+.";
    }
    
    return "I'd be happy to help you find the perfect tickets! I can search by artist, venue, date, or price range. You can also ask me about specific events or get recommendations based on your preferences.";
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  if (isMinimized) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 cursor-pointer" onClick={onToggleMinimize}>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <ComputerDesktopIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium text-gray-900">Chat Assistant</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      {/* Chat Header - Updated to match dashboard style */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-lg text-white">🤖</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Ticket Assistant</h3>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-blue-100">Online & Ready</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onToggleMinimize}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
          title="Minimize"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-2 max-w-[85%] ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.sender === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {message.sender === 'user' ? (
                  <UserIcon className="w-4 h-4" />
                ) : (
                  <ComputerDesktopIcon className="w-4 h-4" />
                )}
              </div>
              
              {/* Message Bubble */}
              <div className={`rounded-lg px-3 py-2 shadow-sm ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <p className="text-sm leading-relaxed">{message.text}</p>
                <p className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2 max-w-[85%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                <ComputerDesktopIcon className="w-4 h-4" />
              </div>
              <div className="bg-gray-100 rounded-lg px-3 py-2 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {messages.length === 1 && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs font-medium text-gray-700 mb-2">Quick suggestions:</p>
          <div className="space-y-1">
            {quickSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSendMessage(suggestion)}
                className="w-full text-xs bg-white border border-gray-200 text-gray-700 px-2 py-1.5 rounded hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors text-left"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area - Fixed at bottom with better margin */}
      <div className="flex-shrink-0 p-3 border-t border-gray-200 bg-white">
        <div className="flex space-x-2 items-end">
          {/* Image Upload Button */}
          <button
            className="flex-shrink-0 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Upload image"
          >
            <PhotoIcon className="w-5 h-5" />
          </button>
          
          {/* Text Input - Multi-line */}
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about tickets, events..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-gray-900 placeholder-gray-500 resize-none min-h-[2.5rem] max-h-[4rem]"
            rows={2}
            disabled={isTyping}
          />
          
          {/* Send Button */}
          <button
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isTyping}
            className="flex-shrink-0 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceChatBot;