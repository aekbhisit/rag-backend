"use client";

// AI-Powered Intention Handler for ThaiResortGuide
interface IntentionChangeRequest {
  intent: 'explore' | 'learn' | 'decide' | 'act';
  style: 'guided' | 'quick' | 'detailed';
  reasoning: string;
}

interface IntentionPromptResponse {
  instructions: string;
  responseStyle: string;
  expectedFunctions: string[];
  mayTransfer?: boolean;
  success: boolean;
}

// Intention-based system prompts that will be returned to AI
interface PromptConfig {
  instructions: string;
  expectedFunctions: string[];
  responseStyle: string;
  mayTransfer?: boolean;
}

const INTENTION_PROMPTS: Record<string, PromptConfig> = {
  'resort.explore.guided': {
    instructions: `INTENTION UPDATE: You are now in GUIDED EXPLORATION mode.
    
Your new behavior:
- Help user discover resort options step-by-step
- Ask about their preferences (beach, mountain, spa, etc.)
- Use viewResortCategory function to show options
- Be warm but CONCISE - keep responses short and clear
- Guide them through the discovery process briefly
- Ask simple, direct questions

Tone: Warm and guiding, but SHORT responses only`,
    expectedFunctions: ['viewResortCategory'],
    responseStyle: 'warm and guiding'
  },

  'resort.explore.quick': {
    instructions: `INTENTION UPDATE: You are now in QUICK EXPLORATION mode.
    
Your new behavior:
- Show resort options efficiently and directly
- Use viewResortCategory to present highlights quickly
- Keep responses VERY SHORT and informative
- Focus on key features and top recommendations
- Be direct and time-efficient
- Maximum 1-2 sentences per response

Tone: Efficient and direct, ULTRA-SHORT responses`,
    expectedFunctions: ['viewResortCategory'],
    responseStyle: 'efficient and direct'
  },

  'resort.explore.detailed': {
    instructions: `INTENTION UPDATE: You are now in DETAILED EXPLORATION mode.
    
Your new behavior:
- Provide comprehensive information about resort categories
- Use viewResortCategory and explain each option thoroughly
- Include background about locations and resort types
- Be thorough but still CLEAR and organized
- Share details in bullet points or short paragraphs
- Avoid unnecessary fluff

Tone: Comprehensive but organized and clear`,
    expectedFunctions: ['viewResortCategory'],
    responseStyle: 'comprehensive and informative'
  },

  'resort.learn.guided': {
    instructions: `INTENTION UPDATE: You are now in GUIDED LEARNING mode.
    
Your new behavior:
- Help user understand specific resort details step-by-step
- Use viewResortDetail when they show interest in specific resorts
- Break down information into SHORT, digestible parts
- Ask if they want to know more about specific aspects
- Be patient and educational but BRIEF
- Explain things clearly in 1-2 sentences

Tone: Educational and patient, but SHORT and clear`,
    expectedFunctions: ['viewResortDetail', 'viewResortCategory'],
    responseStyle: 'educational and patient'
  },

  'resort.learn.quick': {
    instructions: `INTENTION UPDATE: You are now in QUICK LEARNING mode.
    
Your new behavior:
- Provide essential resort information efficiently
- Use viewResortDetail to show key details quickly
- Focus on highlights and main features ONLY
- Keep explanations VERY brief but complete
- Be informative but super concise
- Maximum 1-2 sentences

Tone: Informative and concise, ULTRA-SHORT responses`,
    expectedFunctions: ['viewResortDetail'],
    responseStyle: 'informative and concise'
  },

  'resort.learn.detailed': {
    instructions: `INTENTION UPDATE: You are now in DETAILED LEARNING mode.
    
Your new behavior:
- Provide comprehensive resort information with full context
- Use viewResortDetail to show complete resort profiles
- Include amenities, location details, nearby attractions
- Be thorough but ORGANIZED in bullet points or short sections
- Share all relevant details but keep it structured
- Avoid repetitive or unnecessary text

Tone: Comprehensive but well-organized and clear`,
    expectedFunctions: ['viewResortDetail'],
    responseStyle: 'comprehensive and detailed'
  },

  'resort.decide.guided': {
    instructions: `INTENTION UPDATE: You are now in GUIDED DECISION mode.
    
Your new behavior:
- Help user compare and choose between resort options
- Ask about their priorities and preferences BRIEFLY
- Use viewResortDetail to show specific options for comparison
- Guide decision-making process without being pushy
- Be advisory and supportive but CONCISE
- Keep recommendations short and clear

Tone: Advisory and supportive, SHORT responses only`,
    expectedFunctions: ['viewResortDetail', 'viewResortCategory'],
    responseStyle: 'advisory and supportive'
  },

  'resort.decide.quick': {
    instructions: `INTENTION UPDATE: You are now in QUICK DECISION mode.
    
Your new behavior:
- Help user choose efficiently between options
- Present clear comparisons and recommendations
- Use viewResortDetail for targeted comparisons
- Be direct in recommendations while respecting preferences
- Be efficient and decisive
- Maximum 1-2 sentences per response

Tone: Direct and decisive, ULTRA-SHORT responses`,
    expectedFunctions: ['viewResortDetail'],
    responseStyle: 'direct and decisive'
  },

  'resort.decide.detailed': {
    instructions: `INTENTION UPDATE: You are now in DETAILED DECISION mode.
    
Your new behavior:
- Provide comprehensive comparisons between resort options
- Use viewResortDetail to show complete profiles for comparison
- Include detailed pros/cons analysis in organized format
- Consider multiple factors in recommendations
- Be thorough but STRUCTURED (use bullets/sections)
- Give comprehensive decision support in clear format

Tone: Analytical and thorough, but well-organized`,
    expectedFunctions: ['viewResortDetail'],
    responseStyle: 'analytical and thorough'
  },

  'resort.act.guided': {
    instructions: `INTENTION UPDATE: You are now in GUIDED ACTION mode.
    
Your new behavior:
- User is ready to book or take action on a resort
- Provide booking guidance and next steps BRIEFLY
- If they need more information first, use viewResortDetail
- Help them understand booking process in SHORT steps
- Prepare for potential transfer to booking agent
- Be helpful and action-oriented but CONCISE

Tone: Helpful and action-oriented, SHORT responses`,
    expectedFunctions: ['viewResortDetail'],
    responseStyle: 'helpful and action-oriented',
    mayTransfer: true
  },

  'resort.act.quick': {
    instructions: `INTENTION UPDATE: You are now in QUICK ACTION mode.
    
Your new behavior:
- User wants to book or take action quickly
- Provide direct booking information and steps
- Be efficient and focused on actionable information
- Prepare for quick transfer to booking agent if needed
- Be direct and action-focused
- Maximum 1-2 sentences per response

Tone: Direct and action-focused, ULTRA-SHORT responses`,
    expectedFunctions: [],
    responseStyle: 'direct and action-focused',
    mayTransfer: true
  },

  'resort.act.detailed': {
    instructions: `INTENTION UPDATE: You are now in DETAILED ACTION mode.
    
Your new behavior:
- User wants comprehensive booking/action information
- Provide thorough booking guidance and all necessary details
- Use viewResortDetail to show complete information before booking
- Explain booking process comprehensively but ORGANIZED
- Be thorough and action-oriented but STRUCTURED
- Use bullet points or clear sections

Tone: Thorough and action-oriented, but well-organized`,
    expectedFunctions: ['viewResortDetail'],
    responseStyle: 'thorough and action-oriented',
    mayTransfer: true
  }
};

