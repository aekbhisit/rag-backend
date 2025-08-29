import { UniversalMessage, ConversationContext, RoutingDecision, RoutingRule } from '@/app/types';

export class RoutingEngine {
  private rules: RoutingRule[] = [];
  
  constructor() {
    this.initializeDefaultRules();
  }
  
  async determineRoute(
    message: UniversalMessage,
    context: ConversationContext
  ): Promise<RoutingDecision> {
    console.log(`[RoutingEngine] Analyzing message for routing: "${message.content.substring(0, 50)}..."`);
    
    // Check explicit human handoff requests (highest priority)
    const humanHandoffScore = this.detectHumanHandoffRequest(message.content);
    if (humanHandoffScore > 0.8) {
      console.log(`[RoutingEngine] Human handoff detected (score: ${humanHandoffScore})`);
      return {
        channel: 'human',
        reason: 'explicit_human_request',
        confidence: humanHandoffScore,
        fallback: 'normal',
        metadata: { keywords_matched: this.getMatchedHumanKeywords(message.content) }
      };
    }
    
    // Check voice preference
    if (message.type === 'audio' || context.userPreferences.voiceEnabled) {
      console.log(`[RoutingEngine] Voice input detected or voice enabled`);
      return {
        channel: 'realtime',
        reason: 'voice_input_detected',
        confidence: 0.9,
        fallback: 'normal',
        metadata: { input_type: message.type, voice_enabled: context.userPreferences.voiceEnabled }
      };
    }
    
    // Check complexity requirements
    const complexityScore = this.analyzeComplexity(message.content);
    if (complexityScore > 0.7) {
      console.log(`[RoutingEngine] High complexity detected (score: ${complexityScore})`);
      return {
        channel: 'human',
        reason: 'high_complexity_detected',
        confidence: complexityScore,
        fallback: 'normal',
        metadata: { complexity_indicators: this.getComplexityIndicators(message.content) }
      };
    }
    
    // Check for technical/troubleshooting content
    const technicalScore = this.analyzeTechnicalContent(message.content);
    if (technicalScore > 0.6) {
      console.log(`[RoutingEngine] Technical content detected (score: ${technicalScore})`);
      return {
        channel: 'normal',
        reason: 'technical_content_detected',
        confidence: technicalScore,
        fallback: 'human',
        metadata: { technical_keywords: this.getTechnicalKeywords(message.content) }
      };
    }
    
    // Default to normal API for cost efficiency
    console.log(`[RoutingEngine] Using default text channel`);
    return {
      channel: 'normal',
      reason: 'default_text_channel',
      confidence: 0.6,
      fallback: 'realtime',
      metadata: { default_routing: true }
    };
  }
  
  private detectHumanHandoffRequest(content: string): number {
    const handoffKeywords = [
      'speak to human', 'talk to person', 'human agent', 'real person',
      'customer service', 'representative', 'operator', 'support staff',
      'manager', 'supervisor', 'complaint', 'escalate', 'human help',
      'talk to someone', 'speak to someone', 'live chat', 'live support'
    ];
    
    const contentLower = content.toLowerCase();
    const matches = handoffKeywords.filter(keyword => 
      contentLower.includes(keyword)
    );
    
    console.log(`[RoutingEngine] Human handoff keywords matched: ${matches.length}/${handoffKeywords.length}`);
    return Math.min(matches.length / handoffKeywords.length * 2, 1);
  }
  
  private analyzeComplexity(content: string): number {
    const complexityIndicators = [
      'complex', 'complicated', 'issue', 'problem', 'trouble',
      'bug', 'error', 'technical', 'integration', 'configuration',
      'billing', 'account', 'refund', 'payment', 'cancel', 'subscription',
      'not working', 'broken', 'failed', 'urgent', 'emergency'
    ];
    
    const contentLower = content.toLowerCase();
    const matches = complexityIndicators.filter(indicator =>
      contentLower.includes(indicator)
    );
    
    console.log(`[RoutingEngine] Complexity indicators matched: ${matches.length}/${complexityIndicators.length}`);
    return Math.min(matches.length / complexityIndicators.length * 1.5, 1);
  }
  
  private analyzeTechnicalContent(content: string): number {
    const technicalKeywords = [
      'api', 'endpoint', 'webhook', 'database', 'server', 'code',
      'programming', 'development', 'integration', 'authentication',
      'token', 'key', 'configuration', 'setup', 'install', 'deploy',
      'how to', 'tutorial', 'guide', 'documentation', 'example'
    ];
    
    const contentLower = content.toLowerCase();
    const matches = technicalKeywords.filter(keyword =>
      contentLower.includes(keyword)
    );
    
    return Math.min(matches.length / technicalKeywords.length * 1.2, 1);
  }
  
  private getMatchedHumanKeywords(content: string): string[] {
    const handoffKeywords = [
      'speak to human', 'talk to person', 'human agent', 'real person',
      'customer service', 'representative', 'operator', 'support staff',
      'manager', 'supervisor', 'complaint', 'escalate', 'human help'
    ];
    
    const contentLower = content.toLowerCase();
    return handoffKeywords.filter(keyword => contentLower.includes(keyword));
  }
  
  private getComplexityIndicators(content: string): string[] {
    const complexityIndicators = [
      'complex', 'complicated', 'issue', 'problem', 'trouble',
      'bug', 'error', 'technical', 'integration', 'configuration',
      'billing', 'account', 'refund', 'payment', 'not working', 'broken'
    ];
    
    const contentLower = content.toLowerCase();
    return complexityIndicators.filter(indicator => contentLower.includes(indicator));
  }
  
  private getTechnicalKeywords(content: string): string[] {
    const technicalKeywords = [
      'api', 'endpoint', 'webhook', 'database', 'server', 'code',
      'programming', 'development', 'integration', 'authentication',
      'how to', 'tutorial', 'guide', 'documentation'
    ];
    
    const contentLower = content.toLowerCase();
    return technicalKeywords.filter(keyword => contentLower.includes(keyword));
  }
  
  addRule(rule: RoutingRule): void {
    this.rules.push(rule);
    console.log(`[RoutingEngine] Added custom routing rule: ${rule.id}`);
  }
  
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
    console.log(`[RoutingEngine] Removed routing rule: ${ruleId}`);
  }
  
  getRules(): RoutingRule[] {
    return [...this.rules];
  }
  
  private initializeDefaultRules(): void {
    // Default routing rules can be added here in the future
    // For now, we use the built-in analysis methods
    console.log(`[RoutingEngine] Initialized with default routing rules`);
  }
  
  // Method to test routing without actually routing
  async testRoute(content: string, context: ConversationContext): Promise<RoutingDecision> {
    const testMessage: UniversalMessage = {
      id: 'test-' + Date.now(),
      sessionId: 'test-session',
      timestamp: new Date().toISOString(),
      type: 'text',
      content,
      metadata: {
        source: 'user',
        channel: 'normal'
      }
    };
    
    return this.determineRoute(testMessage, context);
  }
} 