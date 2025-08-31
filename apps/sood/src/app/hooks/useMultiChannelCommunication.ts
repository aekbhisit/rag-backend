import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChannelManager, 
  RealtimeChannel, 
  NormalAPIChannel, 
  HumanStaffChannel 
} from '@/app/lib/channels';
import { 
  UniversalMessage, 
  ConversationContext, 
  UserPreferences, 
  ChannelConfig 
} from '@/app/types';

interface UseMultiChannelCommunicationProps {
  sessionId: string;
  language: string;
  initialChannel?: 'realtime' | 'normal' | 'human';
  autoRouting?: boolean;
  sendClientEvent?: (eventObj: any, eventNameSuffix?: string) => void;
  sessionStatus?: string;
  onChannelSwitch?: (from: string, to: string, reason: string) => void;
  onError?: (error: Error) => void;
}

interface UseMultiChannelCommunicationReturn {
  channelManager: ChannelManager | null;
  activeChannel: string;
  channelHealth: Record<string, boolean>;
  isProcessing: boolean;
  messageHistory: UniversalMessage[];
  isInitialized: boolean;
  sendMessage: (content: string, type?: 'text' | 'audio') => Promise<UniversalMessage>;
  sendUniversalMessage: (content: string, type?: 'text' | 'audio') => Promise<UniversalMessage>;
  switchChannel: (channel: 'realtime' | 'normal' | 'human', reason?: string) => Promise<void>;
  switchToChannel: (channel: 'realtime' | 'normal' | 'human', reason?: string) => Promise<void>;
  getChannelStatus: () => Record<string, boolean>;
  getChannelHealth: () => Record<string, boolean>;
  getChannelCapabilities: () => Record<string, string[]>;
  getTransferStats: () => any;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  conversationContext: ConversationContext | null;
}

