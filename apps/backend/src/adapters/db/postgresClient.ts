import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPostgresPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/rag_assistant',
    });
  }
  return pool;
}

export async function init() {
  const p = getPostgresPool();
  await p.query('SELECT 1');
}

export async function health() {
  try {
    await getPostgresPool().query('SELECT 1');
    return { status: 'ok' as const };
  } catch (e) {
    return { status: 'error' as const, error: (e as Error).message };
  }
}


