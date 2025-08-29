"use client";

import { useRef, useCallback } from 'react';

export interface BotSessionInfo {
  botName: string;
  botId: string;
  lastActive: Date;
  conversationSummary: string;
}

/**
 * Core session registry hook that maintains session state
 */
export function useSessionRegistry() {
  // Track the main user session ID
  const primarySessionIdRef = useRef<string>('');
  
  // Track all bot contexts under this user
  const botSessionsRef = useRef<Map<string, BotSessionInfo>>(new Map());
  
  // Track which bot is currently active
  const activeBotRef = useRef<string>('');
  
  // Initialize with user session
  const registerUserSession = useCallback((sessionId: string) => {
    primarySessionIdRef.current = sessionId;
    console.log(`[SessionRegistry] User session registered: ${sessionId}`);
  }, []);
  
  // Register a bot session
  const registerBotSession = useCallback((botName: string, conversationSummary: string = '') => {
    const botId = `${botName}_${Date.now()}`;
    
    botSessionsRef.current.set(botId, {
      botName,
      botId,
      lastActive: new Date(),
      conversationSummary
    });
    
    if (!activeBotRef.current) {
      activeBotRef.current = botId;
    }
    
    console.log(`[SessionRegistry] Bot session registered: ${botName} (${botId})`);
    return botId;
  }, []);
  
  // Activate a specific bot
  const activateBot = useCallback((botName: string, conversationSummary: string = '') => {
    // Find existing bot or create new one
    let targetBotId = '';
    
    // Look for existing bot by name
    for (const [id, info] of botSessionsRef.current.entries()) {
      if (info.botName === botName) {
        targetBotId = id;
        // Update existing bot with latest conversation summary
        const botInfo = botSessionsRef.current.get(id);
        if (botInfo) {
          botInfo.conversationSummary = conversationSummary;
          botInfo.lastActive = new Date();
          botSessionsRef.current.set(id, botInfo);
        }
        break;
      }
    }
    
    // Register new bot if not found
    if (!targetBotId) {
      targetBotId = registerBotSession(botName, conversationSummary);
    }
    
    // Set as active
    activeBotRef.current = targetBotId;
    console.log(`[SessionRegistry] Activated bot: ${botName} (${targetBotId})`);
    
    return botSessionsRef.current.get(targetBotId);
  }, [registerBotSession]);
  
  // Get active bot info
  const getActiveBotInfo = useCallback(() => {
    return botSessionsRef.current.get(activeBotRef.current);
  }, []);

  return {
    registerUserSession,
    registerBotSession,
    activateBot,
    getActiveBotInfo,
    getPrimarySessionId: () => primarySessionIdRef.current,
    getActiveBotId: () => activeBotRef.current
  };
} 