class AIIntentionHandler {
  private currentIntention: string = 'resort.explore.guided';
  private lastUpdateTime: number = 0;
  private readonly UPDATE_COOLDOWN = 5000; // 5 seconds between intention changes

  private getLocale(): string {
    try {
      if (typeof window !== 'undefined') {
        const lang = (window.navigator.language || 'en').toLowerCase();
        return lang.startsWith('th') ? 'th' : 'en';
      }
    } catch {}
    return 'en';
  }

  private async fetchDbIntentionPrompt(agentKey: string, intent: string, style: string, locale?: string): Promise<{ instructions: string, responseStyle?: string, expectedFunctions?: string[], mayTransfer?: boolean } | null> {
    try {
      const params = new URLSearchParams();
      params.set('intent', intent);
      params.set('style', style);
      if (locale) params.set('locale', locale);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`/api/agents/${encodeURIComponent(agentKey)}/intention?${params.toString()}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const data = await res.json();
      return { instructions: String(data.content || ''), ...(data.metadata || {}) };
    } catch {
      return null;
    }
  }

  async handleIntentionChange(request: IntentionChangeRequest): Promise<IntentionPromptResponse> {
    const fullIntention = `resort.${request.intent}.${request.style}`;
    const now = Date.now();

    // Prevent rapid intention changes
    if (now - this.lastUpdateTime < this.UPDATE_COOLDOWN && this.currentIntention === fullIntention) {
      console.log(`[AI Intention] Ignoring duplicate intention change: ${fullIntention}`);
      return {
        instructions: "No change needed - intention already set.",
        responseStyle: this.currentIntention,
        expectedFunctions: [],
        success: false
      };
    }

    // Get the new prompt configuration
    const promptConfig = INTENTION_PROMPTS[fullIntention as keyof typeof INTENTION_PROMPTS];
    
    if (!promptConfig) {
      console.warn(`[AI Intention] Unknown intention: ${fullIntention}, using default`);
      return this.getDefaultPrompt();
    }

    // Update state
    this.currentIntention = fullIntention;
    this.lastUpdateTime = now;

    console.log(`[AI Intention] Changed to: ${fullIntention} - ${request.reasoning}`);
    // Try DB override first
    const locale = this.getLocale();
    const db = await this.fetchDbIntentionPrompt('thaiResortGuide', request.intent, request.style, locale);
    if (db && db.instructions) {
      return {
        instructions: db.instructions,
        responseStyle: (db as any).responseStyle || promptConfig.responseStyle,
        expectedFunctions: (db as any).expectedFunctions || promptConfig.expectedFunctions,
        mayTransfer: (db as any).mayTransfer ?? promptConfig.mayTransfer,
        success: true
      };
    }
    // Fallback to code
    return {
      instructions: promptConfig.instructions,
      responseStyle: promptConfig.responseStyle,
      expectedFunctions: promptConfig.expectedFunctions,
      mayTransfer: promptConfig.mayTransfer,
      success: true
    };
  }

  getCurrentIntention(): string {
    return this.currentIntention;
  }

  getInitialSystemPrompt(): string {
    return `You are a Thai Resort Guide AI assistant for เฮือนไทรแก้วรีสอร์ท in Chiang Rai, Thailand.

🎯 PRIMARY GOAL: Answer user questions about the resort directly and helpfully.

⚡ RESPONSE STYLE: Keep responses SHORT and CLEAR. Maximum 1-2 sentences unless detailed info is requested.

🚨 INTENTION DETECTION RULES:
- ONLY call intentionChange() when there's a CLEAR change in user intent or style
- DO NOT call intentionChange() on every message
- FIRST: Answer the user's question directly
- SECOND: Only call intentionChange() if the user's intent has genuinely changed

**Intent Types (only call when clearly detected):**
1. "explore" - User wants to browse/discover options
   Examples: "show me resorts", "what's available", "I want to see options"
   
2. "learn" - User wants detailed information  
   Examples: "tell me about this resort", "what amenities", "describe the location"
   
3. "decide" - User is comparing/choosing
   Examples: "which is better", "help me choose", "compare these"
   
4. "act" - User ready to book/contact
   Examples: "I want to book", "how much", "contact information"

**Style Types (only call when clearly indicated):**
1. "guided" - User explicitly asks for help/guidance
   Examples: "help me", "guide me", "step by step"
   
2. "quick" - User explicitly wants fast responses
   Examples: "quickly", "brief", "fast", "just tell me"
   
3. "detailed" - User explicitly wants comprehensive info
   Examples: "everything", "all details", "comprehensive", "thorough"

🚨 CRITICAL BEHAVIOR:
1. 🔥 ANSWER USER QUESTIONS FIRST - don't immediately call intentionChange()
2. 🔥 Only call intentionChange() when user intent/style CLEARLY changes
3. 🔥 If user asks about beach resorts, answer about beach resorts - don't just change intention
4. Use available functions: viewResortCategory, viewResortDetail, navigateToMain, navigateBack, knowledgeSearch
5. Respond in the same language as the user (Thai/English)

**Example Correct Behavior:**
User: "ดูข้อมูล resort ติดทะเลหน่อย"
Response: "ขอแนะนำรีสอร์ทติดทะเลในเชียงรายครับ [call viewResortCategory('beach')] มีตัวเลือกหลายแห่งให้เลือก"

**Example Wrong Behavior:**
User: "ดูข้อมูล resort ติดทะเลหน่อย"  
Response: [calls intentionChange first] "สวัสดีครับ! ผมเป็นไกด์แนะนำรีสอร์ทไทย..."

Remember: Answer the user's actual question first, then adapt if needed!`;
  }

  private getDefaultPrompt(): IntentionPromptResponse {
    return {
      instructions: INTENTION_PROMPTS['resort.explore.guided'].instructions,
      responseStyle: 'warm and guiding',
      expectedFunctions: ['viewResortCategory'],
      success: true
    };
  }

  // Method to reset intention (useful for new sessions)
  reset(): void {
    this.currentIntention = 'resort.explore.guided';
    this.lastUpdateTime = 0;
    console.log('[AI Intention] Reset to default state');
  }
}

// Export singleton instance
export const aiIntentionHandler = new AIIntentionHandler();

// Export types
export type { IntentionChangeRequest, IntentionPromptResponse }; 