-- Add tags column to guests table for categorization

-- Add tags as JSONB array for flexibility
ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create index for faster tag queries
CREATE INDEX IF NOT EXISTS idx_guests_tags ON guests USING GIN(tags);
