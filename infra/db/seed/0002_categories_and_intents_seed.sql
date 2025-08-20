-- Seed data for categories and intents
-- This script populates the new category and intent system with sample data

SET app.current_tenant = '00000000-0000-0000-0000-000000000000';

-- Insert demo categories (hierarchical structure)
INSERT INTO categories (id, tenant_id, name, slug, description, parent_id, level, sort_order) VALUES
-- Top level categories (level 0)
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'Travel & Tourism', 'travel-tourism', 'Places, accommodations, and travel-related information', NULL, 0, 1),
('cat-business-0000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Business & Services', 'business-services', 'Companies, services, and business information', NULL, 0, 2),
('cat-food-000000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Food & Dining', 'food-dining', 'Restaurants, cafes, and food-related content', NULL, 0, 3),
('cat-entertainment-00-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Entertainment', 'entertainment', 'Events, shows, and entertainment venues', NULL, 0, 4),
('cat-shopping-00000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Shopping', 'shopping', 'Retail stores, malls, and shopping centers', NULL, 0, 5),

-- Second level categories (level 1)
-- Travel sub-categories
('cat-hotels-000000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Hotels & Accommodation', 'hotels-accommodation', 'Hotels, resorts, and lodging', 'cat-travel-00000000-0000-0000-0000-000000000000', 1, 1),
('cat-attractions-0000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Attractions & Landmarks', 'attractions-landmarks', 'Tourist attractions and landmarks', 'cat-travel-00000000-0000-0000-0000-000000000000', 1, 2),
('cat-transport-00000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Transportation', 'transportation', 'Airports, stations, and transport services', 'cat-travel-00000000-0000-0000-0000-000000000000', 1, 3),

-- Food sub-categories
('cat-restaurants-000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Restaurants', 'restaurants', 'Full-service restaurants and dining', 'cat-food-000000000-0000-0000-0000-000000000000', 1, 1),
('cat-cafes-0000000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Cafes & Coffee Shops', 'cafes-coffee', 'Coffee shops, cafes, and light dining', 'cat-food-000000000-0000-0000-0000-000000000000', 1, 2),
('cat-fastfood-000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Fast Food', 'fast-food', 'Quick service and fast food chains', 'cat-food-000000000-0000-0000-0000-000000000000', 1, 3),

-- Third level categories (level 2)
-- Restaurant cuisine types
('cat-thai-00000000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Thai Cuisine', 'thai-cuisine', 'Traditional and modern Thai restaurants', 'cat-restaurants-000-0000-0000-0000-000000000000', 2, 1),
('cat-international-00-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'International Cuisine', 'international-cuisine', 'Non-Thai international restaurants', 'cat-restaurants-000-0000-0000-0000-000000000000', 2, 2);

-- Insert demo intent scopes
INSERT INTO intent_scopes (id, tenant_id, name, slug, description, sort_order) VALUES
('scope-general-0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'General Information', 'general', 'General inquiries and information requests', 1),
('scope-location-000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Location Services', 'location', 'Location-based queries and directions', 2),
('scope-booking-0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Booking & Reservations', 'booking', 'Booking services and reservation requests', 3),
('scope-support-0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Customer Support', 'support', 'Customer service and support requests', 4),
('scope-recommendation-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Recommendations', 'recommendations', 'Suggestions and recommendations', 5);

-- Insert demo intent actions
INSERT INTO intent_actions (id, tenant_id, scope_id, name, slug, description, sort_order) VALUES
-- General Information actions
('action-info-000000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'scope-general-0000000-0000-0000-0000-000000000000', 'Basic Information', 'basic-info', 'Provide basic details and information', 1),
('action-hours-00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'scope-general-0000000-0000-0000-0000-000000000000', 'Operating Hours', 'operating-hours', 'Provide operating hours and schedule', 2),
('action-contact-000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'scope-general-0000000-0000-0000-0000-000000000000', 'Contact Information', 'contact-info', 'Provide contact details', 3),

-- Location Services actions
('action-directions-0000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'scope-location-000000-0000-0000-0000-000000000000', 'Directions', 'directions', 'Provide directions and navigation', 1),
('action-nearby-00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'scope-location-000000-0000-0000-0000-000000000000', 'Nearby Places', 'nearby-places', 'Find nearby locations and services', 2),
('action-transport-0000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'scope-location-000000-0000-0000-0000-000000000000', 'Transportation Options', 'transportation', 'Provide transport options and routes', 3),

-- Booking & Reservations actions
('action-availability-00-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'scope-booking-0000000-0000-0000-0000-000000000000', 'Check Availability', 'check-availability', 'Check availability for bookings', 1),
('action-make-booking-00-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'scope-booking-0000000-0000-0000-0000-000000000000', 'Make Reservation', 'make-reservation', 'Process booking and reservation requests', 2),
('action-modify-booking-0-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'scope-booking-0000000-0000-0000-0000-000000000000', 'Modify Booking', 'modify-booking', 'Handle booking modifications', 3),

-- Customer Support actions
('action-complaint-0000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'scope-support-0000000-0000-0000-0000-000000000000', 'Handle Complaints', 'handle-complaints', 'Process customer complaints', 1),
('action-help-000000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'scope-support-0000000-0000-0000-0000-000000000000', 'General Help', 'general-help', 'Provide general assistance', 2),

-- Recommendations actions
('action-suggest-places-0-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'scope-recommendation-0000-0000-0000-000000000000', 'Suggest Places', 'suggest-places', 'Recommend places to visit', 1),
('action-suggest-food-00-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'scope-recommendation-0000-0000-0000-000000000000', 'Food Recommendations', 'food-recommendations', 'Recommend food and dining options', 2);

-- Update existing context to use new categories and intents
-- Add categories to existing test context
INSERT INTO context_categories (tenant_id, context_id, category_id) VALUES
('00000000-0000-0000-0000-000000000000', 'cad0b846-8936-4219-887f-26682c25551e', 'cat-business-0000-0000-0000-0000-000000000000');

-- Add intent scopes to existing test context
INSERT INTO context_intent_scopes (tenant_id, context_id, scope_id) VALUES
('00000000-0000-0000-0000-000000000000', 'cad0b846-8936-4219-887f-26682c25551e', 'scope-general-0000000-0000-0000-0000-000000000000');

-- Add intent actions to existing test context
INSERT INTO context_intent_actions (tenant_id, context_id, action_id) VALUES
('00000000-0000-0000-0000-000000000000', 'cad0b846-8936-4219-887f-26682c25551e', 'action-info-000000000-0000-0000-0000-000000000000');

-- Update existing context with keywords
UPDATE contexts 
SET keywords = ARRAY['test', 'example', 'demo'] 
WHERE id = 'cad0b846-8936-4219-887f-26682c25551e';
