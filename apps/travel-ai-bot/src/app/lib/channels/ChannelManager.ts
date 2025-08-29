import { BaseChannel } from './BaseChannel';
import { RoutingEngine } from '../routing/RoutingEngine';
import { ContextTransferService } from '../context/ContextTransferService';
import { UniversalMessage, ConversationContext, RoutingDecision } from '@/app/types';

export class ChannelManager {
  private activeChannel: 'realtime' | 'normal' | 'human' = 'normal';
  private channelInstances: Map<string, BaseChannel> = new Map();
  private routingEngine: RoutingEngine;
  private contextTransferService: ContextTransferService;
  private isTransitioning: boolean = false;
  private messageQueue: Array<{message: UniversalMessage; context: ConversationContext; resolve: Function; reject: Function}> = [];
  private initialized: boolean = false;
  
  constructor() {
    this.routingEngine = new RoutingEngine();
    this.contextTransferService = new ContextTransferService();
    console.log(`[ChannelManager] Initialized with routing engine and context transfer service`);
  }
  
  async initializeChannels(channels: Record<string, BaseChannel>): Promise<void> {
    console.log(`[ChannelManager] Initializing ${Object.keys(channels).length} channels...`);
    
    try {
      for (const [name, channel] of Object.entries(channels)) {
        console.log(`[ChannelManager] Initializing ${name} channel...`);
        await channel.initialize();
        this.channelInstances.set(name, channel);
        console.log(`[ChannelManager] ✅ ${name} channel initialized successfully`);
      }
      
      this.initialized = true;
      console.log(`[ChannelManager] All channels initialized successfully`);
      
      // Process any queued messages
      await this.processMessageQueue();
      
    } catch (error) {
      console.error(`[ChannelManager] Failed to initialize channels:`, error);
      throw new Error(`Channel initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async sendMessage(
    message: UniversalMessage, 
    context: ConversationContext
  ): Promise<UniversalMessage> {
    console.log(`[ChannelManager] Received message for processing: "${message.content.substring(0, 50)}..."`);
    
    // If not initialized, queue the message
    if (!this.initialized) {
      console.log(`[ChannelManager] Channels not initialized, queueing message`);
      return new Promise((resolve, reject) => {
        this.messageQueue.push({ message, context, resolve, reject });
      });
    }
    
    // If transitioning, wait for transition to complete
    if (this.isTransitioning) {
      console.log(`[ChannelManager] Channel transition in progress, waiting...`);
      await this.waitForTransitionCompletion();
    }
    
    try {
      // Check if auto-routing is needed
      if (context.userPreferences.preferredChannel === 'auto') {
        const routingDecision = await this.routingEngine.determineRoute(message, context);
        console.log(`[ChannelManager] Auto-routing decision: ${routingDecision.channel} (${routingDecision.reason})`);
        
        if (routingDecision.channel !== this.activeChannel) {
          await this.switchChannel(routingDecision.channel, context, routingDecision.reason);
        }
      }
      
      // Get the active channel
      const channel = this.channelInstances.get(this.activeChannel);
      if (!channel) {
        throw new Error(`Channel ${this.activeChannel} not available`);
      }
      
      // Check if channel is healthy
      if (!channel.isHealthy()) {
        console.warn(`[ChannelManager] Active channel ${this.activeChannel} is not healthy, attempting fallback`);
        await this.handleUnhealthyChannel(context);
      }
      
      // Process the message
      console.log(`[ChannelManager] Processing message through ${this.activeChannel} channel`);
      const response = await channel.processMessage(message, context);
      
      console.log(`[ChannelManager] Message processed successfully, response: "${response.content.substring(0, 50)}..."`);
      return response;
      
    } catch (error) {
      console.error(`[ChannelManager] Error processing message:`, error);
      return this.createErrorResponse(message, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  async switchChannel(
    newChannel: 'realtime' | 'normal' | 'human',
    context: ConversationContext,
    reason: string = 'manual'
  ): Promise<void> {
    if (this.activeChannel === newChannel) {
      console.log(`[ChannelManager] Already on ${newChannel} channel, no switch needed`);
      return;
    }
    
    if (this.isTransitioning) {
      console.log(`[ChannelManager] Channel transition already in progress, ignoring switch request`);
      return;
    }
    
    console.log(`[ChannelManager] Starting channel switch: ${this.activeChannel} → ${newChannel} (${reason})`);
    this.isTransitioning = true;
    
    try {
      // Validate target channel exists and is available
      const targetChannel = this.channelInstances.get(newChannel);
      if (!targetChannel) {
        throw new Error(`Target channel ${newChannel} not available`);
      }
      
      if (!targetChannel.isChannelActive()) {
        throw new Error(`Target channel ${newChannel} is not active`);
      }
      
      // Transfer context to new channel
      await this.contextTransferService.transferContext(
        this.activeChannel,
        newChannel,
        context
      );
      
      // Perform channel-specific context transfer
      await targetChannel.transferContext(context);
      
      // Update active channel
      const previousChannel = this.activeChannel;
      this.activeChannel = newChannel;
      
      // Update context with transfer record
      context.transferHistory.push({
        from: previousChannel,
        to: newChannel,
        timestamp: new Date().toISOString(),
        reason,
        contextTransferred: true
      });
      
      // Update active channel in context
      context.activeChannel = newChannel;
      
      console.log(`[ChannelManager] ✅ Successfully switched from ${previousChannel} to ${newChannel}`);
      
    } catch (error) {
      console.error(`[ChannelManager] Failed to switch channels:`, error);
      throw new Error(`Channel switch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isTransitioning = false;
    }
  }
  
  async determineOptimalChannel(
    message: UniversalMessage,
    context: ConversationContext
  ): Promise<RoutingDecision> {
    return await this.routingEngine.determineRoute(message, context);
  }
  
  private async handleUnhealthyChannel(context: ConversationContext): Promise<void> {
    console.log(`[ChannelManager] Handling unhealthy channel: ${this.activeChannel}`);
    
    const currentChannel = this.channelInstances.get(this.activeChannel);
    const fallbackChannelName = currentChannel?.getFallbackChannel();
    
    if (fallbackChannelName) {
      const fallbackChannel = this.channelInstances.get(fallbackChannelName);
      if (fallbackChannel && fallbackChannel.isHealthy()) {
        console.log(`[ChannelManager] Switching to fallback channel: ${fallbackChannelName}`);
        await this.switchChannel(fallbackChannelName as any, context, 'health_check_fallback');
        return;
      }
    }
    
    // Find any healthy channel as last resort
    for (const [name, channel] of this.channelInstances.entries()) {
      if (channel.isHealthy() && name !== this.activeChannel) {
        console.log(`[ChannelManager] Emergency fallback to healthy channel: ${name}`);
        await this.switchChannel(name as any, context, 'emergency_fallback');
        return;
      }
    }
    
    throw new Error('No healthy channels available');
  }
  
  private async waitForTransitionCompletion(): Promise<void> {
    const maxWaitTime = 5000; // 5 seconds
    const checkInterval = 100; // 100ms
    let elapsed = 0;
    
    while (this.isTransitioning && elapsed < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }
    
    if (this.isTransitioning) {
      console.warn(`[ChannelManager] Transition timeout after ${maxWaitTime}ms`);
      this.isTransitioning = false; // Force reset
    }
  }
  
  private async processMessageQueue(): Promise<void> {
    if (this.messageQueue.length === 0) return;
    
    console.log(`[ChannelManager] Processing ${this.messageQueue.length} queued messages`);
    
    while (this.messageQueue.length > 0) {
      const queuedItem = this.messageQueue.shift();
      if (queuedItem) {
        try {
          const response = await this.sendMessage(queuedItem.message, queuedItem.context);
          queuedItem.resolve(response);
        } catch (error) {
          queuedItem.reject(error);
        }
      }
    }
  }
  
  private createErrorResponse(originalMessage: UniversalMessage, error: string): UniversalMessage {
    return {
      id: crypto.randomUUID().slice(0, 32),
      sessionId: originalMessage.sessionId,
      timestamp: new Date().toISOString(),
      type: 'system',
      content: `I apologize, but I encountered an error processing your message: ${error}`,
      metadata: {
        source: 'ai',
        channel: this.activeChannel,
        originalMessageId: originalMessage.id
      }
    };
  }
  
  // Public getters and utility methods
  getActiveChannel(): string {
    return this.activeChannel;
  }
  
  isChannelTransitioning(): boolean {
    return this.isTransitioning;
  }
  
  getAvailableChannels(): string[] {
    return Array.from(this.channelInstances.keys());
  }
  
  getChannelHealth(): Record<string, boolean> {
    const health: Record<string, boolean> = {};
    for (const [name, channel] of this.channelInstances.entries()) {
      health[name] = channel.isHealthy();
    }
    return health;
  }
  
  getChannelCapabilities(): Record<string, string[]> {
    const capabilities: Record<string, string[]> = {};
    for (const [name, channel] of this.channelInstances.entries()) {
      capabilities[name] = channel.getCapabilities();
    }
    return capabilities;
  }
  
  getTransferStats() {
    return this.contextTransferService.getTransferStats();
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
  
  getQueueSize(): number {
    return this.messageQueue.length;
  }
  
  async cleanup(): Promise<void> {
    console.log(`[ChannelManager] Starting cleanup...`);
    
    this.isTransitioning = false;
    this.messageQueue = [];
    
    for (const [name, channel] of this.channelInstances.entries()) {
      try {
        console.log(`[ChannelManager] Closing ${name} channel...`);
        await channel.close();
      } catch (error) {
        console.error(`[ChannelManager] Error closing ${name} channel:`, error);
      }
    }
    
    this.channelInstances.clear();
    this.initialized = false;
    this.contextTransferService.clearTransferLog();
    
    console.log(`[ChannelManager] Cleanup completed`);
  }
} 