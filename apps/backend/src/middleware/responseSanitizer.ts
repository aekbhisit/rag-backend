import { Request, Response, NextFunction } from 'express';
import { dataSanitizer } from '../utils/dataSanitizer';

export function responseSanitizerMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  const originalSend = res.send;

  // Sanitize JSON responses
  res.json = function(body) {
    // Allow explicit bypass from route handlers
    if ((res as any).locals && (res as any).locals.skipSanitize === true) {
      return originalJson.call(this, body);
    }
    const context = {
      endpoint: req.originalUrl,
      method: req.method,
      user: (req as any).user,
      direction: 'response', // Mark as response direction
    };

    // Skip sanitization for certain endpoints that need raw data
    const skipSanitization = req.originalUrl.includes('/messages') ||
                            req.originalUrl.includes('/chat') ||
                            req.originalUrl.includes('/health') ||
                            req.originalUrl.includes('/ping') ||
                            req.originalUrl.includes('/admin/');

    try { console.debug('ResponseSanitizer.json', { url: req.originalUrl, skipSanitization }); } catch {}

    if (skipSanitization) {
      return originalJson.call(this, body);
    }

    // Determine if response contains sensitive data
    const isSensitive = (
      (req.originalUrl.includes('/admin/') && !req.originalUrl.includes('/admin/sessions')) ||
      req.originalUrl.includes('/auth/') ||
      req.originalUrl.includes('/users')
    );

    const sanitizedBody = isSensitive 
      ? dataSanitizer.sanitizeObject(body, { sensitive: true, direction: 'response', endpoint: req.originalUrl }) 
      : body;
    
    return originalJson.call(this, sanitizedBody);
  };

  // Sanitize text responses
  res.send = function(body) {
    // Allow explicit bypass from route handlers
    if ((res as any).locals && (res as any).locals.skipSanitize === true) {
      return originalSend.call(this, body);
    }
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        const context = {
          endpoint: req.originalUrl,
          method: req.method,
          user: (req as any).user,
          direction: 'response', // Mark as response direction
        };
        
        // Skip sanitization for certain endpoints that need raw data
        const skipSanitization = req.originalUrl.includes('/messages') ||
                                req.originalUrl.includes('/chat') ||
                                req.originalUrl.includes('/health') ||
                                req.originalUrl.includes('/ping') ||
                                req.originalUrl.includes('/admin/');

        try { console.debug('ResponseSanitizer.send', { url: req.originalUrl, skipSanitization }); } catch {}

        if (skipSanitization) {
          return originalSend.call(this, body);
        }
        
        const isSensitive = (
          (req.originalUrl.includes('/admin/') && !req.originalUrl.includes('/admin/sessions')) || 
          req.originalUrl.includes('/auth/') ||
          req.originalUrl.includes('/users')
        );
        
        const sanitized = isSensitive 
          ? dataSanitizer.sanitizeObject(parsed, { sensitive: true, direction: 'response', endpoint: req.originalUrl }) 
          : parsed;
        body = JSON.stringify(sanitized);
      } catch {
        // Not JSON, leave as is
      }
    }
    
    return originalSend.call(this, body);
  };

  next();
}
