import { getPostgresPool } from "../adapters/db/postgresClient";

async function run() {
  const pool = getPostgresPool();
  try {
    const tenantId = process.env.TENANT_ID || 'acc44cdb-8da5-4226-9569-1233a39f564f';
    
    console.log(`Consolidating taxi categories for tenant: ${tenantId}`);
    
    // 1. Find all taxi categories
    const { rows: taxiCats } = await pool.query(`
      SELECT id, name, slug, created_at FROM categories 
      WHERE tenant_id = $1 AND slug = 'taxi'
      ORDER BY created_at ASC
    `, [tenantId]);
    
    if (taxiCats.length === 0) {
      console.log('No taxi categories found');
      return;
    }
    
    console.log(`Found ${taxiCats.length} taxi categories:`, taxiCats);
    
    // 2. Keep the first one (oldest), delete the rest
    const keepCategoryId = taxiCats[0].id;
    const deleteCategoryIds = taxiCats.slice(1).map(c => c.id);
    
    console.log(`Keeping category: ${keepCategoryId}`);
    console.log(`Deleting categories: ${deleteCategoryIds}`);
    
    // 3. Move all context associations to the kept category
    for (const deleteId of deleteCategoryIds) {
      console.log(`Moving contexts from category ${deleteId} to ${keepCategoryId}`);
      
      // Update context_categories
      await pool.query(`
        UPDATE context_categories 
        SET category_id = $1 
        WHERE tenant_id = $2 AND category_id = $3
      `, [keepCategoryId, tenantId, deleteId]);
      
      // Delete the duplicate category
      await pool.query(`
        DELETE FROM categories 
        WHERE tenant_id = $1 AND id = $2
      `, [tenantId, deleteId]);
    }
    
    // 4. Verify the fix
    const { rows: finalCats } = await pool.query(`
      SELECT id, name, slug FROM categories 
      WHERE tenant_id = $1 AND slug = 'taxi'
    `, [tenantId]);
    
    console.log(`Final taxi categories:`, finalCats);
    
    // 5. Check context associations
    const { rows: contextCount } = await pool.query(`
      SELECT COUNT(*) as count FROM context_categories cc
      JOIN categories c ON c.id = cc.category_id
      WHERE cc.tenant_id = $1 AND c.slug = 'taxi'
    `, [tenantId]);
    
    console.log(`Contexts associated with taxi category: ${contextCount[0].count}`);
    
    console.log('Taxi categories consolidated successfully!');
    
  } finally {
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
