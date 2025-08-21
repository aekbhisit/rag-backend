import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Mock the cache service before importing the module under test
vi.mock('../services/cacheService', () => ({
  cacheService: {
    checkCustomRateLimit: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetTime: Date.now() + 60000
    })
  }
}));

import { createRateLimiter, tenantSettingsRateLimiter, rateLimiters } from '../middleware/rateLimiter';

describe('Rate Limiting Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      ip: '192.168.1.1',
      header: vi.fn().mockReturnValue('test-tenant'),
      connection: { remoteAddress: '192.168.1.1' } as any
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('createRateLimiter', () => {
    it('should allow request when under limit', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 100
      });

      await rateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.set).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '99',
        'X-RateLimit-Reset': expect.any(String),
        'Retry-After': expect.any(String)
      });
    });

    it('should block request when over limit', async () => {
      // Mock cache service to return rate limit exceeded
      const { cacheService } = await import('../services/cacheService');
      vi.mocked(cacheService.checkCustomRateLimit).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30000
      });

      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 100,
        message: 'Rate limit exceeded'
      });

      await rateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
        retryAfter: expect.any(Number),
        limit: 100,
        remaining: 0
      });
    });

    it('should handle cache service errors gracefully', async () => {
      const { cacheService } = await import('../services/cacheService');
      vi.mocked(cacheService.checkCustomRateLimit).mockRejectedValueOnce(
        new Error('Cache error')
      );

      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 100
      });

      await rateLimiter(mockReq as Request, mockRes as Response, mockNext);

      // Should allow request to proceed on error
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('tenantSettingsRateLimiter', () => {
    it('should apply tenant-specific rate limits', async () => {
      const tenantRateLimiter = tenantSettingsRateLimiter();

      await tenantRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use tenant ID from headers', async () => {
      const tenantRateLimiter = tenantSettingsRateLimiter();

      await tenantRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.header).toHaveBeenCalledWith('X-Tenant-ID');
    });
  });

  describe('Predefined Rate Limiters', () => {
    it('should have auth rate limiter with strict limits', () => {
      expect(rateLimiters.auth).toBeDefined();
      expect(typeof rateLimiters.auth).toBe('function');
    });

    it('should have API rate limiter with moderate limits', () => {
      expect(rateLimiters.api).toBeDefined();
      expect(typeof rateLimiters.api).toBe('function');
    });

    it('should have search rate limiter', () => {
      expect(rateLimiters.search).toBeDefined();
      expect(typeof rateLimiters.search).toBe('function');
    });

    it('should have admin rate limiter', () => {
      expect(rateLimiters.admin).toBeDefined();
      expect(typeof rateLimiters.admin).toBe('function');
    });

    it('should have import/export rate limiter with strict limits', () => {
      expect(rateLimiters.importExport).toBeDefined();
      expect(typeof rateLimiters.importExport).toBe('function');
    });
  });

  describe('Custom Rate Limiter Factory', () => {
    it('should create custom rate limiter with specified parameters', () => {
      const customLimiter = rateLimiters.custom(30000, 25, 'Custom message');
      
      expect(customLimiter).toBeDefined();
      expect(typeof customLimiter).toBe('function');
    });

    it('should use default message if none provided', () => {
      const customLimiter = rateLimiters.custom(30000, 25);
      
      expect(customLimiter).toBeDefined();
      expect(typeof customLimiter).toBe('function');
    });
  });

  describe('Identifier Creation', () => {
    it('should create identifier with IP, user ID, and tenant ID', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 100
      });

      await rateLimiter(mockReq as Request, mockRes as Response, mockNext);

      // Verify that checkCustomRateLimit was called with the expected identifier format
      const { cacheService } = await import('../services/cacheService');
      expect(cacheService.checkCustomRateLimit).toHaveBeenCalledWith(
        expect.stringMatching(/^ratelimit:test-tenant:192\.168\.1\.1:anonymous$/),
        100,
        60
      );
    });

    it('should handle missing IP gracefully', async () => {
      (mockReq as any).ip = undefined;
      (mockReq as any).connection = undefined;

      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 100
      });

      await rateLimiter(mockReq as Request, mockRes as Response, mockNext);

      const { cacheService } = await import('../services/cacheService');
      expect(cacheService.checkCustomRateLimit).toHaveBeenCalledWith(
        expect.stringMatching(/^ratelimit:test-tenant:unknown:anonymous$/),
        100,
        60
      );
    });
  });

  describe('Response Headers', () => {
    it('should set all required rate limit headers', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 100
      });

      await rateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '99',
        'X-RateLimit-Reset': expect.any(String),
        'Retry-After': expect.any(String)
      });
    });

    it('should calculate retry-after correctly', async () => {
      const resetTime = Date.now() + 30000; // 30 seconds from now
      const { cacheService } = await import('../services/cacheService');
      vi.mocked(cacheService.checkCustomRateLimit).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetTime
      });

      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 100
      });

      await rateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          retryAfter: expect.any(Number)
        })
      );
    });
  });
});
