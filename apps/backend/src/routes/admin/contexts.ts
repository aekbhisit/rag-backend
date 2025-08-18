import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { ContextsRepository } from '../../repositories/contextsRepository';
import { createEmbedding } from '../../adapters/ai/embeddingClient';
import { indexContextDocument } from '../../adapters/search/indexService';
import { ensureContextsVectorColumns, extractLatLon } from '../../adapters/db/vectorSchema';
import { TenantsRepository } from '../../repositories/tenantsRepository';
import { getPostgresPool } from '../../adapters/db/postgresClient';
import { QueryLogsRepository } from '../../repositories/queryLogsRepository';

const CreateContextSchema = z.object({
  type: z.enum(['place', 'website', 'ticket', 'document', 'text']).default('text'),
  title: z.string().min(1),
  body: z.string().min(1),
  instruction: z.string().optional(),
  attributes: z.record(z.unknown()).default({}),
  trust_level: z.number().int().min(0).max(10).default(0),
  language: z.string().optional(),
  status: z.string().optional(),
  // Accept keywords as array or comma-separated text; normalize to array
  keywords: z.union([z.array(z.string()), z.string()]).default([]).transform((v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
    return [] as string[];
  }),
  categories: z.array(z.string()).optional(),
  intent_scopes: z.array(z.string()).optional(),
  intent_actions: z.array(z.string()).optional(),
});

type CreateContext = z.infer<typeof CreateContextSchema>;

const mockStore: Array<any> = [];

