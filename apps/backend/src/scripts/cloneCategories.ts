import { getPostgresPool } from "../adapters/db/postgresClient";

async function run() {
  const pool = getPostgresPool();
  const sourceTenant = process.env.SOURCE_TENANT_ID;
  const targetTenant = process.env.TARGET_TENANT_ID;
  if (!sourceTenant || !targetTenant) {
    console.error("Please provide SOURCE_TENANT_ID and TARGET_TENANT_ID env vars");
    process.exit(1);
  }
  if (sourceTenant === targetTenant) {
    console.error("SOURCE_TENANT_ID and TARGET_TENANT_ID must be different");
    process.exit(1);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_tenant', $1, true)", [targetTenant]);

    const { rows: sourceCats } = await client.query(
      `SELECT id, name, slug, description, parent_id, level, sort_order, metadata
       FROM categories WHERE tenant_id = $1 ORDER BY level ASC, sort_order, name`,
      [sourceTenant]
    );
    if (sourceCats.length === 0) {
      console.log('No categories found in source tenant');
      await client.query('ROLLBACK');
      return;
    }

    // Build parent mapping as we insert
    const idMap = new Map<string, string>();

    for (const cat of sourceCats) {
      const parentNewId = cat.parent_id ? idMap.get(cat.parent_id) || null : null;
      const { rows } = await client.query(
        `INSERT INTO categories (tenant_id, name, slug, description, parent_id, level, sort_order, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id`,
        [
          targetTenant,
          cat.name,
          cat.slug,
          cat.description ?? null,
          parentNewId,
          cat.level,
          cat.sort_order,
          cat.metadata || {},
        ]
      );
      const newId = rows[0]?.id;
      if (newId) idMap.set(cat.id, newId);
    }

    await client.query('COMMIT');
    console.log(`Cloned ${sourceCats.length} categories from ${sourceTenant} -> ${targetTenant}`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });


