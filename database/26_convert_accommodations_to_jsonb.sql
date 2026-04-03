-- Convert accommodation description to JSONB for multi-language support

-- Add new JSONB column
ALTER TABLE external_accommodations
  ADD COLUMN description_jsonb JSONB DEFAULT '{}';

-- Migrate existing data (current data is assumed to be English)
UPDATE external_accommodations
SET
  description_jsonb = jsonb_build_object('en', description, 'pt', '', 'es', '')
WHERE description IS NOT NULL;

-- Drop old column
ALTER TABLE external_accommodations
  DROP COLUMN description;

-- Rename new column to original name
ALTER TABLE external_accommodations
  RENAME COLUMN description_jsonb TO description;

-- Set default for new column
ALTER TABLE external_accommodations
  ALTER COLUMN description SET DEFAULT '{}';
