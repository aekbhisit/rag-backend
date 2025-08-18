import { z } from "zod";

export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  settings: z.record(z.unknown()).optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

export const IntentSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  scope: z.string(),
  action: z.string(),
  description: z.string().optional(),
  created_at: z.string(),
});

export const InstructionProfileSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string(),
  version: z.number().int(),
  answer_style: z.record(z.unknown()).optional(),
  retrieval_policy: z.record(z.unknown()).optional(),
  trust_safety: z.record(z.unknown()).optional(),
  glossary: z.record(z.unknown()).optional(),
  ai_instruction_message: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ProfileTargetSchema = z.object({
  profile_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  intent_scope: z.string().optional(),
  intent_action: z.string().optional(),
  channel: z.string().optional(),
  user_segment: z.string().optional(),
  priority: z.number().int(),
});

export const ContextAdminSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  type: z.enum(["place", "website", "ticket", "document", "text"]),
  title: z.string(),
  body: z.string(),
  attributes: z.record(z.unknown()),
  trust_level: z.number().int(),
  language: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const OverrideSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  context_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  instruction_delta: z.string().optional(),
});

export const QueryLogSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  user_id: z.string().optional(),
  query: z.string(),
  detected_language: z.string().optional(),
  profile_id: z.string().optional(),
  retrieval_method: z.enum(["structured", "hybrid", "fallback"]).optional(),
  latency_ms: z.number().optional(),
  created_at: z.string(),
});


