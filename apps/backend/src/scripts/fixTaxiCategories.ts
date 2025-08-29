import { getPostgresPool } from "../adapters/db/postgresClient";

async function run() {
  const pool = getPostgresPool();
  try {
    const tenantId = process.env.TENANT_ID || 'acc44cdb-8da5-4226-9569-1233a39f564f';
    
    console.log(`Fixing taxi categories for tenant: ${tenantId}`);
    
    // 1. Create taxi category if it doesn't exist
    let { rows: taxiCat } = await pool.query(`
      SELECT id, name, slug FROM categories 
      WHERE tenant_id = $1 AND slug = 'taxi'
    `, [tenantId]);
    
    let taxiCategoryId: string;
    
    if (taxiCat.length === 0) {
      console.log('Creating taxi category...');
      const { rows: newCat } = await pool.query(`
        INSERT INTO categories (tenant_id, name, slug, description, level, sort_order)
        VALUES ($1, 'Taxi', 'taxi', 'Taxi and transportation services', 0, 10)
        RETURNING id
      `, [tenantId]);
      taxiCategoryId = newCat[0].id;
      console.log(`Created taxi category with ID: ${taxiCategoryId}`);
    } else {
      taxiCategoryId = taxiCat[0].id;
      console.log(`Taxi category already exists with ID: ${taxiCategoryId}`);
    }
    
    // 2. Find all taxi-related contexts (by title or content)
    const { rows: taxiContexts } = await pool.query(`
      SELECT id, title FROM contexts 
      WHERE tenant_id = $1 AND type = 'text' 
      AND (title ILIKE '%taxi%' OR title ILIKE '%transport%' OR title ILIKE '%safety%' OR title ILIKE '%metered%' OR title ILIKE '%ride%')
    `, [tenantId]);
    
    console.log(`Found ${taxiContexts.length} taxi-related contexts:`, taxiContexts.map(c => c.title));
    
    // 3. Remove old category associations and add taxi category
    for (const context of taxiContexts) {
      console.log(`Fixing context: ${context.title}`);
      
      // Remove old associations
      await pool.query(`
        DELETE FROM context_categories 
        WHERE tenant_id = $1 AND context_id = $2
      `, [tenantId, context.id]);
      
      // Add taxi category
      await pool.query(`
        INSERT INTO context_categories (tenant_id, context_id, category_id)
        VALUES ($1, $2, $3)
      `, [tenantId, context.id, taxiCategoryId]);
    }
    
    console.log('Taxi categories fixed successfully!');
    
  } finally {
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
