import { getPostgresPool } from '../adapters/db/postgresClient.js';

async function testCategoriesEndpoint() {
  try {
    console.log('🔍 Testing categories endpoint...');
    
    const pool = getPostgresPool();
    const client = await pool.connect();
    
    try {
      // Test 1: Check if we can connect
      console.log('✅ Database connection successful');
      
      // Test 2: Check if categories table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'categories'
        );
      `);
      
      if (tableCheck.rows[0]?.exists) {
        console.log('✅ Categories table exists');
        
        // Test 3: Check table structure
        const structure = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'categories'
          ORDER BY ordinal_position;
        `);
        
        console.log('📋 Table structure:');
        structure.rows.forEach(row => {
          console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'}`);
        });
        
        // Test 4: Check if there are any categories
        const count = await client.query('SELECT COUNT(*) FROM categories');
        console.log(`📊 Total categories: ${count.rows[0]?.count || 0}`);
        
        // Test 5: Test the specific query that's failing
        const tenantId = '00000000-0000-0000-0000-000000000000';
        console.log(`🔍 Testing hierarchy query for tenant: ${tenantId}`);
        
        try {
          const hierarchyResult = await client.query(`
            WITH RECURSIVE category_tree AS (
              SELECT 
                id, tenant_id, name, slug, description, parent_id, level, sort_order,
                is_active, metadata, created_at, updated_at,
                ARRAY[id] as path,
                name::text as full_path
              FROM categories 
              WHERE tenant_id = $1 AND parent_id IS NULL
              
              UNION ALL
              
              SELECT 
                c.id, c.tenant_id, c.name, c.slug, c.description, c.parent_id, c.level, c.sort_order,
                c.is_active, c.metadata, c.created_at, c.updated_at,
                ct.path || c.id,
                (ct.full_path || ' > ' || c.name)::text
              FROM categories c
              INNER JOIN category_tree ct ON c.parent_id = ct.id
              WHERE c.tenant_id = $1
            )
            SELECT * FROM category_tree
            ORDER BY level, sort_order, name
          `, [tenantId]);
          
          console.log(`✅ Hierarchy query successful, returned ${hierarchyResult.rows.length} rows`);
          
        } catch (hierarchyError) {
          console.error('❌ Hierarchy query failed:', hierarchyError);
          console.error('Stack:', hierarchyError instanceof Error ? hierarchyError.stack : 'No stack');
        }
        
      } else {
        console.error('❌ Categories table does not exist!');
        
        // Check what tables do exist
        const tables = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name;
        `);
        
        console.log('📋 Available tables:');
        tables.rows.forEach(row => {
          console.log(`  - ${row.table_name}`);
        });
      }
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
  }
}

testCategoriesEndpoint().catch(console.error);
