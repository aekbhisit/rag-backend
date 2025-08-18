import { Pool } from 'pg';

export interface IntentScope {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  actions?: IntentAction[];
}

export interface IntentAction {
  id: string;
  tenant_id: string;
  scope_id: string;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  scope_name?: string;
}

export interface CreateIntentScopeRequest {
  name: string;
  slug: string;
  description?: string;
  sort_order?: number;
  metadata?: Record<string, any>;
}

export interface CreateIntentActionRequest {
  scope_id: string;
  name: string;
  slug: string;
  description?: string;
  sort_order?: number;
  metadata?: Record<string, any>;
}

export class IntentSystemRepository {
  constructor(private pool: Pool) {}

  // Intent Scopes
  async listScopes(tenantId: string): Promise<IntentScope[]> {
    const client = await this.pool.connect();
    try {
      await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
      
      const result = await client.query(`
        SELECT * FROM intent_scopes
        WHERE tenant_id = $1
        ORDER BY sort_order, name
      `, [tenantId]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getScope(tenantId: string, id: string): Promise<IntentScope | null> {
    await this.pool.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
    
    const result = await this.pool.query(`
      SELECT * FROM intent_scopes
      WHERE tenant_id = $1 AND id = $2
    `, [tenantId, id]);
    
    return result.rows[0] || null;
  }

  async createScope(tenantId: string, data: CreateIntentScopeRequest): Promise<IntentScope> {
    await this.pool.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
    
    const result = await this.pool.query(`
      INSERT INTO intent_scopes (
        tenant_id, name, slug, description, sort_order, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      tenantId, data.name, data.slug, data.description,
      data.sort_order || 0, data.metadata || {}
    ]);
    
    return result.rows[0];
  }

  async updateScope(tenantId: string, id: string, data: Partial<CreateIntentScopeRequest & { is_active: boolean; }>): Promise<IntentScope | null> {
    await this.pool.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
    const existing = await this.getScope(tenantId, id);
    if (!existing) return null;
    const next = {
      name: data.name ?? existing.name,
      slug: data.slug ?? existing.slug,
      description: data.description ?? existing.description,
      sort_order: data.sort_order ?? existing.sort_order,
      is_active: (data as any).is_active ?? existing.is_active,
      metadata: data.metadata ?? existing.metadata,
    };
    const result = await this.pool.query(
      `UPDATE intent_scopes
       SET name=$3, slug=$4, description=$5, sort_order=$6, is_active=$7, metadata=$8, updated_at=now()
       WHERE tenant_id=$1 AND id=$2
       RETURNING *`,
      [tenantId, id, next.name, next.slug, next.description, next.sort_order, next.is_active, next.metadata]
    );
    return result.rows[0] || null;
  }

  async deleteScope(tenantId: string, id: string): Promise<boolean> {
    await this.pool.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Remove actions under this scope
      await client.query(`DELETE FROM intent_actions WHERE tenant_id=$1 AND scope_id=$2`, [tenantId, id]);
      const res = await client.query(`DELETE FROM intent_scopes WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
      await client.query('COMMIT');
      return (res.rowCount ?? 0) > 0;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // Intent Actions
  async listActions(tenantId: string, scopeId?: string): Promise<IntentAction[]> {
    const client = await this.pool.connect();
    try {
      await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
      let query = `
        SELECT ia.*, isc.name as scope_name
        FROM intent_actions ia
        INNER JOIN intent_scopes isc ON ia.scope_id = isc.id
        WHERE ia.tenant_id = $1
      `;
      const params: any[] = [tenantId];
      if (scopeId) {
        query += ' AND ia.scope_id = $2';
        params.push(scopeId);
      }
      query += ' ORDER BY isc.sort_order, isc.name, ia.sort_order, ia.name';
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getAction(tenantId: string, id: string): Promise<IntentAction | null> {
    await this.pool.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
    
    const result = await this.pool.query(`
      SELECT ia.*, isc.name as scope_name
      FROM intent_actions ia
      INNER JOIN intent_scopes isc ON ia.scope_id = isc.id
      WHERE ia.tenant_id = $1 AND ia.id = $2
    `, [tenantId, id]);
    
    return result.rows[0] || null;
  }

  async createAction(tenantId: string, data: CreateIntentActionRequest): Promise<IntentAction> {
    await this.pool.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
    
    const result = await this.pool.query(`
      INSERT INTO intent_actions (
        tenant_id, scope_id, name, slug, description, sort_order, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      tenantId, data.scope_id, data.name, data.slug, data.description,
      data.sort_order || 0, data.metadata || {}
    ]);
    
    return result.rows[0];
  }

  async updateAction(tenantId: string, id: string, data: Partial<CreateIntentActionRequest & { is_active: boolean; }>): Promise<IntentAction | null> {
    await this.pool.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
    const existing = await this.getAction(tenantId, id);
    if (!existing) return null;
    const next = {
      scope_id: data.scope_id ?? existing.scope_id,
      name: data.name ?? existing.name,
      slug: data.slug ?? existing.slug,
      description: data.description ?? existing.description,
      sort_order: data.sort_order ?? existing.sort_order,
      is_active: (data as any).is_active ?? existing.is_active,
      metadata: data.metadata ?? existing.metadata,
    };
    const result = await this.pool.query(
      `UPDATE intent_actions
       SET scope_id=$3, name=$4, slug=$5, description=$6, sort_order=$7, is_active=$8, metadata=$9, updated_at=now()
       WHERE tenant_id=$1 AND id=$2
       RETURNING *`,
      [tenantId, id, next.scope_id, next.name, next.slug, next.description, next.sort_order, next.is_active, next.metadata]
    );
    return result.rows[0] || null;
  }

  async deleteAction(tenantId: string, id: string): Promise<boolean> {
    await this.pool.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
    const res = await this.pool.query(`DELETE FROM intent_actions WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
    return (res.rowCount ?? 0) > 0;
  }

  // Context-Intent Relationships
  async getContextScopes(tenantId: string, contextId: string): Promise<IntentScope[]> {
    await this.pool.query('SET app.current_tenant = $1', [tenantId]);
    
    const result = await this.pool.query(`
      SELECT isc.* FROM intent_scopes isc
      INNER JOIN context_intent_scopes cis ON isc.id = cis.scope_id
      WHERE cis.tenant_id = $1 AND cis.context_id = $2
      ORDER BY isc.sort_order, isc.name
    `, [tenantId, contextId]);
    
    return result.rows;
  }

  async getContextActions(tenantId: string, contextId: string): Promise<IntentAction[]> {
    await this.pool.query('SET app.current_tenant = $1', [tenantId]);
    
    const result = await this.pool.query(`
      SELECT ia.*, isc.name as scope_name
      FROM intent_actions ia
      INNER JOIN intent_scopes isc ON ia.scope_id = isc.id
      INNER JOIN context_intent_actions cia ON ia.id = cia.action_id
      WHERE cia.tenant_id = $1 AND cia.context_id = $2
      ORDER BY isc.sort_order, isc.name, ia.sort_order, ia.name
    `, [tenantId, contextId]);
    
    return result.rows;
  }

  async setContextScopes(tenantId: string, contextId: string, scopeIds: string[]): Promise<void> {
    await this.pool.query('SET app.current_tenant = $1', [tenantId]);
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Remove existing scopes
      await client.query(`
        DELETE FROM context_intent_scopes
        WHERE tenant_id = $1 AND context_id = $2
      `, [tenantId, contextId]);
      
      // Add new scopes
      if (scopeIds.length > 0) {
        const values = scopeIds.map((scopeId, index) => 
          `($1, $2, $${index + 3})`
        ).join(', ');
        
        await client.query(`
          INSERT INTO context_intent_scopes (tenant_id, context_id, scope_id)
          VALUES ${values}
        `, [tenantId, contextId, ...scopeIds]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async setContextActions(tenantId: string, contextId: string, actionIds: string[]): Promise<void> {
    await this.pool.query('SET app.current_tenant = $1', [tenantId]);
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Remove existing actions
      await client.query(`
        DELETE FROM context_intent_actions
        WHERE tenant_id = $1 AND context_id = $2
      `, [tenantId, contextId]);
      
      // Add new actions
      if (actionIds.length > 0) {
        const values = actionIds.map((actionId, index) => 
          `($1, $2, $${index + 3})`
        ).join(', ');
        
        await client.query(`
          INSERT INTO context_intent_actions (tenant_id, context_id, action_id)
          VALUES ${values}
        `, [tenantId, contextId, ...actionIds]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Hierarchical data - scopes with their actions
  async getScopesWithActions(tenantId: string): Promise<IntentScope[]> {
    const client = await this.pool.connect();
    try {
      await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
      
      // Get all scopes
      const scopes = await this.listScopes(tenantId);
      
      // Get all actions grouped by scope
      const actionsResult = await client.query(`
        SELECT ia.*, isc.name as scope_name 
        FROM intent_actions ia
        JOIN intent_scopes isc ON ia.scope_id = isc.id
        WHERE ia.tenant_id = $1
        ORDER BY ia.scope_id, ia.sort_order, ia.name
      `, [tenantId]);
      
      // Group actions by scope
      const actionsByScope = actionsResult.rows.reduce((acc, action) => {
        if (!acc[action.scope_id]) {
          acc[action.scope_id] = [];
        }
        acc[action.scope_id].push(action);
        return acc;
      }, {} as Record<string, IntentAction[]>);
      
      // Attach actions to scopes
      return scopes.map(scope => ({
        ...scope,
        actions: actionsByScope[scope.id] || []
      }));
    } finally {
      client.release();
    }
  }
}
