import { Pool, PoolClient, QueryResult } from 'pg';
import { getPostgresPool } from './postgresClient';

interface QueryOptions {
  timeout?: number;
  sanitize?: boolean;
  audit?: boolean;
}

export class SecurePostgresClient {
  private pool: Pool;
  private queryTimeout: number;

  constructor() {
    this.pool = getPostgresPool();
    this.queryTimeout = 30000; // 30 seconds default
  }

  async secureQuery<T = any>(
    query: string,
    params: any[] = [],
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const { timeout = this.queryTimeout, sanitize = true, audit = false } = options;
    
    // Validate query doesn't contain dangerous patterns
    if (sanitize) {
      this.validateQuery(query);
    }
    
    // Set query timeout
    const client = await this.pool.connect();
    
    try {
      await client.query(`SET statement_timeout = ${timeout}`);
      
      const startTime = Date.now();
      const result = await client.query(query, params);
      const duration = Date.now() - startTime;
      
      // Audit slow queries
      if (audit && duration > 5000) {
        console.warn(`Slow query detected: ${duration}ms`, { query: query.substring(0, 100) });
      }
      
      return result;
    } finally {
      client.release();
    }
  }

  private validateQuery(query: string): void {
    const dangerousPatterns = [
      /;\s*drop\s+table/i,
      /;\s*truncate\s+table/i,
      /;\s*delete\s+from\s+\w+\s*$/i,
      /;\s*update\s+\w+\s+set\s+\w+\s*=\s*\w+\s*$/i,
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        throw new Error('Potentially dangerous query detected');
      }
    }
    
    // Ensure parameterized queries are used
    const paramCount = (query.match(/\$/g) || []).length;
    if (paramCount === 0 && query.toLowerCase().includes('where')) {
      console.warn('Query without parameters detected:', query.substring(0, 100));
    }
  }

  async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const securePostgresClient = new SecurePostgresClient();
