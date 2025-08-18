import { getPostgresPool } from "../adapters/db/postgresClient";

async function run() {
  const pool = getPostgresPool();
  try {
    const { rows: counts } = await pool.query(`
      SELECT tenant_id, COUNT(*) as cnt
      FROM contexts
      GROUP BY tenant_id
      ORDER BY cnt DESC
    `);
    console.log("Context counts by tenant:");
    for (const r of counts) console.log(r.tenant_id, Number(r.cnt));

    const tenantId = process.env.TENANT_ID || 'acc44cdb-8da5-4226-9569-1233a39f564f';
    const { rows: items } = await pool.query(`
      SELECT id, title, type, created_at FROM contexts WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 10
    `, [tenantId]);
    console.log(`\nSample contexts for ${tenantId}:`);
    console.log(items);
  } finally {
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });


