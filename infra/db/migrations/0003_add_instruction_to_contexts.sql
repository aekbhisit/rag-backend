-- Add optional instruction column to contexts for UI guidance
ALTER TABLE contexts ADD COLUMN IF NOT EXISTS instruction text;


