import { Router } from 'express';
import { Pool } from 'pg';

export function buildAgentsAdminRouter(pool: Pool) {
  const router = Router();

  router.get('/agents', async (_req, res) => {
    try {
      const r = await pool.query(`SELECT * FROM agents ORDER BY is_default DESC, name ASC`);
      res.json(r.rows);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.get('/agents/:agentKey', async (req, res) => {
    try {
      const { agentKey } = req.params;
      const r = await pool.query(`SELECT * FROM agents WHERE agent_key = $1`, [agentKey]);
      if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
      res.json(r.rows[0]);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.post('/agents', async (req, res) => {
    try {
      const { agent_key, name, public_description, default_locale = 'en', allowed_locales = ['en'], transfer_settings = {}, intention_handler_key = null, is_enabled = true, is_default = false, icon = null, theme = null, tenant_id = null } = req.body || {};
      if (!agent_key || !name || !public_description) return res.status(400).json({ error: 'agent_key, name, public_description required' });
      if (is_default) {
        await pool.query(`UPDATE agents SET is_default = false`);
      }
      const r = await pool.query(
        `INSERT INTO agents (tenant_id, agent_key, name, public_description, default_locale, allowed_locales, transfer_settings, intention_handler_key, is_enabled, is_default, icon, theme)
         VALUES ($1::uuid, $2, $3, $4, $5, $6::text[], $7::jsonb, $8, $9, $10, $11, $12)
         RETURNING id`,
        [tenant_id, agent_key, name, public_description, default_locale, allowed_locales, transfer_settings, intention_handler_key, is_enabled, is_default, icon, theme]
      );
      res.json({ id: r.rows[0].id });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.put('/agents/:agentKey', async (req, res) => {
    try {
      const { agentKey } = req.params;
      const body = req.body || {};
      const fields: string[] = [];
      const vals: any[] = [];
      let i = 1;
      for (const [k, v] of Object.entries(body)) {
        if (k === 'is_default' && v === true) {
          await pool.query(`UPDATE agents SET is_default = false`);
        }
        fields.push(`${k} = $${i++}${k.endsWith('_settings') || k.endsWith('_locales') ? (k.endsWith('_settings') ? '::jsonb' : '::text[]') : ''}`);
        vals.push(v);
      }
      if (fields.length === 0) return res.json({ ok: true });
      const sql = `UPDATE agents SET ${fields.join(', ')}, updated_at = now() WHERE agent_key = $${i} RETURNING agent_key`;
      vals.push(agentKey);
      const r = await pool.query(sql, vals);
      res.json({ agent_key: r.rows[0]?.agent_key });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.post('/agents/:agentKey/publish', async (req, res) => {
    try {
      const { agentKey } = req.params;
      const r = await pool.query(`UPDATE agents SET version = version + 1, updated_at = now() WHERE agent_key = $1 RETURNING version`, [agentKey]);
      res.json({ agent_key: agentKey, version: r.rows[0]?.version || 1 });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Hard delete agent and related data (tools, prompts, agents-test/master conversations)
  router.delete('/agents/:agentKey', async (req, res) => {
    const client = await pool.connect();
    try {
      const { agentKey } = req.params;
      await client.query('BEGIN');
      // Delete related tools
      await client.query(`DELETE FROM agent_tools WHERE agent_key = $1`, [agentKey]);
      // Delete related prompts
      await client.query(`DELETE FROM agent_prompts WHERE agent_key = $1`, [agentKey]);
      // Delete conversations for this agent (cascades to messages/ai_usage)
      try {
        await client.query(`DELETE FROM agent_master_conversations WHERE agent_key = $1`, [agentKey]);
      } catch {}
      // Finally delete the agent
      const r = await client.query(`DELETE FROM agents WHERE agent_key = $1 RETURNING agent_key`, [agentKey]);
      await client.query('COMMIT');
      if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
      return res.json({ agent_key: agentKey, deleted: true });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch {}
      return res.status(500).json({ error: (e as Error).message });
    } finally {
      client.release();
    }
  });

  // Agent tools mapping
  router.get('/agents/:agentKey/tools', async (req, res) => {
    try {
      const { agentKey } = req.params;
      const r = await pool.query(`SELECT * FROM agent_tools WHERE agent_key = $1 ORDER BY position ASC`, [agentKey]);
      res.json(r.rows);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.get('/agents/:agentKey/tools/:id', async (req, res) => {
    try {
      const { agentKey, id } = req.params;
      const r = await pool.query(`SELECT * FROM agent_tools WHERE agent_key = $1 AND id = $2`, [agentKey, id]);
      if (r.rowCount === 0) return res.status(404).json({ error: 'Tool not found' });
      res.json(r.rows[0]);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.post('/agents/:agentKey/tools', async (req, res) => {
    try {
      const { agentKey } = req.params;
      const { tool_key, alias = null, enabled = true, position = 0, arg_defaults = {}, arg_templates = {}, guardrails = {}, overrides = {}, tenant_id = null, locale = null, function_name = null, function_description = null, function_parameters = null, parameter_mapping = null } = req.body || {};
      const r = await pool.query(
        `INSERT INTO agent_tools (agent_key, tool_key, alias, enabled, position, arg_defaults, arg_templates, guardrails, overrides, tenant_id, locale, function_name, function_description, function_parameters, parameter_mapping)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::uuid, $11, $12, $13, $14::jsonb, $15::jsonb)
         RETURNING id`,
        [agentKey, tool_key, alias, enabled, position, arg_defaults, arg_templates, guardrails, overrides, tenant_id, locale, function_name, function_description, function_parameters, parameter_mapping]
      );
      res.json({ id: r.rows[0].id });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.put('/agents/:agentKey/tools/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body || {};
      const fields: string[] = [];
      const vals: any[] = [];
      let i = 1;
      for (const [k, v] of Object.entries(body)) {
        const cast = (k === 'arg_defaults' || k === 'arg_templates' || k === 'guardrails' || k === 'overrides' || k === 'function_parameters' || k === 'parameter_mapping') ? '::jsonb' : (k === 'tenant_id' ? '::uuid' : '');
        fields.push(`${k} = $${i++}${cast}`);
        vals.push(v);
      }
      if (fields.length === 0) return res.json({ ok: true });
      const sql = `UPDATE agent_tools SET ${fields.join(', ')}, version = version + 1, updated_at = now() WHERE id = $${i} RETURNING id`;
      vals.push(id);
      const r = await pool.query(sql, vals);
      res.json({ id: r.rows[0]?.id });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.delete('/agents/:agentKey/tools/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const r = await pool.query(`DELETE FROM agent_tools WHERE id = $1 RETURNING id`, [id]);
      res.json({ id: r.rows[0]?.id });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Tool registry basic endpoints
  router.get('/tool-registry', async (_req, res) => {
    try {
      const r = await pool.query(`SELECT * FROM tool_registry WHERE is_enabled = true ORDER BY category, name`);
      res.json(r.rows);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.post('/tool-registry', async (req, res) => {
    try {
      const { tool_key, name, category, runtime, handler_key, input_schema = {}, output_schema = null, default_settings = {}, permissions = {}, is_enabled = true } = req.body || {};
      if (!tool_key || !name || !category || !runtime || !handler_key) return res.status(400).json({ error: 'tool_key, name, category, runtime, handler_key required' });
      const r = await pool.query(
        `INSERT INTO tool_registry (tool_key, name, category, runtime, handler_key, input_schema, output_schema, default_settings, permissions, is_enabled)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10)
         ON CONFLICT (tool_key) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, runtime = EXCLUDED.runtime, handler_key = EXCLUDED.handler_key, input_schema = EXCLUDED.input_schema, output_schema = EXCLUDED.output_schema, default_settings = EXCLUDED.default_settings, permissions = EXCLUDED.permissions, is_enabled = EXCLUDED.is_enabled, version = tool_registry.version + 1, updated_at = now()
         RETURNING tool_key` ,
        [tool_key, name, category, runtime, handler_key, input_schema, output_schema, default_settings, permissions, is_enabled]
      );
      res.json({ tool_key: r.rows[0]?.tool_key });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.put('/tool-registry/:toolKey', async (req, res) => {
    try {
      const { toolKey } = req.params;
      const body = req.body || {};
      const fields: string[] = [];
      const vals: any[] = [];
      let i = 1;
      for (const [k, v] of Object.entries(body)) {
        const cast = (k === 'input_schema' || k === 'output_schema' || k === 'default_settings' || k === 'permissions') ? '::jsonb' : '';
        fields.push(`${k} = $${i++}${cast}`);
        vals.push(v);
      }
      if (fields.length === 0) return res.json({ ok: true });
      const sql = `UPDATE tool_registry SET ${fields.join(', ')}, version = version + 1, updated_at = now() WHERE tool_key = $${i} RETURNING tool_key`;
      vals.push(toolKey);
      const r = await pool.query(sql, vals);
      res.json({ tool_key: r.rows[0]?.tool_key });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.delete('/tool-registry/:toolKey', async (req, res) => {
    try {
      const { toolKey } = req.params;
      const r = await pool.query(`DELETE FROM tool_registry WHERE tool_key = $1 RETURNING tool_key`, [toolKey]);
      res.json({ tool_key: r.rows[0]?.tool_key });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Agent prompts endpoints
  router.get('/agents/:agentKey/prompts', async (req, res) => {
    try {
      const { agentKey } = req.params;
      const { category, intent, style, locale, tenantId } = req.query as Record<string, string | undefined>;
      const q: any[] = [agentKey];
      const where: string[] = ['agent_key = $1'];
      let i = 2;
      if (category) { where.push(`category = $${i++}`); q.push(category); }
      if (intent) { where.push(`intent = $${i++}`); q.push(intent); }
      if (style) { where.push(`style = $${i++}`); q.push(style); }
      if (locale) { where.push(`locale = $${i++}`); q.push(locale); }
      if (tenantId === '-') { where.push(`tenant_id IS NULL`); }
      else if (tenantId) { where.push(`tenant_id = $${i++}`); q.push(tenantId); }
      const sql = `SELECT id, agent_key, category, intent, style, locale, content, metadata, version, is_published, created_at, updated_at
                   FROM agent_prompts
                   WHERE ${where.join(' AND ')}
                   ORDER BY is_published DESC, updated_at DESC`;
      const r = await pool.query(sql, q);
      res.json(r.rows);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.post('/agents/:agentKey/prompts', async (req, res) => {
    try {
      const { agentKey } = req.params;
      const { category, intent, style, locale = 'en', content, metadata = {}, tenantId = null, createdBy } = req.body || {};
      if (!agentKey || !category || !content) return res.status(400).json({ error: 'agentKey, category, content required' });
      const sql = `INSERT INTO agent_prompts (tenant_id, agent_key, category, intent, style, locale, content, metadata, is_published, created_by, updated_by)
                   VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8::jsonb, false, $9, $9)
                   RETURNING id`;
      const r = await pool.query(sql, [tenantId, agentKey, category, intent ?? null, style ?? null, locale, content, metadata, createdBy ?? null]);
      res.json({ id: r.rows[0].id });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.put('/agents/:agentKey/prompts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { content, metadata, locale, intent, style, updatedBy } = req.body || {};
      const fields: string[] = [];
      const vals: any[] = [];
      let i = 1;
      if (content !== undefined) { fields.push(`content = $${i++}`); vals.push(content); }
      if (metadata !== undefined) { fields.push(`metadata = $${i++}::jsonb`); vals.push(metadata); }
      if (locale !== undefined) { fields.push(`locale = $${i++}`); vals.push(locale); }
      if (intent !== undefined) { fields.push(`intent = $${i++}`); vals.push(intent); }
      if (style !== undefined) { fields.push(`style = $${i++}`); vals.push(style); }
      if (updatedBy !== undefined) { fields.push(`updated_by = $${i++}`); vals.push(updatedBy); }
      fields.push(`updated_at = now()`);
      const sql = `UPDATE agent_prompts SET ${fields.join(', ')} WHERE id = $${i} RETURNING id`;
      vals.push(id);
      const r = await pool.query(sql, vals);
      res.json({ id: r.rows[0]?.id });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.put('/agents/:agentKey/prompts/:id/publish', async (req, res) => {
    try {
      const { id, agentKey } = { ...req.params } as any;
      // Unpublish existing active in the same key tuple and bump version on the published row
      const row = await pool.query(`SELECT tenant_id, agent_key, category, COALESCE(intent,'-') intent, COALESCE(style,'-') style, locale FROM agent_prompts WHERE id = $1`, [id]);
      if (row.rowCount === 0) return res.status(404).json({ error: 'not found' });
      const r0 = row.rows[0];
      await pool.query(
        `UPDATE agent_prompts SET is_published = false
         WHERE (COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000') = COALESCE($1::uuid,'00000000-0000-0000-0000-000000000000'))
           AND agent_key = $2 AND category = $3 AND COALESCE(intent,'-') = $4 AND COALESCE(style,'-') = $5 AND locale = $6`,
        [r0.tenant_id, r0.agent_key, r0.category, r0.intent, r0.style, r0.locale]
      );
      const updated = await pool.query(`UPDATE agent_prompts SET is_published = true, version = version + 1, updated_at = now() WHERE id = $1 RETURNING id, version`, [id]);
      // Invalidate cache and respond
      const { promptService } = await import('../../services/promptService');
      promptService.invalidateCache(agentKey);
      res.json({ id: updated.rows[0].id, version: updated.rows[0].version });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.put('/agents/:agentKey/prompts/:id/unpublish', async (req, res) => {
    try {
      const { id, agentKey } = { ...req.params } as any;
      const r = await pool.query(`UPDATE agent_prompts SET is_published = false, updated_at = now() WHERE id = $1 RETURNING id`, [id]);
      const { promptService } = await import('../../services/promptService');
      promptService.invalidateCache(agentKey);
      res.json({ id: r.rows[0]?.id });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  router.delete('/agents/:agentKey/prompts/:id', async (req, res) => {
    try {
      const { id, agentKey } = { ...req.params } as any;
      const r = await pool.query(`DELETE FROM agent_prompts WHERE id = $1 RETURNING id`, [id]);
      if (r.rowCount === 0) {
        return res.status(404).json({ error: 'Prompt not found' });
      }
      const { promptService } = await import('../../services/promptService');
      promptService.invalidateCache(agentKey);
      res.json({ id: r.rows[0]?.id, deleted: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}


