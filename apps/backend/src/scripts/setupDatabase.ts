import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTables() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting database setup...');

    // Enable required extensions
    console.log('📦 Enabling PostgreSQL extensions...');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await client.query('CREATE EXTENSION IF NOT EXISTS "vector";');
    console.log('✅ Extensions enabled');

    // Create tenants table
    console.log('🏢 Creating tenants table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        contact_email VARCHAR(255),
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tenants table created');

    // Create users table
    console.log('👥 Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        timezone VARCHAR(50) DEFAULT 'UTC',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, email)
      );
    `);
    console.log('✅ Users table created');

    // Create categories table
    console.log('📂 Creating categories table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Categories table created');

    // Create contexts table
    console.log('📄 Creating contexts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS contexts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        title VARCHAR(500) NOT NULL,
        body TEXT NOT NULL,
        keywords TEXT[],
        instruction TEXT,
        trust_level VARCHAR(50) DEFAULT 'medium',
        type VARCHAR(50) DEFAULT 'document',
        source_url VARCHAR(1000),
        file_path VARCHAR(1000),
        file_size INTEGER,
        embedding_model VARCHAR(100),
        embedding_vector vector(1536),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Contexts table created');

    // Create intents table
    console.log('🎯 Creating intents table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS intents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        scope VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Intents table created');

    // Create prompts table
    console.log('💬 Creating prompts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS prompts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        template TEXT NOT NULL,
        description TEXT,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Prompts table created');

    // Create ai_pricing table
    console.log('💰 Creating AI pricing table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_pricing (
        id VARCHAR(255) PRIMARY KEY,
        model VARCHAR(255) NOT NULL,
        provider VARCHAR(255) NOT NULL,
        input_cost_per_1k_tokens DECIMAL(10,6) NOT NULL,
        output_cost_per_1k_tokens DECIMAL(10,6) NOT NULL,
        context_length INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ AI pricing table created');

    // Create chat_sessions table
    console.log('💭 Creating chat sessions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Chat sessions table created');

    // Create chat_messages table
    console.log('💬 Creating chat messages table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        model VARCHAR(100),
        tokens_used INTEGER,
        cost DECIMAL(10,6),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Chat messages table created');

    // Create additional utility tables
    console.log('🔧 Creating utility tables...');
    
    // Create tenant_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        key VARCHAR(255) NOT NULL,
        value JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, key)
      );
    `);

    // Create user_sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create audit_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        resource_type VARCHAR(100),
        resource_id UUID,
        details JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Utility tables created');

    // Create indexes for better performance
    console.log('📊 Creating database indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email);',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
      'CREATE INDEX IF NOT EXISTS idx_categories_tenant_parent ON categories(tenant_id, parent_id);',
      'CREATE INDEX IF NOT EXISTS idx_contexts_tenant_category ON contexts(tenant_id, category_id);',
      'CREATE INDEX IF NOT EXISTS idx_contexts_keywords ON contexts USING GIN(keywords);',
      'CREATE INDEX IF NOT EXISTS idx_intents_tenant_scope_action ON intents(tenant_id, scope, action);',
      'CREATE INDEX IF NOT EXISTS idx_prompts_key ON prompts(key);',
      'CREATE INDEX IF NOT EXISTS idx_ai_pricing_provider_model ON ai_pricing(provider, model);',
      'CREATE INDEX IF NOT EXISTS idx_ai_pricing_active ON ai_pricing(is_active);',
      'CREATE INDEX IF NOT EXISTS idx_chat_sessions_tenant_user ON chat_sessions(tenant_id, user_id);',
      'CREATE INDEX IF NOT EXISTS idx_chat_messages_session_role ON chat_messages(session_id, role);',
      'CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_key ON tenant_settings(tenant_id, key);',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_token ON user_sessions(user_id, session_token);',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_user ON audit_logs(tenant_id, user_id);',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);'
    ];

    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery);
      } catch (error) {
        console.warn(`⚠️  Warning creating index: ${error}`);
      }
    }

    console.log('✅ Database indexes created');

    // Create vector index for embeddings (if pgvector is available)
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_contexts_embedding ON contexts 
        USING ivfflat (embedding_vector vector_cosine_ops) 
        WITH (lists = 100);
      `);
      console.log('✅ Vector index created for embeddings');
    } catch (error) {
      console.warn('⚠️  Vector index creation skipped (pgvector extension may not be available)');
    }

    console.log('🎉 All database tables and indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating database tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function verifyTables() {
  const client = await pool.connect();
  try {
    console.log('🔍 Verifying database tables...');
    
    const expectedTables = [
      'tenants', 'users', 'categories', 'contexts', 'intents', 
      'prompts', 'ai_pricing', 'chat_sessions', 'chat_messages',
      'tenant_settings', 'user_sessions', 'audit_logs'
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
    
    await createTables();
    const verified = await verifyTables();
    
    if (verified) {
      console.log('\n🎉 Database setup completed successfully!');
      console.log('📋 Next steps:');
      console.log('   1. Run: npm run ensure:tenant');
      console.log('   2. Run: npm run ensure:admin-user');
      console.log('   3. Run: npm run seed:ai-pricing');
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
