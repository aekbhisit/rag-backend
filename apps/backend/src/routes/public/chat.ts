import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'pg';
import { getPostgresPool } from '../../adapters/db/postgresClient';
import { getTenantIdFromReq } from '../../config/tenant';

export function buildPublicChatRouter(pool?: Pool) {
  const router = Router();
  const pg = pool || getPostgresPool();

  // POST /api/chat/completions - agent chat completions
  router.post('/chat/completions', async (req, res) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      
      // Validate request body
      const CompletionSchema = z.object({
        agent_key: z.string().min(1),
        messages: z.array(z.object({
          role: z.enum(['user', 'assistant', 'system']),
          content: z.string(),
        })).min(1),
        session_id: z.string().optional(),
        stream: z.boolean().optional().default(false),
        temperature: z.number().min(0).max(2).optional().default(0.7),
        max_tokens: z.number().min(1).optional().default(1000),
      });
      
      const input = CompletionSchema.parse(req.body);
      
      // Get agent configuration
      const agentResult = await pg.query(
        `SELECT name, public_description, is_enabled 
         FROM agents 
         WHERE agent_key = $1 AND tenant_id = $2 AND is_enabled = true`,
        [input.agent_key, tenantId]
      );
      
      if (agentResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Agent not found or disabled',
          agent_key: input.agent_key
        });
      }
      
      const agent = agentResult.rows[0];
      
      // For now, return a simple completion response
      // In a full implementation, this would call the actual AI service
      const completion = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-4o-mini',
        choices: [{
          index: 0,
          message: {
            role: 'assistant' as const,
            content: `Hello! I'm ${agent.name}. ${agent.public_description || 'How can I help you today?'}`
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 25,
          total_tokens: 75
        }
      };
      
      res.json(completion);
      
    } catch (error) {
      console.error('Error in chat completion:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: error.flatten()
        });
      }
      
      res.status(500).json({
        error: 'Failed to process chat completion',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}
