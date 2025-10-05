import { BaseChannel } from './BaseChannel';
import { UniversalMessage, ConversationContext, ChannelConfig } from '@/app/types';

export class HumanStaffChannel extends BaseChannel {
  private staffPlatformEndpoint: string = '/services/staff/messages'; // Placeholder endpoint
  private isStaffConnected: boolean = false;
  private currentStaffId?: string;
  
  constructor(config: ChannelConfig) {
    super(config);
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log(`[HumanStaffChannel] Already initialized`);
      return;
    }
    
    console.log(`[HumanStaffChannel] Initializing human staff channel...`);
    
    try {
      // Placeholder for staff platform connectivity check
      // In a real implementation, this would connect to your staff platform API
      await this.testStaffPlatformConnectivity();
      
      this.isInitialized = true;
      console.log(`[HumanStaffChannel] ✅ Human staff channel initialized (placeholder mode)`);
      
    } catch (error) {
      console.error(`[HumanStaffChannel] Failed to initialize:`, error);
      throw new Error(`Human staff channel initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async processMessage(message: UniversalMessage, context: ConversationContext): Promise<UniversalMessage> {
    console.log(`[HumanStaffChannel] Processing message: "${message.content.substring(0, 50)}..."`);
    
    try {
      // Only handle text messages for now - staff platforms typically support text
      if (message.type !== 'text') {
        return this.createErrorMessage(
          `Human staff channel currently only supports text messages, received: ${message.type}`,
          message.sessionId
        );
      }
      
      // Check if staff is connected
      if (!this.isStaffConnected) {
        // Auto-connect to available staff (placeholder logic)
        await this.connectToAvailableStaff(context);
      }
      
      // Send message to staff platform
      const staffResponse = await this.sendMessageToStaff(message, context);
      
      // Convert staff response to UniversalMessage format
      return this.convertStaffResponseToUniversalMessage(staffResponse, message.sessionId);
      
    } catch (error) {
      console.error(`[HumanStaffChannel] Error processing message:`, error);
      
      // Provide helpful error message to user
      return this.createErrorMessage(
        `Currently no human support staff available. Please try again later or use our AI assistant.`,
        message.sessionId
      );
    }
  }
  
  async transferContext(context: ConversationContext): Promise<void> {
    console.log(`[HumanStaffChannel] Transferring context for session: ${context.sessionId}`);
    
    try {
      // Generate human-readable context for staff
      const humanReadableContext = this.generateHumanReadableContext(context);
      
      // Send context to staff platform (placeholder)
      await this.sendContextToStaff(humanReadableContext, context);
      
      console.log(`[HumanStaffChannel] Context transferred to staff successfully`);
      
    } catch (error) {
      console.error(`[HumanStaffChannel] Failed to transfer context:`, error);
      throw error;
    }
  }
  
  async close(): Promise<void> {
    console.log(`[HumanStaffChannel] Closing human staff channel...`);
    
    // Disconnect from staff platform
    if (this.isStaffConnected) {
      await this.disconnectFromStaff();
    }
    
    this.isStaffConnected = false;
    this.currentStaffId = undefined;
    this.isInitialized = false;
    
    console.log(`[HumanStaffChannel] Human staff channel closed`);
  }
  
  isHealthy(): boolean {
    // Channel is healthy if initialized and staff platform is available
    // In placeholder mode, we'll return true if initialized
    return this.isInitialized;
  }
  
  // Placeholder method to test staff platform connectivity
  private async testStaffPlatformConnectivity(): Promise<boolean> {
    console.log(`[HumanStaffChannel] Testing staff platform connectivity...`);
    
    try {
      // Test staff availability API endpoint
      const response = await fetch('/services/staff/availability', {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        console.log(`[HumanStaffChannel] Staff platform connectivity test passed`);
        return true;
      } else {
        console.warn(`[HumanStaffChannel] Staff API returned status: ${response.status}`);
        return false;
      }
      
    } catch (error) {
      console.warn(`[HumanStaffChannel] Staff platform connectivity test failed:`, error);
      return false;
    }
  }
  
  private async connectToAvailableStaff(context: ConversationContext): Promise<void> {
    console.log(`[HumanStaffChannel] Connecting to available staff...`);
    
    // Placeholder for staff assignment logic
    // In a real implementation, this would:
    // 1. Query your staff platform for available agents
    // 2. Consider language preferences, expertise, etc.
    // 3. Assign the customer to an appropriate staff member
    
    // Simulate finding available staff
    this.currentStaffId = `staff_${Date.now()}`; // Placeholder staff ID
    this.isStaffConnected = true;
    
    console.log(`[HumanStaffChannel] Connected to staff member: ${this.currentStaffId} (simulated)`);
  }
  
  private async sendMessageToStaff(message: UniversalMessage, context: ConversationContext): Promise<any> {
    console.log(`[HumanStaffChannel] Sending message to staff...`);
    
    try {
      // Send message to staff platform API
      const response = await fetch('/services/staff/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_to_staff',
          sessionId: message.sessionId,
          customerMessage: message.content,
          language: context.language
        })
      });

      if (!response.ok) {
        throw new Error(`Staff API returned ${response.status}`);
      }

      const result = await response.json();
      
      // Wait for staff response (poll for a response)
      const staffResponse = await this.waitForStaffResponse(message.sessionId, result.staffId);
      
      console.log(`[HumanStaffChannel] Received response from staff`);
      return staffResponse;
      
    } catch (error) {
      console.error(`[HumanStaffChannel] Error sending message to staff:`, error);
      throw error;
    }
  }

  private async waitForStaffResponse(sessionId: string, staffId: string, maxWaitTime: number = 30000): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await fetch(`/services/staff/messages?sessionId=${sessionId}&staffId=${staffId}`);
        
        if (response.ok) {
          const data = await response.json();
          const respondedMessage = data.messages?.find((msg: any) => 
            msg.sessionId === sessionId && 
            msg.staffId === staffId && 
            msg.status === 'responded'
          );
          
          if (respondedMessage) {
            return {
              id: respondedMessage.id,
              content: respondedMessage.staffResponse,
              staffId: respondedMessage.staffId,
              timestamp: new Date().toISOString()
            };
          }
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.warn(`[HumanStaffChannel] Error polling for staff response:`, error);
      }
    }
    
    // Timeout - return a fallback response
    return {
      id: this.generateMessageId(),
      content: "I apologize for the delay. A staff member will respond to your message shortly. Please check back in a few minutes.",
      staffId: staffId,
      timestamp: new Date().toISOString()
    };
  }
  
  private async sendContextToStaff(context: string, conversationContext: ConversationContext): Promise<void> {
    console.log(`[HumanStaffChannel] Sending context to staff platform...`);
    
    // Placeholder for sending context to staff platform
    // In a real implementation, this would send the conversation context
    // to your staff dashboard/platform
    
    const contextData = {
      sessionId: conversationContext.sessionId,
      humanReadableContext: context,
      messageCount: conversationContext.history.length,
      language: conversationContext.language,
      timestamp: new Date().toISOString()
    };
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`[HumanStaffChannel] Context sent to staff platform (simulated) - ${context.length} characters`);
  }
  
  private async disconnectFromStaff(): Promise<void> {
    console.log(`[HumanStaffChannel] Disconnecting from staff...`);
    
    // Placeholder for staff disconnection logic
    // In a real implementation, this would notify the staff platform
    // that the conversation has ended
    
    if (this.currentStaffId) {
      console.log(`[HumanStaffChannel] Notifying staff ${this.currentStaffId} of session end (simulated)`);
    }
    
    this.currentStaffId = undefined;
    this.isStaffConnected = false;
  }
  
  private convertStaffResponseToUniversalMessage(staffResponse: any, sessionId: string): UniversalMessage {
    return {
      id: staffResponse.id || this.generateMessageId(),
      sessionId,
      timestamp: staffResponse.timestamp || new Date().toISOString(),
      type: 'text',
      content: staffResponse.content,
      metadata: {
        source: 'human',
        channel: 'human',
        staffId: staffResponse.staffId,
        originalEventType: 'staff_response'
      }
    };
  }
  
  private generateHumanReadableContext(context: ConversationContext): string {
    const lines = [
      `=== Customer Support Context ===`,
      `Session ID: ${context.sessionId}`,
      `Language: ${context.language}`,
      `Total Messages: ${context.history.length}`,
      `Active Channel: ${context.activeChannel}`,
      ``,
      `=== Recent Conversation History ===`
    ];
    
    // Add last 10 messages for staff context
    const recentHistory = context.history.slice(-10);
    for (const msg of recentHistory) {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      const source = msg.metadata.source === 'user' ? 'Customer' : 
                    msg.metadata.source === 'ai' ? 'AI Assistant' : 
                    msg.metadata.source === 'human' ? 'Staff' : 'System';
      lines.push(`[${time}] ${source}: ${msg.content}`);
    }
    
    lines.push('');
    lines.push(`=== Staff Assignment ===`);
    lines.push(`Transferred to human support at: ${new Date().toISOString()}`);
    lines.push(`Customer requested human assistance or issue requires human intervention`);
    
    if (context.transferHistory.length > 0) {
      lines.push('');
      lines.push('=== Previous Channel Transfers ===');
      for (const transfer of context.transferHistory.slice(-3)) {
        lines.push(`${transfer.timestamp}: ${transfer.from} → ${transfer.to} (${transfer.reason})`);
      }
    }
    
    return lines.join('\n');
  }
  
  // Public method to check staff connection status
  getStaffConnectionStatus(): boolean {
    return this.isStaffConnected;
  }
  
  getCurrentStaffId(): string | undefined {
    return this.currentStaffId;
  }
} 