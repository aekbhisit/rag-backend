import { Request, Response, NextFunction } from 'express';
import { applicationRegistry } from '../services/applicationRegistry';
import { cacheService } from '../services/cacheService';

interface SystemRateLimitRequest extends Request {
  gatewayMetadata?: {
    sourceApp: string;
    securityLevel: 'high' | 'medium' | 'low';
  };
}

export function systemRateLimiterMiddleware(req: SystemRateLimitRequest, res: Response, next: NextFunction) {
  const origin = req.get('Origin');
  const app = applicationRegistry.getApplicationByOrigin(origin || '');
  const ip = req.ip;
  
  if (!app) {
    // Apply default rate limiting for unknown applications
    return applyRateLimit(req, res, next, {
      windowMs: 60000,
      maxRequests: 100,
      identifier: `unknown:${ip}`
    });
  }

  // Apply application-specific rate limiting
  const config = app.rateLimitConfig;
  const identifier = `${app.appId}:${ip}`;
  
  return applyRateLimit(req, res, next, {
    windowMs: config.windowMs,
    maxRequests: config.maxRequests,
    identifier
  });
}

async function applyRateLimit(
  req: SystemRateLimitRequest, 
  res: Response, 
  next: NextFunction,
  config: { windowMs: number; maxRequests: number; identifier: string }
) {
  try {
    const { windowMs, maxRequests, identifier } = config;
    const windowSeconds = Math.floor(windowMs / 1000);
    
    const rateLimit = await cacheService.checkCustomRateLimit(
      identifier,
      maxRequests,
      windowSeconds
    );
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.floor(rateLimit.resetTime / 1000)));
    res.setHeader('X-RateLimit-Window', String(windowSeconds));
    
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded for this application',
        retryAfter: Math.max(0, Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
        identifier: identifier.split(':')[0], // Don't expose IP
        requestId: (req as any).gatewayMetadata?.requestId
      });
    }
    
    next();
  } catch (error) {
    console.error('Rate limiting error:', error);
    next(); // Allow request on error
  }
}
