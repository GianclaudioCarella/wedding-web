-- Migration script to change attending field from BOOLEAN to TEXT
-- This script adds support for a third option: "perhaps"
-- 
-- Run this script in your Supabase SQL editor or via psql
-- WARNING: This will modify the rsvp_responses table structure

BEGIN;

-- Step 1: Add a new temporary column for the text values
ALTER TABLE rsvp_responses 
ADD COLUMN attending_new TEXT;

-- Step 2: Migrate existing data
-- Convert TRUE to 'yes' and FALSE to 'no'
UPDATE rsvp_responses
SET attending_new = CASE 
  WHEN attending = TRUE THEN 'yes'
  WHEN attending = FALSE THEN 'no'
  ELSE 'no'
END;

-- Step 3: Drop the old boolean column
ALTER TABLE rsvp_responses 
DROP COLUMN attending;

-- Step 4: Rename the new column to the original name
ALTER TABLE rsvp_responses 
RENAME COLUMN attending_new TO attending;

-- Step 5: Add NOT NULL constraint
ALTER TABLE rsvp_responses 
ALTER COLUMN attending SET NOT NULL;

-- Step 6 (Optional): Add a check constraint to ensure only valid values
ALTER TABLE rsvp_responses 
ADD CONSTRAINT attending_check 
CHECK (attending IN ('yes', 'no', 'perhaps'));

COMMIT;

-- To verify the migration was successful, run:
-- SELECT attending, COUNT(*) FROM rsvp_responses GROUP BY attending;
