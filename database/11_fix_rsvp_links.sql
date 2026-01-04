-- Fix rsvp_link to point to home pages instead of RSVP pages
-- This script updates the generated column to use the correct URLs

-- Drop the old rsvp_link column
ALTER TABLE guests DROP COLUMN IF EXISTS rsvp_link;

-- Add the new rsvp_link column pointing to home pages
ALTER TABLE guests ADD COLUMN rsvp_link TEXT GENERATED ALWAYS AS (
  CASE 
    WHEN language = 'pt' THEN 'https://giancat.com/pt/?guest=' || id
    WHEN language = 'es' THEN 'https://giancat.com/es/?guest=' || id
    ELSE 'https://giancat.com/?guest=' || id
  END
) STORED;
