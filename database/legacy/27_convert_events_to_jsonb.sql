-- Convert events name and description to JSONB for multi-language support

-- Add new JSONB columns
ALTER TABLE events
  ADD COLUMN name_jsonb JSONB DEFAULT '{}',
  ADD COLUMN description_jsonb JSONB DEFAULT '{}';

-- Migrate existing data (current data is assumed to be English)
UPDATE events
SET
  name_jsonb = jsonb_build_object('en', name, 'pt', '', 'es', ''),
  description_jsonb = jsonb_build_object('en', description, 'pt', '', 'es', '')
WHERE name IS NOT NULL OR description IS NOT NULL;

-- Drop old columns
ALTER TABLE events
  DROP COLUMN name,
  DROP COLUMN description;

-- Rename new columns to original names
ALTER TABLE events
  RENAME COLUMN name_jsonb TO name;

ALTER TABLE events
  RENAME COLUMN description_jsonb TO description;

-- Add NOT NULL constraint and defaults
ALTER TABLE events
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN description SET DEFAULT '{}';
