import { getPostgresPool } from "../adapters/db/postgresClient";

async function main() {
	const pool = getPostgresPool();
	const tenantId = process.env.TENANT_ID || "acc44cdb-8da5-4226-9569-1233a39f564f";
	const name = process.env.TENANT_NAME || "Default Tenant";
	const contactEmail = process.env.TENANT_CONTACT_EMAIL || null;
	const code = process.env.TENANT_CODE || null;
	const slug = process.env.TENANT_SLUG || null;

	// Ensure table exists (compatible with current schema)
	await pool.query(`
		CREATE EXTENSION IF NOT EXISTS pgcrypto;
		CREATE TABLE IF NOT EXISTS tenants (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			name text NOT NULL,
			code text,
			slug text,
			contact_email text,
			is_active boolean DEFAULT true,
			settings jsonb,
			created_at timestamptz DEFAULT now(),
			updated_at timestamptz
		);
		ALTER TABLE tenants ADD COLUMN IF NOT EXISTS code text;
		ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug text;
		ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_email text;
		ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
		CREATE UNIQUE INDEX IF NOT EXISTS tenants_code_uniq ON tenants(code) WHERE code IS NOT NULL;
		CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_uniq ON tenants(slug) WHERE slug IS NOT NULL;
	`);

	const { rowCount } = await pool.query(`SELECT 1 FROM tenants WHERE id=$1`, [tenantId]);
	if (rowCount && rowCount > 0) {
		console.log(`Tenant already exists: ${tenantId}`);
		return;
	}

	await pool.query(
		`INSERT INTO tenants (id, name, code, slug, contact_email, is_active, settings)
		 VALUES ($1,$2,$3,$4,$5,true,'{}'::jsonb)
		 ON CONFLICT (id) DO NOTHING`,
		[tenantId, name, code, slug, contactEmail]
	);
	console.log(`Tenant ensured: ${tenantId} (${name})`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});


