import { Request, Response, NextFunction } from 'express';
import { applicationRegistry } from '../services/applicationRegistry';

interface TenantSecurityRequest extends Request {
  tenantId: string;
  sourceApp?: string;
  securityLevel?: 'high' | 'medium' | 'low';
}

export function tenantSecurityMiddleware(req: TenantSecurityRequest, res: Response, next: NextFunction) {
  const origin = req.get('Origin');
  const tenantId = req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000';
  const app = applicationRegistry.getApplicationByOrigin(origin || '');
  
  req.tenantId = tenantId;
  req.sourceApp = app?.appId;
  req.securityLevel = app?.securityLevel || 'low';

  // Validate tenant ID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
    return res.status(400).json({
      error: 'INVALID_TENANT_ID',
      message: 'Tenant ID must be a valid UUID'
    });
  }

  // Enforce tenant isolation based on application security level
  if (app?.securityLevel === 'high' && tenantId === '00000000-0000-0000-0000-000000000000') {
    console.warn(`High security app ${app.appId} attempting to use default tenant`, {
      origin,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }

  // Log tenant access for audit
  console.log(`Tenant access: ${tenantId} from ${app?.appId || 'unknown'}`, {
    endpoint: req.originalUrl,
    method: req.method,
    securityLevel: req.securityLevel,
    timestamp: new Date().toISOString()
  });

  next();
}

export function enforceTenantIsolation(req: TenantSecurityRequest, res: Response, next: NextFunction) {
  // Ensure all database queries include tenant_id filter
  const originalQuery = req.query;
  const originalBody = req.body;

  // Add tenant_id to query parameters for GET requests
  if (req.method === 'GET' && originalQuery) {
    originalQuery.tenant_id = req.tenantId;
  }

  // Add tenant_id to body for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && originalBody && typeof originalBody === 'object') {
    originalBody.tenant_id = req.tenantId;
  }

  next();
}
