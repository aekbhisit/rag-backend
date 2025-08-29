import { getPostgresPool } from '../adapters/db/postgresClient.js';

async function purgeOldData() {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const days = Number(process.env.RETENTION_DAYS || 90);
    console.log(`Purging data older than ${days} days...`);
    await client.query(`DELETE FROM rag_citations WHERE message_id IN (SELECT id FROM messages WHERE created_at < now() - ($1||' days')::interval)`, [days]);
    await client.query(`DELETE FROM tool_calls WHERE message_id IN (SELECT id FROM messages WHERE created_at < now() - ($1||' days')::interval)`, [days]);
    await client.query(`DELETE FROM requests WHERE started_at < now() - ($1||' days')::interval`, [days]);
    await client.query(`DELETE FROM messages WHERE created_at < now() - ($1||' days')::interval`, [days]);
    await client.query(`DELETE FROM sessions WHERE started_at < now() - ($1||' days')::interval AND id NOT IN (SELECT DISTINCT session_id FROM messages)`, [days]);
    console.log('Purge completed');
  } finally {
    client.release();
  }
}

purgeOldData().catch(err => { console.error(err); process.exit(1); });



