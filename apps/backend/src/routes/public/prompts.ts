import { Router } from 'express';
import { promptService } from '../../services/promptService';

export function buildPublicPromptsRouter() {
  const router = Router();

  router.get('/agents/:agentKey/prompt', async (req, res) => {
    try {
      const { agentKey } = req.params;
      const { category, locale, tenantId } = req.query as any;
      if (!agentKey || !category) return res.status(400).json({ error: 'agentKey and category required' });
      if (category !== 'base' && category !== 'initial_system') return res.status(400).json({ error: 'invalid category' });
      const rec = category === 'base'
        ? await promptService.getBasePrompt(agentKey, { tenantId: tenantId || undefined, locale: locale || undefined })
        : await promptService.getInitialSystemPrompt(agentKey, { tenantId: tenantId || undefined, locale: locale || undefined });
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


