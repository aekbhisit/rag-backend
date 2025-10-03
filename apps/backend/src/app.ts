import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { z } from 'zod';
import { ContextRetrievalRequestSchema } from '@rag/shared';
import * as db from './adapters/db/postgresClient';
import * as cache from './adapters/cache/redisClient';
import * as storage from './adapters/storage/minioClient';
import { getPostgresPool } from './adapters/db/postgresClient';
import { buildContextsRouter } from './routes/admin/contexts';
import type { ErrorResponse } from './types/error';
import { buildIntentsRouter } from './routes/admin/intents';
import { getTenantIdFromReq } from './config/tenant';
import { tenantSettingsRateLimiter } from './middleware/rateLimiter';

export async function createApp() {
  const app = express();

  // Disable etag to avoid 304 Not Modified for dynamic admin APIs
  app.set('etag', false);

  app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  }));
  app.use(cors({
    origin: true,
    methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','X-Tenant-ID','X-User-ID','Accept','Authorization','Cache-Control','Pragma'],
  }));
  app.options('*', cors({
    origin: true,
    methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','X-Tenant-ID','X-User-ID','Accept','Authorization','Cache-Control','Pragma'],
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(morgan('dev'));

  // Assign a request id for cross-referencing logs
  app.use((req, res, next) => {
    const rid = 'req_' + Math.random().toString(36).slice(2);
    (req as any).request_id = rid;
    try { res.setHeader('X-Request-Id', rid); } catch {}
    next();
  });

  // Capture any 5xx responses that did not go through error handler
  app.use((req, res, next) => {
    const startedAt = Date.now();
    const originalSend = res.send;
    const originalJson = res.json;
    const originalStatus = res.status;
    
    // Track if response has been sent
    let responseSent = false;
    let responseStatus = 200;
    
    // Override res.send to track response
    res.send = function(body) {
      if (!responseSent) {
        responseSent = true;
        responseStatus = res.statusCode;
        console.log(`Response sent: ${req.method} ${req.originalUrl || req.url} -> ${responseStatus}`);
      }
      return originalSend.call(this, body);
    };
    
    // Override res.json to track response
    res.json = function(body) {
      if (!responseSent) {
        responseSent = true;
        responseStatus = res.statusCode;
        console.log(`Response sent: ${req.method} ${req.originalUrl || req.url} -> ${responseStatus}`);
      }
      return originalJson.call(this, body);
    };
    
    // Override res.status to track status changes
    res.status = function(code) {
      responseStatus = code;
      console.log(`Status changed: ${req.method} ${req.originalUrl || req.url} -> ${code}`);
      return originalStatus.call(this, code);
    };
    
    res.on('finish', async () => {
      try {
        if (res.statusCode >= 500) {
          console.error(`HTTP ${res.statusCode} error on ${req.method} ${req.originalUrl || req.url}`);
          console.error('Response tracking info:', {
            responseSent,
            responseStatus,
            finalStatus: res.statusCode,
            requestId: (req as any).request_id,
            tenantId: req.header('X-Tenant-ID')
          });
          
          // Try to log to database, but don't fail if database is unavailable
          try {
            const { ErrorLogsRepository } = await import('./repositories/errorLogsRepository.js');
            const repo = new ErrorLogsRepository(getPostgresPool());
            await repo.create({
              tenant_id: (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString(),
              endpoint: req.originalUrl || req.url,
              method: req.method,
              http_status: res.statusCode,
              message: `HTTP ${res.statusCode} without thrown error - Response tracking: sent=${responseSent}, trackedStatus=${responseStatus}`,
              error_code: 'HTTP_ERROR',
              stack: null,
              file: null,
              line: null,
              column_no: null,
              headers: req.headers,
              query: req.query,
              body: req.body,
              request_id: (req as any).request_id || null,
              log_status: 'open',
              notes: `Response tracking: sent=${responseSent}, trackedStatus=${responseStatus}, finalStatus=${res.statusCode}`,
              fixed_by: null,
              fixed_at: null,
            } as any);
            console.log('Error logged to database successfully');
          } catch (dbError) {
            console.error('Failed to log error to database:', dbError);
            // Fallback: log to console/file
            console.error('Error details:', {
              tenant_id: (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString(),
              endpoint: req.originalUrl || req.url,
              method: req.method,
              status: res.statusCode,
              request_id: (req as any).request_id || null,
              timestamp: new Date().toISOString(),
              responseTracking: {
                responseSent,
                responseStatus,
                finalStatus: res.statusCode
              }
            });
          }
        }
      } catch (error) {
        console.error('Error in response finish handler:', error);
      }
    });
    next();
  });

  // Ensure admin APIs are never cached by browsers/proxies
  app.use('/api/admin', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // Simple API-key + tenant extractor placeholders
  app.use((req, _res, next) => {
    (req as any).tenantId = getTenantIdFromReq(req);
    next();
  });

  app.get('/api/health', async (_req, res) => {
    try {
      const results = await Promise.all([
        db.health(),
        cache.health(),
        storage.health(),
      ]);
      const [dbH, cacheH, storageH] = results as any[];
      const overall = [dbH, cacheH, storageH].every((h: any) => h.status === 'ok') ? 'ok' : 'degraded';
      res.json({ status: overall, db: dbH, cache: cacheH, storage: storageH });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Health check failed',
        error: String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Simple ping endpoint that doesn't require database access
  app.get('/api/ping', (_req, res) => {
    res.json({ 
      status: 'ok', 
      message: 'pong',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Test endpoints for debugging (placed before admin routes to ensure error handling works)
  app.get('/api/test-categories', async (req, res) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      console.log('Testing categories endpoint for tenant:', tenantId);
      
      const { getPostgresPool } = await import('./adapters/db/postgresClient.js');
      const pool = getPostgresPool();
      const client = await pool.connect();
      
      try {
        // Test basic query
        const countResult = await client.query('SELECT COUNT(*) FROM categories WHERE tenant_id = $1', [tenantId]);
        const count = countResult.rows[0]?.count || '0';
        
        // Test hierarchy query
        let hierarchyResult;
        try {
          hierarchyResult = await client.query(`
            WITH RECURSIVE category_tree AS (
              SELECT id, tenant_id, name, slug, level, sort_order
              FROM categories 
              WHERE tenant_id = $1 AND parent_id IS NULL
              UNION ALL
              SELECT c.id, c.tenant_id, c.name, c.slug, c.level, c.sort_order
              FROM categories c
              INNER JOIN category_tree ct ON c.parent_id = ct.id
              WHERE c.tenant_id = $1
            )
            SELECT * FROM category_tree
            ORDER BY level, sort_order, name
          `, [tenantId]);
        } catch (hierarchyError) {
          hierarchyResult = { error: hierarchyError.message, code: hierarchyError.code };
        }
        
        res.json({
          status: 'ok',
          tenantId,
          categoryCount: count,
          hierarchyQuery: hierarchyResult.error ? 'failed' : 'success',
          hierarchyError: hierarchyResult.error || null,
          hierarchyErrorCode: hierarchyResult.code || null,
          hierarchyResults: hierarchyResult.rows ? hierarchyResult.rows.length : 0,
          timestamp: new Date().toISOString()
        });
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('Test categories endpoint error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Test failed',
        error: String(error),
        stack: error instanceof Error ? error.stack : null,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Test endpoint to trigger database errors and test error logging
  app.get('/api/test-db-error', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      console.log('Testing database error logging for tenant:', tenantId);
      
      const { getPostgresPool } = await import('./adapters/db/postgresClient.js');
      const pool = getPostgresPool();
      const client = await pool.connect();
      
      try {
        // This will cause a database error
        await client.query('SELECT * FROM non_existent_table WHERE invalid_column = $1', ['test']);
        
        // If we get here, something is wrong
        res.json({ status: 'unexpected_success' });
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('Database error test endpoint error:', error);
      // Pass error to next() to trigger global error handler
      next(error);
    }
  });

  app.get('/health', async (_req, res) => {
    const dbH = await db.health();
    res.status(dbH.status === 'ok' ? 200 : 503).json({ status: dbH.status });
  });

  // Apply tenant-aware rate limiting to public API endpoints
  app.use('/api', tenantSettingsRateLimiter());

  app.post('/api/retrieve', (req, res, next) => {
    try {
      const parsed = ContextRetrievalRequestSchema.parse(req.body);
      res.json({
        contexts: [],
        citations: [],
        profile_id: 'placeholder',
        ai_instruction_message: 'placeholder',
        retrieval_method: 'fallback',
        latency_ms: 0,
        intent_filters_applied: { scope_filter: false, action_filter: false, combined_query: parsed.query },
      });
    } catch (err) {
      next(err);
    }
  });

  // Admin: contexts & intents & profiles/targets/overrides/logs/users
  app.use('/api/admin/contexts', buildContextsRouter(getPostgresPool()));
  app.use('/api/admin/intents', buildIntentsRouter(getPostgresPool()));
  const { buildProfilesRouter } = await import('./routes/admin/profiles');
  const { buildProfileTargetsRouter } = await import('./routes/admin/profileTargets');
  const { buildOverridesRouter } = await import('./routes/admin/overrides');
  const { buildLogsRouter } = await import('./routes/admin/logs');
  const { buildUsersRouter } = await import('./routes/admin/users');
  const { buildSettingsRouter } = await import('./routes/admin/settings');
  const { buildErrorLogsRouter } = await import('./routes/admin/errorLogs');
  app.use('/api/admin/profiles', buildProfilesRouter(getPostgresPool()));
  app.use('/api/admin/profile-targets', buildProfileTargetsRouter(getPostgresPool()));
  app.use('/api/admin/overrides', buildOverridesRouter(getPostgresPool()));
  app.use('/api/admin/logs', buildLogsRouter(getPostgresPool()));
  app.use('/api/admin/users', buildUsersRouter(getPostgresPool()));
  app.use('/api/admin/settings', buildSettingsRouter(getPostgresPool()));
  app.use('/api/admin/error-logs', buildErrorLogsRouter(getPostgresPool()));
  try {
    const { buildAgentsAdminRouter } = await import('./routes/admin/agents');
    app.use('/api/admin', buildAgentsAdminRouter(getPostgresPool()));
  } catch (error) {
    console.error('Failed to mount agents admin routes:', error);
  }
  try {
    const { buildAgentsMasterAdminRouter } = await import('./routes/admin/agentsMaster');
    app.use('/api/admin', buildAgentsMasterAdminRouter(getPostgresPool()));
  } catch (error) {
    console.error('Failed to mount agents master admin routes:', error);
  }
  try {
    const { buildAgentsTestAdminRouter } = await import('./routes/admin/agentsTest');
    app.use('/api/admin', buildAgentsTestAdminRouter(getPostgresPool()));
  } catch (error) {
    console.error('Failed to mount agents test routes:', error);
  }
  try {
    const { buildToolTestAdminRouter } = await import('./routes/admin/toolTest');
    app.use('/api/admin', buildToolTestAdminRouter(getPostgresPool()));
  } catch (error) {
    console.error('Failed to mount tool test admin routes:', error);
  }
  try {
    const { buildNavigationPagesRouter } = await import('./routes/admin/navigation-pages');
    app.use('/api/admin/navigation-pages', buildNavigationPagesRouter(getPostgresPool()));
  } catch (error) {
    console.error('Failed to mount navigation pages admin routes:', error);
  }
  const { buildAuthRouter } = await import('./routes/admin/auth');
  app.use('/api/admin/auth', buildAuthRouter(getPostgresPool()));
  const { buildDashboardRouter } = await import('./routes/admin/dashboard');
  app.use('/api/admin/dashboard', buildDashboardRouter(getPostgresPool()));
  
  // Cache management routes
  try {
    const { buildCacheRouter } = await import('./routes/admin/cache.js');
    app.use('/api/admin/cache', buildCacheRouter());
  } catch (error) {
    console.error('Failed to load cache routes:', error);
  }

  // Import routes
  const { importRoutes } = await import('./routes/admin/import');
  app.use('/api/admin/import', importRoutes);

  // Categories and Intent System routes
  try {
    const { buildCategoriesRouter } = await import('./routes/admin/categories.js');
    const { buildIntentSystemRouter } = await import('./routes/admin/intentSystem.js');
    const { buildPromptsRouter } = await import('./routes/admin/prompts.js');
    const { buildRequestsRouter } = await import('./routes/admin/requests.js');
    const { buildMessagesRouter } = await import('./routes/admin/messages.js');
    const { buildSessionsRouter } = await import('./routes/admin/sessions.js');
    const { buildCostsRouter } = await import('./routes/admin/costs.js');
    const { buildAiCostsRouter } = await import('./routes/admin/aiCosts.js').catch(() => ({ buildAiCostsRouter: null as any }));
    const { buildAiUsageRouter } = await import('./routes/admin/aiUsage.js').catch(() => ({ buildAiUsageRouter: null as any }));
    const { buildAiPricingRouter } = await import('./routes/admin/aiPricing.js').catch(() => ({ buildAiPricingRouter: null as any }));
    const { buildTenantsRouter } = await import('./routes/admin/tenants.js').catch(() => ({ buildTenantsRouter: null as any }));
    app.use('/api/admin/categories', buildCategoriesRouter(getPostgresPool()));
    app.use('/api/admin/intent-system', buildIntentSystemRouter(getPostgresPool()));
    app.use('/api/admin/prompts', buildPromptsRouter(getPostgresPool()));
    app.use('/api/admin/requests', buildRequestsRouter(getPostgresPool()));
    app.use('/api/admin/messages', buildMessagesRouter(getPostgresPool()));
    app.use('/api/admin/sessions', buildSessionsRouter(getPostgresPool()));
    app.use('/api/admin/costs', buildCostsRouter());
    if (buildAiCostsRouter) app.use('/api/admin/ai-costs', buildAiCostsRouter());
    if (buildAiUsageRouter) app.use('/api/admin/ai-usage', buildAiUsageRouter());
    if (buildAiPricingRouter) app.use('/api/admin/ai-pricing', buildAiPricingRouter());
    if (buildTenantsRouter) app.use('/api/admin/tenants', buildTenantsRouter());
  } catch (error) {
    console.error('Failed to load categories/intent routes:', error);
  }

  // Public retrieval routes
  try {
    const { buildPublicRetrieveRouter } = await import('./routes/public/retrieve.js');
    app.use('/api', buildPublicRetrieveRouter());
  } catch (error) {
    console.error('Failed to load public retrieve routes:', error);
  }

  // Public prompts endpoints
  try {
    const { buildPublicPromptsRouter } = await import('./routes/public/prompts');
    app.use('/api', buildPublicPromptsRouter());
  } catch (error) {
    console.error('Failed to load public prompts routes:', error);
  }

  // Public agents endpoints (for frontend-safe data)
  try {
    const { buildPublicAgentsRouter } = await import('./routes/public/agents');
    app.use('/api', buildPublicAgentsRouter());
  } catch (error) {
    console.error('Failed to load public agents routes:', error);
  }

  // Public API docs
  try {
    const { buildDocsRouter } = await import('./routes/public/docs.js');
    app.use('/api', buildDocsRouter());
  } catch (error) {
    console.error('Failed to load api docs routes:', error);
  }

  // Public messages endpoints (logging)
  try {
    const { buildPublicMessagesRouter } = await import('./routes/public/messages');
    app.use('/api', buildPublicMessagesRouter());
  } catch (error) {
    console.error('Failed to load public messages routes:', error);
  }

  // Public chat endpoints (completions)
  try {
    const { buildPublicChatRouter } = await import('./routes/public/chat');
    app.use('/api', buildPublicChatRouter());
  } catch (error) {
    console.error('Failed to load public chat routes:', error);
  }

  // Public contexts endpoints (import)
  try {
    const { buildPublicContextsRouter } = await import('./routes/public/contexts');
    app.use('/api', buildPublicContextsRouter());
  } catch (error) {
    console.error('Failed to load public contexts routes:', error);
  }

  // Public LINE endpoints
  try {
    const { buildPublicLineRouter } = await import('./routes/public/line');
    app.use('/api', buildPublicLineRouter());
  } catch (error) {
    console.error('Failed to load public line routes:', error);
  }

  // Public staff endpoints
  try {
    const { buildPublicStaffRouter } = await import('./routes/public/staff');
    app.use('/api', buildPublicStaffRouter());
  } catch (error) {
    console.error('Failed to load public staff routes:', error);
  }

  // Public travel endpoints
  try {
    const { buildPublicTravelRouter } = await import('./routes/public/travel');
    app.use('/api', buildPublicTravelRouter());
  } catch (error) {
    console.error('Failed to load public travel routes:', error);
  }

  // Error handler
  app.use(async (err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // Log full error details for debugging
    // eslint-disable-next-line no-console
    console.error('API Error:', err);
    const isZod = err instanceof z.ZodError;
    const status = isZod ? 400 : 500;
    // Persist into error_logs for production diagnostics
    try {
      const { ErrorLogsRepository } = await import('./repositories/errorLogsRepository.js');
      const repo = new ErrorLogsRepository(getPostgresPool());
      const stack: string = typeof err?.stack === 'string' ? err.stack : '';
      let file: string | null = null; let line: number | null = null; let column_no: number | null = null;
      try {
        const first = stack.split('\n').find((l: string) => l.includes('.ts:') || l.includes('.js:')) || '';
        const m = first.match(/\((.*):(\d+):(\d+)\)/) || first.match(/at\s+[^\(]*\s+(.*):(\d+):(\d+)/);
        if (m) { file = m[1] || null; line = m[2] ? Number(m[2]) : null; column_no = m[3] ? Number(m[3]) : null; }
      } catch {}
      await repo.create({
        tenant_id: (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString(),
        endpoint: req.originalUrl || req.url,
        method: req.method,
        http_status: status,
        message: String(err?.message || 'unexpected'),
        error_code: isZod ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
        stack,
        file,
        line,
        column_no: column_no as any,
        headers: req.headers,
        query: req.query,
        body: req.body,
        request_id: (req as any).request_id || null,
        log_status: 'open',
        notes: null,
        fixed_by: null,
        fixed_at: null,
      } as any);
      console.log('Error logged to database successfully');
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError);
      // Fallback: log to console with full error details
      console.error('Full error details (fallback logging):', {
        error: err,
        stack: err?.stack,
        tenant_id: (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString(),
        endpoint: req.originalUrl || req.url,
        method: req.method,
        status,
        request_id: (req as any).request_id || null,
        timestamp: new Date().toISOString()
      });
    }
    const error: ErrorResponse = {
      error_code: isZod ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
      message: isZod ? 'Invalid request' : 'Unexpected error',
      details: isZod ? (err as any).flatten() : undefined,
      escalation_required: !isZod,
      timestamp: new Date().toISOString(),
      request_id: 'req_' + Math.random().toString(36).slice(2),
    };
    res.status(status).json(error);
  });

  return app;
}


