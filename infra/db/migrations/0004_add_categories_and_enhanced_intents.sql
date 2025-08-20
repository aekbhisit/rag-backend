-- Migration: Add categories and enhanced intents system
-- Description: Creates multi-level category system and hierarchical intent system

-- Categories table for multi-level categorization
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    level INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, slug, parent_id),
    CHECK (level >= 0 AND level <= 5) -- Max 5 levels deep
);

-- Context-Category relationship (many-to-many)
CREATE TABLE IF NOT EXISTS context_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    context_id UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, context_id, category_id)
);

-- Enhanced intents table with scope/action hierarchy
DROP TABLE IF EXISTS intents CASCADE;
CREATE TABLE IF NOT EXISTS intent_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS intent_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    scope_id UUID NOT NULL REFERENCES intent_scopes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, scope_id, slug)
);

-- Context-Intent relationship (many-to-many, both scope and action level)
DROP TABLE IF EXISTS context_intents CASCADE;
CREATE TABLE IF NOT EXISTS context_intent_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    context_id UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
    scope_id UUID NOT NULL REFERENCES intent_scopes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, context_id, scope_id)
);

CREATE TABLE IF NOT EXISTS context_intent_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    context_id UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
    action_id UUID NOT NULL REFERENCES intent_actions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, context_id, action_id)
);

-- Add keywords field to contexts table
ALTER TABLE contexts ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

-- Add images support for contexts (especially places)
CREATE TABLE IF NOT EXISTS context_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    context_id UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text TEXT,
    caption TEXT,
    source VARCHAR(50), -- 'upload', 'google_maps', 'import', etc.
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, context_id, url)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_tenant_parent ON categories(tenant_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_tenant_slug ON categories(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_context_categories_context ON context_categories(context_id);
CREATE INDEX IF NOT EXISTS idx_context_categories_category ON context_categories(category_id);

CREATE INDEX IF NOT EXISTS idx_intent_scopes_tenant ON intent_scopes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intent_actions_scope ON intent_actions(scope_id);
CREATE INDEX IF NOT EXISTS idx_context_intent_scopes_context ON context_intent_scopes(context_id);
CREATE INDEX IF NOT EXISTS idx_context_intent_actions_context ON context_intent_actions(context_id);

CREATE INDEX IF NOT EXISTS idx_contexts_keywords ON contexts USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_context_images_context ON context_images(context_id);

-- RLS Policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_intent_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_intent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY categories_tenant_isolation ON categories
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY context_categories_tenant_isolation ON context_categories
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- RLS Policies for intents
CREATE POLICY intent_scopes_tenant_isolation ON intent_scopes
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY intent_actions_tenant_isolation ON intent_actions
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY context_intent_scopes_tenant_isolation ON context_intent_scopes
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY context_intent_actions_tenant_isolation ON context_intent_actions
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- RLS Policies for images
CREATE POLICY context_images_tenant_isolation ON context_images
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
