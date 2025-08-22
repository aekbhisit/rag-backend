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

  // Import a context with full fields including optional embedding vector
  router.post('/import', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const ImportSchema = CreateContextSchema.extend({
        id: z.string().uuid().optional(),
        embedding: z.array(z.number()).min(2).optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
      });
      const input = ImportSchema.parse(req.body) as any;
      const now = new Date().toISOString();

      if (useMock || !repo) {
        const item = {
          id: input.id || randomUUID(),
          tenant_id: tenantId,
          created_at: input.created_at || now,
          updated_at: input.updated_at || now,
          ...input,
        };
        mockStore.unshift(item);
        // Best-effort index when embedding provided
        try {
          const keywords = Array.isArray((req.body as any)?.keywords)
            ? (req.body as any).keywords
            : (typeof (req.body as any)?.keywords === 'string'
                ? (req.body as any).keywords.split(',').map((s: string) => s.trim()).filter(Boolean)
                : []);
          if (Array.isArray(input.embedding)) {
            await indexContextDocument({
              tenant_id: tenantId,
              context_id: item.id,
              type: item.type,
              title: item.title,
              body: item.body,
              instruction: item.instruction,
              keywords,
              status: item.status,
              embedding: input.embedding,
              trust_level: item.trust_level,
              language: item.language,
              attributes: item.attributes,
              created_at: item.created_at,
              updated_at: item.updated_at,
            });
          }
        } catch {}
        return res.status(201).json(item);
      }

      // Persist without embedding first
      const { embedding, latitude, longitude, id: providedId, created_at, updated_at, ...rest } = input as any;
      const created = await repo.create(tenantId, rest);

      // Ensure DB vector columns exist
      await ensureContextsVectorColumns(getPostgresPool(), Number(process.env.EMBEDDING_DIM || '1536'));

      // Audit: context import
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'IMPORT',
          resource: 'context',
          resourceId: created.id,
          details: `Imported context ${created.title}`,
          request: { body: req.body },
          response: { id: created.id },
        });
      } catch {}

      const keywords = Array.isArray((req.body as any)?.keywords)
        ? (req.body as any).keywords
        : (typeof (req.body as any)?.keywords === 'string'
            ? (req.body as any).keywords.split(',').map((s: string) => s.trim()).filter(Boolean)
            : []);

      let usedEmbedding: number[] | null = null;
      if (Array.isArray(embedding) && embedding.length > 0) {
        usedEmbedding = embedding.map((n: number) => Number(n));
      } else {
        // Fallback: create embedding
        try {
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
          usedEmbedding = emb.vector as number[];
        } catch {}
      }

      // Index embedding if available
      try {
        if (usedEmbedding) {
          await indexContextDocument({
            tenant_id: tenantId,
            context_id: created.id,
            type: created.type,
            title: created.title,
            instruction: created.instruction,
            body: created.body,
            keywords,
            embedding: usedEmbedding,
            trust_level: created.trust_level,
            language: created.language,
            attributes: created.attributes,
            created_at: created.created_at,
            updated_at: created.updated_at,
          });
          const pool = getPostgresPool();
          const vectorLiteral = `[${usedEmbedding.map((n: number) => Number(n)).join(',')}]`;
          await pool.query(
            `UPDATE contexts SET embedding = $3::vector WHERE tenant_id=$1 AND id=$2`,
            [tenantId, created.id, vectorLiteral]
          );
        }
      } catch {}

      // Persist geo coordinates regardless of embedding presence
      try {
        const pool = getPostgresPool();
        const { lat, lon } = typeof latitude === 'number' && typeof longitude === 'number'
          ? { lat: latitude, lon: longitude }
          : extractLatLon(created.attributes as any);
        await pool.query(
          `UPDATE contexts SET latitude = $3, longitude = $4 WHERE tenant_id=$1 AND id=$2`,
          [tenantId, created.id, lat, lon]
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
            // status: (req.body as any)?.status || mockStore[idx].status, // Status not supported in Context type
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

  // Duplicate a context by id (copy all fields and relations)
  router.post('/:id/duplicate', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      if (useMock || !repo) {
        const src = mockStore.find(x => x.id === id);
        if (!src) return res.status(404).json({ message: 'Not found' });
        const now = new Date().toISOString();
        const dup = { ...src, id: randomUUID(), title: `${src.title} (copy)`, created_at: now, updated_at: now };
        mockStore.unshift(dup);
        return res.status(201).json(dup);
      }

      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
        const { rows: srcRows } = await client.query(
          `SELECT type, title, body, instruction, attributes, trust_level, language, status, keywords, embedding, latitude, longitude
           FROM contexts WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
          [tenantId, id]
        );
        const src = srcRows[0];
        if (!src) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Not found' }); }
        const newId = randomUUID();
        const title = `${src.title} (copy)`;
        // Insert duplicate with same vector/geo
        await client.query(
          `INSERT INTO contexts (id, tenant_id, type, title, body, instruction, attributes, trust_level, language, status, keywords, embedding, latitude, longitude)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [newId, tenantId, src.type, title, src.body, src.instruction ?? null, src.attributes, src.trust_level, src.language ?? null, src.status ?? 'active', src.keywords || [], src.embedding ?? null, src.latitude ?? null, src.longitude ?? null]
        );
        // Copy relations
        await client.query(
          `INSERT INTO context_categories (tenant_id, context_id, category_id)
           SELECT tenant_id, $2, category_id FROM context_categories WHERE tenant_id=$1 AND context_id=$3`,
          [tenantId, newId, id]
        );
        await client.query(
          `INSERT INTO context_intent_scopes (tenant_id, context_id, scope_id)
           SELECT tenant_id, $2, scope_id FROM context_intent_scopes WHERE tenant_id=$1 AND context_id=$3`,
          [tenantId, newId, id]
        );
        await client.query(
          `INSERT INTO context_intent_actions (tenant_id, context_id, action_id)
           SELECT tenant_id, $2, action_id FROM context_intent_actions WHERE tenant_id=$1 AND context_id=$3`,
          [tenantId, newId, id]
        );
        await client.query('COMMIT');

        // Audit: context duplicate
        try {
          await logsRepo.create(tenantId, {
            userId: (req as any).userId || null,
            action: 'CREATE',
            resource: 'context',
            resourceId: newId,
            details: `Duplicated context ${id} -> ${title}`,
            request: { params: req.params },
            response: { id: newId },
          });
        } catch {}

        // Return minimal fields
        const { rows } = await pool.query(
          `SELECT id, tenant_id, type, title, body, instruction, attributes, trust_level, language, status, keywords, created_at, updated_at
           FROM contexts WHERE tenant_id=$1 AND id=$2`,
          [tenantId, newId]
        );
        return res.status(201).json(rows[0]);
      } catch (e) {
        try { await (e as any).code ? null : null; } catch {}
        try { await (await getPostgresPool().connect()).query('ROLLBACK'); } catch {}
        throw e;
      } finally {
        try { client.release(); } catch {}
      }
    } catch (e) { next(e); }
  });

  // Create embeddings for contexts missing embedding
  router.post('/embedding/missing', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const pool = getPostgresPool();
      await ensureContextsVectorColumns(pool, Number(process.env.EMBEDDING_DIM || '1536'));
      // Load tenant AI settings
      const tenant = await tenantsRepo.get(tenantId);
      const settings: any = tenant?.settings || {};
      const ai = settings.ai || {};
      const embSettings = ai.embedding || {};
      const provider = (embSettings.provider || '').toLowerCase() === 'openai' ? 'openai' : (process.env.EMBEDDING_PROVIDER === 'openai' ? 'openai' : 'none');
      const targetDim = Number(process.env.EMBEDDING_DIM || '1536');

      const { rows } = await pool.query(
        `SELECT id, type, title, body, instruction, attributes, trust_level, language, status, keywords
         FROM contexts WHERE tenant_id=$1 AND embedding IS NULL ORDER BY updated_at DESC LIMIT 10000`,
        [tenantId]
      );
      let updated = 0;
      for (const r of rows) {
        try {
          const keywords = Array.isArray(r.keywords) ? r.keywords : [];
          const emb = await createEmbedding({ title: r.title, body: r.body, keywords }, {
            provider,
            apiKey: (ai.providers?.[embSettings.provider?.toLowerCase?.() || 'openai']?.apiKey) || process.env.OPENAI_API_KEY,
            model: embSettings.model || process.env.OPENAI_EMBEDDING_MODEL,
            targetDim,
            metadata: { tenant_id: tenantId, context_id: r.id },
          });
          const { lat, lon } = extractLatLon(r.attributes as any);
          const vectorLiteral = `[${emb.vector.map((n: number) => Number(n)).join(',')}]`;
          await pool.query(
            `UPDATE contexts SET embedding = $3::vector, latitude = $4, longitude = $5, updated_at=now() WHERE tenant_id=$1 AND id=$2`,
            [tenantId, r.id, vectorLiteral, lat, lon]
          );
          try {
            await indexContextDocument({
              tenant_id: tenantId,
              context_id: r.id,
              type: r.type,
              title: r.title,
              instruction: r.instruction,
              body: r.body,
              keywords,
              status: r.status,
              embedding: emb.vector,
              trust_level: r.trust_level,
              language: r.language,
              attributes: r.attributes,
            });
          } catch {}
          updated += 1;
        } catch {}
      }
      res.json({ updated, total_missing: rows.length });
    } catch (e) { next(e); }
  });

  // Re-embed all contexts
  router.post('/embedding/rebuild', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const pool = getPostgresPool();
      await ensureContextsVectorColumns(pool, Number(process.env.EMBEDDING_DIM || '1536'));
      const tenant = await tenantsRepo.get(tenantId);
      const settings: any = tenant?.settings || {};
      const ai = settings.ai || {};
      const embSettings = ai.embedding || {};
      const provider = (embSettings.provider || '').toLowerCase() === 'openai' ? 'openai' : (process.env.EMBEDDING_PROVIDER === 'openai' ? 'openai' : 'none');
      const targetDim = Number(process.env.EMBEDDING_DIM || '1536');

      const { rows } = await pool.query(
        `SELECT id, type, title, body, instruction, attributes, trust_level, language, status, keywords
         FROM contexts WHERE tenant_id=$1 ORDER BY updated_at DESC LIMIT 20000`,
        [tenantId]
      );
      let updated = 0;
      for (const r of rows) {
        try {
          const keywords = Array.isArray(r.keywords) ? r.keywords : [];
          const emb = await createEmbedding({ title: r.title, body: r.body, keywords }, {
            provider,
            apiKey: (ai.providers?.[embSettings.provider?.toLowerCase?.() || 'openai']?.apiKey) || process.env.OPENAI_API_KEY,
            model: embSettings.model || process.env.OPENAI_EMBEDDING_MODEL,
            targetDim,
            metadata: { tenant_id: tenantId, context_id: r.id },
          });
          const { lat, lon } = extractLatLon(r.attributes as any);
          const vectorLiteral = `[${emb.vector.map((n: number) => Number(n)).join(',')}]`;
          await pool.query(
            `UPDATE contexts SET embedding = $3::vector, latitude = $4, longitude = $5, updated_at=now() WHERE tenant_id=$1 AND id=$2`,
            [tenantId, r.id, vectorLiteral, lat, lon]
          );
          try {
            await indexContextDocument({
              tenant_id: tenantId,
              context_id: r.id,
              type: r.type,
              title: r.title,
              instruction: r.instruction,
              body: r.body,
              keywords,
              status: r.status,
              embedding: emb.vector,
              trust_level: r.trust_level,
              language: r.language,
              attributes: r.attributes,
            });
          } catch {}
          updated += 1;
        } catch {}
      }
      res.json({ updated, total: rows.length });
    } catch (e) { next(e); }
  });

  return router;
}


