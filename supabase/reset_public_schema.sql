-- ==============================================================================
-- AMBUNET: Reset Supabase public schema for a clean demo setup
-- ==============================================================================
-- Use this only for a demo/development database. It deletes all public tables,
-- functions, triggers, policies, and data, then recreates the public schema grants.
-- After this file succeeds, run:
--   1. supabase/schema.sql
--   2. supabase/seed.sql

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
