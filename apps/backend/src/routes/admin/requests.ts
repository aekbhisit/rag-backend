import { Router } from 'express';
import type { Pool } from 'pg';
import { RequestsRepository } from '../../repositories/requestsRepository';
import { getPostgresPool } from '../../adapters/db/postgresClient';

export function buildRequestsRouter(_pool: Pool) {
  const router = Router();
  const repo = new RequestsRepository(getPostgresPool());

  router.get('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const page = Math.max(Number(req.query.page || 1), 1);
      const size = Math.min(Math.max(Number(req.query.size || 50), 1), 500);
      const offset = (page - 1) * size;
      // For now repo.list does not support offset; fetch size*page and slice.
      const items = await repo.list(tenantId, q, size * page);
      const totalQ = await (repo as any).pool.query(`SELECT COUNT(*)::int AS cnt FROM rag_requests WHERE tenant_id=$1`, [tenantId]);
      const total = (totalQ.rows[0]?.cnt as number) || items.length;
      const pageItems = items.slice(offset, offset + size);
      res.json({ items: pageItems, total, page, size });
    } catch (e) { next(e); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const row = await repo.getById(tenantId, id);
      if (!row) return res.status(404).json({ message: 'Not found' });
      
      // Fetch context details for contexts_used
      let contextDetails = [];
      if (row.contexts_used && Array.isArray(row.contexts_used) && row.contexts_used.length > 0) {
        try {
          const contextPromises = row.contexts_used.map(async (contextId: string) => {
            try {
              const contextRes = await fetch(`${process.env.RAG_BASE_URL || 'http://localhost:3100'}/api/contexts/${encodeURIComponent(contextId)}`, {
                headers: { 'X-Tenant-ID': tenantId }
              });
              if (contextRes.ok) {
                const contextData = await contextRes.json();
                return {
                  id: contextId,
                  title: contextData.title || 'Untitled',
                  type: contextData.type || 'text'
                };
              }
            } catch (err) {
              console.warn(`Failed to fetch context ${contextId}:`, err);
            }
            return {
              id: contextId,
              title: 'Unknown Context',
              type: 'unknown'
            };
          });
          
          contextDetails = await Promise.all(contextPromises);
        } catch (err) {
          console.warn('Failed to fetch context details:', err);
        }
      }
      
      // Add context details to the response
      const response = {
        ...row,
        context_details: contextDetails
      };
      
      return res.json(response);
    } catch (e) { next(e); }
  });

  return router;
}


