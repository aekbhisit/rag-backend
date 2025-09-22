import { Router } from 'express';
import { promptService } from '../../services/promptService';

export function buildPublicPromptsRouter() {
  const router = Router();

  router.get('/agents/:agentKey/prompt', async (req, res) => {
    try {
      const { agentKey } = req.params;
      const { locale, tenantId } = req.query as any;
      if (!agentKey) return res.status(400).json({ error: 'agentKey required' });
      // Simplified: always use base category (system prompt)
      const rec = await promptService.getBasePrompt(agentKey, { tenantId: tenantId || undefined, locale: locale || undefined });
      if (!rec) return res.status(404).json({ error: 'not found' });
      res.json({ id: rec.id, content: rec.content, version: rec.version, metadata: rec.metadata, locale: rec.locale });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.get('/agents/:agentKey/intention', async (req, res) => {
    try {
      const { agentKey } = req.params;
      const { intent, style, locale, tenantId } = req.query as any;
      if (!agentKey || !intent || !style) return res.status(400).json({ error: 'agentKey, intent, style required' });
      const rec = await promptService.getIntentionPrompt(agentKey, { intent, style, tenantId: tenantId || undefined, locale: locale || undefined });
      if (!rec) return res.status(404).json({ error: 'not found' });
      res.json({ id: rec.id, content: rec.content, version: rec.version, metadata: rec.metadata, locale: rec.locale });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}


