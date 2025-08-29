import { BaseChannel } from './BaseChannel';
import { UniversalMessage, ConversationContext, ChannelConfig } from '@/app/types';

export class RealtimeChannel extends BaseChannel {
  private sendClientEvent?: (eventObj: any, eventNameSuffix?: string) => void;
  private sessionStatus: string = 'DISCONNECTED';
  private isHealthyStatus: boolean = false;
  
  constructor(config: ChannelConfig) {
    super(config);
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log(`[RealtimeChannel] Already initialized`);
      return;
    }
    
    console.log(`[RealtimeChannel] Initializing realtime channel...`);
    
    // Note: The actual WebRTC connection will be handled by the existing useWebRTCConnection hook
    // This channel class provides the interface for the multi-channel system
    this.isHealthyStatus = true;
    this.isInitialized = true;
    
    console.log(`[RealtimeChannel] ✅ Realtime channel initialized`);
  }
  
  async processMessage(message: UniversalMessage, context: ConversationContext): Promise<UniversalMessage> {
    console.log(`[RealtimeChannel] Processing message: "${message.content.substring(0, 50)}..."`);
    
    if (!this.sendClientEvent) {
      throw new Error('Realtime channel not properly connected - sendClientEvent not available');
    }
    
    try {
      // Convert UniversalMessage to realtime API format
      if (message.type === 'text') {
        // Text message via realtime API
        const messageId = this.generateMessageId();
        
        this.sendClientEvent({
          type: "conversation.item.create",
          item: {
            id: messageId,
            type: "message",
            role: "user", 
            content: [{ type: "input_text", text: message.content }],
          },
        });
        
        this.sendClientEvent({ type: "response.create" });
        
        // Return immediate acknowledgment - actual response will come via server events
        return this.createSystemMessage(
          "Message sent via realtime connection",
          message.sessionId
        );
        
      } else if (message.type === 'audio') {
        // Audio message handling
        console.log(`[RealtimeChannel] Audio message detected - handled by WebRTC connection`);
        
        // Audio is handled directly by the WebRTC connection via PTT
        // Return acknowledgment
        return this.createSystemMessage(
          "Audio message processed via realtime connection", 
          message.sessionId
        );
        
      } else {
        console.warn(`[RealtimeChannel] Unsupported message type: ${message.type}`);
        return this.createErrorMessage(
          `Realtime channel does not support message type: ${message.type}`,
          message.sessionId
        );
      }
      
    } catch (error) {
      console.error(`[RealtimeChannel] Error processing message:`, error);
      return this.createErrorMessage(
        `Failed to process message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        message.sessionId
      );
    }
  }
  
  async transferContext(context: ConversationContext): Promise<void> {
    console.log(`[RealtimeChannel] Transferring context for session: ${context.sessionId}`);
    
    try {
      if (!this.sendClientEvent) {
        throw new Error('Realtime channel not properly connected');
      }
      
      // Update session with conversation context
      // In realtime API, we can set instructions and context via session.update
      const contextSummary = this.generateContextSummary(context);
      
      this.sendClientEvent({
        type: "session.update",
        session: {
          instructions: `Previous conversation context: ${contextSummary}. Please continue the conversation naturally.`,
          // Include language preference if available
          ...(context.language && { language: context.language })
        }
      });
      
      console.log(`[RealtimeChannel] Context transferred successfully`);
      
    } catch (error) {
      console.error(`[RealtimeChannel] Failed to transfer context:`, error);
      throw error;
    }
  }
  
  async close(): Promise<void> {
    console.log(`[RealtimeChannel] Closing realtime channel...`);
    
    // The actual WebRTC disconnection is handled by useWebRTCConnection
    // This just updates our internal state
    this.sendClientEvent = undefined;
    this.sessionStatus = 'DISCONNECTED';
    this.isHealthyStatus = false;
    this.isInitialized = false;
    
    console.log(`[RealtimeChannel] Realtime channel closed`);
  }
  
  isHealthy(): boolean {
    // Channel is healthy if it's initialized and has a connected session
    return this.isInitialized && this.isHealthyStatus && this.sessionStatus === 'CONNECTED';
  }
  
  // Method to connect this channel to the WebRTC connection
  connectToWebRTC(sendClientEvent: (eventObj: any, eventNameSuffix?: string) => void, sessionStatus: string): void {
    this.sendClientEvent = sendClientEvent;
    this.sessionStatus = sessionStatus;
    this.isHealthyStatus = sessionStatus === 'CONNECTED';
    
    console.log(`[RealtimeChannel] Connected to WebRTC with status: ${sessionStatus}`);
  }
  
  // Method to update session status
  updateSessionStatus(status: string): void {
    this.sessionStatus = status;
    this.isHealthyStatus = status === 'CONNECTED';
    console.log(`[RealtimeChannel] Session status updated: ${status}`);
  }
  
  private generateContextSummary(context: ConversationContext): string {
    // Generate a brief summary of recent conversation for context transfer
    const recentMessages = context.history.slice(-5);
    const summary = recentMessages
      .map(msg => `${msg.metadata.source}: ${msg.content.substring(0, 100)}`)
      .join(' | ');
    
    return `Recent conversation (${context.history.length} total messages): ${summary}`;
  }
} 