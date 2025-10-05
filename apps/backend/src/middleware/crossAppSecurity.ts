import { Request, Response, NextFunction } from 'express';

interface CrossAppRequest extends Request {
  sourceApp?: 'travel-ai-bot' | 'admin-web' | 'external';
  allowedOperations?: string[];
}

export function crossAppSecurityMiddleware(req: CrossAppRequest, res: Response, next: NextFunction) {
  const origin = req.get('Origin');
  const userAgent = req.get('User-Agent');
  const referer = req.get('Referer');
  
  // Determine source application
  if (origin?.includes('chat.haahii.com')) {
    req.sourceApp = 'travel-ai-bot';
    req.allowedOperations = ['read', 'create_session', 'log_message', 'retrieve_context'];
  } else if (origin?.includes('admin.haahii.com')) {
    req.sourceApp = 'admin-web';
    req.allowedOperations = ['admin_all']; // Admin has full access
  } else if (origin?.includes('localhost:3000') || origin?.includes('localhost:3100') || origin?.includes('localhost:3200')) {
    // Development environment
    req.sourceApp = req.sourceApp || 'external';
    req.allowedOperations = ['dev_all'];
  } else {
    req.sourceApp = 'external';
    req.allowedOperations = ['public_only'];
  }

  // Log cross-app requests for security monitoring
  console.log(`Cross-app request: ${req.sourceApp} -> ${req.method} ${req.originalUrl}`, {
    origin,
    userAgent: userAgent?.substring(0, 100),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  next();
}

export function validateCrossAppOperation(requiredOperation: string) {
  return (req: CrossAppRequest, res: Response, next: NextFunction) => {
    const allowedOps = req.allowedOperations || [];
    
    if (allowedOps.includes('admin_all') || allowedOps.includes('dev_all')) {
      return next(); // Admin and dev have full access
    }
    
    if (allowedOps.includes(requiredOperation)) {
      return next();
    }
    
    // Check for specific operation permissions
    if (requiredOperation === 'admin_write' && !allowedOps.includes('admin_all')) {
      return res.status(403).json({ 
        error: 'FORBIDDEN_OPERATION',
        message: 'Admin write operation not allowed from this application',
        sourceApp: req.sourceApp
      });
    }
    
    if (requiredOperation === 'user_data' && !allowedOps.includes('read')) {
      return res.status(403).json({ 
        error: 'FORBIDDEN_OPERATION',
        message: 'User data access not allowed from this application',
        sourceApp: req.sourceApp
      });
    }
    
    next();
  };
}
