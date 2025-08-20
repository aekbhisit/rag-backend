import { Pool } from 'pg';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function importFromSQLFiles() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting database setup from SQL files...');

    // Import extensions from 001_extensions.sql
    console.log('📦 Importing PostgreSQL extensions...');
    try {
      const extensionsPath = join(__dirname, '../../../postgres/initdb/001_extensions.sql');
      const extensionsSQL = readFileSync(extensionsPath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = extensionsSQL.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        const trimmedStmt = statement.trim();
        if (trimmedStmt && !trimmedStmt.startsWith('--')) {
          try {
            await client.query(trimmedStmt);
          } catch (error) {
            console.warn(`⚠️  Warning executing extension statement: ${error.message}`);
          }
        }
      }
      console.log('✅ PostgreSQL extensions imported successfully');
    } catch (error) {
      console.warn('⚠️  Could not import extensions file, using basic extensions');
      await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
      await client.query('CREATE EXTENSION IF NOT EXISTS "vector";');
    }

    // Import schema from 100_app_schema.sql
    console.log('📦 Importing database schema...');
    try {
      const schemaPath = join(__dirname, '../../../postgres/initdb/100_app_schema.sql');
      const schemaSQL = readFileSync(schemaPath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = schemaSQL.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        const trimmedStmt = statement.trim();
        if (trimmedStmt && !trimmedStmt.startsWith('--')) {
          try {
            await client.query(trimmedStmt);
          } catch (error) {
            // Ignore errors for IF NOT EXISTS statements
            if (!error.message.includes('already exists')) {
              console.warn(`⚠️  Warning executing statement: ${error.message}`);
            }
          }
        }
      }
      console.log('✅ Database schema imported successfully');
    } catch (error) {
      console.warn('⚠️  Could not import schema file, falling back to manual table creation');
      await createTablesManually(client);
    }

    // Import seed data from 110_seed_core_data.sql
    console.log('🌱 Importing seed data...');
    try {
      const seedPath = join(__dirname, '../../../postgres/initdb/110_seed_core_data.sql');
      const seedSQL = readFileSync(seedPath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = seedSQL.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        const trimmedStmt = statement.trim();
        if (trimmedStmt && !trimmedStmt.startsWith('--')) {
          try {
            await client.query(trimmedStmt);
          } catch (error) {
            console.warn(`⚠️  Warning executing seed statement: ${error.message}`);
          }
        }
      }
      console.log('✅ Seed data imported successfully');
    } catch (error) {
      console.warn('⚠️  Could not import seed data file:', error.message);
    }

  } catch (error) {
    console.error('❌ Error importing from SQL files:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function createTablesManually(client: any) {
  console.log('🔧 Falling back to manual table creation...');
  
  // Create basic tables if SQL import failed
  await client.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar(255) NOT NULL,
      code varchar(50) UNIQUE NOT NULL,
      slug varchar(100) UNIQUE NOT NULL,
      contact_email varchar(255),
      is_active boolean DEFAULT true,
      settings jsonb DEFAULT '{}',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email varchar NOT NULL,
      role varchar NOT NULL DEFAULT 'admin',
      name text,
      status varchar NOT NULL DEFAULT 'active',
      timezone varchar NOT NULL DEFAULT 'UTC',
      password_hash text,
      last_login timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz,
      UNIQUE(tenant_id, email)
    );
  `);

  console.log('✅ Basic tables created manually');
}

async function verifyTables() {
  const client = await pool.connect();
  try {
    console.log('🔍 Verifying database tables...');

    // Definitive list used by code + your local
    const expectedTables = [
      'tenants','users','categories','contexts',
      'context_categories','context_intent_scopes','context_intent_actions','context_edit_history',
      'intents','intent_scopes','intent_actions','prompts',
      'ai_pricing','ai_usage_logs','rag_requests','query_logs',
      'instruction_profiles','profile_targets',
      'context_profile_overrides','context_images','context_usage_stats',
      'tenant_settings','user_sessions','audit_logs'
    ];

    for (const tableName of expectedTables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);
      if (result.rows[0].exists) {
        console.log(`✅ Table '${tableName}' exists`);
      } else {
        console.error(`❌ Table '${tableName}' missing!`);
        return false;
      }
    }

    console.log('🎉 All required tables verified successfully!');
    return true;

  } catch (error) {
    console.error('❌ Error verifying tables:', error);
    return false;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🚀 RAG Assistant Database Setup');
    console.log('================================');

    await importFromSQLFiles();
    const verified = await verifyTables();

    if (verified) {
      console.log('\n🎉 Database setup completed successfully!');
      console.log('📋 Next steps:');
      console.log('   1. Run: node apps/backend/dist/scripts/ensureTenant.js');
      console.log('   2. Run: node apps/backend/dist/scripts/ensureAdminUser.js');
      console.log('   3. Run: node apps/backend/dist/scripts/seedAiPricing.js');
    } else {
      console.error('\n❌ Database verification failed!');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
