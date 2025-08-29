"use client";

import { UniversalMessage } from '@/app/types';
import { useEffect, useState } from 'react';

interface MessageHistoryHook {
  messages: UniversalMessage[];
  addMessage: (message: UniversalMessage) => void;
  addMessages: (messages: UniversalMessage[]) => void;
  updateMessage: (message: UniversalMessage) => void;
  addOrUpdateMessage: (message: UniversalMessage) => void;
  replaceMessageById: (oldId: string, newMessage: UniversalMessage) => void;
  replaceLatestSpeechPlaceholder: (newMessage: UniversalMessage) => void;
  clearMessages: () => void;
  loadMessages: () => void;
}

export function useMessageHistory(sessionId: string): MessageHistoryHook {
  const [messages, setMessages] = useState<UniversalMessage[]>([]);
  
  // Storage key based on session ID
  const storageKey = `chat-history-${sessionId}`;
  
  // Load messages from localStorage on component mount
  useEffect(() => {
    loadMessages();
  }, [sessionId]);
  
  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (error) {
        console.warn('Failed to save chat history:', error);
      }
    }
  }, [messages, storageKey]);
  
  const loadMessages = () => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedMessages = JSON.parse(stored);
        setMessages(parsedMessages);
      }
    } catch (error) {
      console.warn('Failed to load chat history:', error);
    }
  };
  
  const addMessage = (message: UniversalMessage) => {
    console.log(`[MessageHistory-TRACK] 📝 addMessage called - ID: ${message.id}, Source: ${message.metadata.source}, Content: "${message.content.substring(0, 50)}"`);
    setMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) {
        console.log(`[MessageHistory-TRACK] 🔄 Message ${message.id} already exists, updating`);
        return prev.map(m => (m.id === message.id ? message : m));
      } else {
        console.log(`[MessageHistory-TRACK] ✅ Adding new message ${message.id}`);
        return [...prev, message];
      }
    });
  };
  
  const addMessages = (newMessages: UniversalMessage[]) => {
    setMessages(prev => [...prev, ...newMessages]);
  };
  
  const updateMessage = (message: UniversalMessage) => {
    setMessages(prev => prev.map(m => m.id === message.id ? message : m));
  };
  
  const addOrUpdateMessage = (message: UniversalMessage) => {
    console.log(`[MessageHistory-TRACK] 🔄 addOrUpdateMessage called - ID: ${message.id}, Source: ${message.metadata.source}, Content: "${message.content.substring(0, 50)}"`);
    setMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) {
        console.log(`[MessageHistory-TRACK] 🔄 Updating existing message ${message.id}`);
        return prev.map(m => m.id === message.id ? message : m);
      } else {
        console.log(`[MessageHistory-TRACK] ✅ Adding new message ${message.id}`);
        return [...prev, message];
      }
    });
  };

  const replaceMessageById = (oldId: string, newMessage: UniversalMessage) => {
    setMessages(prev => prev.map(m => (m.id === oldId ? newMessage : m)));
  };

  const replaceLatestSpeechPlaceholder = (newMessage: UniversalMessage) => {
    console.log(`[MessageHistory-TRACK] 🔁 replaceLatestSpeechPlaceholder called - NewID: ${newMessage.id}, Content: "${newMessage.content.substring(0, 50)}"`);
    setMessages(prev => {
      // Find last speech-* placeholder (user, isTranscribing, not deleted)
      let targetIndex = -1;
      for (let i = prev.length - 1; i >= 0; i -= 1) {
        const meta: any = prev[i].metadata || {};
        if (
          prev[i].id.startsWith('speech-') &&
          prev[i].metadata.source === 'user' &&
          !!meta.isTranscribing &&
          !meta.deleted
        ) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex >= 0) {
        console.log(`[MessageHistory-TRACK] 🎯 Found speech placeholder at index ${targetIndex}, replacing with ${newMessage.id}`);
        const next = prev.slice();
        next[targetIndex] = newMessage;
        return next;
      }

      // If no placeholder, clean any lingering speech-* first, then upsert by id
      console.log(`[MessageHistory-TRACK] ⚠️ No speech placeholder found, cleaning and upserting`);
      const cleaned = prev.filter(m => !(m.id.startsWith('speech-') && (m.metadata as any)?.isTranscribing));
      const exists = cleaned.some(m => m.id === newMessage.id);
      console.log(`[MessageHistory-TRACK] 🔍 After cleaning, message exists: ${exists}`);
      return exists
        ? cleaned.map(m => (m.id === newMessage.id ? newMessage : m))
        : [...cleaned, newMessage];
    });
  };
  
  const clearMessages = () => {
    setMessages([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear chat history:', error);
    }
  };
  
  return {
    messages,
    addMessage,
    addMessages,
    updateMessage,
    addOrUpdateMessage,
    replaceMessageById,
    replaceLatestSpeechPlaceholder,
    clearMessages,
    loadMessages
  };
} 