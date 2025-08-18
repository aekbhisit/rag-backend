export interface InstructionProfile {
  id: string;
  tenant_id: string;
  name: string;
  version: number;
  answer_style?: Record<string, unknown>;
  retrieval_policy?: Record<string, unknown>;
  trust_safety?: Record<string, unknown>;
  glossary?: Record<string, unknown>;
  ai_instruction_message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileTarget {
  profile_id: string;
  tenant_id: string;
  intent_scope?: string;
  intent_action?: string;
  channel?: string;
  user_segment?: string;
  priority: number;
}


