import { getPostgresPool } from '../adapters/db/postgresClient';
import { ErrorLogsRepository } from '../repositories/errorLogsRepository';

async function main() {
  const pool = getPostgresPool();
  const repo = new ErrorLogsRepository(pool);
  await repo.ensureTable();
  const { rows } = await pool.query(`SELECT to_regclass('public.error_logs') AS tbl`);
  // eslint-disable-next-line no-console
  console.log('Ensured table:', rows?.[0]?.tbl || null);
  process.exit(0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Failed ensuring error_logs table:', e);
  process.exit(1);
});


