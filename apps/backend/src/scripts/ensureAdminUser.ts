import { getPostgresPool } from "../adapters/db/postgresClient";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import bcrypt from "bcryptjs";

async function main() {
  const pool = getPostgresPool();
  const tenantId = process.env.TENANT_ID || "acc44cdb-8da5-4226-9569-1233a39f564f";
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "password";
  const name = process.env.ADMIN_NAME || "Admin";

  // Ensure users table and columns exist (mirror ensureTable)
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
          CREATE TABLE IF NOT EXISTS public.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        email varchar NOT NULL,
        role varchar NOT NULL DEFAULT 'admin',
        name text,
        status varchar NOT NULL DEFAULT 'active',
        timezone varchar NOT NULL DEFAULT 'UTC',
        password_hash text,
        last_login timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz
      );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_email ON public.users(tenant_id, email);
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'users' AND constraint_name = 'users_status_chk'
      ) THEN
        ALTER TABLE public.users ADD CONSTRAINT users_status_chk CHECK (status IN ('active','inactive','pending'));
      END IF;
    END$$;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name text;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status varchar NOT NULL DEFAULT 'active';
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash text;
  `);

  await pool.query(
    `INSERT INTO public.users (tenant_id,email,role,status,name)
     VALUES ($1,$2,'admin','active',$3)
     ON CONFLICT (tenant_id,email) DO UPDATE SET role='admin', status='active', name=COALESCE(EXCLUDED.name, public.users.name)`,
    [tenantId, email, name]
  );

  const hash = await bcrypt.hash(password, 10);
  await pool.query(`UPDATE public.users SET password_hash=$3 WHERE tenant_id=$1 AND email=$2`, [tenantId, email, hash]);
  console.log(`Admin user ensured for tenant ${tenantId}: ${email}`);
}

main().catch((e) => { console.error(e); process.exit(1); });


