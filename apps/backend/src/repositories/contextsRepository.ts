import type { Pool } from 'pg';
import type { Context } from '@rag/shared';

export class ContextsRepository {
  constructor(private readonly pool: Pool) {}

  async list(
    tenantId: string,
    opts: { type?: string; query?: string; limit?: number; offset?: number } = {}
  ): Promise<Context[]> {
    const { type, query, limit = 50, offset = 0 } = opts;
    const params: any[] = [tenantId];
    let where = 'tenant_id = $1';
    if (type) { params.push(type); where += ` AND type = $${params.length}`; }
    if (query) {
      params.push(`%${query}%`);
      const i = params.length;
      where += ` AND (title ILIKE $${i} OR body ILIKE $${i})`;
    }
    const sql = `SELECT id, tenant_id, type, title, body, instruction, attributes, trust_level, status, keywords, created_at, updated_at
                 FROM contexts WHERE ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    const { rows } = await this.pool.query(sql, params);
    return rows;
  }

  async get(tenantId: string, id: string): Promise<Context | null> {
    const { rows } = await this.pool.query(
      `SELECT id, tenant_id, type, title, body, instruction, attributes, trust_level, status, keywords, created_at, updated_at
       FROM contexts WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id]
    );
    return rows[0] ?? null;
  }

  async create(tenantId: string, input: Omit<Context, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<Context> {
    const { type, title, body, instruction, attributes, trust_level } = input as any;
    const keywords = (input as any).keywords || [];
    const status = (input as any).status || 'active';
    const language = (input as any).language || null;
    const categories = (input as any).categories || [];
    const intent_scopes = (input as any).intent_scopes || [];
    const intent_actions = (input as any).intent_actions || [];

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
      
      // Create the context
      const { rows } = await client.query(
        `INSERT INTO contexts (tenant_id, type, title, body, instruction, attributes, trust_level, language, status, keywords)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id, tenant_id, type, title, body, instruction, attributes, trust_level, language, status, keywords, created_at, updated_at`,
        [tenantId, type, title, body, instruction ?? null, attributes, trust_level, language, status, keywords]
      );
      
      const context = rows[0];
      const contextId = context.id;
      
      // Add categories if provided
      if (categories.length > 0) {
        const categoryValues = categories.map((categoryId: string, index: number) => 
          `($1, $2, $${index + 3})`
        ).join(', ');
        
        await client.query(`
          INSERT INTO context_categories (tenant_id, context_id, category_id)
          VALUES ${categoryValues}
        `, [tenantId, contextId, ...categories]);
      }
      
      // Add intent scopes if provided
      if (intent_scopes.length > 0) {
        const scopeValues = intent_scopes.map((scopeId: string, index: number) => 
          `($1, $2, $${index + 3})`
        ).join(', ');
        
        await client.query(`
          INSERT INTO context_intent_scopes (tenant_id, context_id, scope_id)
          VALUES ${scopeValues}
        `, [tenantId, contextId, ...intent_scopes]);
      }
      
      // Add intent actions if provided
      if (intent_actions.length > 0) {
        const actionValues = intent_actions.map((actionId: string, index: number) => 
          `($1, $2, $${index + 3})`
        ).join(', ');
        
        await client.query(`
          INSERT INTO context_intent_actions (tenant_id, context_id, action_id)
          VALUES ${actionValues}
        `, [tenantId, contextId, ...intent_actions]);
      }
      
      await client.query('COMMIT');
      return context;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(tenantId: string, id: string, patch: Partial<Context>): Promise<Context | null> {
    const existing = await this.get(tenantId, id);
    if (!existing) return null;
    const merged = { ...existing, ...patch } as any;
    const normalizedKeywords = Array.isArray((merged as any).keywords)
      ? (merged as any).keywords
      : (typeof (merged as any).keywords === 'string'
          ? (merged as any).keywords.split(',').map((s: string) => s.trim()).filter(Boolean)
          : (existing as any).keywords || []);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);

      const { rows } = await client.query(
        `UPDATE contexts SET type=$3, title=$4, body=$5, instruction=$6, attributes=$7, trust_level=$8, language=$9, keywords=$10, updated_at=now()
         WHERE tenant_id=$1 AND id=$2
         RETURNING id, tenant_id, type, title, body, instruction, attributes, trust_level, language, keywords, created_at, updated_at`,
        [tenantId, id, merged.type, merged.title, merged.body, merged.instruction ?? null, merged.attributes, merged.trust_level, merged.language, normalizedKeywords]
      );

      const updated = rows[0];

      // Minimal edit history entry (one summary row)
      await client.query(
        `INSERT INTO context_edit_history (tenant_id, context_id, user_email, action, description)
         VALUES ($1, $2, $3, 'UPDATE', $4)`,
        [tenantId, id, (patch as any)._edited_by || 'admin@demo.local', 'Context updated via API']
      );

      await client.query('COMMIT');
      return updated ?? null;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM contexts WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
    const affected = result.rowCount ?? 0;
    return affected > 0;
  }
}


