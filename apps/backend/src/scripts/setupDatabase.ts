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
    // Common extensions used across repositories
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await client.query('CREATE EXTENSION IF NOT EXISTS "vector";');
    // Enable PostGIS if available to support geography/geometry tables (optional)
    try { await client.query('CREATE EXTENSION IF NOT EXISTS postgis;'); } catch { /* ignore */ }
    console.log('✅ Extensions enabled');

    // Tenants
    console.log('🏢 Creating tenants table...');
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
    console.log('✅ Tenants table created');

    // Users
    console.log('👥 Creating users table...');
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
      CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users(tenant_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_email ON public.users(tenant_id, email);
    `);
    console.log('✅ Users table created');

    // Categories
    console.log('📂 Creating categories table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL,
        description text,
        parent_id uuid REFERENCES categories(id) ON DELETE CASCADE,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz
      );
    `);
    console.log('✅ Categories table created');

    // Contexts (align with code usage: attributes, language, status, embedding, latitude/longitude)
    console.log('📄 Creating contexts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS contexts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
        type varchar(50) DEFAULT 'document',
        title varchar(500) NOT NULL,
        body text NOT NULL,
        instruction text,
        attributes jsonb DEFAULT '{}',
        trust_level varchar(50) DEFAULT 'medium',
        language varchar(10),
        status varchar(30) DEFAULT 'active',
        keywords text[],
        source_url varchar(1000),
        file_path varchar(1000),
        file_size integer,
        embedding vector(1536),
        latitude double precision,
        longitude double precision,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz
      );
    `);
    console.log('✅ Contexts table created');

    // Context link tables used by repositories/routes
    await client.query(`
      CREATE TABLE IF NOT EXISTS context_categories (
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
        category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (tenant_id, context_id, category_id)
      );
      CREATE TABLE IF NOT EXISTS context_intent_scopes (
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
        scope_id uuid NOT NULL,
        PRIMARY KEY (tenant_id, context_id, scope_id)
      );
      CREATE TABLE IF NOT EXISTS context_intent_actions (
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
        action_id uuid NOT NULL,
        PRIMARY KEY (tenant_id, context_id, action_id)
      );
      CREATE TABLE IF NOT EXISTS context_edit_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
        user_email varchar(255),
        action varchar(50) NOT NULL,
        description text,
        created_at timestamptz DEFAULT now()
      );
    `);

    // Intents (taxonomy), plus optional lookup tables for scopes/actions compatibility
    console.log('🎯 Creating intents tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS intents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        scope varchar(100) NOT NULL,
        action varchar(100) NOT NULL,
        description text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_intents_tenant_scope_action ON intents(tenant_id, scope, action);

      CREATE TABLE IF NOT EXISTS intent_scopes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        scope varchar(100) NOT NULL,
        description text,
        created_at timestamptz DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS intent_actions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        action varchar(100) NOT NULL,
        description text,
        created_at timestamptz DEFAULT now()
      );
    `);

    // Prompts
    console.log('💬 Creating prompts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS prompts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        key varchar(100) NOT NULL,
        name varchar(255) NOT NULL,
        template text NOT NULL,
        description text,
        is_default boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_prompts_key ON prompts(key);
    `);

    // AI Pricing (align with AiPricingRepository)
    console.log('💰 Creating ai_pricing table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_pricing (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        provider text NOT NULL,
        model text NOT NULL,
        input_per_1k double precision,
        cached_input_per_1k double precision,
        output_per_1k double precision,
        embedding_per_1k double precision,
        currency text DEFAULT 'USD',
        version text,
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS ai_pricing_tenant_idx ON ai_pricing(tenant_id);
      CREATE UNIQUE INDEX IF NOT EXISTS ai_pricing_unique ON ai_pricing(tenant_id, provider, model);
    `);

    // AI Usage Logs (align with AiUsageRepository)
    console.log('🧾 Creating ai_usage_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        observation_id text,
        trace_id text,
        request_id text,
        environment text,
        project_id text,
        endpoint text,
        operation text NOT NULL,
        provider text,
        model text,
        model_version text,
        start_time timestamptz,
        end_time timestamptz,
        latency_ms integer,
        usage_input_tokens integer,
        usage_cached_input_tokens integer,
        usage_output_tokens integer,
        usage_total_tokens integer,
        pricing_input_per_1k double precision,
        pricing_cached_input_per_1k double precision,
        pricing_output_per_1k double precision,
        pricing_total_per_1k double precision,
        pricing_version text,
        pricing_source text,
        cost_input_usd double precision,
        cost_output_usd double precision,
        cost_total_usd double precision,
        cost_currency text,
        cost_source text,
        status text,
        error_message text,
        context_ids text[],
        category_ids text[],
        intent_scope text,
        intent_action text,
        metadata jsonb,
        imported_at timestamptz,
        created_at timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant ON ai_usage_logs(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_ai_usage_time ON ai_usage_logs(start_time DESC);
      CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON ai_usage_logs(model);
      CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage_logs(provider);
      CREATE INDEX IF NOT EXISTS idx_ai_usage_operation ON ai_usage_logs(operation);
    `);

    // Requests (align with RequestsRepository)
    console.log('📨 Creating rag_requests table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS rag_requests (
        tenant_id uuid NOT NULL,
        id text PRIMARY KEY,
        endpoint text NOT NULL,
        query text,
        prompt_key text,
        prompt_params jsonb,
        prompt_text text,
        model text,
        answer_text text,
        answer_status boolean DEFAULT false,
        contexts_used text[],
        intent_scope text,
        intent_action text,
        intent_detail text,
        latency_ms integer,
        created_at timestamptz DEFAULT now(),
        request_body jsonb,
        embedding_usage_id text,
        generating_usage_id text
      );
      CREATE INDEX IF NOT EXISTS idx_rag_requests_tenant ON rag_requests(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_rag_requests_created ON rag_requests(created_at DESC);
    `);

    // Query logs (used by admin/logs)
    await client.query(`
      CREATE TABLE IF NOT EXISTS query_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        user_email text,
        question text,
        answer text,
        status text,
        latency_ms integer,
        created_at timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_query_logs_tenant ON query_logs(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_query_logs_created ON query_logs(created_at DESC);
    `);

    // Instruction profiles & targets (align with repositories)
    console.log('🧩 Creating instruction_profiles & profile_targets tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS instruction_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name text NOT NULL,
        version integer DEFAULT 1,
        answer_style jsonb,
        retrieval_policy jsonb,
        trust_safety jsonb,
        glossary jsonb,
        ai_instruction_message text NOT NULL,
        is_active boolean DEFAULT true,
        min_trust_level integer DEFAULT 0,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_instruction_profiles_tenant ON instruction_profiles(tenant_id);

      CREATE TABLE IF NOT EXISTS profile_targets (
        profile_id uuid NOT NULL,
        tenant_id uuid NOT NULL,
        intent_scope text,
        intent_action text,
        channel text NOT NULL DEFAULT '',
        user_segment text NOT NULL DEFAULT '',
        priority integer DEFAULT 0,
        PRIMARY KEY (profile_id, tenant_id, coalesce(intent_scope,''), coalesce(intent_action,''), channel, user_segment)
      );
      CREATE INDEX IF NOT EXISTS idx_profile_targets_tenant ON profile_targets(tenant_id);
    `);

    // Optional context-related tables found in your local DB
    await client.query(`
      CREATE TABLE IF NOT EXISTS context_profile_overrides (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
        profile_id uuid NOT NULL,
        overrides jsonb NOT NULL,
        created_at timestamptz DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS context_images (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
        url text NOT NULL,
        alt text,
        created_at timestamptz DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS context_usage_stats (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
        views integer DEFAULT 0,
        likes integer DEFAULT 0,
        dislikes integer DEFAULT 0,
        last_viewed_at timestamptz
      );
      CREATE TABLE IF NOT EXISTS summary_stats (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        stat_key text NOT NULL,
        stat_value numeric,
        recorded_at timestamptz DEFAULT now()
      );
    `);

    console.log('📊 Creating database indexes...');
    // Additional indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_categories_tenant_parent ON categories(tenant_id, parent_id);
      CREATE INDEX IF NOT EXISTS idx_contexts_tenant_category ON contexts(tenant_id, category_id);
      CREATE INDEX IF NOT EXISTS idx_contexts_keywords ON contexts USING GIN(keywords);
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_tenant_user ON chat_sessions(tenant_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session_role ON chat_messages(session_id, role);
      CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_key ON tenant_settings(tenant_id, key);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_token ON user_sessions(user_id, session_token);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_user ON audit_logs(tenant_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    `);

    // Vector index for embeddings (if available)
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_contexts_embedding ON contexts 
        USING ivfflat (embedding vector_cosine_ops)
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

    // Definitive list used by code + your local
    const expectedTables = [
      'tenants','users','categories','contexts',
      'context_categories','context_intent_scopes','context_intent_actions','context_edit_history',
      'intents','intent_scopes','intent_actions','prompts',
      'ai_pricing','ai_usage_logs','rag_requests','query_logs',
      'instruction_profiles','profile_targets',
      'context_profile_overrides','context_images','context_usage_stats',
      'chat_sessions','chat_messages',
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

    await createTables();
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