export function useMultiChannelCommunication({
  sessionId,
  language,
  initialChannel = 'normal',
  sendClientEvent,
  sessionStatus = 'DISCONNECTED',
  onChannelSwitch,
  onError
}: UseMultiChannelCommunicationProps): UseMultiChannelCommunicationReturn {
  const [channelManager, setChannelManager] = useState<ChannelManager | null>(null);
  const [activeChannel, setActiveChannel] = useState<string>(initialChannel);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [conversationContext, setConversationContext] = useState<ConversationContext | null>(null);
  
  const initializationRef = useRef<boolean>(false);
  
  // Initialize the multi-channel system
  useEffect(() => {
    if (initializationRef.current || !sessionId) return;
    
    const initializeChannels = async () => {
      console.log(`[useMultiChannelCommunication] Initializing multi-channel system for session: ${sessionId}`);
      
      try {
        // Create channel manager
        const manager = new ChannelManager();
        
        // Create channel configurations
        const realtimeConfig: ChannelConfig = {
          type: 'realtime',
          isActive: true,
          capabilities: ['voice', 'text', 'function_calls'],
          fallbackChannel: 'normal',
          priority: 1
        };
        
        const normalConfig: ChannelConfig = {
          type: 'normal',
          isActive: true,
          capabilities: ['text', 'function_calls'],
          fallbackChannel: 'human',
          priority: 2
        };
        
        const humanConfig: ChannelConfig = {
          type: 'human',
          isActive: true,
          capabilities: ['text', 'human_handoff'],
          priority: 3
        };
        
        // Create channel instances
        const realtimeChannel = new RealtimeChannel(realtimeConfig);
        const normalChannel = new NormalAPIChannel(normalConfig);
        const humanChannel = new HumanStaffChannel(humanConfig);
        
        // Initialize channels
        await manager.initializeChannels({
          realtime: realtimeChannel,
          normal: normalChannel,
          human: humanChannel
        });
        
        // Initialize conversation context
        const context: ConversationContext = {
          sessionId,
          history: [],
          activeChannel: 'normal',
          userPreferences: {
            preferredChannel: 'auto',
            voiceEnabled: false,
            language: language || 'en-US',
            staffNotificationMethods: ['email']
          },
          transferHistory: [],
          language: language || 'en-US'
        };
        
        setChannelManager(manager);
        setConversationContext(context);
        setActiveChannel('normal');
        setIsInitialized(true);
        
        console.log(`[useMultiChannelCommunication] ✅ Multi-channel system initialized successfully`);
        
      } catch (error) {
        console.error(`[useMultiChannelCommunication] Failed to initialize:`, error);
        setIsInitialized(false);
      }
    };
    
    initializationRef.current = true;
    initializeChannels();
    
    // Cleanup on unmount
    return () => {
      if (channelManager) {
        channelManager.cleanup();
      }
    };
  }, [sessionId, language]);
  
  // Update realtime channel connection when WebRTC status changes
  useEffect(() => {
    if (!channelManager || !sendClientEvent) return;
    
    const channels = channelManager.getAvailableChannels();
    if (channels.includes('realtime')) {
      // Get the realtime channel and update its connection
      const realtimeChannel = (channelManager as any).channelInstances?.get('realtime') as RealtimeChannel;
      if (realtimeChannel && realtimeChannel.connectToWebRTC) {
        realtimeChannel.connectToWebRTC(sendClientEvent, sessionStatus);
      }
    }
  }, [channelManager, sendClientEvent, sessionStatus]);
  
  // Update language in conversation context
  useEffect(() => {
    if (conversationContext && language !== conversationContext.language) {
      setConversationContext(prev => prev ? {
        ...prev,
        language,
        userPreferences: {
          ...prev.userPreferences,
          language
        }
      } : null);
    }
  }, [language, conversationContext]);
  
  const sendUniversalMessage = useCallback(async (
    content: string, 
    type: 'text' | 'audio' = 'text'
  ): Promise<UniversalMessage> => {
    if (!channelManager || !conversationContext) {
      throw new Error('Multi-channel system not initialized');
    }
    
    setIsProcessing(true);
    
    const message: UniversalMessage = {
      id: crypto.randomUUID().slice(0, 32),
      sessionId,
      timestamp: new Date().toISOString(),
      type,
      content,
      metadata: {
        source: 'user',
        channel: conversationContext.activeChannel
      }
    };
    
    console.log(`[useMultiChannelCommunication] Sending message: "${content.substring(0, 50)}..."`);
    
    try {
      // Add message to conversation history
      const updatedContext = {
        ...conversationContext,
        history: [...conversationContext.history, message]
      };
      setConversationContext(updatedContext);
      
      // Send message through channel manager
      const response = await channelManager.sendMessage(message, updatedContext);
      
      // Add response to conversation history
      const finalContext = {
        ...updatedContext,
        history: [...updatedContext.history, response]
      };
      setConversationContext(finalContext);
      
      // Update active channel if it changed
      const newActiveChannel = channelManager.getActiveChannel();
      if (newActiveChannel !== activeChannel) {
        const oldChannel = activeChannel;
        setActiveChannel(newActiveChannel);
        onChannelSwitch?.(oldChannel, newActiveChannel, 'auto_routing');
      }
      
      setIsProcessing(false);
      return response;
      
    } catch (error) {
      setIsProcessing(false);
      console.error(`[useMultiChannelCommunication] Error sending message:`, error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [channelManager, conversationContext, sessionId, activeChannel, onChannelSwitch, onError]);
  
  const switchToChannel = useCallback(async (
    channel: 'realtime' | 'normal' | 'human',
    reason: string = 'manual'
  ): Promise<void> => {
    if (!channelManager || !conversationContext) {
      throw new Error('Multi-channel system not initialized');
    }
    
    console.log(`[useMultiChannelCommunication] Switching to ${channel} channel (${reason})`);
    
    try {
      const oldChannel = activeChannel;
      await channelManager.switchChannel(channel, conversationContext, reason);
      
      // Update local state
      setActiveChannel(channel);
      
      // Update conversation context
      setConversationContext(prev => prev ? {
        ...prev,
        activeChannel: channel
      } : null);
      
      // Notify about channel switch
      onChannelSwitch?.(oldChannel, channel, reason);
      
    } catch (error) {
      console.error(`[useMultiChannelCommunication] Error switching channel:`, error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [channelManager, conversationContext, activeChannel, onChannelSwitch, onError]);
  
  const updateUserPreferences = useCallback((preferences: Partial<UserPreferences>) => {
    if (!conversationContext) return;
    
    setConversationContext(prev => prev ? {
      ...prev,
      userPreferences: {
        ...prev.userPreferences,
        ...preferences
      }
    } : null);
  }, [conversationContext]);
  
  const getChannelHealth = useCallback((): Record<string, boolean> => {
    if (!channelManager) return {};
    return channelManager.getChannelHealth();
  }, [channelManager]);
  
  const getChannelCapabilities = useCallback((): Record<string, string[]> => {
    if (!channelManager) return {};
    return channelManager.getChannelCapabilities();
  }, [channelManager]);
  
  const getTransferStats = useCallback(() => {
    if (!channelManager) return null;
    return channelManager.getTransferStats();
  }, [channelManager]);
  
  // Compute derived state
  const messageHistory = conversationContext?.history || [];
  const channelHealth = getChannelHealth();

  return {
    channelManager,
    activeChannel,
    channelHealth,
    isProcessing,
    messageHistory,
    isInitialized,
    sendMessage: sendUniversalMessage,
    sendUniversalMessage,
    switchChannel: switchToChannel,
    switchToChannel,
    getChannelStatus: getChannelHealth,
    getChannelHealth,
    getChannelCapabilities,
    getTransferStats,
    updateUserPreferences,
    conversationContext
  };
} 