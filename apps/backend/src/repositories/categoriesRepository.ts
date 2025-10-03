import { Pool } from 'pg';

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  level: number;
  sort_order: number;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  children?: Category[];
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  sort_order?: number;
  metadata?: Record<string, any>;
}

export class CategoriesRepository {
  constructor(private pool: Pool) {}

  async list(tenantId: string): Promise<Category[]> {
    const client = await this.pool.connect();
    try {
      await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
      
      const result = await client.query(`
        SELECT * FROM categories
        WHERE tenant_id = $1
        ORDER BY level, sort_order, name
      `, [tenantId]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getHierarchy(tenantId: string): Promise<Category[]> {
    const client = await this.pool.connect();
    try {
      await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
      
      // First check if there are any categories for this tenant
      const countResult = await client.query('SELECT COUNT(*) FROM categories WHERE tenant_id = $1', [tenantId]);
      const categoryCount = parseInt(countResult.rows[0]?.count || '0');
      
      if (categoryCount === 0) {
        console.log(`No categories found for tenant ${tenantId}, returning empty array`);
        return [];
      }
      
      const result = await client.query(`
      WITH RECURSIVE category_tree AS (
        -- Base case: root categories (level 0)
        SELECT 
          id, tenant_id, name, slug, description, parent_id, level, sort_order,
            is_active, metadata, created_at, updated_at,
            ARRAY[id] as path,
            name::text as full_path
        FROM categories 
        WHERE tenant_id = $1 AND parent_id IS NULL
        
        UNION ALL
        
        -- Recursive case: children
        SELECT 
          c.id, c.tenant_id, c.name, c.slug, c.description, c.parent_id, c.level, c.sort_order,
          c.is_active, c.metadata, c.created_at, c.updated_at,
          ct.path || c.id,
            (ct.full_path || ' > ' || c.name)::text
        FROM categories c
        INNER JOIN category_tree ct ON c.parent_id = ct.id
        WHERE c.tenant_id = $1
      )
      SELECT * FROM category_tree
      ORDER BY level, sort_order, name
    `, [tenantId]);
      return result.rows;
    } catch (error) {
      console.error('Database error in getHierarchy:', {
        error: error,
        stack: error instanceof Error ? error.stack : undefined,
        tenantId,
        query: 'getHierarchy'
      });
      throw error; // Re-throw to be caught by the route handler
    } finally {
      client.release();
    }
  }

  async get(tenantId: string, id: string): Promise<Category | null> {
    const client = await this.pool.connect();
    try {
      await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
      const result = await client.query(`
      SELECT * FROM categories
      WHERE tenant_id = $1 AND id = $2
    `, [tenantId, id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async create(tenantId: string, data: CreateCategoryRequest): Promise<Category> {
    const client = await this.pool.connect();
    try {
      await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
      // Calculate level based on parent
      let level = 0;
      if (data.parent_id) {
        const parent = await this.get(tenantId, data.parent_id);
        if (parent) {
          level = parent.level + 1;
        }
      }
      const result = await client.query(`
      INSERT INTO categories (
        tenant_id, name, slug, description, parent_id, level, sort_order, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
        tenantId, data.name, data.slug, data.description, 
        data.parent_id, level, data.sort_order || 0, data.metadata || {}
      ]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async update(tenantId: string, id: string, data: Partial<CreateCategoryRequest>): Promise<Category | null> {
    const client = await this.pool.connect();
    try {
      await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
      const updates: string[] = [];
      const values: any[] = [tenantId, id];
      let paramIndex = 3;
    
    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.slug !== undefined) {
      updates.push(`slug = $${paramIndex++}`);
      values.push(data.slug);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      values.push(data.sort_order);
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(data.metadata));
    }
    
    updates.push(`updated_at = NOW()`);
    
    if (updates.length === 1) { // Only updated_at
      return this.get(tenantId, id);
    }
    
    const result = await client.query(`
      UPDATE categories 
      SET ${updates.join(', ')}
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `, values);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('SET app.current_tenant = $1', [tenantId]);
      const result = await client.query(`
      DELETE FROM categories
      WHERE tenant_id = $1 AND id = $2
    `, [tenantId, id]);
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }

  async getContextCategories(tenantId: string, contextId: string): Promise<Category[]> {
    const client = await this.pool.connect();
    try {
      await client.query('SET app.current_tenant = $1', [tenantId]);
      const result = await client.query(`
      SELECT c.* FROM categories c
      INNER JOIN context_categories cc ON c.id = cc.category_id
      WHERE cc.tenant_id = $1 AND cc.context_id = $2
      ORDER BY c.level, c.sort_order, c.name
    `, [tenantId, contextId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async setContextCategories(tenantId: string, contextId: string, categoryIds: string[]): Promise<void> {
    await this.pool.query('SET app.current_tenant = $1', [tenantId]);
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Remove existing categories
      await client.query(`
        DELETE FROM context_categories
        WHERE tenant_id = $1 AND context_id = $2
      `, [tenantId, contextId]);
      
      // Add new categories
      if (categoryIds.length > 0) {
        const values = categoryIds.map((categoryId, index) => 
          `($1, $2, $${index + 3})`
        ).join(', ');
        
        await client.query(`
          INSERT INTO context_categories (tenant_id, context_id, category_id)
          VALUES ${values}
        `, [tenantId, contextId, ...categoryIds]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
