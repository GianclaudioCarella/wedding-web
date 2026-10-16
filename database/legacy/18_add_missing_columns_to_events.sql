-- Add missing columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_time TIME;
ALTER TABLE events ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
