import type { Pool } from 'pg';

export class StatsRepository {
  constructor(private readonly pool: Pool) {}

  async ensureTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS context_usage_stats (
        tenant_id UUID NOT NULL,
        context_id UUID NOT NULL,
        used_count BIGINT NOT NULL DEFAULT 0,
        last_used_at TIMESTAMP NOT NULL DEFAULT now(),
        PRIMARY KEY (tenant_id, context_id)
      );
      CREATE TABLE IF NOT EXISTS summary_stats (
        tenant_id UUID PRIMARY KEY,
        answered_count BIGINT NOT NULL DEFAULT 0,
        unanswered_count BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);
  }

  async incrementContextUses(tenantId: string, contextIds: string[]): Promise<void> {
    if (!contextIds || contextIds.length === 0) return;
    await this.ensureTables();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const ctxId of contextIds) {
        await client.query(
          `INSERT INTO context_usage_stats (tenant_id, context_id, used_count, last_used_at)
           VALUES ($1, $2, 1, now())
           ON CONFLICT (tenant_id, context_id)
           DO UPDATE SET used_count = context_usage_stats.used_count + 1, last_used_at = now()`,
          [tenantId, ctxId]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      // swallow errors to not block response
    } finally {
      client.release();
    }
  }

  async incrementSummaryOutcome(tenantId: string, answered: boolean): Promise<void> {
    await this.ensureTables();
    const col = answered ? 'answered_count' : 'unanswered_count';
    await this.pool.query(
      `INSERT INTO summary_stats (tenant_id, ${col}, updated_at) VALUES ($1, 1, now())
       ON CONFLICT (tenant_id) DO UPDATE SET ${col} = summary_stats.${col} + 1, updated_at = now()`,
      [tenantId]
    );
  }
}


