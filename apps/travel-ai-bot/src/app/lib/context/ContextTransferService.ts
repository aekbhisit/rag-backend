import { ConversationContext } from '@/app/types';

export class ContextTransferService {
  private transferLog: Array<{
    from: string;
    to: string;
    timestamp: string;
    contextSize: number;
    success: boolean;
  }> = [];
  
  async transferContext(
    fromChannel: string,
    toChannel: string,
    context: ConversationContext
  ): Promise<void> {
    console.log(`[ContextTransfer] Starting context transfer from ${fromChannel} to ${toChannel}`);
    
    try {
      // Serialize context for transfer validation
      const serializedContext = this.serializeContext(context);
      const contextSize = serializedContext.length;
      
      console.log(`[ContextTransfer] Context size: ${contextSize} characters`);
      console.log(`[ContextTransfer] Message history count: ${context.history.length}`);
      console.log(`[ContextTransfer] Previous transfers: ${context.transferHistory.length}`);
      
      // Validate context before transfer
      this.validateContext(context);
      
      // Channel-specific transfer logic
      await this.executeChannelSpecificTransfer(fromChannel, toChannel, context);
      
      // Log successful transfer
      this.logTransfer(fromChannel, toChannel, contextSize, true);
      
      console.log(`[ContextTransfer] Successfully transferred context from ${fromChannel} to ${toChannel}`);
      
    } catch (error) {
      console.error(`[ContextTransfer] Failed to transfer context:`, error);
      
      // Log failed transfer
      this.logTransfer(fromChannel, toChannel, 0, false);
      
      // Re-throw error to be handled by the calling code
      throw new Error(`Context transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private async executeChannelSpecificTransfer(
    fromChannel: string,
    toChannel: string,
    context: ConversationContext
  ): Promise<void> {
    console.log(`[ContextTransfer] Executing ${fromChannel} → ${toChannel} transfer`);
    
    switch (toChannel) {
      case 'realtime':
        await this.transferToRealtimeChannel(context, fromChannel);
        break;
      case 'normal':
        await this.transferToNormalChannel(context, fromChannel);
        break;
      case 'human':
        await this.transferToHumanChannel(context, fromChannel);
        break;
      default:
        throw new Error(`Unknown target channel: ${toChannel}`);
    }
  }
  
  private async transferToRealtimeChannel(context: ConversationContext, fromChannel: string): Promise<void> {
    console.log(`[ContextTransfer] Preparing context for realtime channel`);
    
    // Realtime channels need session updates with conversation history
    // This will be handled by the RealtimeChannel implementation
    // For now, we just validate that the context is ready
    
    const contextSummary = this.generateContextSummary(context);
    console.log(`[ContextTransfer] Context summary for realtime: ${contextSummary}`);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  private async transferToNormalChannel(context: ConversationContext, fromChannel: string): Promise<void> {
    console.log(`[ContextTransfer] Preparing context for normal API channel`);
    
    // Normal API channels use conversation history in requests
    // No special transfer needed - history is included in each request
    // We just validate the context is properly formatted
    
    this.validateHistoryForNormalAPI(context);
    console.log(`[ContextTransfer] Context validated for normal API usage`);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  private async transferToHumanChannel(context: ConversationContext, fromChannel: string): Promise<void> {
    console.log(`[ContextTransfer] Preparing context for human staff channel`);
    
    // Human channels need context sent to staff platform
    // This will be handled by the HumanStaffChannel implementation
    // For now, we prepare a human-readable context summary
    
    const humanReadableContext = this.generateHumanReadableContext(context, fromChannel);
    console.log(`[ContextTransfer] Generated human-readable context (${humanReadableContext.length} chars)`);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  private validateContext(context: ConversationContext): void {
    if (!context.sessionId) {
      throw new Error('Context missing sessionId');
    }
    
    if (!Array.isArray(context.history)) {
      throw new Error('Context history is not an array');
    }
    
    if (!context.userPreferences) {
      throw new Error('Context missing userPreferences');
    }
    
    if (!context.language) {
      throw new Error('Context missing language');
    }
    
    console.log(`[ContextTransfer] Context validation passed`);
  }
  
  private validateHistoryForNormalAPI(context: ConversationContext): void {
    // Check if history is too long for normal API (token limits)
    const MAX_HISTORY_ITEMS = 20;
    
    if (context.history.length > MAX_HISTORY_ITEMS) {
      console.warn(`[ContextTransfer] History is long (${context.history.length} items), will be truncated for normal API`);
    }
    
    // Validate message format
    for (const message of context.history.slice(-10)) {
      if (!message.content || !message.metadata?.source) {
        console.warn(`[ContextTransfer] Invalid message format detected in history`);
      }
    }
  }
  
  private generateContextSummary(context: ConversationContext): string {
    const recentMessages = context.history.slice(-5);
    const summary = recentMessages
      .map(msg => `${msg.metadata.source}: ${msg.content.substring(0, 100)}`)
      .join(' | ');
    
    return `Session: ${context.sessionId.substring(0, 8)}, Messages: ${context.history.length}, Recent: ${summary}`;
  }
  
  private generateHumanReadableContext(context: ConversationContext, fromChannel: string): string {
    const lines = [
      `=== Customer Support Context Transfer ===`,
      `Session ID: ${context.sessionId}`,
      `Previous Channel: ${fromChannel}`,
      `Language: ${context.language}`,
      `Total Messages: ${context.history.length}`,
      ``,
      `=== Recent Conversation History ===`
    ];
    
    // Add last 10 messages for human context
    const recentHistory = context.history.slice(-10);
    for (const msg of recentHistory) {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      const source = msg.metadata.source === 'user' ? 'Customer' : 
                    msg.metadata.source === 'ai' ? 'AI Assistant' : 'System';
      lines.push(`[${time}] ${source}: ${msg.content}`);
    }
    
    lines.push('');
    lines.push(`=== Transfer Information ===`);
    lines.push(`Transferred at: ${new Date().toISOString()}`);
    lines.push(`Reason: Channel switch from ${fromChannel} to human support`);
    
    return lines.join('\n');
  }
  
  private serializeContext(context: ConversationContext): string {
    try {
      return JSON.stringify({
        sessionId: context.sessionId,
        messageCount: context.history.length,
        lastActivity: context.history[context.history.length - 1]?.timestamp,
        language: context.language,
        activeChannel: context.activeChannel,
        transferCount: context.transferHistory.length,
        userPreferences: context.userPreferences
      });
    } catch (error) {
      throw new Error(`Failed to serialize context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private logTransfer(from: string, to: string, contextSize: number, success: boolean): void {
    const logEntry = {
      from,
      to,
      timestamp: new Date().toISOString(),
      contextSize,
      success
    };
    
    this.transferLog.push(logEntry);
    
    // Keep only last 100 transfer logs
    if (this.transferLog.length > 100) {
      this.transferLog = this.transferLog.slice(-100);
    }
  }
  
  // Public methods for monitoring and debugging
  getTransferLog(): Array<{from: string; to: string; timestamp: string; contextSize: number; success: boolean}> {
    return [...this.transferLog];
  }
  
  getTransferStats(): {
    totalTransfers: number;
    successfulTransfers: number;
    failedTransfers: number;
    averageContextSize: number;
  } {
    const total = this.transferLog.length;
    const successful = this.transferLog.filter(log => log.success).length;
    const failed = total - successful;
    const averageSize = total > 0 
      ? this.transferLog.reduce((sum, log) => sum + log.contextSize, 0) / total 
      : 0;
    
    return {
      totalTransfers: total,
      successfulTransfers: successful,
      failedTransfers: failed,
      averageContextSize: Math.round(averageSize)
    };
  }
  
  clearTransferLog(): void {
    this.transferLog = [];
    console.log(`[ContextTransfer] Transfer log cleared`);
  }
} 