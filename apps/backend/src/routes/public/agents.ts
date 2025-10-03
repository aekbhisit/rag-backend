import { Router } from 'express';
import type { Pool } from 'pg';
import { getPostgresPool } from '../../adapters/db/postgresClient';
import { TenantsRepository } from '../../repositories/tenantsRepository';

export function buildPublicAgentsRouter(pool?: Pool) {
  const router = Router();
  const pg = pool || getPostgresPool();
  const tenantsRepo = new TenantsRepository(getPostgresPool());

  // GET /api/agents - list enabled agents (public fields only)
  router.get('/agents', async (_req, res) => {
    try {
      const { rows } = await pg.query(
        `SELECT agent_key, name, public_description, icon, theme, is_enabled
         FROM agents
         WHERE is_enabled = true
         ORDER BY is_default DESC, name ASC`
      );
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/agents/:agentKey/tools - public tool function schemas
  router.get('/agents/:agentKey/tools', async (req, res) => {
    try {
      const { agentKey } = req.params;
      const { rows } = await pg.query(
        `SELECT tool_key, function_name, function_description, function_parameters
         FROM agent_tools
         WHERE agent_key = $1 AND (enabled IS NULL OR enabled = true)
         ORDER BY position ASC`,
        [agentKey]
      );
      // Sanitize: remove null names and ensure parameters shape
      const tools = (rows || [])
        .filter((r: any) => typeof r.function_name === 'string' && r.function_name.trim().length > 0)
        .map((r: any) => ({
          tool_key: r.tool_key,
          function_name: String(r.function_name),
          function_description: r.function_description || '',
          function_parameters: ((): any => {
            const p = r.function_parameters && typeof r.function_parameters === 'object' ? r.function_parameters : { type: 'object', properties: {} };
            if (!p.type) p.type = 'object';
            if (p.type !== 'object') p.type = 'object';
            if (!p.properties || typeof p.properties !== 'object') p.properties = {};
            if (p.required && !Array.isArray(p.required)) p.required = [];
            return p;
          })(),
        }));
      res.json(tools);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/agents/:agentKey/navigation-pages/active - active pages for prompts
  router.get('/agents/:agentKey/navigation-pages/active', async (req, res) => {
    try {
      const { agentKey } = req.params;
      const { rows } = await pg.query(
        `SELECT id, agent_key, page_slug, title, description, keywords, examples, priority, is_active
         FROM agent_navigation_pages
         WHERE agent_key = $1 AND is_active = true
         ORDER BY priority DESC, title ASC`,
        [agentKey]
      );
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/tenant-ai-config - public generating config (no secrets)
  router.get('/tenant-ai-config', async (req, res) => {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || '';
      const tenant = tenantId ? await tenantsRepo.get(tenantId) : null;
      const ai: any = tenant?.settings?.ai || {};
      const gen: any = ai.generating || {};
      const provider: string = (gen.provider || 'openai').toLowerCase();
      const model: string = gen.model || process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
      const maxTokens = typeof gen.maxTokens === 'number' ? gen.maxTokens : 4000;
      const temperature = typeof gen.temperature === 'number' ? gen.temperature : 0.7;
      res.json({ provider, model, maxTokens, temperature });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // GET /api/agent-sets - public agent sets aggregation (replaces Next.js proxy)
  router.get('/agent-sets', async (_req, res) => {
    try {
      // 1) list enabled agents (public fields only)
      const agentsResult = await pg.query(
        `SELECT agent_key, name, public_description
         FROM agents
         WHERE is_enabled = true
         ORDER BY is_default DESC, name ASC`
      );
      const agents = Array.isArray(agentsResult.rows) ? agentsResult.rows : [];

      const set: Record<string, any[]> = { default: [] };

      for (const a of agents) {
        const key = String(a.agent_key);

        // 2) load system prompt (base category)
        const promptResult = await pg.query(
          `SELECT content FROM agent_prompts 
           WHERE agent_key = $1 AND category = 'base' 
           ORDER BY version DESC LIMIT 1`,
          [key]
        );
        const instructions = promptResult.rows.length > 0 ? promptResult.rows[0].content || '' : '';

        // 3) tools (public)
        const toolsResult = await pg.query(
          `SELECT tool_key, function_name, function_description, function_parameters
           FROM agent_tools
           WHERE agent_key = $1 AND (enabled IS NULL OR enabled = true)
           ORDER BY position ASC`,
          [key]
        );
        const rawTools = Array.isArray(toolsResult.rows) ? toolsResult.rows : [];

        // sanitize tool schemas
        const dbTools = rawTools
          .filter((t: any) => typeof t?.function_name === 'string' && t.function_name.trim().length > 0)
          .map((t: any) => {
            const params = t.function_parameters && typeof t.function_parameters === 'object'
              ? { ...t.function_parameters }
              : { type: 'object', properties: {} };
            if (!params.type) params.type = 'object';
            if (params.type !== 'object') params.type = 'object';
            if (!params.properties || typeof params.properties !== 'object') params.properties = {};
            if (params.required && !Array.isArray(params.required)) params.required = [];
            return {
              type: 'function',
              function: {
                name: String(t.function_name),
                description: t.function_description || '',
                parameters: params,
              },
            };
          });

        // map function -> skill/tool key for client-side resolution
        const functionSkillKeys: Record<string, string> = {};
        for (const t of rawTools) {
          const toolKey = t.tool_key || t.skill_id || t.skill;
          if (t.function_name && toolKey) functionSkillKeys[String(t.function_name)] = String(toolKey);
        }

        set.default.push({
          name: a.name,
          key,
          publicDescription: a.public_description,
          instructions: instructions, // load system prompt from database
          tools: dbTools,
          toolLogic: {}, // client maps DB tool keys to actual handlers
          functionSkillKeys,
          downstreamAgents: [],
        });
      }

      // downstream agents list (enable transfers)
      const downstream = set.default.map((x: any) => ({ name: x.name, publicDescription: x.publicDescription }));
      set.default = set.default.map((agent: any) => ({
        ...agent,
        downstreamAgents: downstream.filter((d: any) => d.name !== agent.name),
      }));

      res.json({ agentSets: set, defaultSetKey: 'default' });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}


