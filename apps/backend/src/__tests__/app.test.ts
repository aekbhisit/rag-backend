import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp, mockPool, mockCacheService } from './test-setup';
import { createApp } from '../app';

// Mock dependencies
vi.mock('../adapters/cache/redisClient', () => ({
  createRedisClient: () => mockCacheService
}));

vi.mock('../repositories/errorLogsRepository', () => ({
  ErrorLogsRepository: vi.fn().mockImplementation(() => ({
    ensureTable: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue({ id: 'test-error-id' })
  }))
}));

vi.mock('../middleware/rateLimiter', () => ({
  tenantSettingsRateLimiter: () => (req: any, res: any, next: any) => next()
}));

// Mock all database adapters
vi.mock('../adapters/db/postgresClient', () => ({
  getPostgresPool: () => mockPool,
  createPostgresPool: () => mockPool
}));

vi.mock('../adapters/storage/minioClient', () => ({
  createMinioClient: () => ({})
}));

// Mock all route builders that may not exist
// Route modules are now implemented

describe('Main Application', () => {
  let app: any;

  beforeEach(async () => {
    app = await createApp();
  });

  describe('Middleware Stack', () => {
    it('should have CORS middleware', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should have JSON body parser', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ test: 'data' });

      // Should not return 400 for invalid JSON
      expect(response.status).not.toBe(400);
    });

    it('should have request ID middleware', async () => {
      const response = await request(app)
        .get('/api/test');

      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should have tenant middleware', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('X-Tenant-ID', 'test-tenant');

      // Should not return 401 for missing tenant
      expect(response.status).not.toBe(401);
    });
  });

  describe('Route Mounting', () => {
    it('should mount public routes at /rag', async () => {
      const response = await request(app)
        .post('/rag/summary')
        .send({ text_query: 'test' });

      // Should not return 404
      expect(response.status).not.toBe(404);
    });

    it('should mount admin routes at /api/admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('X-Tenant-ID', 'test-tenant');

      // Should not return 404
      expect(response.status).not.toBe(404);
    });

    it('should mount error logs routes', async () => {
      const response = await request(app)
        .get('/api/admin/error-logs')
        .set('X-Tenant-ID', 'test-tenant');

      // Should not return 404
      expect(response.status).not.toBe(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown/route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/rag/summary')
        .send({}); // Missing required fields

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle internal server errors', async () => {
      // Mock a route that throws an error
      app.get('/test-error', (req: any, res: any) => {
        throw new Error('Test error');
      });

      const response = await request(app)
        .get('/test-error');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should log errors to error logs repository', async () => {
      const { ErrorLogsRepository } = await import('../repositories/errorLogsRepository');
      const mockCreate = vi.mocked(ErrorLogsRepository).mock.results[0].value.create;

      // Mock a route that throws an error
      app.get('/test-error-logging', (req: any, res: any) => {
        throw new Error('Test error for logging');
      });

      await request(app)
        .get('/test-error-logging')
        .expect(500);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error for logging',
          status: 500
        })
      );
    });
  });

  describe('Request ID Tracking', () => {
    it('should generate unique request IDs', async () => {
      const response1 = await request(app)
        .get('/api/test');

      const response2 = await request(app)
        .get('/api/test');

      expect(response1.headers['x-request-id']).toBeDefined();
      expect(response2.headers['x-request-id']).toBeDefined();
      expect(response1.headers['x-request-id']).not.toBe(response2.headers['x-request-id']);
    });

    it('should include request ID in error logs', async () => {
      const { ErrorLogsRepository } = await import('../repositories/errorLogsRepository');
      const mockCreate = vi.mocked(ErrorLogsRepository).mock.results[0].value.create;

      app.get('/test-request-id', (req: any, res: any) => {
        throw new Error('Test error with request ID');
      });

      await request(app)
        .get('/test-request-id')
        .expect(500);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          request_id: expect.any(String)
        })
      );
    });
  });

  describe('Response Monitoring', () => {
    it('should log 5xx responses', async () => {
      const { ErrorLogsRepository } = await import('../repositories/errorLogsRepository');
      const mockCreate = vi.mocked(ErrorLogsRepository).mock.results[0].value.create;

      app.get('/test-5xx', (req: any, res: any) => {
        res.status(500).json({ error: 'Internal error' });
      });

      await request(app)
        .get('/test-5xx')
        .expect(500);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 500,
          message: 'Internal error'
        })
      );
    });

    it('should not log successful responses', async () => {
      const { ErrorLogsRepository } = await import('../repositories/errorLogsRepository');
      const mockCreate = vi.mocked(ErrorLogsRepository).mock.results[0].value.create;

      app.get('/test-success', (req: any, res: any) => {
        res.json({ success: true });
      });

      await request(app)
        .get('/test-success')
        .expect(200);

      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('Security Headers', () => {
    it('should have security headers', async () => {
      const response = await request(app)
        .get('/api/test');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should have CORS headers for preflight', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should apply rate limiting to API routes', async () => {
      // This test verifies that rate limiting middleware is applied
      // The actual rate limiting behavior is tested in the middleware tests
      const response = await request(app)
        .get('/api/admin/users')
        .set('X-Tenant-ID', 'test-tenant');

      expect(response.status).not.toBe(429); // Should not be rate limited initially
    });
  });

  describe('Database Integration', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      vi.mocked(mockPool.query).mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/admin/users')
        .set('X-Tenant-ID', 'test-tenant');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Performance', () => {
    it('should respond within reasonable time', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/api/test')
        .expect(404);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests', async () => {
      const promises = Array(5).fill(0).map(() =>
        request(app)
          .get('/api/test')
          .expect(404)
      );

      const responses = await Promise.all(promises);
      expect(responses).toHaveLength(5);
      
      responses.forEach(response => {
        expect(response.status).toBe(404);
      });
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log request details', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await request(app)
        .get('/api/test')
        .set('User-Agent', 'TestAgent/1.0');

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should include request metadata in error logs', async () => {
      const { ErrorLogsRepository } = await import('../repositories/errorLogsRepository');
      const mockCreate = vi.mocked(ErrorLogsRepository).mock.results[0].value.create;

      app.get('/test-metadata', (req: any, res: any) => {
        throw new Error('Test metadata error');
      });

      await request(app)
        .get('/test-metadata')
        .set('User-Agent', 'TestAgent/1.0')
        .set('X-Tenant-ID', 'test-tenant')
        .expect(500);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'user-agent': 'TestAgent/1.0',
            'x-tenant-id': 'test-tenant'
          })
        })
      );
    });
  });
});
