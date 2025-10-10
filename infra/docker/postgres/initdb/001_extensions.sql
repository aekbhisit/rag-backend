-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- UUID generation functions
CREATE EXTENSION IF NOT EXISTS vector;          -- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS postgis;         -- Geographic data types
CREATE EXTENSION IF NOT EXISTS pg_trgm;         -- Trigram text search
CREATE EXTENSION IF NOT EXISTS unaccent;        -- Remove accents from text

