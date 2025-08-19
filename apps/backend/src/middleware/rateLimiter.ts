import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';

export interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds
  maxRequests: number;     // Maximum requests per window
  message?: string;        // Custom error message
  statusCode?: number;     // Custom status code
  skipSuccessfulRequests?: boolean; // Skip rate limiting for successful requests
  skipFailedRequests?: boolean;     // Skip rate limiting for failed requests
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter: number;
}

/**
 * Rate limiting middleware using Redis
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Create identifier for rate limiting (IP + User ID if available)
      const identifier = createIdentifier(req);
      
      // Check rate limit
      const rateLimit = await cacheService.checkCustomRateLimit(
        identifier,
        config.maxRequests,
        Math.floor(config.windowMs / 1000)
      );

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': config.maxRequests,
        'X-RateLimit-Remaining': rateLimit.remaining,
        'X-RateLimit-Reset': Math.floor(rateLimit.resetTime / 1000),
        'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      });

      if (!rateLimit.allowed) {
        const statusCode = config.statusCode || 429;
        const message = config.message || 'Too many requests';
        
        return res.status(statusCode).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
          limit: config.maxRequests,
          remaining: 0
        });
      }

      // Continue to next middleware
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // On error, allow the request to proceed
      next();
    }
  };
}

/**
 * Create a unique identifier for rate limiting
 */
function createIdentifier(req: Request): string {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userId = (req as any).user?.id || 'anonymous';
  const tenantId = req.header('X-Tenant-ID') || 'default';
  
  return `ratelimit:${tenantId}:${ip}:${userId}`;
}

/**
 * Predefined rate limiters for different endpoints
 */
export const rateLimiters = {
  // Strict rate limiting for authentication endpoints
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,            // 5 attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again later.',
    statusCode: 429
  }),

  // Moderate rate limiting for API endpoints
  api: createRateLimiter({
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 100,          // 100 requests per minute
    message: 'API rate limit exceeded. Please slow down your requests.',
    statusCode: 429
  }),

  // Generous rate limiting for search endpoints
  search: createRateLimiter({
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 50,           // 50 searches per minute
    message: 'Search rate limit exceeded. Please wait before searching again.',
    statusCode: 429
  }),

  // Strict rate limiting for admin endpoints
  admin: createRateLimiter({
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 30,           // 30 admin operations per minute
    message: 'Admin operation rate limit exceeded.',
    statusCode: 429
  }),

  // Very strict rate limiting for import/export operations
  importExport: createRateLimiter({
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 5,            // 5 import/export operations per minute
    message: 'Import/Export rate limit exceeded. These operations are resource-intensive.',
    statusCode: 429
  }),

  // Custom rate limiter factory
  custom: (windowMs: number, maxRequests: number, message?: string) => 
    createRateLimiter({
      windowMs,
      maxRequests,
      message: message || `Rate limit exceeded. Maximum ${maxRequests} requests per ${Math.floor(windowMs / 1000)} seconds.`
    })
};

/**
 * Dynamic rate limiting based on user role
 */
export function createDynamicRateLimiter(
  defaultConfig: RateLimitConfig,
  roleConfigs: Record<string, RateLimitConfig>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRole = (req as any).user?.role || 'anonymous';
      const config = roleConfigs[userRole] || defaultConfig;
      
      const identifier = createIdentifier(req);
      const rateLimit = await cacheService.checkCustomRateLimit(
        identifier,
        config.maxRequests,
        Math.floor(config.windowMs / 1000)
      );

      // Set headers
      res.set({
        'X-RateLimit-Limit': config.maxRequests,
        'X-RateLimit-Remaining': rateLimit.remaining,
        'X-RateLimit-Reset': Math.floor(rateLimit.resetTime / 1000),
        'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      });

      if (!rateLimit.allowed) {
        return res.status(config.statusCode || 429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: config.message || 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
          limit: config.maxRequests,
          remaining: 0
        });
      }

      next();
    } catch (error) {
      console.error('Dynamic rate limiting error:', error);
      next();
    }
  };
}

/**
 * Tenant-aware rate limiting
 */
export function createTenantRateLimiter(
  baseConfig: RateLimitConfig,
  tenantMultipliers: Record<string, number> = {}
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.header('X-Tenant-ID') || 'default';
      const multiplier = tenantMultipliers[tenantId] || 1;
      
      const config = {
        ...baseConfig,
        maxRequests: Math.floor(baseConfig.maxRequests * multiplier)
      };
      
      const identifier = createIdentifier(req);
      const rateLimit = await cacheService.checkCustomRateLimit(
        identifier,
        config.maxRequests,
        Math.floor(config.windowMs / 1000)
      );

      // Set headers
      res.set({
        'X-RateLimit-Limit': config.maxRequests,
        'X-RateLimit-Remaining': rateLimit.remaining,
        'X-RateLimit-Reset': Math.floor(rateLimit.resetTime / 1000),
        'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      });

      if (!rateLimit.allowed) {
        return res.status(config.statusCode || 429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: config.message || 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
          limit: config.maxRequests,
          remaining: 0
        });
      }

      next();
    } catch (error) {
      console.error('Tenant rate limiting error:', error);
      next();
    }
  };
}

export default rateLimiters;
