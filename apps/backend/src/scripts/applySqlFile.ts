import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getPostgresPool } from '../adapters/db/postgresClient';

async function main() {
  const MIGRATION_FILE = process.env.MIGRATION_FILE;
  if (!MIGRATION_FILE) {
    console.error('MIGRATION_FILE env var is required');
    process.exit(1);
  }
  const abs = resolve(process.cwd(), MIGRATION_FILE);
  console.log('🚀 Applying SQL file:', abs);
  const sql = readFileSync(abs, 'utf8');
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ SQL applied successfully');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to apply SQL:', (e as Error).message);
    process.exit(1);
  } finally {
    client.release();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


