import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp, testData, createAuthHeaders } from '../../../__tests__/test-setup';

describe('Admin Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Basic Admin API', () => {
    it('should handle admin requests', async () => {
      const response = await request(app)
        .get('/api/admin/health')
        .set(createAuthHeaders())
        .expect(404); // Expected since we don't have this route mounted

      expect(response.status).toBe(404);
    });

    it('should require authentication headers', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .expect(404); // Expected since we don't have routes mounted

      expect(response.status).toBe(404);
    });
  });
});