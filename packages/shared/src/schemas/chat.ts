import { z } from "zod";

export const ClassifyRequestSchema = z.object({
  text: z.string().min(1),
  tenant_id: z.string().uuid(),
});
export const ClassifyResponseSchema = z.object({
  scope: z.string().optional(),
  action: z.string().optional(),
  detail: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export const AnswerRequestSchema = z.object({
  query: z.string().min(1),
  tenant_id: z.string().uuid(),
  intent: z
    .object({ scope: z.string().optional(), action: z.string().optional(), detail: z.string().optional() })
    .optional(),
});
export const AnswerResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(z.object({ context_id: z.string().uuid(), snippet: z.string() })).default([]),
});

export const PreviewRequestSchema = AnswerRequestSchema.extend({ max_contexts: z.number().int().min(1).max(50).default(10) });
export const PreviewResponseSchema = z.object({
  contexts: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      snippet: z.string(),
      score: z.number().optional(),
    })
  ),
});


