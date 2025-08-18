import { getPostgresPool } from "../adapters/db/postgresClient";

async function main() {
	const pool = getPostgresPool();
	await pool.query(`
		ALTER TABLE public.users
			ADD COLUMN IF NOT EXISTS name text,
			ADD COLUMN IF NOT EXISTS status varchar NOT NULL DEFAULT 'active',
			ADD COLUMN IF NOT EXISTS password_hash text;
	`);
	await pool.query(`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM information_schema.constraint_column_usage
				WHERE table_name = 'users' AND constraint_name = 'users_status_chk'
			) THEN
				ALTER TABLE public.users
					ADD CONSTRAINT users_status_chk CHECK (status IN ('active','inactive','pending'));
			END IF;
		END$$;
	`);
	const { rows } = await pool.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='users' AND table_schema='public' ORDER BY column_name`);
	console.log(rows);
	process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
