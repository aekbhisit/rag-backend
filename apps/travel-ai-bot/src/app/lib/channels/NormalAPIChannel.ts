import { BaseChannel } from './BaseChannel';
import { UniversalMessage, ConversationContext, ChannelConfig } from '@/app/types';

export class NormalAPIChannel extends BaseChannel {
  private apiEndpoint: string = '/services/chat/completions';
  
  constructor(config: ChannelConfig) {
    super(config);
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log(`[NormalAPIChannel] Already initialized`);
      return;
    }
    
    console.log(`[NormalAPIChannel] Initializing normal API channel...`);
    
    // Test the API endpoint connectivity
    try {
      const healthCheck = await this.testAPIConnectivity();
      if (healthCheck) {
        this.isInitialized = true;
        console.log(`[NormalAPIChannel] ✅ Normal API channel initialized successfully`);
      } else {
        throw new Error('API connectivity test failed');
      }
    } catch (error) {
      console.error(`[NormalAPIChannel] Failed to initialize:`, error);
      throw new Error(`Normal API channel initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async processMessage(message: UniversalMessage, context: ConversationContext): Promise<UniversalMessage> {
    console.log(`[NormalAPIChannel] Processing message: "${message.content.substring(0, 50)}..."`);
    
    try {
      // Only handle text messages - audio is not supported by normal API
      if (message.type !== 'text') {
        return this.createErrorMessage(
          `Normal API channel only supports text messages, received: ${message.type}`,
          message.sessionId
        );
      }
      
      // Convert conversation history to OpenAI chat format
      const messages = this.convertHistoryToChatFormat(context.history, message);
      
      // Call the OpenAI chat completions API
      const response = await this.callChatCompletionsAPI(messages, context);
      
      // Convert response back to UniversalMessage format
      return this.convertAPIResponseToUniversalMessage(response, message.sessionId);
      
    } catch (error) {
      console.error(`[NormalAPIChannel] Error processing message:`, error);
      return this.createErrorMessage(
        `Failed to process message via normal API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        message.sessionId
      );
    }
  }
  
  async transferContext(context: ConversationContext): Promise<void> {
    console.log(`[NormalAPIChannel] Transferring context for session: ${context.sessionId}`);
    
    // Normal API doesn't need special context transfer since conversation history
    // is included in each request. We just validate the context format.
    
    try {
      this.validateContextForNormalAPI(context);
      console.log(`[NormalAPIChannel] Context validated for normal API usage`);
    } catch (error) {
      console.error(`[NormalAPIChannel] Context validation failed:`, error);
      throw error;
    }
  }
  
  async close(): Promise<void> {
    console.log(`[NormalAPIChannel] Closing normal API channel...`);
    
    // Normal API is stateless, so no cleanup needed
    this.isInitialized = false;
    
    console.log(`[NormalAPIChannel] Normal API channel closed`);
  }
  
  isHealthy(): boolean {
    // Normal API is healthy if initialized (stateless)
    return this.isInitialized;
  }
  
  private async testAPIConnectivity(): Promise<boolean> {
    try {
      console.log(`[NormalAPIChannel] Testing API connectivity...`);
      
      // Simple test message to verify the endpoint is working
      const testMessages = [
        { role: 'user', content: 'Hello' }
      ];
      
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Use smaller model for connectivity test
          messages: testMessages,
          max_tokens: 10,
          temperature: 0,
        }),
      });
      
      if (response.ok) {
        console.log(`[NormalAPIChannel] API connectivity test passed`);
        return true;
      } else {
        console.warn(`[NormalAPIChannel] API connectivity test failed with status: ${response.status}`);
        return false;
      }
      
    } catch (error) {
      console.warn(`[NormalAPIChannel] API connectivity test failed:`, error);
      return false;
    }
  }
  
  private convertHistoryToChatFormat(history: UniversalMessage[], currentMessage: UniversalMessage): any[] {
    const messages: any[] = [];
    
    // Convert conversation history to OpenAI chat format
    // Limit history to prevent token overflow (keep last 20 messages)
    const recentHistory = history.slice(-20);
    
    for (const msg of recentHistory) {
      if (msg.type === 'text' && msg.content.trim()) {
        messages.push({
          role: this.mapSourceToRole(msg.metadata.source),
          content: msg.content
        });
      }
    }
    
    // Add current message
    messages.push({
      role: 'user',
      content: currentMessage.content
    });
    
    console.log(`[NormalAPIChannel] Converted ${recentHistory.length + 1} messages to chat format`);
    return messages;
  }
  
  private mapSourceToRole(source: string): string {
    switch (source) {
      case 'user':
        return 'user';
      case 'ai':
        return 'assistant';
      case 'human':
        return 'assistant'; // Human responses are also assistant in OpenAI format
      default:
        return 'user';
    }
  }
  
  private async callChatCompletionsAPI(messages: any[], context: ConversationContext): Promise<any> {
    console.log(`[NormalAPIChannel] Calling chat completions API with ${messages.length} messages`);
    
    const requestBody = {
      model: 'gpt-4o-mini', // Use cost-effective model for normal API
      messages: messages,
      max_tokens: 2000,
      temperature: 0.7,
      // Include language preference if available
      ...(context.language && { 
        // Note: OpenAI API doesn't have direct language parameter, 
        // but we could add it as a system message if needed
      })
    };
    
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chat completions API failed (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`[NormalAPIChannel] API call successful, received response`);
    
    return data;
  }
  
  private convertAPIResponseToUniversalMessage(apiResponse: any, sessionId: string): UniversalMessage {
    try {
      const choice = apiResponse.choices?.[0];
      if (!choice || !choice.message) {
        throw new Error('Invalid API response format');
      }
      
      const content = choice.message.content || 'No response content';
      
      return {
        id: this.generateMessageId(),
        sessionId,
        timestamp: new Date().toISOString(),
        type: 'text',
        content,
        metadata: {
          source: 'ai',
          channel: 'normal',
          originalEventType: 'chat_completion_response'
        }
      };
      
    } catch (error) {
      console.error(`[NormalAPIChannel] Error converting API response:`, error);
      throw new Error(`Failed to convert API response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private validateContextForNormalAPI(context: ConversationContext): void {
    if (!context.sessionId) {
      throw new Error('Context missing sessionId');
    }
    
    if (!Array.isArray(context.history)) {
      throw new Error('Context history is not an array');
    }
    
    // Check for very long history that might exceed token limits
    if (context.history.length > 50) {
      console.warn(`[NormalAPIChannel] Long conversation history (${context.history.length} messages) - will be truncated`);
    }
    
    // Validate recent messages have proper format
    const recentMessages = context.history.slice(-5);
    for (const msg of recentMessages) {
      if (!msg.content || !msg.metadata?.source) {
        console.warn(`[NormalAPIChannel] Invalid message format detected in recent history`);
      }
    }
    
    console.log(`[NormalAPIChannel] Context validation passed for ${context.history.length} messages`);
  }
} 