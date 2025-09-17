import { Pool } from 'pg';
import { getPostgresPool } from '../adapters/db/postgresClient';

type PromptCategory = 'base' | 'initial_system' | 'intention';

export interface PromptLookupParams {
  tenantId?: string | null;
  locale?: string | null;
}

export interface IntentionLookupParams extends PromptLookupParams {
  intent: string;
  style: string;
}

export interface PromptRecord {
  id: string;
  agent_key: string;
  category: PromptCategory;
  intent: string | null;
  style: string | null;
  locale: string;
  content: string;
  metadata: any;
  version: number;
}

interface CacheEntry {
  value: PromptRecord | null;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_LOCALE = process.env.PROMPT_DEFAULT_LOCALE || 'en';

export class PromptService {
  private pool: Pool;
  private cache = new Map<string, CacheEntry>();
  private ttlMs: number;

  constructor(pool?: Pool, ttlMs: number = DEFAULT_TTL_MS) {
    this.pool = pool ?? getPostgresPool();
    this.ttlMs = ttlMs;
  }

  private buildCacheKey(parts: (string | null | undefined)[]): string {
    return parts.map(p => (p == null ? '-' : String(p))).join('|');
  }

  private getFromCache(key: string): PromptRecord | null | undefined {
    const hit = this.cache.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return hit.value;
  }

  private setCache(key: string, value: PromptRecord | null) {
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  private async queryPrompt(
    agentKey: string,
    category: PromptCategory,
    locale: string,
    tenantId?: string | null,
    intent?: string | null,
    style?: string | null
  ): Promise<PromptRecord | null> {
    const res = await this.pool.query(
      `SELECT id, agent_key, category, intent, style, locale, content, metadata, version
       FROM agent_prompts
       WHERE agent_key = $1
         AND category = $2
         AND locale = $3
         AND is_published = true
         AND ($4::uuid IS NULL AND tenant_id IS NULL OR tenant_id = $4::uuid)
         AND ($5::text IS NULL OR intent = $5::text)
         AND ($6::text IS NULL OR style = $6::text)
       ORDER BY version DESC
       LIMIT 1`,
      [agentKey, category, locale, tenantId ?? null, intent ?? null, style ?? null]
    );
    if (res.rowCount === 0) return null;
    return res.rows[0] as PromptRecord;
  }

  private async fallbackLookup(
    agentKey: string,
    category: PromptCategory,
    params: PromptLookupParams,
    intent?: string | null,
    style?: string | null
  ): Promise<PromptRecord | null> {
    const tenantId = params.tenantId ?? null;
    const locale = params.locale ?? DEFAULT_LOCALE;

    // 1) tenant + locale
    let record = await this.queryPrompt(agentKey, category, locale, tenantId, intent, style);
    if (record) return record;
    // 2) tenant + default locale
    if (locale !== DEFAULT_LOCALE) {
      record = await this.queryPrompt(agentKey, category, DEFAULT_LOCALE, tenantId, intent, style);
      if (record) return record;
    }
    // 3) global + locale
    record = await this.queryPrompt(agentKey, category, locale, null, intent, style);
    if (record) return record;
    // 4) global + default locale
    if (locale !== DEFAULT_LOCALE) {
      record = await this.queryPrompt(agentKey, category, DEFAULT_LOCALE, null, intent, style);
      if (record) return record;
    }
    // 5) not found -> return null (caller applies code fallback)
    return null;
  }

  async getBasePrompt(agentKey: string, params: PromptLookupParams = {}): Promise<PromptRecord | null> {
    const key = this.buildCacheKey(['base', agentKey, params.tenantId, params.locale]);
    const cached = this.getFromCache(key);
    if (cached !== undefined) return cached;
    const rec = await this.fallbackLookup(agentKey, 'base', params);
    this.setCache(key, rec);
    return rec;
  }

  async getInitialSystemPrompt(agentKey: string, params: PromptLookupParams = {}): Promise<PromptRecord | null> {
    const key = this.buildCacheKey(['initial_system', agentKey, params.tenantId, params.locale]);
    const cached = this.getFromCache(key);
    if (cached !== undefined) return cached;
    const rec = await this.fallbackLookup(agentKey, 'initial_system', params);
    this.setCache(key, rec);
    return rec;
  }

  async getIntentionPrompt(agentKey: string, q: IntentionLookupParams): Promise<PromptRecord | null> {
    const key = this.buildCacheKey(['intention', agentKey, q.intent, q.style, q.tenantId, q.locale]);
    const cached = this.getFromCache(key);
    if (cached !== undefined) return cached;
    const rec = await this.fallbackLookup(agentKey, 'intention', q, q.intent, q.style);
    this.setCache(key, rec);
    return rec;
  }

  invalidateCache(agentKey?: string) {
    if (!agentKey) {
      this.cache.clear();
      return;
    }
    for (const k of this.cache.keys()) {
      if (k.includes(`|${agentKey}|`)) this.cache.delete(k);
    }
  }
}

export const promptService = new PromptService();


