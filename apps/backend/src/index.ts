import 'dotenv/config';
import http from 'node:http'
import { createApp } from './app.js';
import * as db from './adapters/db/postgresClient';
import * as cache from './adapters/cache/redisClient';
import * as storage from './adapters/storage/minioClient';
import { ensureAiUsageIndex } from './adapters/search/aiUsageLogService';
// requests index now stored in Postgres; no index ensure needed

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

async function init() {
  try {
    const skip = process.env.SKIP_ADAPTERS_INIT === 'true';
    if (!skip) {
      await db.init();
      await cache.init();
      await storage.init();
    }
    // Ensure usage indices (Postgres-backed) exist on startup
    await ensureAiUsageIndex();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Initialization error:', e);
  }
}

async function start() {
  const app = await createApp();
  const server = http.createServer(app);
  
  server.listen(PORT, async () => {
    await init();
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${PORT}`);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Process-level error logging
  const logProcessError = async (type: 'unhandledRejection' | 'uncaughtException', error: any) => {
    try {
      const { ErrorLogsRepository } = await import('./repositories/errorLogsRepository.js');
      const { getPostgresPool } = await import('./adapters/db/postgresClient.js');
      const repo = new ErrorLogsRepository(getPostgresPool());
      await repo.create({
        tenant_id: '00000000-0000-0000-0000-000000000000',
        endpoint: type,
        method: null as any,
        status: 500,
        message: String(error?.message || error || 'process error'),
        error_code: type.toUpperCase(),
        stack: typeof error?.stack === 'string' ? error.stack : null,
        file: null,
        line: null,
        column_no: null as any,
        headers: null,
        query: null,
        body: null,
        request_id: null,
      } as any);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to persist process-level error:', e);
    }
  };
  process.on('unhandledRejection', (reason) => { void logProcessError('unhandledRejection', reason); });
  process.on('uncaughtException', (err) => { void logProcessError('uncaughtException', err); });
}

start().catch(console.error);


