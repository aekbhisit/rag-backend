import { Router } from 'express';
import { systemSecurityMonitor } from '../../services/systemSecurityMonitor';
import { applicationRegistry } from '../../services/applicationRegistry';
import { jwtAuthMiddleware, requireJWT, requireRole } from '../../middleware/jwtAuth';

export function buildSystemSecurityRouter() {
  const router = Router();

  // All routes require admin authentication
  router.use(jwtAuthMiddleware as any);
  router.use(requireJWT as any);
  router.use(requireRole('admin') as any);

  // Get system security overview
  router.get('/overview', (req, res, next) => {
    try {
      const metrics = systemSecurityMonitor.getSystemSecurityMetrics();
      const applications = applicationRegistry.getApplications();
      
      res.json({
        status: 'ok',
        metrics,
        applications: applications.map(app => ({
          appId: app.appId,
          name: app.name,
          domain: app.domain,
          securityLevel: app.securityLevel,
          allowedOperations: app.allowedOperations,
          rateLimitConfig: app.rateLimitConfig
        })),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  // Get events by source application
  router.get('/events/source/:appId', (req, res, next) => {
    try {
      const appId = req.params.appId;
      const events = systemSecurityMonitor.getEventsBySourceApp(appId);
      
      res.json({
        status: 'ok',
        sourceApp: appId,
        events,
        count: events.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  // Get events by tenant
  router.get('/events/tenant/:tenantId', (req, res, next) => {
    try {
      const tenantId = req.params.tenantId;
      const events = systemSecurityMonitor.getEventsByTenant(tenantId);
      
      res.json({
        status: 'ok',
        tenantId,
        events,
        count: events.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  // Get critical events
  router.get('/events/critical', (req, res, next) => {
    try {
      const metrics = systemSecurityMonitor.getSystemSecurityMetrics();
      
      res.json({
        status: 'ok',
        criticalEvents: metrics.recentCriticalEvents,
        count: metrics.recentCriticalEvents.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
