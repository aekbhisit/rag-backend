import { Request, Response, NextFunction } from 'express';
import { securityMonitoring } from '../services/securityMonitoringService';

export function securityMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const tenantId = req.header('X-Tenant-ID') || 'unknown';
  const userId = (req as any).user?.userId;
  const ipAddress = req.ip;

  // Monitor for suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//g,
    /<script/gi,
    /union\s+select/gi,
    /eval\(/gi,
    /javascript:/gi,
    /vbscript:/gi,
  ];

  const url = req.originalUrl || req.url;
  const body = JSON.stringify(req.body || {});

  for (const pattern of suspiciousPatterns) {
    try {
      if (pattern.test(url) || pattern.test(body)) {
        securityMonitoring.logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'high',
          message: 'Suspicious request pattern detected',
          metadata: {
            pattern: pattern.toString(),
            url,
            method: req.method,
            userAgent: req.get('User-Agent'),
            body: body.substring(0, 200),
          },
          tenantId,
          userId,
          ipAddress,
        });
      }
    } catch {}
  }

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    try {
      if (url.includes('/auth/login') && res.statusCode === 401) {
        securityMonitoring.logSecurityEvent({
          type: 'auth_failure',
          severity: 'medium',
          message: 'Authentication failure',
          metadata: { endpoint: url, responseTime, userAgent: req.get('User-Agent') },
          tenantId,
          ipAddress,
        });
      }

      if (res.statusCode === 429) {
        securityMonitoring.logSecurityEvent({
          type: 'rate_limit',
          severity: 'low',
          message: 'Rate limit exceeded',
          metadata: { endpoint: url, responseTime },
          tenantId,
          userId,
          ipAddress,
        });
      }

      if (res.statusCode >= 500) {
        securityMonitoring.logSecurityEvent({
          type: 'error',
          severity: 'high',
          message: 'Server error occurred',
          metadata: { endpoint: url, statusCode: res.statusCode, responseTime },
          tenantId,
          userId,
          ipAddress,
        });
      }

      if (url.includes('/admin/') && res.statusCode === 200) {
        securityMonitoring.logSecurityEvent({
          type: 'data_access',
          severity: 'low',
          message: 'Admin data accessed',
          metadata: { endpoint: url, method: req.method, responseTime },
          tenantId,
          userId,
          ipAddress,
        });
      }
    } catch {}
  });

  next();
}


