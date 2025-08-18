import { Router } from 'express';
import type { Pool } from 'pg';

function rangeToDates(range: string): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  switch (range) {
    case '1d': from.setDate(to.getDate() - 1); break;
    case '7d': from.setDate(to.getDate() - 7); break;
    case '90d': from.setDate(to.getDate() - 90); break;
    case '30d': default: from.setDate(to.getDate() - 30); break;
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

export function buildDashboardRouter(pool: Pool) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const range = typeof req.query.range === 'string' ? req.query.range : '7d';
      const { from, to } = rangeToDates(range);

      // Basic request metrics
      const totalsQ = await pool.query(
        `SELECT
           count(*)::int AS total,
           coalesce(sum(CASE WHEN answer_status = true THEN 1 ELSE 0 END),0)::int AS success,
           coalesce(avg(latency_ms),0)::float AS avg_latency,
           coalesce(sum(CASE WHEN (contexts_used IS NULL OR array_length(contexts_used,1) = 0) THEN 1 ELSE 0 END),0)::int AS zero_hit
         FROM rag_requests
         WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3`,
        [tenantId, from, to]
      );
      const totals = totalsQ.rows[0] || { total: 0, success: 0, avg_latency: 0, zero_hit: 0 };
      const totalQueries = Number(totals.total || 0);
      const successRate = totalQueries > 0 ? (Number(totals.success || 0) / totalQueries) * 100 : 0;
      const avgResponseTime = Number(totals.avg_latency || 0) | 0;
      const zeroHitRate = totalQueries > 0 ? (Number(totals.zero_hit || 0) / totalQueries) * 100 : 0;

      // Top intents
      const intentsQ = await pool.query(
        `SELECT coalesce(intent_scope,'unknown') AS intent, count(*)::int AS cnt
         FROM rag_requests
         WHERE tenant_id=$1 AND created_at BETWEEN $2 AND $3
         GROUP BY coalesce(intent_scope,'unknown')
         ORDER BY cnt DESC
         LIMIT 5`,
        [tenantId, from, to]
      );
      const topIntents = intentsQ.rows.map((r: any) => ({ intent: r.intent || 'unknown', count: Number(r.cnt || 0), percentage: totalQueries > 0 ? (Number(r.cnt || 0) / totalQueries) * 100 : 0 }));

      // Trend: daily counts and avg response
      const trendQ = await pool.query(
        `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
                count(*)::int AS cnt,
                coalesce(avg(latency_ms),0)::float AS avg_ms
         FROM rag_requests
         WHERE tenant_id=$1 AND created_at BETWEEN $2 AND $3
         GROUP BY 1
         ORDER BY 1 ASC`,
        [tenantId, from, to]
      );
      const queryTrend = trendQ.rows.map((r: any) => ({ date: r.day, count: Number(r.cnt || 0) }));
      const responseTimes = trendQ.rows.map((r: any) => ({ date: r.day, avg_ms: Math.round(Number(r.avg_ms || 0)) }));

      // Context usage breakdown
      const ctxTotalQ = await pool.query(`SELECT count(*)::int AS cnt FROM contexts WHERE tenant_id=$1`, [tenantId]);
      const ctxTotal = Number(ctxTotalQ.rows[0]?.cnt || 0);
      const ctxQ = await pool.query(
        `SELECT type, count(*)::int AS cnt FROM contexts WHERE tenant_id=$1 GROUP BY type ORDER BY cnt DESC`,
        [tenantId]
      );
      const contextUsage = ctxQ.rows.map((r: any) => ({ type: r.type || 'unknown', count: Number(r.cnt || 0), percentage: ctxTotal > 0 ? (Number(r.cnt || 0) / ctxTotal) * 100 : 0 }));

      // Error rate (requests with answer_status=false)
      const errorRate = totalQueries > 0 ? ((totalQueries - Number(totals.success || 0)) / totalQueries) * 100 : 0;

      res.json({
        totalQueries,
        successRate,
        avgResponseTime,
        zeroHitRate,
        topIntents,
        queryTrend,
        responseTimes,
        contextUsage,
        errorRate,
      });
    } catch (e) {
      next(e);
    }
  });

  return router;
}


