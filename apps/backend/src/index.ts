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
}

start().catch(console.error);


