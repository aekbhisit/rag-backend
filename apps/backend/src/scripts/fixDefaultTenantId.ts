import { getPostgresPool } from "../adapters/db/postgresClient";

const ZERO_ID = "00000000-0000-0000-0000-000000000000";

async function run() {
  const pool = getPostgresPool();
  try {
    const { rows: tenants } = await pool.query(`SELECT * FROM tenants WHERE id=$1`, [ZERO_ID]);
    if (tenants.length === 0) {
      console.log("No tenant with zero UUID found. Nothing to do.");
      await pool.end();
      return;
    }

    const old = tenants[0];
    const { rows: [{ new_id }] } = await pool.query(`SELECT gen_random_uuid() AS new_id`);
    console.log(`Rewriting tenant id ${ZERO_ID} -> ${new_id}`);

    // 1) Insert a new tenant row with the new id
    await pool.query(
      `INSERT INTO tenants (id, name, code, slug, contact_email, is_active, settings, created_at, updated_at)
       VALUES ($1, $2, $3, NULL, $4, COALESCE($5,true), $6, COALESCE($7, now()), now())`,
      [new_id, old.name, old.code || null, old.contact_email || null, old.is_active ?? true, old.settings || null, old.created_at || null]
    );

    // 2) Update all referencing tables to point to new_id
    const { rows: tables } = await pool.query(
      `SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='tenant_id' ORDER BY table_name`
    );
    for (const t of tables) {
      const table = t.table_name as string;
      if (table === 'tenants') continue;
      const res = await pool.query(`UPDATE "${table}" SET tenant_id=$1 WHERE tenant_id=$2`, [new_id, ZERO_ID]);
      if (res.rowCount) console.log(`Updated ${res.rowCount} row(s) in ${table}`);
    }

    // 3) Delete the old zero-id tenant
    await pool.query(`DELETE FROM tenants WHERE id=$1`, [ZERO_ID]);
    console.log("Tenant id updated.");
    console.log(new_id);
  } finally {
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });


