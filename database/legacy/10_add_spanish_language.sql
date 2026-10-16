-- Drop the old constraint
ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_language_check;

-- Add new constraint with Spanish support
ALTER TABLE guests ADD CONSTRAINT guests_language_check 
CHECK (language IN ('en', 'pt', 'es'));

-- Drop the old rsvp_link column (it's a generated column, so we need to recreate it)
ALTER TABLE guests DROP COLUMN rsvp_link;

-- Add the new rsvp_link column with Spanish support
ALTER TABLE guests ADD COLUMN rsvp_link TEXT GENERATED ALWAYS AS (
  CASE 
    WHEN language = 'pt' THEN 'https://giancat.com/pt/rsvp?guest=' || id
    WHEN language = 'es' THEN 'https://giancat.com/es/rsvp?guest=' || id
    ELSE 'https://giancat.com/rsvp?guest=' || id
  END
) STORED;
