-- Migration: Drop legacy config table
-- Description: Removes the unused `config` table (legacy), since the app stores settings in `tenants.settings`
-- Safe: Uses IF EXISTS so it won't fail if the table doesn't exist.

DROP TABLE IF EXISTS config CASCADE;
