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
    allowedHeaders: ['Content-Type','X-Tenant-ID','Accept','Authorization','Cache-Control','Pragma'],
  }));
  app.options('*', cors({
    origin: true,
    methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','X-Tenant-ID','Accept','Authorization','Cache-Control','Pragma'],
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(morgan('dev'));

  // Ensure admin APIs are never cached by browsers/proxies
  app.use('/api/admin', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // Simple API-key + tenant extractor placeholders
  app.use((req, _res, next) => {
    (req as any).tenantId = req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000';
    next();
  });

  app.get('/api/health', async (_req, res) => {
    const results = await Promise.all([
      db.health(),
      cache.health(),
      storage.health(),
    ]);
    const [dbH, cacheH, storageH] = results as any[];
    const overall = [dbH, cacheH, storageH].every((h: any) => h.status === 'ok') ? 'ok' : 'degraded';
    res.json({ status: overall, db: dbH, cache: cacheH, storage: storageH });
  });

  app.get('/health', async (_req, res) => {
    const dbH = await db.health();
    res.status(dbH.status === 'ok' ? 200 : 503).json({ status: dbH.status });
  });

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
  const { buildProfilesRouter } = require('./routes/admin/profiles');
  const { buildProfileTargetsRouter } = require('./routes/admin/profileTargets');
  const { buildOverridesRouter } = require('./routes/admin/overrides');
  const { buildLogsRouter } = require('./routes/admin/logs');
  const { buildUsersRouter } = require('./routes/admin/users');
  const { buildSettingsRouter } = require('./routes/admin/settings');
  app.use('/api/admin/profiles', buildProfilesRouter(getPostgresPool()));
  app.use('/api/admin/profile-targets', buildProfileTargetsRouter(getPostgresPool()));
  app.use('/api/admin/overrides', buildOverridesRouter(getPostgresPool()));
  app.use('/api/admin/logs', buildLogsRouter(getPostgresPool()));
  app.use('/api/admin/users', buildUsersRouter(getPostgresPool()));
  app.use('/api/admin/settings', buildSettingsRouter(getPostgresPool()));
  const { buildAuthRouter } = require('./routes/admin/auth');
  app.use('/api/admin/auth', buildAuthRouter(getPostgresPool()));
  const { buildDashboardRouter } = require('./routes/admin/dashboard');
  app.use('/api/admin/dashboard', buildDashboardRouter(getPostgresPool()));
  
  // Cache management routes
  try {
    const { buildCacheRouter } = await import('./routes/admin/cache.js');
    app.use('/api/admin/cache', buildCacheRouter());
  } catch (error) {
    console.error('Failed to load cache routes:', error);
  }

  // Import routes
  const { importRoutes } = require('./routes/admin/import');
  app.use('/api/admin/import', importRoutes);

  // Categories and Intent System routes
  try {
    const { buildCategoriesRouter } = await import('./routes/admin/categories.js');
    const { buildIntentSystemRouter } = await import('./routes/admin/intentSystem.js');
    const { buildPromptsRouter } = await import('./routes/admin/prompts.js');
    const { buildRequestsRouter } = await import('./routes/admin/requests.js');
    const { buildCostsRouter } = await import('./routes/admin/costs.js');
    const { buildAiCostsRouter } = await import('./routes/admin/aiCosts.js').catch(() => ({ buildAiCostsRouter: null as any }));
    const { buildAiUsageRouter } = await import('./routes/admin/aiUsage.js').catch(() => ({ buildAiUsageRouter: null as any }));
    const { buildAiPricingRouter } = await import('./routes/admin/aiPricing.js').catch(() => ({ buildAiPricingRouter: null as any }));
    const { buildTenantsRouter } = await import('./routes/admin/tenants.js').catch(() => ({ buildTenantsRouter: null as any }));
    app.use('/api/admin/categories', buildCategoriesRouter(getPostgresPool()));
    app.use('/api/admin/intent-system', buildIntentSystemRouter(getPostgresPool()));
    app.use('/api/admin/prompts', buildPromptsRouter(getPostgresPool()));
    app.use('/api/admin/requests', buildRequestsRouter(getPostgresPool()));
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

  // Public API docs
  try {
    const { buildDocsRouter } = await import('./routes/public/docs.js');
    app.use('/api', buildDocsRouter());
  } catch (error) {
    console.error('Failed to load api docs routes:', error);
  }

  // Error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // Log full error details for debugging
    // eslint-disable-next-line no-console
    console.error('API Error:', err);
    const isZod = err instanceof z.ZodError;
    const status = isZod ? 400 : 500;
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


