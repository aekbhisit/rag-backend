import express from 'express';
import { Pool } from 'pg';
import { createClient } from 'redis';

// Mock Redis client
export const mockRedisClient = {
  get: async () => null,
  set: async () => 'OK',
  setEx: async () => 'OK',
  del: async () => 1,
  exists: async () => 0,
  incr: async () => 1,
  expire: async () => 1,
  disconnect: async () => {},
} as any;

// Create a shared query implementation that both pool and client can use
const mockQueryImplementation = vi.fn().mockImplementation(async (sql: string, params: any[] = []) => {
    // INSERT operations
    if (sql.includes('INSERT INTO error_logs')) {
      return {
        rows: [{
          id: 'test-error-id',
          tenant_id: params[1] || 'test-tenant-id',
          endpoint: params[2],
          method: params[3],
          status: params[4],
          message: params[5],
          error_code: params[6],
          stack: params[7],
          file: params[8],
          line: params[9],
          column_no: params[10],
          headers: params[11],
          query: params[12],
          body: params[13],
          request_id: params[14],
          created_at: new Date().toISOString()
        }]
      };
    }
    
    if (sql.includes('INSERT INTO contexts')) {
      return {
        rows: [{
          id: 'test-generated-id',
          tenant_id: params[0] || 'test-tenant-id',
          type: params[1] || 'text',
          title: params[2] || 'Test Title',
          body: params[3] || 'Test Body',
          instruction: params[4] || null,
          attributes: params[5] || {},
          trust_level: params[6] || 1,
          language: params[7] || 'en',
          status: params[8] || 'active',
          keywords: params[9] || 'test',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      };
    }
    
    if (sql.includes('INSERT INTO users')) {
      return {
        rows: [{
          id: 'test-generated-id',
          tenant_id: params[0] || 'test-tenant-id',
          email: params[1] || 'test@example.com',
          role: params[2] || 'admin',
          timezone: params[3] || 'UTC',
          name: params[4] || null,
          status: params[5] || 'active',
          last_login: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      };
    }
    
    if (sql.includes('INSERT INTO categories')) {
      return {
        rows: [{
          id: 'test-generated-id',
          tenant_id: params[0] || 'test-tenant-id',
          name: params[1] || 'Test Category',
          description: params[2] || 'Test Description',
          color: params[3] || '#000000',
          icon: params[4] || 'icon',
          weight: params[5] || 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      };
    }
    
    if (sql.includes('INSERT INTO tenants')) {
      return {
        rows: [{
          id: 'test-generated-id',
          name: params[0] || 'Test Tenant',
          alias: params[1] || 'test-alias',
          domain: params[2] || 'test.com',
          status: params[3] || 'active',
          settings: params[4] || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      };
    }
    
    if (sql.includes('INSERT INTO')) {
      // Generic fallback for other INSERT operations
      return {
        rows: [{
          id: 'test-generated-id',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      };
    }
    

    
    // SELECT operations with proper pagination structure
    if (sql.includes('COUNT(*)')) {
      return { rows: [{ count: '5' }] };
    }
    
    if (sql.includes('SELECT') && sql.includes('error_logs')) {
      if (sql.includes('WHERE id =')) {
        const id = params[0];
        if (id === 'non-existent-id') {
          return { rows: [] };
        }
        return {
          rows: [{
            id: id || 'test-error-id',
            tenant_id: 'test-tenant-id',
            endpoint: '/api/test',
            method: 'GET',
            status: 500,
            message: 'Test error',
            error_code: null,
            stack: null,
            file: null,
            line: null,
            column_no: null,
            headers: null,
            query: null,
            body: null,
            request_id: null,
            created_at: new Date().toISOString()
          }]
        };
      }
      return {
        rows: [{
          id: 'test-error-id',
          tenant_id: 'test-tenant-id',
          endpoint: '/api/test',
          method: 'GET',
          status: 500,
          message: 'Test error',
          error_code: null,
          stack: null,
          file: null,
          line: null,
          column_no: null,
          headers: null,
          query: null,
          body: null,
          request_id: null,
          created_at: new Date().toISOString()
        }]
      };
    }
    
    if (sql.includes('SELECT') && sql.includes('tenants')) {
      if (sql.includes('WHERE id =')) {
        return {
          rows: [{
            id: 'test-tenant-id',
            name: 'Test Tenant',
            settings: {
              api: {
                rateLimitPerMinute: 100,
                rateLimitPerDay: 1000,
                ipAllowlist: []
              }
            },
            created_at: new Date().toISOString()
          }]
        };
      }
      return {
        rows: [{
          id: 'test-tenant-id',
          name: 'Test Tenant',
          settings: {
            api: {
              rateLimitPerMinute: 100,
              rateLimitPerDay: 1000,
              ipAllowlist: []
            }
          },
          created_at: new Date().toISOString()
        }]
      };
    }
    
    if (sql.includes('SELECT') && (sql.includes('users') || sql.includes('user'))) {
      if (sql.includes('WHERE id =') || sql.includes('WHERE email =')) {
        return {
          rows: [{
            id: 'test-user-id',
            email: 'test@example.com',
            role: 'admin',
            tenant_id: 'test-tenant-id',
            created_at: new Date().toISOString()
          }]
        };
      }
      return {
        rows: [{
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'admin',
          tenant_id: 'test-tenant-id',
          created_at: new Date().toISOString()
        }]
      };
    }
    
    if (sql.includes('SELECT') && sql.includes('contexts')) {
      return {
        rows: [{
          id: 'test-context-id',
          title: 'Test Context',
          body: 'Test body content',
          type: 'text',
          embedding: [0.1, 0.2, 0.3],
          tenant_id: 'test-tenant-id',
          created_at: new Date().toISOString()
        }]
      };
    }
    
    if (sql.includes('SELECT') && sql.includes('categories')) {
      return {
        rows: [{
          id: 'test-category-id',
          name: 'Test Category',
          tenant_id: 'test-tenant-id',
          created_at: new Date().toISOString()
        }]
      };
    }
    
    // UPDATE operations
    if (sql.includes('UPDATE')) {
      return {
        rows: [{
          id: 'test-updated-id',
          updated_at: new Date().toISOString()
        }]
      };
    }
    
    // DELETE operations
    if (sql.includes('DELETE')) {
      return { rows: [], rowCount: 1 };
    }
    
    // Table/Index creation
    if (sql.includes('CREATE TABLE') || sql.includes('CREATE INDEX') || sql.includes('CREATE EXTENSION')) {
      return { rows: [] };
    }
    
    // Default empty result
    return { rows: [] };
  });

// Mock Postgres pool
export const mockPool = {
  query: mockQueryImplementation,
  connect: async () => ({
    query: mockQueryImplementation,
    release: vi.fn()
  }),
  end: vi.fn(),
} as any;

// Mock cache service
export const mockCacheService = {
  checkCustomRateLimit: async () => ({
    allowed: true,
    remaining: 99,
    resetTime: Date.now() + 60000
  }),
  get: async () => null,
  set: async () => true,
  delete: async () => true,
} as any;

// Create test app with common middleware
export function createTestApp() {
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Mock tenant middleware
  app.use((req, _res, next) => {
    (req as any).tenantId = 'test-tenant-id';
    (req as any).user = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'admin',
      tenant_id: 'test-tenant-id'
    };
    next();
  });
  
  // Mock request ID middleware
  app.use((req, _res, next) => {
    (req as any).request_id = 'test-request-id';
    next();
  });
  
  return app;
}

// Test data factories
export const testData = {
  tenant: {
    id: 'test-tenant-id',
    name: 'Test Tenant',
    settings: {
      api: {
        rateLimitPerMinute: 100,
        rateLimitPerDay: 1000,
        ipAllowlist: []
      }
    }
  },
  
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    password: 'password123',
    role: 'admin',
    tenant_id: 'test-tenant-id'
  },
  
  context: {
    id: 'test-context-id',
    title: 'Test Context',
    body: 'Test body content',
    type: 'text',
    attributes: { source: 'test' },
    trust_level: 1,
    keywords: ['test', 'example'],
    embedding: [0.1, 0.2, 0.3],
    tenant_id: 'test-tenant-id'
  },
  
  category: {
    id: 'test-category-id',
    name: 'Test Category',
    description: 'Test category description',
    tenant_id: 'test-tenant-id'
  },
  
  intent: {
    id: 'test-intent-id',
    scope: 'general',
    action: 'question',
    description: 'Test intent',
    tenant_id: 'test-tenant-id'
  }
};

// Helper to create authenticated request
export function createAuthHeaders(tenantId = 'test-tenant-id') {
  return {
    'X-Tenant-ID': tenantId,
    'Authorization': 'Bearer test-token',
    'Content-Type': 'application/json'
  };
}
