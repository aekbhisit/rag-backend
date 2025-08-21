import { Router } from 'express';
import type { Pool } from 'pg';
import { ErrorLogsRepository } from '../../repositories/errorLogsRepository';

export function buildErrorLogsRouter(pool: Pool) {
  const repo = new ErrorLogsRepository(pool);
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const page = Math.max(Number(req.query.page || 1), 1);
      const size = Math.min(Math.max(Number(req.query.size || 20), 1), 200);
      const offset = (page - 1) * size;
      const items = await repo.list(tenantId, { limit: size, offset });
      const { rows } = await (repo as any).pool.query(`SELECT COUNT(*)::int AS cnt FROM error_logs WHERE tenant_id=$1`, [tenantId]);
      const total = (rows[0]?.cnt as number) || 0;
      res.json({ items, total, page, size });
    } catch (e) { next(e); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const row = await repo.get(tenantId, req.params.id);
      if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
      res.json(row);
    } catch (e) { next(e); }
  });

  // Update error log status
  router.patch('/:id/status', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const { status, notes, fixedBy } = req.body;
      
      if (!status || !['open', 'fixed', 'ignored'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Must be open, fixed, or ignored' });
      }
      
      const errorLog = await repo.updateStatus(tenantId, req.params.id, status, notes, fixedBy);
      
      if (!errorLog) {
        return res.status(404).json({ message: 'Error log not found' });
      }
      
      res.json(errorLog);
    } catch (e) { next(e); }
  });

  // Delete error log
  router.delete('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const row = await repo.delete(tenantId, req.params.id);
      if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
      res.json({ message: 'Error log deleted successfully' });
    } catch (e) { next(e); }
  });

  // Export error logs for analysis
  router.post('/export', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const { status, dateFrom, dateTo, errorCode } = req.body;
      
      const errorLogs = await repo.exportForAnalysis(tenantId, {
        status,
        dateFrom,
        dateTo,
        errorCode
      });
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="error-logs-${new Date().toISOString().split('T')[0]}.json"`);
      
      res.json({
        exportDate: new Date().toISOString(),
        filters: { status, dateFrom, dateTo, errorCode },
        totalRecords: errorLogs.length,
        errorLogs
      });
    } catch (e) { next(e); }
  });

  return router;
}