export function buildContextsRouter(pool?: Pool) {
  const useMock = process.env.USE_MOCK_DATA === 'true' || process.env.SKIP_ADAPTERS_INIT === 'true';
  const repo = pool ? new ContextsRepository(pool) : null;
  const tenantsRepo = new TenantsRepository(getPostgresPool());
  const logsRepo = new QueryLogsRepository(getPostgresPool());
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const page = Math.max(Number(req.query.page || 1), 1);
      const size = Math.min(Math.max(Number(req.query.size || 20), 1), 200);
      const offset = (page - 1) * size;
      if (useMock || !repo) {
        const filtered = q
          ? mockStore.filter(x => x.title?.toLowerCase().includes(q.toLowerCase()) || x.body?.toLowerCase().includes(q.toLowerCase()))
          : mockStore;
        const pageItems = filtered.slice(offset, offset + size);
        return res.json({ items: pageItems, total: filtered.length, page, size });
      }
      const items = await repo.list(tenantId, { limit: size, offset, query: q });
      // total count
      const { rows } = await (repo as any).pool.query(
        `SELECT COUNT(*)::int AS cnt FROM contexts WHERE tenant_id=$1` + (q ? ` AND (title ILIKE $2 OR body ILIKE $2)` : ``),
        q ? [tenantId, `%${q}%`] : [tenantId]
      );
      const total = (rows[0]?.cnt as number) || 0;
      res.json({ items, total, page, size });
    } catch (e) { next(e); }
  });

  router.post('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const input: CreateContext = CreateContextSchema.parse(req.body);
      if (useMock || !repo) {
        const now = new Date().toISOString();
        const item = { id: randomUUID(), tenant_id: tenantId, created_at: now, updated_at: now, ...input };
        mockStore.unshift(item);
        // Best-effort embedding + indexing in mock mode
        try {
          const tenant = await tenantsRepo.get(tenantId);
          const settings: any = tenant?.settings || {};
          const ai = settings.ai || {};
          const embSettings = ai.embedding || {};
          const provider = (embSettings.provider || '').toLowerCase() === 'openai' ? 'openai' : (process.env.EMBEDDING_PROVIDER === 'openai' ? 'openai' : 'none');
          const targetDim = Number(process.env.EMBEDDING_DIM || '1536');
          const keywords = Array.isArray((req.body as any)?.keywords) ? (req.body as any).keywords : [];
          const emb = await createEmbedding({ title: input.title, body: input.body, keywords }, {
            provider,
            apiKey: (ai.providers?.[embSettings.provider?.toLowerCase?.() || 'openai']?.apiKey) || process.env.OPENAI_API_KEY,
            model: embSettings.model || process.env.OPENAI_EMBEDDING_MODEL,
            targetDim,
            metadata: { tenant_id: tenantId },
          });
          await indexContextDocument({
            tenant_id: tenantId,
            context_id: item.id,
            type: input.type,
            title: input.title,
            body: input.body,
            keywords,
            embedding: emb.vector,
            trust_level: input.trust_level,
            language: input.language,
            attributes: input.attributes,
          });
        } catch {}
        return res.status(201).json(item);
      }
      const created = await repo.create(tenantId, input as any);
      // Ensure DB has vector and geo columns
      await ensureContextsVectorColumns(getPostgresPool(), Number(process.env.EMBEDDING_DIM || '1536'));
      // Audit: context create
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'CREATE',
          resource: 'context',
          resourceId: created.id,
          details: `Created context ${created.title}`,
          request: { body: req.body },
          response: { id: created.id },
        });
      } catch {}
      // Create embedding from combined fields and index into OpenSearch
      const keywords = Array.isArray((req.body as any)?.keywords)
        ? (req.body as any).keywords
        : (typeof (req.body as any)?.keywords === 'string'
            ? (req.body as any).keywords.split(',').map((s: string) => s.trim()).filter(Boolean)
            : []);
      const tenant = await tenantsRepo.get(tenantId);
      const settings: any = tenant?.settings || {};
      const ai = settings.ai || {};
      const embSettings = ai.embedding || {};
      const provider = (embSettings.provider || '').toLowerCase() === 'openai' ? 'openai' : (process.env.EMBEDDING_PROVIDER === 'openai' ? 'openai' : 'none');
      const targetDim = Number(process.env.EMBEDDING_DIM || '1536');
      const emb = await createEmbedding({ title: created.title, body: created.body, keywords }, {
        provider,
        apiKey: (ai.providers?.[embSettings.provider?.toLowerCase?.() || 'openai']?.apiKey) || process.env.OPENAI_API_KEY,
        model: embSettings.model || process.env.OPENAI_EMBEDDING_MODEL,
        targetDim,
        metadata: { tenant_id: tenantId, context_id: created.id },
      });
      // Persist embedding and geo into Postgres
      try {
        const { lat, lon } = extractLatLon(created.attributes as any);
        const pool = getPostgresPool();
        const vectorLiteral = `[${emb.vector.map((n: number) => Number(n)).join(',')}]`;
        await pool.query(
          `UPDATE contexts SET embedding = $3::vector, latitude = $4, longitude = $5 WHERE tenant_id=$1 AND id=$2`,
          [tenantId, created.id, vectorLiteral, lat, lon]
        );
      } catch {}
      res.status(201).json(created);
    } catch (e) { next(e); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      if (useMock || !repo) {
        const item = mockStore.find(x => x.id === id);
        if (!item) return res.status(404).json({ message: 'Not found' });
        return res.json(item);
      }
      const item = await repo.get(tenantId, id);
      if (!item) return res.status(404).json({ message: 'Not found' });
      // Fetch edit history with tenant RLS context
      const pool: any = repo as any;
      const client = await pool.pool.connect();
      try {
        await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
        const { rows: history } = await client.query(
          `SELECT id, tenant_id, context_id, user_email, action, field, old_value, new_value, description, created_at
           FROM context_edit_history WHERE tenant_id=$1 AND context_id=$2 ORDER BY created_at DESC LIMIT 100`,
          [tenantId, id]
        );
        return res.json({ ...item, _edit_history: history });
      } finally {
        client.release();
      }
    } catch (e) { next(e); }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      const PatchSchema = CreateContextSchema.partial();
      const patch = PatchSchema.parse(req.body);
      if (useMock || !repo) {
        const idx = mockStore.findIndex(x => x.id === id);
        if (idx === -1) return res.status(404).json({ message: 'Not found' });
        mockStore[idx] = { ...mockStore[idx], ...patch, updated_at: new Date().toISOString() };
        // Re-embed and re-index after update
        try {
          const tenant = await tenantsRepo.get(tenantId);
          const embSettings = tenant?.settings?.aiModel?.embedding || {};
          const provider = embSettings.provider === 'openai' ? 'openai' : (process.env.EMBEDDING_PROVIDER === 'openai' ? 'openai' : 'none');
          const targetDim = Number(process.env.EMBEDDING_DIM || '1024');
          const keywords = Array.isArray((req.body as any)?.keywords) ? (req.body as any).keywords : [];
          const emb = await createEmbedding({ title: mockStore[idx].title, body: mockStore[idx].body, keywords }, {
            provider,
            apiKey: embSettings.apiKey || process.env.OPENAI_API_KEY,
            model: embSettings.model || process.env.OPENAI_EMBEDDING_MODEL,
            targetDim,
          });
          await indexContextDocument({
            tenant_id: tenantId,
            context_id: mockStore[idx].id,
            type: mockStore[idx].type,
            title: mockStore[idx].title,
            instruction: mockStore[idx].instruction,
            body: mockStore[idx].body,
            keywords,
            status: (req.body as any)?.status || mockStore[idx].status,
            embedding: emb.vector,
            trust_level: mockStore[idx].trust_level,
            language: mockStore[idx].language,
            attributes: mockStore[idx].attributes,
            created_at: mockStore[idx].created_at,
            updated_at: mockStore[idx].updated_at,
          });
        } catch {}
        return res.json(mockStore[idx]);
      }
      const updated = await repo.update(tenantId, id, patch as any);
      if (!updated) return res.status(404).json({ message: 'Not found' });
      // Audit: context update
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'UPDATE',
          resource: 'context',
          resourceId: id,
          details: `Updated context ${updated.title}`,
          request: { body: req.body },
          response: { id },
        });
      } catch {}
      // Re-embed and re-index after update
      try {
        const tenant = await tenantsRepo.get(tenantId);
        const settings: any = tenant?.settings || {};
        const ai = settings.ai || {};
        const embSettings = ai.embedding || {};
        const provider = (embSettings.provider || '').toLowerCase() === 'openai' ? 'openai' : (process.env.EMBEDDING_PROVIDER === 'openai' ? 'openai' : 'none');
        const targetDim = Number(process.env.EMBEDDING_DIM || '1536');
        const keywords = Array.isArray((req.body as any)?.keywords)
          ? (req.body as any).keywords
          : (typeof (req.body as any)?.keywords === 'string'
              ? (req.body as any).keywords.split(',').map((s: string) => s.trim()).filter(Boolean)
              : []);
        const emb = await createEmbedding({ title: updated.title, body: updated.body, keywords }, {
          provider,
          apiKey: (ai.providers?.[embSettings.provider?.toLowerCase?.() || 'openai']?.apiKey) || process.env.OPENAI_API_KEY,
          model: embSettings.model || process.env.OPENAI_EMBEDDING_MODEL,
          targetDim,
        });
        try {
          const { lat, lon } = extractLatLon(updated.attributes as any);
          const pool = getPostgresPool();
          const vectorLiteral = `[${emb.vector.map((n: number) => Number(n)).join(',')}]`;
          await pool.query(
            `UPDATE contexts SET embedding = $3::vector, latitude = $4, longitude = $5 WHERE tenant_id=$1 AND id=$2`,
            [tenantId, updated.id, vectorLiteral, lat, lon]
          );
        } catch {}
      } catch {}
      res.json(updated);
    } catch (e) { next(e); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      if (useMock || !repo) {
        const idx = mockStore.findIndex(x => x.id === id);
        if (idx >= 0) mockStore.splice(idx, 1);
        return res.status(204).end();
      }
      await repo.delete(tenantId, id);
      // Audit: context delete
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'DELETE',
          resource: 'context',
          resourceId: id,
          details: `Deleted context ${id}`,
          request: { params: req.params },
          response: { id },
        });
      } catch {}
      res.status(204).end();
    } catch (e) { next(e); }
  });

  return router;
}


