-- Fixed seed data for categories and intents
SET app.current_tenant = '00000000-0000-0000-0000-000000000000';

-- Insert demo categories (using gen_random_uuid())
INSERT INTO categories (tenant_id, name, slug, description, parent_id, level, sort_order) VALUES
-- Top level categories (level 0)
('00000000-0000-0000-0000-000000000000', 'Travel & Tourism', 'travel-tourism', 'Places, accommodations, and travel-related information', NULL, 0, 1),
('00000000-0000-0000-0000-000000000000', 'Business & Services', 'business-services', 'Companies, services, and business information', NULL, 0, 2),
('00000000-0000-0000-0000-000000000000', 'Food & Dining', 'food-dining', 'Restaurants, cafes, and food-related content', NULL, 0, 3),
('00000000-0000-0000-0000-000000000000', 'Entertainment', 'entertainment', 'Events, shows, and entertainment venues', NULL, 0, 4),
('00000000-0000-0000-0000-000000000000', 'Shopping', 'shopping', 'Retail stores, malls, and shopping centers', NULL, 0, 5);

-- Insert demo intent scopes
INSERT INTO intent_scopes (tenant_id, name, slug, description, sort_order) VALUES
('00000000-0000-0000-0000-000000000000', 'General Information', 'general', 'General inquiries and information requests', 1),
('00000000-0000-0000-0000-000000000000', 'Location Services', 'location', 'Location-based queries and directions', 2),
('00000000-0000-0000-0000-000000000000', 'Booking & Reservations', 'booking', 'Booking services and reservation requests', 3),
('00000000-0000-0000-0000-000000000000', 'Customer Support', 'support', 'Customer service and support requests', 4),
('00000000-0000-0000-0000-000000000000', 'Recommendations', 'recommendations', 'Suggestions and recommendations', 5);

-- Get IDs for relationships (using a simple approach)
-- We'll add intent actions for the general scope
DO $$
DECLARE
    general_scope_id UUID;
    location_scope_id UUID;
    cat_business_id UUID;
    cat_food_id UUID;
BEGIN
    -- Get scope IDs
    SELECT id INTO general_scope_id FROM intent_scopes WHERE slug = 'general' AND tenant_id = '00000000-0000-0000-0000-000000000000';
    SELECT id INTO location_scope_id FROM intent_scopes WHERE slug = 'location' AND tenant_id = '00000000-0000-0000-0000-000000000000';
    
    -- Insert intent actions
    INSERT INTO intent_actions (tenant_id, scope_id, name, slug, description, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000000', general_scope_id, 'Basic Information', 'basic-info', 'Provide basic details and information', 1),
    ('00000000-0000-0000-0000-000000000000', general_scope_id, 'Operating Hours', 'operating-hours', 'Provide operating hours and schedule', 2),
    ('00000000-0000-0000-0000-000000000000', general_scope_id, 'Contact Information', 'contact-info', 'Provide contact details', 3),
    ('00000000-0000-0000-0000-000000000000', location_scope_id, 'Directions', 'directions', 'Provide directions and navigation', 1),
    ('00000000-0000-0000-0000-000000000000', location_scope_id, 'Nearby Places', 'nearby-places', 'Find nearby locations and services', 2);
    
    -- Get category IDs
    SELECT id INTO cat_business_id FROM categories WHERE slug = 'business-services' AND tenant_id = '00000000-0000-0000-0000-000000000000';
    
    -- Add categories to existing test context if it exists
    INSERT INTO context_categories (tenant_id, context_id, category_id) 
    SELECT '00000000-0000-0000-0000-000000000000', 'cad0b846-8936-4219-887f-26682c25551e', cat_business_id
    WHERE EXISTS (SELECT 1 FROM contexts WHERE id = 'cad0b846-8936-4219-887f-26682c25551e');
    
    -- Add intent scopes to existing test context if it exists
    INSERT INTO context_intent_scopes (tenant_id, context_id, scope_id) 
    SELECT '00000000-0000-0000-0000-000000000000', 'cad0b846-8936-4219-887f-26682c25551e', general_scope_id
    WHERE EXISTS (SELECT 1 FROM contexts WHERE id = 'cad0b846-8936-4219-887f-26682c25551e');
    
END $$;

-- Update existing context with keywords
UPDATE contexts 
SET keywords = ARRAY['test', 'example', 'demo', 'website'] 
WHERE id = 'cad0b846-8936-4219-887f-26682c25551e';
