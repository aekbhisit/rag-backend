import { Request, Response, NextFunction } from 'express';
import { applicationRegistry } from '../services/applicationRegistry';

interface GatewayRequest extends Request {
  gatewayMetadata?: {
    requestId: string;
    sourceApp: string;
    tenantId: string;
    timestamp: number;
    securityLevel: 'high' | 'medium' | 'low';
  };
}

export function apiGatewaySecurityMiddleware(req: GatewayRequest, res: Response, next: NextFunction) {
  const origin = req.get('Origin');
  const tenantId = req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000';
  const app = applicationRegistry.getApplicationByOrigin(origin || '');
  
  // Generate unique request ID for tracing
  const requestId = `gateway_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.gatewayMetadata = {
    requestId,
    sourceApp: app?.appId || 'external',
    tenantId,
    timestamp: Date.now(),
    securityLevel: app?.securityLevel || 'low'
  };

  // Set gateway headers
  res.setHeader('X-Gateway-Request-ID', requestId);
  res.setHeader('X-Gateway-Source-App', req.gatewayMetadata.sourceApp);
  res.setHeader('X-Gateway-Security-Level', req.gatewayMetadata.securityLevel);

  // Log gateway request
  console.log(`Gateway request: ${req.gatewayMetadata.sourceApp} -> ${req.method} ${req.originalUrl}`, {
    requestId,
    tenantId,
    securityLevel: req.gatewayMetadata.securityLevel,
    timestamp: new Date().toISOString()
  });

  next();
}

export function validateGatewayOperation(operation: string) {
  return (req: GatewayRequest, res: Response, next: NextFunction) => {
    const app = applicationRegistry.getApplicationByOrigin(req.get('Origin') || '');
    
    if (!app) {
      return res.status(403).json({
        error: 'UNAUTHORIZED_APPLICATION',
        message: 'Application not registered in gateway',
        requestId: req.gatewayMetadata?.requestId
      });
    }

    // Check operation permissions
    const allowedOps = app.allowedOperations;
    
    if (allowedOps.includes('admin_all') || allowedOps.includes('dev_all')) {
      return next();
    }

    if (!allowedOps.includes(operation) && !allowedOps.includes('public_only')) {
      return res.status(403).json({
        error: 'FORBIDDEN_OPERATION',
        message: `Operation '${operation}' not allowed for application '${app.appId}'`,
        allowedOperations: allowedOps,
        requestId: req.gatewayMetadata?.requestId
      });
    }

    next();
  };
}
