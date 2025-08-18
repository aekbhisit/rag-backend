import { getPostgresPool } from "../adapters/db/postgresClient";

async function run() {
  const pool = getPostgresPool();
  try {
    const { rows: counts } = await pool.query(`
      SELECT tenant_id, COUNT(*) AS cnt
      FROM categories
      GROUP BY tenant_id
      ORDER BY cnt DESC
    `);
    console.log("Category counts by tenant:");
    counts.forEach((r: any) => console.log(r.tenant_id, Number(r.cnt)));

    const tenantId = process.env.TENANT_ID || 'acc44cdb-8da5-4226-9569-1233a39f564f';
    const { rows } = await pool.query(
      `SELECT id, name, slug, parent_id, level, sort_order FROM categories WHERE tenant_id=$1 ORDER BY level, sort_order, name LIMIT 20`,
      [tenantId]
    );
    console.log(`\nSample categories for ${tenantId}:`);
    console.table(rows);
  } finally {
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });


