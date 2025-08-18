import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'pg';
import { createEmbedding } from '../../adapters/ai/embeddingClient';
import { TenantsRepository } from '../../repositories/tenantsRepository';
import { getPostgresPool } from '../../adapters/db/postgresClient';

const BaseRetrieveSchema = z.object({
  conversation_history: z.string().optional(),
  text_query: z.string().min(1),
  simantic_query: z.string().optional(),
  intent_scope: z.string().optional(),
  intent_action: z.string().optional(),
  category: z.string().optional(),
  top_k: z.number().int().min(1).max(20).default(3),
  min_score: z.number().min(0).max(1).default(0.5),
  fulltext_weight: z.number().min(0).max(1).default(0.5),
  semantic_weight: z.number().min(0).max(1).default(0.5),
  response_format: z.enum(['default', 'verbose']).default('default'),
  prompt_key: z.string().optional(),
  prompt_params: z.record(z.any()).nullish(),
});

export function buildPublicRetrieveRouter() {
  const router = Router();
  const tenantsRepo = new TenantsRepository(getPostgresPool());
  const pool: Pool = getPostgresPool() as any;

  async function getGeneratingConfig(tenantId: string) {
    let tenant: any = null;
    try { tenant = await tenantsRepo.get(tenantId); } catch { tenant = null; }
    const ai: any = tenant?.settings?.ai || {};
    const genCfg: any = ai.generating || {};
    const provider: string = (genCfg.provider || 'openai').toLowerCase();
    const model: string = genCfg.model || process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
    const providerKey: string | undefined = ai?.providers?.[provider]?.apiKey || (provider === 'openai' ? process.env.OPENAI_API_KEY : undefined);
    const gen = {
      maxTokens: typeof genCfg.maxTokens === 'number' ? genCfg.maxTokens : 512,
      temperature: typeof genCfg.temperature === 'number' ? genCfg.temperature : 0.2,
      provider,
    };
    return { apiKey: providerKey, model, gen } as const;
  }

  // 1) Raw contexts search with filters + pagination
  router.get('/contexts', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const type = typeof req.query.type === 'string' ? req.query.type : undefined;
      const scope = typeof req.query.intent_scope === 'string' ? req.query.intent_scope : undefined;
      const action = typeof req.query.intent_action === 'string' ? req.query.intent_action : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const page = Number(req.query.page || 1);
      const pageSize = Math.min(Math.max(Number(req.query.page_size || 10), 1), 100);
      const from = (page - 1) * pageSize;

      const params: any[] = [tenantId];
      let where = 'tenant_id = $1';
      if (type) { params.push(type); where += ` AND type = $${params.length}`; }
      if (status) { params.push(status); where += ` AND status = $${params.length}`; }
      if (scope) { params.push(scope); where += ` AND $${params.length} = ANY(intent_scopes)`; }
      if (action) { params.push(action); where += ` AND $${params.length} = ANY(intent_actions)`; }
      if (q) { params.push(`%${q}%`); const i = params.length; where += ` AND (title ILIKE $${i} OR body ILIKE $${i})`; }
      params.push(pageSize); params.push(from);
      const { rows } = await pool.query(
        `SELECT id, tenant_id, type, title, body, instruction, attributes, trust_level, status, keywords, language, created_at, updated_at
         FROM contexts WHERE ${where}
         ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
        params
      );
      res.json({ items: rows, total: rows.length, page, page_size: pageSize });
    } catch (_e) {
      return res.json({
        answer: '',
        answer_status: false,
        answer_sources: [],
        context_sources: [],
        meta: {
          rag_request_log_id: null,
          embedding: { provider: 'none', model: 'fallback', usage: { prompt_tokens: 0, total_tokens: 0 }, cost: { input_usd: null, output_usd: null, total_usd: null, currency: 'USD' }, latency_ms: 0, ai_usage_log_id: null },
          generating: { provider: 'openai', model: undefined, usage: { prompt_tokens: 0, cached_input_tokens: 0, completion_tokens: 0, total_tokens: 0 }, cost: { input_usd: null, output_usd: null, total_usd: null, currency: 'USD' }, latency_ms: 0, ai_usage_log_id: null }
        }
      });
    }
  });

  // 1.1) Get single context by id (public)
  router.get('/contexts/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { rows } = await pool.query(
        `SELECT id, tenant_id, type, title, body, instruction, attributes, trust_level, status, keywords, language, created_at, updated_at
         FROM contexts WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
        [tenantId, id]
      );
      const row = rows[0];
      if (!row) return res.status(404).json({ message: 'Not found' });
      return res.json(row);
    } catch (e: any) {
      const msg = e?.message || 'unexpected';
      const stack = typeof e?.stack === 'string' ? e.stack : undefined;
      return res.status(200).json({
        answer: '',
        answer_status: false,
        answer_sources: [],
        context_sources: [],
        meta: {
          rag_request_log_id: null,
          error: { message: msg, stack },
          embedding: { provider: 'none', model: 'fallback', usage: { prompt_tokens: 0, total_tokens: 0 }, cost: { input_usd: null, output_usd: null, total_usd: null, currency: 'USD' }, latency_ms: 0, ai_usage_log_id: null },
          generating: { provider: 'openai', model: undefined, usage: { prompt_tokens: 0, cached_input_tokens: 0, completion_tokens: 0, total_tokens: 0 }, cost: { input_usd: null, output_usd: null, total_usd: null, currency: 'USD' }, latency_ms: 0, ai_usage_log_id: null }
        }
      });
    }
  });

  async function knnRetrieve(
    tenantId: string,
    text: string,
    filters: { scope?: string; action?: string; category?: string },
    topK: number,
    weights: { fulltextWeight: number; semanticWeight: number },
    minScore: number
  ) {
    let tenant: any = null;
    try { tenant = await tenantsRepo.get(tenantId); } catch { tenant = null; }
    const ai: any = tenant?.settings?.ai || {};
    const embCfg: any = ai.embedding || {};
    const provider: string = (embCfg.provider || (process.env.EMBEDDING_PROVIDER || 'openai')).toLowerCase();
    const model: string = embCfg.model || process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    const targetDim = Number(embCfg.dimensions || process.env.EMBEDDING_DIM || '1024');
    const apiKey: string | undefined = ai?.providers?.[provider]?.apiKey || (provider === 'openai' ? process.env.OPENAI_API_KEY : undefined);
    const providerOpt: 'openai' | 'none' = (provider === 'openai' && apiKey) ? 'openai' : 'none';
    const emb = await createEmbedding(
      { title: '', body: text },
      { provider: providerOpt, apiKey, model, targetDim, metadata: { tenant_id: tenantId } }
    );
    const vectorLiteral = `[${emb.vector.map((n: number) => Number(n)).join(',')}]`;
    // Build vector SQL and params with filters
    const vecParams: any[] = [tenantId, vectorLiteral];
    const vecWhere: string[] = ['tenant_id = $1'];
    let vecIdx = vecParams.length;
    if (filters.scope) {
      vecParams.push(filters.scope); vecIdx += 1;
      vecWhere.push(`$${vecIdx} = ANY(intent_scopes)`);
    }
    if (filters.action) {
      vecParams.push(filters.action); vecIdx += 1;
      vecWhere.push(`$${vecIdx} = ANY(intent_actions)`);
    }
    if (filters.category) {
      vecParams.push(filters.category); vecIdx += 1;
      vecParams.push(`%${filters.category}%`); vecIdx += 1;
      vecWhere.push(`EXISTS (
        SELECT 1 FROM context_categories cc
        JOIN categories c ON c.id = cc.category_id
        WHERE cc.context_id = contexts.id AND cc.tenant_id = $1 AND (c.slug = $${vecIdx - 1} OR c.name ILIKE $${vecIdx})
      )`);
    }
    const vectorSql = `
      SELECT id, title, body, instruction, 1 - (embedding <=> $2::vector) AS vec_score
      FROM contexts
      WHERE ${vecWhere.join(' AND ')} AND embedding IS NOT NULL
      ORDER BY embedding <-> $2::vector
      LIMIT ${Math.max(2 * 10, topK * 2)}
    `;

    // Build FTS SQL and params with filters
    const ftsParams: any[] = [tenantId, text];
    const ftsWhere: string[] = ['tenant_id = $1'];
    let ftsIdx = ftsParams.length;
    if (filters.scope) {
      ftsParams.push(filters.scope); ftsIdx += 1;
      ftsWhere.push(`$${ftsIdx} = ANY(intent_scopes)`);
    }
    if (filters.action) {
      ftsParams.push(filters.action); ftsIdx += 1;
      ftsWhere.push(`$${ftsIdx} = ANY(intent_actions)`);
    }
    if (filters.category) {
      ftsParams.push(filters.category); ftsIdx += 1;
      ftsParams.push(`%${filters.category}%`); ftsIdx += 1;
      ftsWhere.push(`EXISTS (
        SELECT 1 FROM context_categories cc
        JOIN categories c ON c.id = cc.category_id
        WHERE cc.context_id = contexts.id AND cc.tenant_id = $1 AND (c.slug = $${ftsIdx - 1} OR c.name ILIKE $${ftsIdx})
      )`);
    }
    const ftsSql = `
      SELECT id, title, body, instruction,
             ts_rank_cd(
               setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
               setweight(to_tsvector('simple', coalesce(body,'')), 'B')
             , plainto_tsquery('simple', $2)) AS fts_score
      FROM contexts
      WHERE ${ftsWhere.join(' AND ')}
      ORDER BY fts_score DESC
      LIMIT ${Math.max(2 * 10, topK * 2)}
    `;

    // Execute vector and FTS queries with safety; if FTS fails, proceed with vector-only
    const map = new Map<string, { id: string; title: string; body: string; instruction?: string; vec_score?: number; fts_score?: number }>();
    // Use a dedicated client to ensure session-local settings (RLS)
    const client = await pool.connect();
    try {
      await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
    } catch { /* ignore */ }

    let maxVec = 0;
    try {
      const vecRes = await client.query(vectorSql, vecParams);
      for (const r of vecRes.rows) {
        const vs = Number(r.vec_score) || 0;
        if (vs > maxVec) maxVec = vs;
        map.set(r.id, { id: r.id, title: r.title, body: r.body, instruction: r.instruction, vec_score: vs });
      }
    } catch (_e) {
      // ignore vector query errors
    }
    let maxFts = 0;
    try {
      const ftsRes = await client.query(ftsSql, ftsParams);
      for (const r of ftsRes.rows) {
        const fs = Number(r.fts_score) || 0;
        if (fs > maxFts) maxFts = fs;
        const prev = map.get(r.id) || { id: r.id, title: r.title, body: r.body, instruction: r.instruction } as any;
        prev.fts_score = fs;
        map.set(r.id, prev);
      }
    } catch (_e) {
      // ignore FTS errors (e.g., unaccent extension missing)
    }

    // Combine scores with weights, normalize, filter by minScore
    const fullW = Math.max(0, Number(weights.fulltextWeight || 0));
    const semW = Math.max(0, Number(weights.semanticWeight || 0));
    const sumW = fullW + semW || 1;
    let hits = Array.from(map.values()).map((r) => {
      const vecNorm = maxVec > 0 ? (Number(r.vec_score || 0) / maxVec) : Number(r.vec_score || 0);
      const ftsNorm = maxFts > 0 ? (Number(r.fts_score || 0) / maxFts) : Number(r.fts_score || 0);
      const score = (semW * vecNorm + fullW * ftsNorm) / sumW;
      return { id: r.id, title: r.title, body: r.body, instruction: r.instruction, score };
    })
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

    // Fallback: if no hits from vector/FTS, do a simple LIKE search on title/body/keywords
    if (!hits.length) {
      const likeParams: any[] = [tenantId, `%${text}%`];
      const likeWhere: string[] = ['tenant_id = $1', `(title ILIKE $2 OR body ILIKE $2)`];
      let likeIdx = likeParams.length;
      if (filters.scope) { likeParams.push(filters.scope); likeIdx += 1; likeWhere.push(`$${likeIdx} = ANY(intent_scopes)`); }
      if (filters.action) { likeParams.push(filters.action); likeIdx += 1; likeWhere.push(`$${likeIdx} = ANY(intent_actions)`); }
      if (filters.category) {
        likeParams.push(filters.category); likeIdx += 1;
        likeParams.push(`%${filters.category}%`); likeIdx += 1;
        likeWhere.push(`EXISTS (SELECT 1 FROM context_categories cc JOIN categories c ON c.id=cc.category_id WHERE cc.context_id=contexts.id AND cc.tenant_id=$1 AND (c.slug=$${likeIdx-1} OR c.name ILIKE $${likeIdx}))`);
      }
      try {
        const likeSql = `SELECT id, title, body, instruction FROM contexts WHERE ${likeWhere.join(' AND ')} ORDER BY updated_at DESC LIMIT ${topK}`;
        const { rows } = await client.query(likeSql, likeParams);
        hits = rows.map((r: any) => ({ id: r.id, title: r.title, body: r.body, instruction: r.instruction, score: 1 }));
      } catch { /* ignore */ }
    }

    // Deep fallback: generate 2–4 char n-grams from text for languages without spaces (e.g., Thai)
    if (!hits.length && typeof text === 'string' && text.length >= 2) {
      const chars = Array.from(text).filter(ch => /\p{L}/u.test(ch));
      const grams = new Set<string>();
      for (let n = 4; n >= 2; n--) {
        for (let i = 0; i <= chars.length - n; i++) {
          grams.add(chars.slice(i, i + n).join(''));
          if (grams.size > 8) break;
        }
        if (grams.size > 8) break;
      }
      if (grams.size) {
        const gramList = Array.from(grams);
        const params: any[] = [tenantId];
        const where: string[] = ['tenant_id = $1'];
        gramList.forEach((g, idx) => {
          params.push(`%${g}%`);
          const p = params.length;
          where.push(`(title ILIKE $${p} OR body ILIKE $${p})`);
        });
        // apply filters
        if (filters.scope) { params.push(filters.scope); where.push(`$${params.length} = ANY(intent_scopes)`); }
        if (filters.action) { params.push(filters.action); where.push(`$${params.length} = ANY(intent_actions)`); }
        if (filters.category) {
          params.push(filters.category);
          params.push(`%${filters.category}%`);
          const pSlug = params.length - 1;
          const pName = params.length;
          where.push(`EXISTS (SELECT 1 FROM context_categories cc JOIN categories c ON c.id=cc.category_id WHERE cc.context_id=contexts.id AND cc.tenant_id=$1 AND (c.slug=$${pSlug} OR c.name ILIKE $${pName}))`);
        }
        try {
          const sql = `SELECT id, title, body, instruction FROM contexts WHERE ${where.join(' OR ')} ORDER BY updated_at DESC LIMIT ${topK}`;
          const { rows } = await client.query(sql, params);
          if (rows.length) hits = rows.map((r: any) => ({ id: r.id, title: r.title, body: r.body, instruction: r.instruction, score: 1 }));
        } catch { /* ignore */ }
      }
    }

    // Final fallback: return latest contexts for tenant to avoid empty result when data exists
    if (!hits.length) {
      try {
        const { rows } = await client.query(`SELECT id, title, body, instruction FROM contexts WHERE tenant_id=$1 ORDER BY updated_at DESC LIMIT ${topK}`, [tenantId]);
        hits = rows.map((r: any) => ({ id: r.id, title: r.title, body: r.body, instruction: r.instruction, score: 0.5 }));
      } catch { /* ignore */ }
    }

    try { client.release(); } catch {}

    // expose embedding usage id and usage tokens if available
    let embeddingUsageId = (emb as any)?.usage_id as (string | undefined);
    const embeddingUsage = (emb as any)?.usage as ({ promptTokens?: number; totalTokens?: number } | undefined);
    const embeddingLatencyMs = (emb as any)?.latencyMs as (number | undefined);
    let embeddingCost = (emb as any)?.cost as ( { input_usd?: number | null; output_usd?: number | null; total_usd?: number | null; currency?: string | null } | undefined );
    // Ensure an ai_usage log exists for embedding even if provider fallback skipped logging
    if (!embeddingUsageId) {
      try {
        const nowIso = new Date().toISOString();
        let pricingSnap: any = { input_per_1k: null, output_per_1k: null, total_per_1k: null, version: null, source: null };
        let costSnap: any = { input_usd: null, output_usd: null, total_usd: null, currency: 'USD', source: null };
        try {
          const { AiPricingRepository } = await import('../../repositories/aiPricingRepository.js');
          const { getPostgresPool } = await import('../../adapters/db/postgresClient.js');
          const prRepo = new AiPricingRepository(getPostgresPool());
          const pr = await prRepo.findByModel(tenantId, 'openai', model || 'text-embedding-3-small');
          if (pr) {
            pricingSnap = { input_per_1k: pr.input_per_1k ?? null, output_per_1k: pr.output_per_1k ?? null, total_per_1k: pr.embedding_per_1k ?? null, version: pr.version || null, source: 'tenant' };
            const totalTok = (embeddingUsage?.totalTokens as number) || 0;
            const cTotal = pr.embedding_per_1k ? (totalTok / 1000) * pr.embedding_per_1k : 0;
            costSnap = { input_usd: null, output_usd: null, total_usd: pr.embedding_per_1k ? cTotal : null, currency: pr.currency || 'USD', source: 'computed' };
          }
        } catch {}
        const { indexAiUsage } = await import('../../adapters/search/aiUsageLogService.js');
        const id = await indexAiUsage({
          tenant_id: tenantId,
          operation: 'embedding',
          provider: providerOpt,
          model,
          start_time: nowIso,
          end_time: nowIso,
          latency_ms: embeddingLatencyMs ?? 0,
          usage: {
            input_tokens: embeddingUsage?.promptTokens ?? 0,
            output_tokens: 0,
            total_tokens: embeddingUsage?.totalTokens ?? 0,
          },
          cost: costSnap,
          pricing: pricingSnap,
          imported_at: nowIso,
        } as any);
        if (id) embeddingUsageId = id;
        if (costSnap) embeddingCost = costSnap;
      } catch {}
    }
    return { hits, embeddingUsageId, embeddingUsage, embeddingLatencyMs, embeddingCost, embeddingProvider: providerOpt, embeddingModel: model } as const;
  }

  function applyPromptTemplate(
    template: string,
    query: string,
    contexts: Array<{ id: string; title: string; body: string; instruction?: string }>,
    conversation?: any[],
    extraParams?: Record<string, unknown>
  ): string {
    const contextText = contexts
      .map((c, i) => `[#${i + 1}] id: ${c.id}
Title: ${c.title}
Instruction: ${c.instruction || ''}
Body:
${c.body}`)
      .join('\n\n');
    const turns = Array.isArray(conversation)
      ? conversation.filter((t: any) => t != null && (typeof t === 'string' || typeof t === 'object'))
      : (typeof conversation === 'string' && String(conversation).trim().length > 0 ? [String(conversation)] : []);
    const conv = turns.length
      ? turns.map((t: any) => {
          if (typeof t === 'string') return `- user: ${t}`;
          const role = (t && typeof t === 'object' && (t as any).role) ? (t as any).role : 'user';
          const content: any = (t && typeof t === 'object') ? (t as any).content : '';
          const text = typeof content === 'string' ? content : JSON.stringify(content ?? '');
          return `- ${role}: ${text}`;
        }).join('\n')
      : '';
    const replacements: Record<string, string> = {
      query,
      text_query: query,
      contexts: contextText,
      conversation: conv,
    };
    if (extraParams && typeof extraParams === 'object') {
      for (const [k, v] of Object.entries(extraParams)) {
        if (typeof k === 'string' && k.length > 0) {
          try {
            replacements[k] = typeof v === 'string' ? v : JSON.stringify(v);
          } catch {
            replacements[k] = String(v);
          }
        }
      }
    }
    let out = template;
    for (const [k, v] of Object.entries(replacements)) {
      out = out.replaceAll(`{${k}}`, v ?? '');
    }
    return out;
  }

  function buildContextOnlyBlock(
    contexts: Array<{ id: string; title: string; body: string; instruction?: string }>
  ): string {
    return contexts
      .map((c, i) => `[#${i + 1}] id: ${c.id}
Title: ${c.title}
Instruction: ${c.instruction || ''}
Body:
${c.body}`)
      .join('\n\n');
  }

  function ensurePromptHasContexts(prompt: string, contexts: Array<{ id: string; title: string; body: string; instruction?: string }>): string {
    if (contexts.length === 0) return prompt;
    const hasContextContent = /\[#\d+\]|Body:\s|Title:\s/i.test(prompt);
    if (hasContextContent) return prompt;
    const ctxBlock = buildContextOnlyBlock(contexts);
    return `${prompt}\n\nContext:\n${ctxBlock}`;
  }

  function buildPromptDefault(
    query: string,
    contexts: Array<{ id: string; title: string; body: string; instruction?: string }>,
    conversation?: any[]
  ) {
    const contextText = contexts
      .map((c, i) => `[#${i + 1}] id: ${c.id}
Title: ${c.title}
Instruction: ${c.instruction || ''}
Body:
${c.body}`)
      .join('\n\n');
    const turns = Array.isArray(conversation)
      ? conversation.filter((t: any) => t != null && (typeof t === 'string' || typeof t === 'object'))
      : [];
    const conv = turns.length
      ? `Conversation history (most recent last):\n${turns.map((t: any) => {
          if (typeof t === 'string') return `- user: ${t}`;
          const role = (t && typeof t === 'object' && (t as any).role) ? (t as any).role : 'user';
          const content: any = (t && typeof t === 'object') ? (t as any).content : '';
          const text = typeof content === 'string' ? content : JSON.stringify(content ?? '');
          return `- ${role}: ${text}`;
        }).join('\n')}`
      : '';
    return `You are a helpful assistant. Summarize and answer the user's question strictly using the provided context. Cite sources by [#index].

Question: ${query}

Context:
${contextText}

${conv}

Return a concise answer in English/Thai if applicable.`;
  }

  async function callSummaryModel(tenantId: string, prompt: string) {
    const { apiKey, model, gen } = await getGeneratingConfig(tenantId);
    if (!apiKey) {
      throw new Error('MISSING_SUMMARY_API_KEY');
    }
    const started = Date.now();
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You answer using only provided context and cite sources by [#index].' },
          { role: 'user', content: prompt }
        ],
        temperature: gen.temperature ?? 0.2,
        max_tokens: gen.maxTokens ?? 512,
      })
    });
    if (!res.ok) {
      throw new Error(`Summary model HTTP ${res.status}`);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const cachedTokens = data?.usage?.prompt_tokens_details?.cached_tokens as number | undefined;
    const usage = data?.usage ? { promptTokens: data.usage.prompt_tokens, cachedPromptTokens: cachedTokens, completionTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens } : undefined;
    const latency = Date.now() - started;
    return { text, latencyMs: latency, model, usage } as { text: string; latencyMs: number; model?: string; usage?: { promptTokens?: number; cachedPromptTokens?: number; completionTokens?: number; totalTokens?: number } };
  }

  // 2) RAG summary default (top 3)
  router.post('/rag/summary', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const input = BaseRetrieveSchema.parse(req.body || {});
      const { apiKey } = await getGeneratingConfig(tenantId);
      if (!apiKey) {
        // No generation key → do retrieval only and return no_answer with meta
        const combined = [input.text_query, input.simantic_query].filter(Boolean).join(' ');
        const { hits, embeddingUsageId, embeddingUsage, embeddingLatencyMs, embeddingCost, embeddingProvider, embeddingModel } = await knnRetrieve(
          tenantId,
          combined,
          { scope: input.intent_scope, action: input.intent_action, category: input.category },
          input.top_k,
          { fulltextWeight: input.fulltext_weight, semanticWeight: input.semantic_weight },
          input.min_score
        );
        return res.json({
          answer: '',
          answer_status: false,
          answer_sources: [],
          context_sources: hits.map(h => h.id),
          meta: {
            rag_request_log_id: null,
            embedding: { provider: embeddingProvider, model: embeddingModel, usage: { prompt_tokens: embeddingUsage?.promptTokens || 0, total_tokens: embeddingUsage?.totalTokens || 0 }, cost: embeddingCost, latency_ms: embeddingLatencyMs, ai_usage_log_id: embeddingUsageId || null },
            generating: { provider: 'openai', model: undefined, usage: { prompt_tokens: 0, cached_input_tokens: 0, completion_tokens: 0, total_tokens: 0 }, cost: { input_usd: null, output_usd: null, total_usd: null, currency: 'USD' }, latency_ms: 0, ai_usage_log_id: null }
          }
        });
      }
      const combined = [input.text_query, input.simantic_query].filter(Boolean).join(' ');
      const start = Date.now();
      const { hits, embeddingUsageId, embeddingUsage, embeddingLatencyMs, embeddingCost, embeddingProvider, embeddingModel } = await knnRetrieve(
        tenantId,
        combined,
        { scope: input.intent_scope, action: input.intent_action, category: input.category },
        input.top_k,
        { fulltextWeight: input.fulltext_weight, semanticWeight: input.semantic_weight },
        input.min_score
      );
      if (!hits || hits.length === 0) {
        return res.json({
          answer: '',
          answer_status: false,
          sources: [],
          context_sources: [],
          meta: {
            rag_request_log_id: undefined,
            generating_usage_id: undefined,
            embedding: { provider: embeddingProvider, model: embeddingModel, usage: { prompt_tokens: embeddingUsage?.promptTokens || 0, total_tokens: embeddingUsage?.totalTokens || 0 }, cost: embeddingCost, latency_ms: embeddingLatencyMs },
            generating: { provider: 'openai', model: undefined, usage: { prompt_tokens: 0, cached_input_tokens: 0, completion_tokens: 0, total_tokens: 0 }, cost: { input_usd: null, output_usd: null, total_usd: null, currency: 'USD' }, latency_ms: 0 }
          }
        });
      }
      // Select prompt: if key provided → use it; otherwise use tenant default prompt; fallback to built-in
      let prompt: string;
      let chosenPromptKey: string | undefined;
      if (input.prompt_key) {
        // Prefer DB prompt by key
        try {
          const { PromptsRepository } = await import('../../repositories/promptsRepository.js');
          const repo = new PromptsRepository(getPostgresPool());
          const dbPrompt = await repo.getByKey(tenantId, input.prompt_key);
          const tpl = dbPrompt?.template;
          if (tpl && tpl.trim().length > 0) {
            prompt = applyPromptTemplate(tpl, input.text_query, hits, input.conversation_history as any, { ...(input.prompt_params || {}), query: input.text_query, intent_scope: input.intent_scope, intent_action: input.intent_action, category: input.category });
            chosenPromptKey = dbPrompt?.key || input.prompt_key;
          } else {
            // Fallback to DB default prompt; if missing, use built-in
            const def = await repo.getDefault(tenantId);
            if (def?.template) {
              prompt = applyPromptTemplate(def.template, input.text_query, hits, input.conversation_history as any, { ...(input.prompt_params || {}), query: input.text_query, intent_scope: input.intent_scope, intent_action: input.intent_action, category: input.category });
              chosenPromptKey = def.key;
            } else {
              prompt = buildPromptDefault(input.text_query, hits, input.conversation_history as any);
              chosenPromptKey = undefined;
            }
          }
        } catch {
          prompt = buildPromptDefault(input.text_query, hits, input.conversation_history as any);
        }
      } else {
        // Use tenant default prompt if configured; otherwise fallback to default builder
        try {
          const { PromptsRepository } = await import('../../repositories/promptsRepository.js');
          const repo = new PromptsRepository(getPostgresPool());
          const def = await repo.getDefault(tenantId);
          if (def?.template) {
            prompt = applyPromptTemplate(def.template, input.text_query, hits, input.conversation_history as any, { ...(input.prompt_params || {}), query: input.text_query, intent_scope: input.intent_scope, intent_action: input.intent_action, category: input.category });
            chosenPromptKey = def.key;
          } else {
            prompt = buildPromptDefault(input.text_query, hits, input.conversation_history as any);
            chosenPromptKey = undefined;
          }
        } catch {
          prompt = buildPromptDefault(input.text_query, hits, input.conversation_history as any);
        }
      }
      prompt = ensurePromptHasContexts(prompt, hits);
      const usedContextIds = hits.map(h => h.id);
      let text = '';
      let latencyMs = 0;
      let model: string | undefined = undefined;
      let usage: { promptTokens?: number; cachedPromptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined = undefined;
      try {
        const r = await callSummaryModel(tenantId, prompt);
        text = r.text;
        latencyMs = r.latencyMs;
        model = r.model;
        usage = r.usage;
      } catch (_e) {
        return res.json({
          answer: '',
          answer_status: false,
          answer_sources: [],
          context_sources: usedContextIds,
          meta: {
            rag_request_log_id: null,
            embedding: { provider: embeddingProvider, model: embeddingModel, usage: { prompt_tokens: embeddingUsage?.promptTokens || 0, total_tokens: embeddingUsage?.totalTokens || 0 }, cost: embeddingCost, latency_ms: embeddingLatencyMs, ai_usage_log_id: embeddingUsageId || null },
            generating: { provider: 'openai', model: undefined, usage: { prompt_tokens: 0, cached_input_tokens: 0, completion_tokens: 0, total_tokens: 0 }, cost: { input_usd: null, output_usd: null, total_usd: null, currency: 'USD' }, latency_ms: 0, ai_usage_log_id: null }
          }
        });
      }
      // Extract cited indices like [#1] from answer to determine answer sources
      const cited = new Set<number>();
      const re = /\[#(\d+)\]/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const idx = Number(m[1]);
        if (Number.isFinite(idx)) cited.add(idx);
      }
      let answerSourceIds: string[] = Array.from(cited)
        .map(i => hits[i - 1])
        .filter(Boolean)
        .map(h => h.id);
      // Ensure sources present when answer exists
      if ((!answerSourceIds || answerSourceIds.length === 0) && text && text.trim().length > 0) {
        answerSourceIds = usedContextIds;
      }
      let reqId: string | undefined;
      let genUsageId: string | undefined;
      try {
        const { StatsRepository } = await import('../../repositories/statsRepository.js');
        const stats = new StatsRepository(getPostgresPool());
        await stats.incrementContextUses(tenantId, answerSourceIds.length ? answerSourceIds : usedContextIds);
        await stats.incrementSummaryOutcome(tenantId, !!text && text.trim().length > 0);
        const { indexRagRequest } = await import('../../adapters/search/requestsLogService.js');
        const { indexAiUsage, setUsageRequestLink } = await import('../../adapters/search/aiUsageLogService.js');
        const { AiPricingRepository } = await import('../../repositories/aiPricingRepository.js');
        const { getPostgresPool: getPgPool } = await import('../../adapters/db/postgresClient.js');
        reqId = 'req_' + Math.random().toString(36).slice(2);
        await indexRagRequest({
          tenant_id: tenantId,
          id: reqId,
          endpoint: '/rag/summary',
          query: input.text_query,
          prompt_key: chosenPromptKey,
          prompt_params: input.prompt_params || undefined,
          prompt_text: prompt,
          model,
          answer_text: text,
          answer_status: !!text && text.trim().length > 0,
          contexts_used: answerSourceIds,
          intent_scope: input.intent_scope,
          intent_action: input.intent_action,
          intent_detail: undefined,
          latency_ms: latencyMs,
          request_body: req.body,
          embedding_usage_id: embeddingUsageId || null,
        });
        // Log AI usage for cost analytics
        const nowIso = new Date().toISOString();
        // Compute pricing snapshot and total cost if available
        let pricingSnap: any = { input_per_1k: null, cached_input_per_1k: null, output_per_1k: null, total_per_1k: null, version: null, source: null };
        let costSnap: any = { input_usd: null, output_usd: null, total_usd: null, currency: 'USD', source: null };
        try {
          const repo = new AiPricingRepository(getPgPool());
          const pr = await repo.findByModel(tenantId, 'openai', model || '');
          if (pr) {
            pricingSnap = { input_per_1k: pr.input_per_1k ?? null, cached_input_per_1k: (pr as any).cached_input_per_1k ?? null, output_per_1k: pr.output_per_1k ?? null, total_per_1k: pr.embedding_per_1k ?? null, version: pr.version || null, source: 'tenant' };
            const inTok = usage?.promptTokens ?? 0;
            const cachedTok = usage?.cachedPromptTokens ?? 0;
            const nonCachedTok = Math.max(0, inTok - cachedTok);
            const outTok = usage?.completionTokens ?? 0;
            const cIn = pr.input_per_1k ? (nonCachedTok / 1000) * pr.input_per_1k : 0;
            const cCached = (pr as any).cached_input_per_1k ? (cachedTok / 1000) * (pr as any).cached_input_per_1k : 0;
            const cOut = pr.output_per_1k ? (outTok / 1000) * pr.output_per_1k : 0;
            const total = (pr.input_per_1k || (pr as any).cached_input_per_1k) ? (cIn + cCached) : 0 + (pr.output_per_1k ? cOut : 0);
            costSnap = { input_usd: (pr.input_per_1k || (pr as any).cached_input_per_1k) ? (cIn + cCached) : null, output_usd: pr.output_per_1k ? cOut : null, total_usd: total, currency: pr.currency || 'USD', source: 'computed' };
          }
        } catch {}
        genUsageId = await indexAiUsage({
          tenant_id: tenantId,
          request_id: reqId!,
          operation: 'generate',
          provider: 'openai',
          model: model || undefined,
          endpoint: '/rag/summary',
          start_time: nowIso,
          end_time: nowIso,
          latency_ms: latencyMs,
          usage: {
            input_tokens: usage?.promptTokens ?? null,
            cached_input_tokens: usage?.cachedPromptTokens ?? null,
            output_tokens: usage?.completionTokens ?? null,
            total_tokens: usage?.totalTokens ?? null,
          },
          cost: costSnap,
          pricing: pricingSnap,
          context_ids: answerSourceIds,
          intent_scope: input.intent_scope || null,
          intent_action: input.intent_action || null,
          metadata: { prompt_key: input.prompt_key || null },
          imported_at: nowIso,
        });
        // Update request row with generating usage id and back-link embedding usage if available
        try {
          const { RequestsRepository } = await import('../../repositories/requestsRepository.js');
          const repoReq = new RequestsRepository(getPostgresPool());
          await repoReq.create({
            tenant_id: tenantId,
            id: reqId!,
            endpoint: '/rag/summary',
            query: input.text_query,
            prompt_key: chosenPromptKey,
            prompt_params: input.prompt_params || undefined,
            prompt_text: prompt,
            model,
            answer_text: text,
            answer_status: !!text && text.trim().length > 0,
            contexts_used: answerSourceIds,
            intent_scope: input.intent_scope,
            intent_action: input.intent_action,
            intent_detail: undefined,
            latency_ms: latencyMs,
            created_at: nowIso,
            request_body: req.body,
            embedding_usage_id: embeddingUsageId || null,
            generating_usage_id: genUsageId || null,
          } as any);
          if (embeddingUsageId && reqId) {
            await setUsageRequestLink(tenantId, embeddingUsageId, reqId);
          }
        } catch {}
      } catch {}
      res.json({
        answer: text,
        answer_status: !!text && text.trim().length > 0,
        answer_sources: answerSourceIds,
        context_sources: usedContextIds,
        meta: {
          rag_request_log_id: reqId || null,
          embedding: { provider: embeddingProvider, model: embeddingModel, usage: { prompt_tokens: embeddingUsage?.promptTokens || 0, total_tokens: embeddingUsage?.totalTokens || 0 }, cost: embeddingCost, latency_ms: embeddingLatencyMs, ai_usage_log_id: embeddingUsageId || null },
          generating: { provider: 'openai', model: model || undefined, usage: { prompt_tokens: usage?.promptTokens || 0, cached_input_tokens: usage?.cachedPromptTokens || 0, completion_tokens: usage?.completionTokens || 0, total_tokens: usage?.totalTokens || 0 }, latency_ms: latencyMs, ai_usage_log_id: genUsageId || null }
        }
      });
    } catch (e: any) {
      const msg = e?.message || 'unexpected';
      const stack = typeof e?.stack === 'string' ? e.stack : undefined;
      return res.status(200).json({ answer: '', answer_status: false, answer_sources: [], context_sources: [], meta: { rag_request_log_id: null, error: { message: msg, stack } } });
    }
  });

  // 3) RAG contexts endpoint: try summary; if not available, return raw contexts
  router.post('/rag/contexts', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const input = BaseRetrieveSchema.parse(req.body || {});
      const combined = [input.text_query, input.simantic_query].filter(Boolean).join(' ');
      const { hits, embeddingUsage, embeddingProvider, embeddingModel } = await knnRetrieve(
        tenantId,
        combined,
        { scope: input.intent_scope, action: input.intent_action, category: input.category },
        input.top_k,
        { fulltextWeight: input.fulltext_weight, semanticWeight: input.semantic_weight },
        input.min_score
      );
      let text = '';
      let latencyMs = 0;
      try {
      const { apiKey } = await getGeneratingConfig(tenantId);
        if (!apiKey) throw new Error('MISSING_SUMMARY_API_KEY');
      let prompt: string;
      if (input.prompt_key) {
        try {
          const { PromptsRepository } = await import('../../repositories/promptsRepository.js');
          const repo = new PromptsRepository(getPostgresPool());
          const dbPrompt = await repo.getByKey(tenantId, input.prompt_key);
          const tpl = dbPrompt?.template;
          if (tpl && tpl.trim().length > 0) {
              prompt = applyPromptTemplate(tpl, input.text_query, hits, input.conversation_history as any, { ...(input.prompt_params || {}), query: input.text_query, intent_scope: input.intent_scope, intent_action: input.intent_action, category: input.category });
          } else {
              let tenant: any = null; try { tenant = await tenantsRepo.get(tenantId); } catch { tenant = null; }
            const map = (tenant?.settings?.prompts || {}) as Record<string, string>;
            const stpl = map[input.prompt_key];
            prompt = (typeof stpl === 'string' && stpl.trim().length > 0)
                ? applyPromptTemplate(stpl, input.text_query, hits, input.conversation_history as any, input.prompt_params || {})
                : buildPromptDefault(input.text_query, hits, input.conversation_history as any);
          }
        } catch {
            prompt = buildPromptDefault(input.text_query, hits, input.conversation_history as any);
        }
      } else {
        try {
          const { PromptsRepository } = await import('../../repositories/promptsRepository.js');
          const repo = new PromptsRepository(getPostgresPool());
          const def = await repo.getDefault(tenantId);
          if (def?.template) {
              prompt = applyPromptTemplate(def.template, input.text_query, hits, input.conversation_history as any, { ...(input.prompt_params || {}), query: input.text_query, intent_scope: input.intent_scope, intent_action: input.intent_action, category: input.category });
          } else {
              prompt = buildPromptDefault(input.text_query, hits, input.conversation_history as any);
          }
        } catch {
            prompt = buildPromptDefault(input.text_query, hits, input.conversation_history as any);
        }
      }
      prompt = ensurePromptHasContexts(prompt, hits);
        const r = await callSummaryModel(tenantId, prompt);
        text = r.text;
        latencyMs = r.latencyMs;
      } catch {
        // fallthrough
      }
      if (!text) {
        return res.json({ answer_status: false, latency_ms: latencyMs, contexts: hits, meta: { provider: 'openai', embedding: { provider: embeddingProvider, model: embeddingModel } } });
      }
      res.json({ summary_text: text, answer_sources: hits.map((h, i) => ({ index: i + 1, context_id: h.id, title: h.title, snippet: (h.body || '').slice(0, 400) })), answer_status: true, latency_ms: latencyMs, meta: { embedding: { provider: embeddingProvider, model: embeddingModel } } });
    } catch (e: any) {
      const msg = e?.message || 'unexpected';
      const stack = typeof e?.stack === 'string' ? e.stack : undefined;
      return res.status(200).json({ answer_status: false, contexts: [], meta: { error: { message: msg, stack } } });
    }
  });

  const PlaceRetrieveSchema = BaseRetrieveSchema.extend({
    lat: z.number(),
    long: z.number(),
    max_distance_km: z.number().min(0).default(5),
    distance_weight: z.number().min(0).max(1).default(1),
  });

  async function placeRetrieve(
    tenantId: string,
    text: string,
    filters: { scope?: string; action?: string; category?: string },
    coords: { lat: number; long: number; maxKm: number },
    topK: number,
    weights: { fulltextWeight: number; semanticWeight: number; distanceWeight?: number },
    minScore: number
  ) {
    let tenant: any = null; try { tenant = await tenantsRepo.get(tenantId); } catch { tenant = null; }
    const ai: any = tenant?.settings?.ai || {};
    const embCfg: any = ai.embedding || {};
    const provider: string = (embCfg.provider || (process.env.EMBEDDING_PROVIDER || 'openai')).toLowerCase();
    const model: string = embCfg.model || process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    const targetDim = Number(embCfg.dimensions || process.env.EMBEDDING_DIM || '1024');
    const apiKey: string | undefined = ai?.providers?.[provider]?.apiKey || (provider === 'openai' ? process.env.OPENAI_API_KEY : undefined);
    const providerOpt: 'openai' | 'none' = (provider === 'openai' && apiKey) ? 'openai' : 'none';
    const emb = await createEmbedding(
      { title: '', body: text },
      { provider: providerOpt, apiKey, model, targetDim, metadata: { tenant_id: tenantId } }
    );
    const vectorLiteral = `[${emb.vector.map((n: number) => Number(n)).join(',')}]`;
    const vecParams: any[] = [tenantId, vectorLiteral];
    const vecWhere: string[] = ["tenant_id = $1", "type = 'place'", 'embedding IS NOT NULL', 'latitude IS NOT NULL', 'longitude IS NOT NULL'];
    let vecIdx = vecParams.length;
    if (filters.scope) { vecParams.push(filters.scope); vecIdx += 1; vecWhere.push(`$${vecIdx} = ANY(intent_scopes)`); }
    if (filters.action) { vecParams.push(filters.action); vecIdx += 1; vecWhere.push(`$${vecIdx} = ANY(intent_actions)`); }
    if (filters.category) {
      vecParams.push(filters.category); vecIdx += 1;
      vecParams.push(`%${filters.category}%`); vecIdx += 1;
      vecWhere.push(`EXISTS (SELECT 1 FROM context_categories cc JOIN categories c ON c.id = cc.category_id WHERE cc.context_id = contexts.id AND cc.tenant_id = $1 AND (c.slug = $${vecIdx-1} OR c.name ILIKE $${vecIdx}))`);
    }
    // Haversine distance in km
    const lat = coords.lat; const lon = coords.long; const maxKm = coords.maxKm;
    const distExpr = `(6371 * acos(least(1, cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lon})) + sin(radians(${lat})) * sin(radians(latitude)))))`;
    vecWhere.push(`${distExpr} <= ${Math.max(0.001, maxKm)}`);
    const vectorSql = `
      SELECT id, title, body, instruction, ${distExpr} AS distance_km, 1 - (embedding <=> $2::vector) AS vec_score
      FROM contexts
      WHERE ${vecWhere.join(' AND ')}
      ORDER BY embedding <-> $2::vector
      LIMIT ${Math.max(2 * 10, topK * 2)}
    `;

    const ftsParams: any[] = [tenantId, text];
    const ftsWhere: string[] = ["tenant_id = $1", "type = 'place'", 'latitude IS NOT NULL', 'longitude IS NOT NULL'];
    let ftsIdx = ftsParams.length;
    if (filters.scope) { ftsParams.push(filters.scope); ftsIdx += 1; ftsWhere.push(`$${ftsIdx} = ANY(intent_scopes)`); }
    if (filters.action) { ftsParams.push(filters.action); ftsIdx += 1; ftsWhere.push(`$${ftsIdx} = ANY(intent_actions)`); }
    if (filters.category) {
      ftsParams.push(filters.category); ftsIdx += 1;
      ftsParams.push(`%${filters.category}%`); ftsIdx += 1;
      ftsWhere.push(`EXISTS (SELECT 1 FROM context_categories cc JOIN categories c ON c.id = cc.category_id WHERE cc.context_id = contexts.id AND cc.tenant_id = $1 AND (c.slug = $${ftsIdx-1} OR c.name ILIKE $${ftsIdx}))`);
    }
    const ftsSql = `
      SELECT id, title, body, instruction, ${distExpr} AS distance_km,
             ts_rank_cd(
               setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
               setweight(to_tsvector('simple', coalesce(body,'')), 'B')
             , plainto_tsquery('simple', $2)) AS fts_score
      FROM contexts
      WHERE ${ftsWhere.join(' AND ')} AND ${distExpr} <= ${Math.max(0.001, maxKm)}
      ORDER BY fts_score DESC
      LIMIT ${Math.max(2 * 10, topK * 2)}
    `;

    const map = new Map<string, { id: string; title: string; body: string; instruction?: string; distance_km?: number; vec_score?: number; fts_score?: number }>();
    const client = await pool.connect();
    try { await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]); } catch {}
    let maxVec = 0; let maxFts = 0; let maxDist = 0;
    try {
      const vecRes = await client.query(vectorSql, vecParams);
      for (const r of vecRes.rows) {
        const vs = Number(r.vec_score) || 0; if (vs > maxVec) maxVec = vs;
        const dk = Number(r.distance_km) || 0; if (dk > maxDist) maxDist = Math.max(maxDist, dk);
        map.set(r.id, { id: r.id, title: r.title, body: r.body, instruction: r.instruction, distance_km: dk, vec_score: vs });
      }
    } catch {}
    try {
      const ftsRes = await client.query(ftsSql, ftsParams);
      for (const r of ftsRes.rows) {
        const fs = Number(r.fts_score) || 0; if (fs > maxFts) maxFts = fs;
        const dk = Number(r.distance_km) || 0; if (dk > maxDist) maxDist = Math.max(maxDist, dk);
        const prev = map.get(r.id) || { id: r.id, title: r.title, body: r.body, instruction: r.instruction, distance_km: dk } as any;
        prev.fts_score = fs; prev.distance_km = prev.distance_km ?? dk;
        map.set(r.id, prev);
      }
    } catch {}

    // Note: no fallback beyond max_distance_km; results are strictly limited by the provided radius.
    const fullW = Math.max(0, Number(weights.fulltextWeight || 0));
    const semW = Math.max(0, Number(weights.semanticWeight || 0));
    const distW = Math.max(0, Number(weights.distanceWeight ?? 1));
    const sumTextW = fullW + semW || 1;
    const sumAllW = fullW + semW + distW || 1;
    const scored = Array.from(map.values()).map((r) => {
      const vecNorm = maxVec > 0 ? (Number(r.vec_score || 0) / maxVec) : Number(r.vec_score || 0);
      const ftsNorm = maxFts > 0 ? (Number(r.fts_score || 0) / maxFts) : Number(r.fts_score || 0);
      const distRaw = Number(r.distance_km || 0);
      const distNorm = Math.max(0, 1 - Math.min(distRaw, maxKm) / Math.max(1e-6, maxKm));
      const textScore = (semW * vecNorm + fullW * ftsNorm) / sumTextW;
      const finalScore = (semW * vecNorm + fullW * ftsNorm + distW * distNorm) / sumAllW;
      return { id: r.id, title: r.title, body: r.body, instruction: r.instruction, text_score: textScore, score: finalScore, distance_km: distRaw };
    });
    let hits = scored
      .filter(r => r.text_score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    if (!hits.length) {
      // Fallback: ignore min_score; prioritize nearest by distance then score
      hits = scored
        .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0) || (b.score - a.score))
        .slice(0, topK);
    }

    let embeddingUsageId = (emb as any)?.usage_id as (string | undefined);
    const embeddingUsage = (emb as any)?.usage as ({ promptTokens?: number; totalTokens?: number } | undefined);
    const embeddingLatencyMs = (emb as any)?.latencyMs as (number | undefined);
    let embeddingCost = (emb as any)?.cost as ( { input_usd?: number | null; output_usd?: number | null; total_usd?: number | null; currency?: string | null } | undefined );
    if (!embeddingUsageId) {
      try {
        const nowIso = new Date().toISOString();
        let pricingSnap: any = { input_per_1k: null, output_per_1k: null, total_per_1k: null, version: null, source: null };
        let costSnap: any = { input_usd: null, output_usd: null, total_usd: null, currency: 'USD', source: null };
        try {
          const { AiPricingRepository } = await import('../../repositories/aiPricingRepository.js');
          const { getPostgresPool } = await import('../../adapters/db/postgresClient.js');
          const prRepo = new AiPricingRepository(getPostgresPool());
          const pr = await prRepo.findByModel(tenantId, 'openai', model || 'text-embedding-3-small');
          if (pr) {
            pricingSnap = { input_per_1k: pr.input_per_1k ?? null, output_per_1k: pr.output_per_1k ?? null, total_per_1k: pr.embedding_per_1k ?? null, version: pr.version || null, source: 'tenant' };
            const totalTok = (embeddingUsage?.totalTokens as number) || 0;
            const cTotal = pr.embedding_per_1k ? (totalTok / 1000) * pr.embedding_per_1k : 0;
            costSnap = { input_usd: null, output_usd: null, total_usd: pr.embedding_per_1k ? cTotal : null, currency: pr.currency || 'USD', source: 'computed' };
          }
        } catch {}
        const { indexAiUsage } = await import('../../adapters/search/aiUsageLogService.js');
        const id = await indexAiUsage({
          tenant_id: tenantId,
          operation: 'embedding',
          provider: providerOpt,
          model,
          start_time: nowIso,
          end_time: nowIso,
          latency_ms: embeddingLatencyMs ?? 0,
          usage: {
            input_tokens: embeddingUsage?.promptTokens ?? 0,
            output_tokens: 0,
            total_tokens: embeddingUsage?.totalTokens ?? 0,
          },
          cost: costSnap,
          pricing: pricingSnap,
          imported_at: nowIso,
        } as any);
        if (id) embeddingUsageId = id;
        if (costSnap) embeddingCost = costSnap;
      } catch {}
    }
    return { hits, embeddingUsageId, embeddingUsage, embeddingLatencyMs, embeddingCost, embeddingProvider: providerOpt, embeddingModel: model } as const;
  }

  // 3) RAG place search (nearby places with hybrid + distance)
  router.post('/rag/place', async (req, res) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const input = PlaceRetrieveSchema.parse(req.body || {});
      const combined = [input.text_query, input.simantic_query].filter(Boolean).join(' ');
      const { hits, embeddingUsageId, embeddingUsage, embeddingLatencyMs, embeddingCost, embeddingProvider, embeddingModel } = await placeRetrieve(
        tenantId,
        combined,
        { scope: input.intent_scope, action: input.intent_action, category: input.category },
        { lat: input.lat, long: input.long, maxKm: input.max_distance_km },
        input.top_k,
        { fulltextWeight: input.fulltext_weight, semanticWeight: input.semantic_weight, distanceWeight: input.distance_weight },
        input.min_score
      );
      const contexts = hits.map(h => ({ id: h.id, title: h.title, body: h.body, instruction: (h as any).instruction, score: h.score, distance_km: (h as any).distance_km }));
      const places = hits.map(h => ({ id: h.id, title: h.title, snippet: (h.body || '').slice(0, 200), distance_km: (h as any).distance_km, score: h.score }));
      let answer = '';
      let genLatency = 0;
      let genModel: string | undefined = undefined;
      let genUsage: { promptTokens?: number; cachedPromptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined = undefined;
      let genUsageId: string | undefined;
      let promptText: string | undefined;
      let chosenPromptKey: string | undefined;
      try {
        const { apiKey } = await getGeneratingConfig(tenantId);
        if (apiKey && hits.length) {
          // Prefer DB prompt template (explicit key or tenant default); fallback to a concise built-in
          try {
            const { PromptsRepository } = await import('../../repositories/promptsRepository.js');
            const repo = new PromptsRepository(getPostgresPool());
            if (input.prompt_key) {
              const dbPrompt = await repo.getByKey(tenantId, input.prompt_key);
              const tpl = dbPrompt?.template;
              if (tpl && tpl.trim().length > 0) {
                promptText = applyPromptTemplate(tpl, input.text_query, hits, input.conversation_history as any, {
                  ...(input.prompt_params || {}),
                  query: input.text_query,
                  text_query: input.text_query,
                  intent_scope: input.intent_scope,
                  intent_action: input.intent_action,
                  category: input.category,
                  lat: input.lat,
                  long: input.long,
                  max_distance_km: input.max_distance_km,
                  distance_weight: input.distance_weight,
                  top_k: input.top_k,
                  min_score: input.min_score,
                  fulltext_weight: input.fulltext_weight,
                  semantic_weight: input.semantic_weight,
                });
                chosenPromptKey = dbPrompt?.key || input.prompt_key;
              } else {
                const def = await repo.getDefault(tenantId);
                if (def?.template) {
                  promptText = applyPromptTemplate(def.template, input.text_query, hits, input.conversation_history as any, {
                    ...(input.prompt_params || {}),
                    query: input.text_query,
                    text_query: input.text_query,
                    intent_scope: input.intent_scope,
                    intent_action: input.intent_action,
                    category: input.category,
                    lat: input.lat,
                    long: input.long,
                    max_distance_km: input.max_distance_km,
                    distance_weight: input.distance_weight,
                    top_k: input.top_k,
                    min_score: input.min_score,
                    fulltext_weight: input.fulltext_weight,
                    semantic_weight: input.semantic_weight,
                  });
                  chosenPromptKey = def.key;
                }
              }
            } else {
              const def = await repo.getDefault(tenantId);
              if (def?.template) {
                promptText = applyPromptTemplate(def.template, input.text_query, hits, input.conversation_history as any, {
                  ...(input.prompt_params || {}),
                  query: input.text_query,
                  text_query: input.text_query,
                  intent_scope: input.intent_scope,
                  intent_action: input.intent_action,
                  category: input.category,
                  lat: input.lat,
                  long: input.long,
                  max_distance_km: input.max_distance_km,
                  distance_weight: input.distance_weight,
                  top_k: input.top_k,
                  min_score: input.min_score,
                  fulltext_weight: input.fulltext_weight,
                  semantic_weight: input.semantic_weight,
                });
                chosenPromptKey = def.key;
              }
            }
          } catch {}
          if (!promptText) {
            const ctxLines = hits.map((h, i) => `[#${i+1}] ${h.title} — distance_km: ${(h as any).distance_km?.toFixed(2)}`).join('\n');
            promptText = `You are a helpful assistant. The user is at latitude ${input.lat}, longitude ${input.long}.\n`+
              `Answer the user's question using only the provided place list and distances. If appropriate, provide approximate distance and whether it seems near or far. Cite sources by [#index].\n\n`+
              `Question: ${input.text_query}\n\nPlaces:\n${ctxLines}`;
          }
          const r = await callSummaryModel(tenantId, promptText);
          answer = r.text || '';
          genLatency = r.latencyMs;
          genModel = r.model;
          genUsage = r.usage;
          try {
            const { indexAiUsage } = await import('../../adapters/search/aiUsageLogService.js');
            const nowIso = new Date().toISOString();
            genUsageId = await indexAiUsage({
              tenant_id: tenantId,
              operation: 'generating',
              provider: 'openai',
              model: genModel,
              start_time: nowIso,
              end_time: nowIso,
              latency_ms: genLatency,
              usage: {
                input_tokens: genUsage?.promptTokens ?? 0,
                output_tokens: genUsage?.completionTokens ?? 0,
                total_tokens: genUsage?.totalTokens ?? 0,
              },
              cost: { input_usd: null, output_usd: null, total_usd: null, currency: 'USD' },
              pricing: { input_per_1k: null, output_per_1k: null, total_per_1k: null, version: null, source: null },
              imported_at: nowIso,
            } as any);
          } catch {}
        }
      } catch {}
      // Extract citations
      const cited = new Set<number>();
      if (answer) {
        const re = /\[#(\d+)\]/g; let m: RegExpExecArray | null;
        while ((m = re.exec(answer)) !== null) { const idx = Number(m[1]); if (Number.isFinite(idx)) cited.add(idx); }
      }
      let answerSourceIds: string[] = Array.from(cited).map(i => hits[i - 1]).filter(Boolean).map(h => h.id);
      if ((!answerSourceIds.length) && answer) answerSourceIds = hits.map(h => h.id);

      let reqId: string | undefined;
      try {
        const { indexRagRequest } = await import('../../adapters/search/requestsLogService.js');
        const { indexAiUsage, setUsageRequestLink } = await import('../../adapters/search/aiUsageLogService.js');
        const { RequestsRepository } = await import('../../repositories/requestsRepository.js');
        const { getPostgresPool: getPgPool } = await import('../../adapters/db/postgresClient.js');
        const nowIso = new Date().toISOString();
        reqId = 'req_' + Math.random().toString(36).slice(2);
        await indexRagRequest({
          tenant_id: tenantId,
          id: reqId,
          endpoint: '/rag/place',
          query: input.text_query,
          prompt_key: chosenPromptKey,
          prompt_params: input.prompt_params || undefined,
          prompt_text: promptText || '',
          model: genModel || '',
          answer_text: answer,
          answer_status: !!answer && answer.trim().length > 0,
          contexts_used: answerSourceIds,
          intent_scope: input.intent_scope,
          intent_action: input.intent_action,
          intent_detail: undefined,
          latency_ms: genLatency,
          request_body: req.body,
          embedding_usage_id: embeddingUsageId || null,
        });
        // Log generation usage if we generated an answer
        if (answer) {
          let pricingSnap: any = { input_per_1k: null, cached_input_per_1k: null, output_per_1k: null, total_per_1k: null, version: null, source: null };
          let costSnap: any = { input_usd: null, output_usd: null, total_usd: null, currency: 'USD', source: null };
          try {
            const { AiPricingRepository } = await import('../../repositories/aiPricingRepository.js');
            const repo = new AiPricingRepository(getPgPool());
            const pr = await repo.findByModel(tenantId, 'openai', genModel || '');
            if (pr) {
              pricingSnap = { input_per_1k: pr.input_per_1k ?? null, cached_input_per_1k: (pr as any).cached_input_per_1k ?? null, output_per_1k: pr.output_per_1k ?? null, total_per_1k: pr.embedding_per_1k ?? null, version: pr.version || null, source: 'tenant' };
              const inTok = genUsage?.promptTokens ?? 0;
              const cachedTok = genUsage?.cachedPromptTokens ?? 0;
              const nonCachedTok = Math.max(0, inTok - cachedTok);
              const outTok = genUsage?.completionTokens ?? 0;
              const cIn = pr.input_per_1k ? (nonCachedTok / 1000) * pr.input_per_1k : 0;
              const cCached = (pr as any).cached_input_per_1k ? (cachedTok / 1000) * (pr as any).cached_input_per_1k : 0;
              const cOut = pr.output_per_1k ? (outTok / 1000) * pr.output_per_1k : 0;
              const total = (pr.input_per_1k || (pr as any).cached_input_per_1k) ? (cIn + cCached) : 0 + (pr.output_per_1k ? cOut : 0);
              costSnap = { input_usd: (pr.input_per_1k || (pr as any).cached_input_per_1k) ? (cIn + cCached) : null, output_usd: pr.output_per_1k ? cOut : null, total_usd: total, currency: pr.currency || 'USD', source: 'computed' };
            }
          } catch {}
          const genId = await indexAiUsage({
            tenant_id: tenantId,
            request_id: reqId!,
            operation: 'generate',
            provider: 'openai',
            model: genModel || undefined,
            endpoint: '/rag/place',
            start_time: nowIso,
            end_time: nowIso,
            latency_ms: genLatency,
            usage: {
              input_tokens: genUsage?.promptTokens ?? null,
              cached_input_tokens: genUsage?.cachedPromptTokens ?? null,
              output_tokens: genUsage?.completionTokens ?? null,
              total_tokens: genUsage?.totalTokens ?? null,
            },
            cost: pricingSnap ? { input_usd: null, output_usd: null, total_usd: null, currency: 'USD' } : { input_usd: null, output_usd: null, total_usd: null, currency: 'USD' },
            pricing: pricingSnap,
            context_ids: answerSourceIds,
            intent_scope: input.intent_scope || null,
            intent_action: input.intent_action || null,
            metadata: { prompt_key: chosenPromptKey || null },
            imported_at: nowIso,
          } as any);
          try { if (embeddingUsageId && reqId) await setUsageRequestLink(tenantId, embeddingUsageId, reqId); } catch {}
        }
        try {
          const repoReq = new RequestsRepository(getPostgresPool());
          await repoReq.create({
            tenant_id: tenantId,
            id: reqId!,
            endpoint: '/rag/place',
            query: input.text_query,
            prompt_key: chosenPromptKey,
            prompt_params: input.prompt_params || undefined,
            prompt_text: promptText,
            model: genModel,
            answer_text: answer,
            answer_status: !!answer && answer.trim().length > 0,
            contexts_used: answerSourceIds,
            intent_scope: input.intent_scope,
            intent_action: input.intent_action,
            intent_detail: undefined,
            latency_ms: genLatency,
            created_at: nowIso,
            request_body: req.body,
            embedding_usage_id: embeddingUsageId || null,
            generating_usage_id: genUsageId || null,
          } as any);
        } catch {}
      } catch {}

      return res.json({
        answer,
        answer_status: !!answer && answer.trim().length > 0,
        answer_sources: answerSourceIds,
        context_sources: hits.map(h => h.id),
        contexts,
        places,
        meta: {
          rag_request_log_id: reqId || null,
          embedding: { provider: embeddingProvider, model: embeddingModel, usage: { prompt_tokens: embeddingUsage?.promptTokens || 0, total_tokens: embeddingUsage?.totalTokens || 0 }, cost: embeddingCost, latency_ms: embeddingLatencyMs, ai_usage_log_id: embeddingUsageId || null },
          generating: { provider: 'openai', model: genModel || undefined, usage: { prompt_tokens: genUsage?.promptTokens || 0, cached_input_tokens: genUsage?.cachedPromptTokens || 0, completion_tokens: genUsage?.completionTokens || 0, total_tokens: genUsage?.totalTokens || 0 }, cost: { input_usd: null, output_usd: null, total_usd: null, currency: 'USD' }, latency_ms: genLatency, ai_usage_log_id: genUsageId || null }
        }
      });
    } catch (e: any) {
      const msg = e?.message || 'unexpected';
      const stack = typeof e?.stack === 'string' ? e.stack : undefined;
      return res.status(200).json({ answer: '', answer_status: false, answer_sources: [], context_sources: [], places: [], meta: { rag_request_log_id: null, error: { message: msg, stack } } });
    }
  });

  return router;
}


