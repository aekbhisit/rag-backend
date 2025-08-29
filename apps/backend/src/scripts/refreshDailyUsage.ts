import { getPostgresPool } from '../adapters/db/postgresClient.js';

async function refreshDailyUsage() {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    console.log('Refreshing mv_daily_usage...');
    await client.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_usage`);
    console.log('Refresh completed');
  } finally { client.release(); }
}

refreshDailyUsage().catch(err => { console.error(err); process.exit(1); });



