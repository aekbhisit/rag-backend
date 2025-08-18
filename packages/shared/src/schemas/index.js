import { z } from "zod";
export const IntentFiltersSchema = z.object({
    scope: z.string().optional(),
    action: z.string().optional(),
    detail: z.string().max(500).optional(),
});
export const ContextRetrievalRequestSchema = z.object({
    query: z.string().min(1).max(1000),
    intent: IntentFiltersSchema.optional(),
    tenant_id: z.string().uuid(),
    channel: z.string().optional(),
    user_id: z.string().optional(),
});
export const ContextSchema = z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    type: z.enum(["place", "website", "ticket", "doc_chunk"]),
    title: z.string(),
    body: z.string(),
    attributes: z.record(z.unknown()),
    trust_level: z.number().int(),
    language: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
});
export const ContextRetrievalResponseSchema = z.object({
    contexts: z.array(ContextSchema),
    citations: z
        .array(z.object({
        context_id: z.string().uuid(),
        snippet: z.string(),
        score: z.number().optional(),
    }))
        .default([]),
    profile_id: z.string(),
    ai_instruction_message: z.string(),
    retrieval_method: z.enum(["structured", "hybrid", "fallback"]),
    latency_ms: z.number(),
    intent_filters_applied: z.object({
        scope_filter: z.boolean(),
        action_filter: z.boolean(),
        combined_query: z.string(),
    }),
});
