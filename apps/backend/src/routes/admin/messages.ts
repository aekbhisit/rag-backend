import { Router } from 'express';
import type { Pool } from 'pg';
import { getPostgresPool } from '../../adapters/db/postgresClient';
import { MessagesRepository } from '../../repositories/messagesRepository';
import { MessagePromptsRepository } from '../../repositories/messagePromptsRepository';
import { ToolCallsRepository } from '../../repositories/toolCallsRepository';
import { CitationsRepository } from '../../repositories/citationsRepository';
import { getTenantIdFromReq } from '../../config/tenant';

export function buildMessagesRouter(_pool: Pool) {
  const router = Router();
  const msgRepo = new MessagesRepository(getPostgresPool());
  const promptsRepo = new MessagePromptsRepository(getPostgresPool());
  const toolsRepo = new ToolCallsRepository(getPostgresPool());
  const citesRepo = new CitationsRepository(getPostgresPool());

  router.post('/', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const body = req.body || {};
      const required = ['session_id','role','type'];
      for (const k of required) if (!body[k]) return res.status(400).json({ error: `Missing ${k}` });
      const row = await msgRepo.create({
        tenant_id: tenantId,
        session_id: body.session_id,
        role: body.role,
        type: body.type,
        content: body.content,
        content_tokens: body.content_tokens,
        response_tokens: body.response_tokens,
        total_tokens: body.total_tokens,
        model: body.model,
        latency_ms: body.latency_ms,
        meta: body.meta,
      } as any);
      return res.status(201).json(row);
    } catch (e) { next(e); }
  });

  router.post('/:id/prompt', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { template, params, tools_declared } = req.body || {};
      if (!template) return res.status(400).json({ error: 'Missing template' });
      const row = await promptsRepo.create({ tenant_id: tenantId, message_id: id, template, params, tools_declared });
      return res.status(201).json(row);
    } catch (e) { next(e); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const row = await msgRepo.getById(tenantId, id);
      if (!row) return res.status(404).json({ message: 'Not found' });
      return res.json(row);
    } catch (e) { next(e); }
  });

  router.get('/:id/prompt', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const row = await promptsRepo.getByMessage(tenantId, id);
      if (!row) return res.status(404).json({ message: 'Not found' });
      return res.json(row);
    } catch (e) { next(e); }
  });

  router.get('/:id/tool-calls', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const rows = await toolsRepo.listByMessage(tenantId, id);
      return res.json({ items: rows });
    } catch (e) { next(e); }
  });

  router.post('/:id/tool-calls', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { tool_name, arguments: args, result, status, error, started_at, ended_at, duration_ms } = req.body || {};
      if (!tool_name) return res.status(400).json({ error: 'Missing tool_name' });
      const { rows } = await (toolsRepo as any).pool.query(
        `INSERT INTO tool_calls (tenant_id, message_id, tool_name, arguments, result, status, error, started_at, ended_at, duration_ms)
         VALUES ($1,$2,$3,COALESCE($4,'{}'::jsonb),$5,COALESCE($6,'success'),$7,$8,$9,$10)
         RETURNING *`,
        [tenantId, id, tool_name, args ?? {}, result ?? null, status ?? 'success', error ?? null, started_at ?? null, ended_at ?? null, duration_ms ?? null]
      );
      return res.status(201).json(rows[0]);
    } catch (e) { next(e); }
  });

  router.get('/:id/citations', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const rows = await citesRepo.listByMessage(tenantId, id);
      return res.json({ items: rows });
    } catch (e) { next(e); }
  });

  router.post('/:id/citations', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { chunk_id, source_type, source_uri, score, highlight, metadata } = req.body || {};
      if (!chunk_id || !source_type) return res.status(400).json({ error: 'Missing chunk_id/source_type' });
      const { rows } = await (citesRepo as any).pool.query(
        `INSERT INTO rag_citations (tenant_id, message_id, chunk_id, source_type, source_uri, score, highlight, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'{}'::jsonb))
         RETURNING *`,
        [tenantId, id, chunk_id, source_type, source_uri ?? null, score ?? null, highlight ?? null, metadata ?? {}]
      );
      return res.status(201).json(rows[0]);
    } catch (e) { next(e); }
  });

  return router;
}


