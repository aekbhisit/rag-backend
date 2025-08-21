import { getPostgresPool } from '../adapters/db/postgresClient.js';

async function debugCategoriesError() {
  try {
    console.log('🔍 Debugging categories endpoint error...');
    
    const pool = getPostgresPool();
    const client = await pool.connect();
    
    try {
      const tenantId = '00000000-0000-0000-0000-000000000000';
      
      // Test 1: Basic connection and tenant setting
      console.log('✅ Testing basic connection...');
      await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
      console.log('✅ Tenant config set successfully');
      
      // Test 2: Check if categories table exists and has data
      console.log('✅ Checking categories table...');
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'categories'
        );
      `);
      
      if (!tableExists.rows[0]?.exists) {
        console.error('❌ Categories table does not exist!');
        return;
      }
      
      // Test 3: Check categories count for tenant
      const countResult = await client.query('SELECT COUNT(*) FROM categories WHERE tenant_id = $1', [tenantId]);
      const categoryCount = parseInt(countResult.rows[0]?.count || '0');
      console.log(`📊 Categories for tenant ${tenantId}: ${categoryCount}`);
      
      if (categoryCount === 0) {
        console.log('ℹ️ No categories found for this tenant - this is expected');
      }
      
      // Test 4: Test the exact query that's failing in production
      console.log('🔍 Testing the exact hierarchy query from production...');
      
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
        
        if (hierarchyResult.rows.length > 0) {
          console.log('📋 Sample result:', hierarchyResult.rows[0]);
        }
        
      } catch (hierarchyError) {
        console.error('❌ Hierarchy query failed with error:');
        console.error('Error message:', hierarchyError.message);
        console.error('Error code:', hierarchyError.code);
        console.error('Error detail:', hierarchyError.detail);
        console.error('Error hint:', hierarchyError.hint);
        console.error('Error where:', hierarchyError.where);
        console.error('Error schema:', hierarchyError.schema);
        console.error('Error table:', hierarchyError.table);
        console.error('Error column:', hierarchyError.column);
        console.error('Error dataType:', hierarchyError.dataType);
        console.error('Error constraint:', hierarchyError.constraint);
        console.error('Error file:', hierarchyError.file);
        console.error('Error line:', hierarchyError.line);
        console.error('Error routine:', hierarchyError.routine);
        console.error('Stack trace:', hierarchyError.stack);
        
        // Try to identify the specific issue
        if (hierarchyError.code === '42P01') {
          console.error('❌ Issue: Table does not exist');
        } else if (hierarchyError.code === '42703') {
          console.error('❌ Issue: Column does not exist');
        } else if (hierarchyError.code === '42601') {
          console.error('❌ Issue: Syntax error in SQL');
        } else if (hierarchyError.code === '0A000') {
          console.error('❌ Issue: Feature not supported (possibly CTE)');
        }
      }
      
      // Test 5: Check database version and extensions
      console.log('🔍 Checking database version and extensions...');
      const versionResult = await client.query('SELECT version()');
      console.log('📋 Database version:', versionResult.rows[0]?.version);
      
      const extensionsResult = await client.query(`
        SELECT extname, extversion 
        FROM pg_extension 
        WHERE extname IN ('uuid-ossp', 'pgcrypto')
        ORDER BY extname;
      `);
      console.log('📋 Extensions:', extensionsResult.rows);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
  }
}

debugCategoriesError().catch(console.error);
