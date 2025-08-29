import { getPostgresPool } from "../adapters/db/postgresClient";

async function run() {
  const pool = getPostgresPool();
  try {
    const tenantId = process.env.TENANT_ID || 'acc44cdb-8da5-4226-9569-1233a39f564f';
    const type = 'text';
    const category = 'taxi';
    const pageSize = 100;
    const page = 1;
    const from = (page - 1) * pageSize;
    
    console.log(`Debugging taxi query for tenant: ${tenantId}`);
    console.log(`Type: ${type}, Category: ${category}, Page: ${page}, PageSize: ${pageSize}`);
    
    // Build the exact same query logic as the backend
    const params: any[] = [tenantId];
    let where = 'tenant_id = $1';
    
    if (type) { 
      params.push(type); 
      where += ` AND type = $${params.length}`; 
    }
    
    if (category) {
      // Match by slug (exact) or name (ILIKE)
      params.push(category); 
      const pSlug = params.length;
      params.push(`%${category}%`); 
      const pName = params.length;
      where += ` AND EXISTS (
        SELECT 1 FROM context_categories cc
        JOIN categories c ON c.id = cc.category_id
        WHERE cc.context_id = contexts.id AND cc.tenant_id = contexts.tenant_id AND (c.slug = $${pSlug} OR c.name ILIKE $${pName})
      )`;
    }
    
    params.push(pageSize); 
    params.push(from);
    
    const sql = `SELECT id, tenant_id, type, title, body, instruction, attributes, trust_level, status, keywords, language, created_at, updated_at
                 FROM contexts WHERE ${where}
                 ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
    
    console.log('\nGenerated SQL:');
    console.log(sql);
    console.log('\nParameters:', params);
    
    // Execute the query
    const { rows } = await pool.query(sql, params);
    console.log(`\nResult: ${rows.length} rows`);
    
    if (rows.length > 0) {
      console.log('First few results:');
      rows.slice(0, 3).forEach((row, i) => {
        console.log(`${i + 1}. ${row.title} (${row.id})`);
      });
    }
    
    // Let's also check what categories exist
    console.log('\nChecking categories:');
    const { rows: cats } = await pool.query(`
      SELECT id, name, slug FROM categories 
      WHERE tenant_id = $1 AND slug = $2
    `, [tenantId, category]);
    console.log('Taxi categories:', cats);
    
    // Check context-category associations
    console.log('\nChecking context-category associations:');
    const { rows: assocs } = await pool.query(`
      SELECT cc.context_id, cc.category_id, c.name, c.slug, ctx.title
      FROM context_categories cc
      JOIN categories c ON c.id = cc.category_id
      JOIN contexts ctx ON ctx.id = cc.context_id
      WHERE cc.tenant_id = $1 AND c.slug = $2
      LIMIT 5
    `, [tenantId, category]);
    console.log('Associations:', assocs);
    
  } finally {
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
