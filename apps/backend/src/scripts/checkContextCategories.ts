import { getPostgresPool } from "../adapters/db/postgresClient";

async function run() {
  const pool = getPostgresPool();
  try {
    const tenantId = process.env.TENANT_ID || 'acc44cdb-8da5-4226-9569-1233a39f564f';
    
    console.log(`Checking context-category associations for tenant: ${tenantId}`);
    
    const { rows } = await pool.query(`
      SELECT cc.context_id, cc.category_id, c.name, c.slug 
      FROM context_categories cc 
      JOIN categories c ON c.id = cc.category_id 
      WHERE cc.tenant_id = $1 
      LIMIT 10
    `, [tenantId]);
    
    console.log('Context-Category associations:', rows);
    
    // Check if taxi category exists
    const { rows: taxiCat } = await pool.query(`
      SELECT id, name, slug FROM categories 
      WHERE tenant_id = $1 AND slug = 'taxi'
    `, [tenantId]);
    
    console.log('Taxi category:', taxiCat);
    
  } finally {
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
