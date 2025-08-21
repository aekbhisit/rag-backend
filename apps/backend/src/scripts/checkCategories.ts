import { getPostgresPool } from '../adapters/db/postgresClient.js';

async function checkCategories() {
  try {
    console.log('🔍 Checking categories data...');
    
    const pool = getPostgresPool();
    const client = await pool.connect();
    
    try {
      // Check categories by tenant
      const result = await client.query('SELECT tenant_id, COUNT(*) FROM categories GROUP BY tenant_id ORDER BY tenant_id;');
      console.log('📊 Categories by tenant:', result.rows);
      
      // Check specific tenant that's failing
      const tenantId = '00000000-0000-0000-0000-000000000000';
      const specificResult = await client.query('SELECT id, name, slug FROM categories WHERE tenant_id = $1 LIMIT 5;', [tenantId]);
      console.log(`📋 Categories for tenant ${tenantId}:`, specificResult.rows);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkCategories().catch(console.error);
