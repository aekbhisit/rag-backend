-- Migration: Add status field to contexts table
-- Description: Adds status field to enable/disable contexts

-- Add status field to contexts table
ALTER TABLE contexts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Add check constraint for valid status values
ALTER TABLE contexts ADD CONSTRAINT contexts_status_check 
CHECK (status IN ('active', 'inactive'));

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_contexts_status ON contexts(status);

-- Update existing contexts to have active status
UPDATE contexts SET status = 'active' WHERE status IS NULL;
