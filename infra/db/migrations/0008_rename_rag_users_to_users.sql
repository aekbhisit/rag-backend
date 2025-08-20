-- Migration: Rename rag_users to users and update related constraints/indexes

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rag_users') THEN
    ALTER TABLE rag_users RENAME TO users;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'rag_users_tenant_idx') THEN
    ALTER INDEX rag_users_tenant_idx RENAME TO users_tenant_idx;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rag_users_status_check') THEN
    ALTER TABLE users RENAME CONSTRAINT rag_users_status_check TO users_status_check;
  END IF;
END $$;

-- Ensure RLS enabled and tenant isolation policy exists on users
DO $$ BEGIN
  BEGIN
    ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  -- Drop old policy name if it exists on users
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='tenant_isolation_rag_users') THEN
    DROP POLICY tenant_isolation_rag_users ON users;
  END IF;
  -- Create new policy name
  DO $$ BEGIN
    CREATE POLICY tenant_isolation_users ON users USING (tenant_id = current_setting('app.current_tenant')::uuid);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
END $$;
