import { UniversalMessage, ConversationContext, ChannelConfig } from '@/app/types';

export abstract class BaseChannel {
  protected config: ChannelConfig;
  protected isInitialized: boolean = false;
  
  constructor(config: ChannelConfig) {
    this.config = config;
  }
  
  // Abstract methods that all channels must implement
  abstract processMessage(message: UniversalMessage, context: ConversationContext): Promise<UniversalMessage>;
  abstract transferContext(context: ConversationContext): Promise<void>;
  abstract initialize(): Promise<void>;
  abstract close(): Promise<void>;
  abstract isHealthy(): boolean;
  
  // Common utility methods available to all channels
  protected generateMessageId(): string {
    return crypto.randomUUID().slice(0, 32);
  }
  
  protected createSystemMessage(content: string, sessionId: string): UniversalMessage {
    return {
      id: this.generateMessageId(),
      sessionId,
      timestamp: new Date().toISOString(),
      type: 'system',
      content,
      metadata: {
        source: 'ai',
        channel: this.config.type
      }
    };
  }
  
  protected createErrorMessage(error: string, sessionId: string): UniversalMessage {
    return {
      id: this.generateMessageId(),
      sessionId,
      timestamp: new Date().toISOString(),
      type: 'system',
      content: `Error: ${error}`,
      metadata: {
        source: 'ai',
        channel: this.config.type
      }
    };
  }
  
  // Getters for channel information
  getChannelType(): string {
    return this.config.type;
  }
  
  getCapabilities(): string[] {
    return this.config.capabilities;
  }
  
  getPriority(): number {
    return this.config.priority;
  }
  
  getFallbackChannel(): string | undefined {
    return this.config.fallbackChannel;
  }
  
  isChannelActive(): boolean {
    return this.config.isActive;
  }
  
  getInitializationStatus(): boolean {
    return this.isInitialized;
  }
} 