import { Router } from 'express';
import { complianceService } from '../../services/complianceService';
import { getTenantIdFromReq } from '../../config/tenant';
import { jwtAuthMiddleware, requireJWT, requireRole } from '../../middleware/jwtAuth';

export function buildComplianceRouter() {
  const router = Router();

  // Admin protection
  router.use(jwtAuthMiddleware as any);
  router.use(requireJWT as any);
  router.use(requireRole('admin') as any);

  router.get('/security-report', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const startDate = (req.query.start as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = (req.query.end as string) || new Date().toISOString();
      const report = await complianceService.generateSecurityReport(tenantId, startDate, endDate);
      res.json({ status: 'ok', report, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  router.get('/data-retention', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const report = await complianceService.generateDataRetentionReport(tenantId);
      res.json({ status: 'ok', report, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  router.post('/cleanup', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const retentionDays = parseInt(req.body?.retentionDays) || 90;
      const results = await complianceService.cleanupOldData(tenantId, retentionDays);
      res.json({ status: 'ok', message: 'Data cleanup completed', results, retentionDays, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  return router;
}


