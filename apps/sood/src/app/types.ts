
import { z } from "zod";

// Define the allowed moderation categories only once
export const MODERATION_CATEGORIES = [
  "OFFENSIVE",
  "OFF_BRAND",
  "VIOLENCE",
  "NONE",
] as const;

// Derive the union type for ModerationCategory from the array
export type ModerationCategory = (typeof MODERATION_CATEGORIES)[number];

// Create a Zod enum based on the same array
export const ModerationCategoryZod = z.enum([...MODERATION_CATEGORIES]);

export type SessionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED";

export interface ToolParameterProperty {
  type: string;
  description?: string;
  enum?: string[];
  pattern?: string;
  properties?: Record<string, ToolParameterProperty>;
  required?: string[];
  additionalProperties?: boolean;
  items?: ToolParameterProperty;
}

export interface ToolParameters {
  type: string;
  properties: Record<string, ToolParameterProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface Tool {
  type: "function";
  name: string;
  description: string;
  parameters: ToolParameters;
}

export interface AgentConfig {
  name: string;
  publicDescription: string; // gives context to agent transfer tool
  instructions: string;
  systemPrompt?: string; // Optional system prompt for the agent
  model?: string; // Optional model specification
  conversationSummary?: string; // Optional conversation context/summary
  tools: Tool[];
  toolLogic?: Record<
    string,
    (args: any, transcriptLogsFiltered: TranscriptItem[]) => Promise<any> | any
  >;
  downstreamAgents?:
    | AgentConfig[]
    | { name: string; publicDescription: string }[];
  transferSettings?: {
    autoGenerateFirstMessage: boolean;
    initialPrompt?: string;
    initialSystemPrompt?: string;
    waitForVoicePlayback?: boolean;
  };
}

export type AllAgentConfigsType = Record<string, AgentConfig[]>;

export interface GuardrailResultType {
  status: "IN_PROGRESS" | "DONE";
  testText?: string; 
  category?: ModerationCategory;
  rationale?: string;
}

export interface TranscriptItem {
  itemId: string;
  type: "MESSAGE" | "BREADCRUMB";
  role?: "user" | "assistant";
  title?: string;
  data?: Record<string, any>;
  expanded: boolean;
  timestamp: string;
  createdAtMs: number;
  status: "IN_PROGRESS" | "DONE";
  isHidden: boolean;
  guardrailResult?: GuardrailResultType;
}

export interface Log {
  id: number;
  timestamp: string;
  direction: string;
  eventName: string;
  data: any;
  expanded: boolean;
  type: string;
}

export interface ServerEvent {
  type: string;
  event_id?: string;
  item_id?: string;
  transcript?: string;
  delta?: string;
  metadata?: {
    language?: string;
    [key: string]: any;
  };
  payload?: {
    userId?: string;
    userData?: any;
    [key: string]: any;
  };
  session?: {
    id?: string;
  };
  item?: {
    id?: string;
    object?: string;
    type?: string;
    status?: string;
    name?: string;
    arguments?: string;
    role?: "user" | "assistant";
    content?: {
      type?: string;
      transcript?: string | null;
      text?: string;
    }[];
  };
  response?: {
    output?: {
      id: string;
      type?: string;
      name?: string;
      arguments?: any;
      call_id?: string;
      role: string;
      content?: any;
    }[];
    metadata: Record<string, any>;
    status_details?: {
      error?: any;
    };
  };
}

export interface LoggedEvent {
  id: number;
  direction: "client" | "server";
  expanded: boolean;
  timestamp: string;
  eventName: string;
  eventData: Record<string, any>; // can have arbitrary objects logged
}

// Update the GuardrailOutputZod schema to use the shared ModerationCategoryZod
export const GuardrailOutputZod = z.object({
  moderationRationale: z.string(),
  moderationCategory: ModerationCategoryZod,
});

export type GuardrailOutput = z.infer<typeof GuardrailOutputZod>;

// ==========================================
// Multi-Channel Routing System Interfaces
// ==========================================

export interface UniversalMessage {
  id: string;
  sessionId: string;
  timestamp: string;
  type: 'text' | 'audio' | 'system';
  content: string;
  metadata: {
    source: 'user' | 'ai' | 'human';
    channel: 'realtime' | 'normal' | 'human';
    language?: string;
    audioData?: ArrayBuffer;
    staffId?: string;
    agentName?: string;
    originalEventType?: string; // For preserving original realtime event types
    originalMessageId?: string; // For linking error responses to original messages
    isStreaming?: boolean; // For tracking streaming voice responses
    // Extended optional fields used by chat UI for ordering and placeholders
    isTranscribing?: boolean;
    seq?: number;
    streamSeq?: string;
    deleted?: boolean;
    mappedFrom?: string;
  };
}

export interface ConversationContext {
  sessionId: string;
  history: UniversalMessage[];
  activeChannel: 'realtime' | 'normal' | 'human';
  userPreferences: UserPreferences;
  transferHistory: ChannelTransfer[];
  agentConfig?: AgentConfig; // Reuse existing agent config
  language: string;
}

export interface ChannelConfig {
  type: 'realtime' | 'normal' | 'human';
  isActive: boolean;
  capabilities: ('voice' | 'text' | 'function_calls' | 'human_handoff')[];
  fallbackChannel?: 'realtime' | 'normal' | 'human';
  priority: number;
}

export interface RoutingDecision {
  channel: 'realtime' | 'normal' | 'human';
  reason: string;
  confidence: number;
  fallback?: 'realtime' | 'normal' | 'human';
  metadata?: Record<string, any>;
}

export interface UserPreferences {
  preferredChannel: 'realtime' | 'normal' | 'human' | 'auto';
  voiceEnabled: boolean;
  language: string;
  staffNotificationMethods: string[];
}

export interface ChannelTransfer {
  from: string;
  to: string;
  timestamp: string;
  reason: string;
  contextTransferred: boolean;
}

export interface RoutingRule {
  id: string;
  trigger: string;
  targetChannel: 'realtime' | 'normal' | 'human';
  confidence: number;
  conditions: Record<string, any>;
}
