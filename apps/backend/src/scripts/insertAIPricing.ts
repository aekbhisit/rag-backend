import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface AIPricing {
  id: string;
  model: string;
  provider: string;
  input_cost_per_1k_tokens: number;
  output_cost_per_1k_tokens: number;
  context_length: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const defaultAIPricing: AIPricing[] = [
  {
    id: 'gpt-4o-2024-05-13',
    model: 'gpt-4o',
    provider: 'openai',
    input_cost_per_1k_tokens: 0.0025,
    output_cost_per_1k_tokens: 0.01,
    context_length: 128000,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'gpt-4o-mini-2024-07-18',
    model: 'gpt-4o-mini',
    provider: 'openai',
    input_cost_per_1k_tokens: 0.00015,
    output_cost_per_1k_tokens: 0.0006,
    context_length: 128000,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'gpt-3.5-turbo-0125',
    model: 'gpt-3.5-turbo',
    provider: 'openai',
    input_cost_per_1k_tokens: 0.0005,
    output_cost_per_1k_tokens: 0.0015,
    context_length: 16385,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    model: 'claude-3-5-sonnet',
    provider: 'anthropic',
    input_cost_per_1k_tokens: 0.003,
    output_cost_per_1k_tokens: 0.015,
    context_length: 200000,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'claude-3-haiku-20240307',
    model: 'claude-3-haiku',
    provider: 'anthropic',
    input_cost_per_1k_tokens: 0.00025,
    output_cost_per_1k_tokens: 0.00125,
    context_length: 200000,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'gemini-1.5-pro',
    model: 'gemini-1.5-pro',
    provider: 'google',
    input_cost_per_1k_tokens: 0.00125,
    output_cost_per_1k_tokens: 0.005,
    context_length: 1000000,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'gemini-1.5-flash',
    model: 'gemini-1.5-flash',
    provider: 'google',
    input_cost_per_1k_tokens: 0.000075,
    output_cost_per_1k_tokens: 0.0003,
    context_length: 1000000,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

async function createAIPricingTable() {
  const client = await pool.connect();
  try {
    // Create ai_pricing table if it doesn't exist
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

    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_pricing_provider_model ON ai_pricing(provider, model);
      CREATE INDEX IF NOT EXISTS idx_ai_pricing_active ON ai_pricing(is_active);
    `);

    console.log('AI pricing table created successfully');
  } catch (error) {
    console.error('Error creating AI pricing table:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function insertAIPricing() {
  const client = await pool.connect();
  try {
    // Check if data already exists
    const existingCount = await client.query('SELECT COUNT(*) FROM ai_pricing');
    if (parseInt(existingCount.rows[0].count) > 0) {
      console.log('AI pricing data already exists, skipping insertion');
      return;
    }

    // Insert default AI pricing data
    const insertQuery = `
      INSERT INTO ai_pricing (
        id, model, provider, input_cost_per_1k_tokens, 
        output_cost_per_1k_tokens, context_length, is_active, 
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING
    `;

    for (const pricing of defaultAIPricing) {
      await client.query(insertQuery, [
        pricing.id,
        pricing.model,
        pricing.provider,
        pricing.input_cost_per_1k_tokens,
        pricing.output_cost_per_1k_tokens,
        pricing.context_length,
        pricing.is_active,
        pricing.created_at,
        pricing.updated_at,
      ]);
    }

    console.log(`Inserted ${defaultAIPricing.length} AI pricing records`);
  } catch (error) {
    console.error('Error inserting AI pricing data:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('Starting AI pricing setup...');
    
    await createAIPricingTable();
    await insertAIPricing();
    
    console.log('AI pricing setup completed successfully');
  } catch (error) {
    console.error('AI pricing setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
