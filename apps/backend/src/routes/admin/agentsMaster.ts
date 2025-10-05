import { Router } from 'express';
import { Pool } from 'pg';
import { AgentMasterService } from '../../services/agentMasterService';
import { getPostgresPool } from '../../adapters/db/postgresClient';

export function buildAgentsMasterAdminRouter(pool: Pool) {
  const router = Router();
  const agentMasterService = new AgentMasterService(pool);

  // Get tenant AI configuration
  router.get('/agents-master/config', async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID required' });
      }

      const config = await agentMasterService.getTenantAiConfig(tenantId);
      res.json(config);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // List conversations
  router.get('/agents-master/conversations', async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const userId = req.headers['x-user-id'] as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID required' });
      }

      let conversations;
      if (userId) {
        conversations = await agentMasterService.listConversationsByUser(userId, limit, offset);
      } else {
        conversations = await agentMasterService.listConversations(tenantId, limit, offset);
      }

      res.json(conversations);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Create new conversation
  router.post('/agents-master/conversations', async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const userId = req.headers['x-user-id'] as string;
      const { title, sessionId, agentKey } = req.body || {};

      if (!tenantId || !userId || !title) {
        return res.status(400).json({ error: 'Tenant ID, User ID, and title required' });
      }

      const conversationId = await agentMasterService.createConversation(tenantId, userId, title, sessionId, agentKey);
      res.json({ conversationId });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Get conversation details
  router.get('/agents-master/conversations/:conversationId', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const conversation = await agentMasterService.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      res.json(conversation);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Update conversation
  router.put('/agents-master/conversations/:conversationId', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { title, status, metadata } = req.body || {};

      await agentMasterService.updateConversation(conversationId, {
        title,
        status,
        metadata
      });

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Archive conversation
  router.post('/agents-master/conversations/:conversationId/archive', async (req, res) => {
    try {
      const { conversationId } = req.params;
      await agentMasterService.archiveConversation(conversationId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Delete conversation
  router.delete('/agents-master/conversations/:conversationId', async (req, res) => {
    try {
      const { conversationId } = req.params;
      await agentMasterService.deleteConversation(conversationId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Chat with AI
  router.post('/agents-master/chat', async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const userId = req.headers['x-user-id'] as string;
      const { conversationId, message, agentKey } = req.body || {};

      if (!tenantId || !userId || !message) {
        return res.status(400).json({ error: 'Tenant ID, User ID, and message required' });
      }

      const response = await agentMasterService.chatWithAI(tenantId, userId, conversationId, message, agentKey);
      res.json(response);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Get conversation messages
  router.get('/agents-master/conversations/:conversationId/messages', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const messages = await agentMasterService.getConversationMessages(conversationId);
      res.json(messages);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Get conversation history
  router.get('/agents-master/conversations/:conversationId/messages', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await agentMasterService.getConversationHistory(conversationId, limit);
      res.json(messages);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Get recent messages
  router.get('/agents-master/conversations/:conversationId/messages/recent', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const count = parseInt(req.query.count as string) || 10;
      const messages = await agentMasterService.getRecentMessages(conversationId, count);
      res.json(messages);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Get function calls
  router.get('/agents-master/conversations/:conversationId/function-calls', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const functionCalls = await agentMasterService.getFunctionCalls(conversationId);
      res.json(functionCalls);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Get token usage
  router.get('/agents-master/conversations/:conversationId/token-usage', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const tokenUsage = await agentMasterService.getTokenUsage(conversationId);
      res.json({ totalTokens: tokenUsage });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Get usage analytics
  router.get('/agents-master/usage-analytics', async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const fromDate = req.query.from as string;
      const toDate = req.query.to as string;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID required' });
      }

      const analytics = await agentMasterService.getTenantUsageSummary(tenantId, fromDate, toDate);
      res.json(analytics);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Get conversation usage analytics
  router.get('/agents-master/conversations/:conversationId/usage-analytics', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const analytics = await agentMasterService.getUsageSummary(conversationId);
      res.json(analytics);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Chat endpoint (placeholder for now)
  router.post('/agents-master/chat', async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const userId = req.headers['x-user-id'] as string;
      const { conversationId, message, sessionId } = req.body || {};

      if (!tenantId || !userId || !message) {
        return res.status(400).json({ error: 'Tenant ID, User ID, and message required' });
      }

      // This will be implemented in the next phase with OpenAI integration
      res.json({ 
        message: "Chat functionality will be implemented in Phase 3 with OpenAI integration",
        conversationId: conversationId || 'placeholder'
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
