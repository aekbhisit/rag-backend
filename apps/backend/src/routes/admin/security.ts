import { Router } from 'express';
import { securityMonitoring } from '../../services/securityMonitoringService';
import { jwtAuthMiddleware, requireJWT, requireRole } from '../../middleware/jwtAuth';

export function buildSecurityRouter() {
  const router = Router();

  // Admin protection
  router.use(jwtAuthMiddleware as any);
  router.use(requireJWT as any);
  router.use(requireRole('admin') as any);

  router.get('/metrics', (req, res, next) => {
    try {
      const metrics = securityMonitoring.getSecurityMetrics();
      res.json({ status: 'ok', metrics, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  router.get('/events', (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const type = req.query.type as any;
      const severity = req.query.severity as any;
      let events = securityMonitoring.getRecentEvents(limit);
      if (type) events = events.filter(e => e.type === type);
      if (severity) events = events.filter(e => e.severity === severity);
      res.json({ status: 'ok', events, count: events.length, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  router.get('/events/:type', (req, res, next) => {
    try {
      const type = req.params.type as any;
      const events = securityMonitoring.getEventsByType(type);
      res.json({ status: 'ok', type, events, count: events.length, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  router.get('/severity/:severity', (req, res, next) => {
    try {
      const severity = req.params.severity as any;
      const events = securityMonitoring.getEventsBySeverity(severity);
      res.json({ status: 'ok', severity, events, count: events.length, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  router.post('/check-alerts', (req, res, next) => {
    try {
      securityMonitoring.checkForAlerts();
      res.json({ status: 'ok', message: 'Security alert check completed', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  return router;
}


