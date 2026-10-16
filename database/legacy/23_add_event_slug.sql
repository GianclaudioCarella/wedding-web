-- Add slug column to events for stable image/asset linking
ALTER TABLE events ADD COLUMN IF NOT EXISTS slug TEXT;

-- Auto-populate slugs from existing event names (safe to re-run)
UPDATE events SET slug = 'pre-party'  WHERE slug IS NULL AND (name ILIKE '%pre-party%' OR name ILIKE '%pre party%' OR name ILIKE '%thursday%');
UPDATE events SET slug = 'wedding'    WHERE slug IS NULL AND  name ILIKE '%wedding%';
UPDATE events SET slug = 'aftermath'  WHERE slug IS NULL AND (name ILIKE '%aftermath%' OR name ILIKE '%sunday%' OR name ILIKE '%brunch%');
