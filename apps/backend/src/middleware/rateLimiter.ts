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
      const identifier = createIdentifier(req);
      const rateLimit = await cacheService.checkCustomRateLimit(
        identifier,
        config.maxRequests,
        Math.floor(config.windowMs / 1000)
      );
      res.set({
        'X-RateLimit-Limit': String(config.maxRequests),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(Math.floor(rateLimit.resetTime / 1000)),
        'Retry-After': String(Math.max(0, Math.ceil((rateLimit.resetTime - Date.now()) / 1000)))
      });
      if (!rateLimit.allowed) {
        const statusCode = config.statusCode || 429;
        const message = config.message || 'Too many requests';
        return res.status(statusCode).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfter: Math.max(0, Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
          limit: config.maxRequests,
          remaining: 0
        });
      }
      next();
    } catch (error) {
      // On error, allow the request to proceed
      // eslint-disable-next-line no-console
      console.error('Rate limiting error:', error);
      next();
    }
  };
}

/**
 * Create a unique identifier for rate limiting
 */
function createIdentifier(req: Request): string {
  const ip = (req.ip || (req.connection as any)?.remoteAddress || 'unknown').toString();
  const userId = ((req as any).user?.id || 'anonymous').toString();
  const tenantId = (req.header('X-Tenant-ID') || process.env.TENANT_ID || process.env.DEFAULT_TENANT_ID || 'default').toString();
  return `ratelimit:${tenantId}:${ip}:${userId}`;
}

/**
 * Predefined rate limiters for different endpoints
 */
export const rateLimiters = {
  auth: createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 5, message: 'Too many authentication attempts. Please try again later.', statusCode: 429 }),
  api: createRateLimiter({ windowMs: 60 * 1000, maxRequests: 100, message: 'API rate limit exceeded. Please slow down your requests.', statusCode: 429 }),
  search: createRateLimiter({ windowMs: 60 * 1000, maxRequests: 50, message: 'Search rate limit exceeded. Please wait before searching again.', statusCode: 429 }),
  admin: createRateLimiter({ windowMs: 60 * 1000, maxRequests: 30, message: 'Admin operation rate limit exceeded.', statusCode: 429 }),
  importExport: createRateLimiter({ windowMs: 60 * 1000, maxRequests: 5, message: 'Import/Export rate limit exceeded. These operations are resource-intensive.', statusCode: 429 }),
  custom: (windowMs: number, maxRequests: number, message?: string) => createRateLimiter({ windowMs, maxRequests, message: message || `Rate limit exceeded. Maximum ${maxRequests} requests per ${Math.floor(windowMs / 1000)} seconds.` })
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
      const cfg = roleConfigs[userRole] || defaultConfig;
      const identifier = createIdentifier(req);
      const rateLimit = await cacheService.checkCustomRateLimit(
        identifier,
        cfg.maxRequests,
        Math.floor(cfg.windowMs / 1000)
      );
      res.set({
        'X-RateLimit-Limit': String(cfg.maxRequests),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(Math.floor(rateLimit.resetTime / 1000)),
        'Retry-After': String(Math.max(0, Math.ceil((rateLimit.resetTime - Date.now()) / 1000)))
      });
      if (!rateLimit.allowed) {
        return res.status(cfg.statusCode || 429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: cfg.message || 'Rate limit exceeded',
          retryAfter: Math.max(0, Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
          limit: cfg.maxRequests,
          remaining: 0
        });
      }
      next();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Dynamic rate limiting error:', error);
      next();
    }
  };
}

/**
 * Tenant-aware rate limiting using tenant settings (per-minute and per-day)
 */
export function tenantSettingsRateLimiter() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || process.env.TENANT_ID || process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000000').toString();
      const ip = (req.ip || (req.connection as any)?.remoteAddress || '').toString();

      // Load tenant settings lazily
      let perMinute = 60;
      let perDay = 5000;
      let ipAllowlist: string[] = [];
      try {
        const { TenantsRepository } = await import('../repositories/tenantsRepository.js');
        const { getPostgresPool } = await import('../adapters/db/postgresClient.js');
        const repo = new TenantsRepository(getPostgresPool());
        const t = await repo.get(tenantId);
        perMinute = Number(t?.settings?.api?.rateLimitPerMinute ?? perMinute) || perMinute;
        perDay = Number(t?.settings?.api?.rateLimitPerDay ?? perDay) || perDay;
        ipAllowlist = Array.isArray(t?.settings?.api?.ipAllowlist) ? t!.settings.api.ipAllowlist : [];
      } catch {}

      // Allowlist bypass
      if (ipAllowlist.includes(ip)) return next();

      // Minute window
      const idBase = createIdentifier(req);
      const minute = await cacheService.checkCustomRateLimit(
        `${idBase}:m`,
        perMinute,
        60
      );
      res.set({
        'X-RateLimit-Limit-Minute': String(perMinute),
        'X-RateLimit-Remaining-Minute': String(minute.remaining),
        'X-RateLimit-Reset-Minute': String(Math.floor(minute.resetTime / 1000))
      });
      if (!minute.allowed) {
        return res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Per-minute rate limit exceeded',
          retryAfter: Math.max(0, Math.ceil((minute.resetTime - Date.now()) / 1000)),
          limit: perMinute,
          remaining: 0
        });
      }

      // Day window
      const day = await cacheService.checkCustomRateLimit(
        `${idBase}:d`,
        perDay,
        86400
      );
      res.set({
        'X-RateLimit-Limit-Day': String(perDay),
        'X-RateLimit-Remaining-Day': String(day.remaining),
        'X-RateLimit-Reset-Day': String(Math.floor(day.resetTime / 1000))
      });
      if (!day.allowed) {
        return res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Daily rate limit exceeded',
          retryAfter: Math.max(0, Math.ceil((day.resetTime - Date.now()) / 1000)),
          limit: perDay,
          remaining: 0
        });
      }

      next();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Tenant rate limiting error:', error);
      next();
    }
  };
}

// Enhanced user-based rate limiter
export function createUserBasedRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Create identifier based on user if authenticated, otherwise IP
      const userId = (req as any).user?.userId;
      const identifier = userId ? `user:${userId}` : createIdentifier(req);
      
      const rateLimit = await cacheService.checkCustomRateLimit(
        identifier,
        config.maxRequests,
        Math.floor(config.windowMs / 1000)
      );
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': String(config.maxRequests),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(Math.floor(rateLimit.resetTime / 1000)),
      });
      
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: config.message || 'Rate limit exceeded',
          retryAfter: Math.max(0, Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
        });
      }
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      next(); // Allow request on error
    }
  };
}

// Export enhanced rate limiters
export const enhancedRateLimiters = {
  ...rateLimiters,
  userBased: createUserBasedRateLimiter,
};

export default rateLimiters;


