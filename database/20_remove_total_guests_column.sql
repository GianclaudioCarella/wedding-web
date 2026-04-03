-- Remove total_guests column as we now track individual guests instead of party sizes
-- This column is no longer needed with the new party_role system (primary, partner, child, other)

ALTER TABLE guests DROP COLUMN IF EXISTS total_guests;
