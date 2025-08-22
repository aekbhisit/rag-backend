import { getPostgresPool } from '../adapters/db/postgresClient.js';

async function run() {
  const pool = getPostgresPool();
  try {
    const tenantId = process.env.TENANT_ID || '00000000-0000-0000-0000-000000000000';
    const q = `
      SELECT id, title, type, latitude, longitude,
             (attributes->>'lat') AS attr_lat,
             (attributes->>'longitude') AS attr_lon,
             created_at
      FROM contexts
      WHERE tenant_id=$1 AND type='place'
      ORDER BY created_at DESC
      LIMIT 10`;
    const { rows } = await pool.query(q, [tenantId]);
    console.log(rows);
  } finally {
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });


