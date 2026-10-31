-- Guest photo album. Files live in S3 (see infra/); this table holds metadata.
-- Guests never talk to Supabase directly: the /api/album routes use the
-- service role after checking the album password cookie.
BEGIN;

CREATE TABLE IF NOT EXISTS public.guest_photos (
  id UUID PRIMARY KEY,
  original_key TEXT NOT NULL,
  display_key TEXT NOT NULL,
  thumb_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  width INTEGER CHECK (width > 0),
  height INTEGER CHECK (height > 0),
  original_filename TEXT,
  uploader_name TEXT CHECK (char_length(uploader_name) <= 80),
  -- SHA-256 of a random key kept in the uploader's browser, lets them delete their own photos.
  uploader_key_hash TEXT NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guest_photos_visible_created
  ON public.guest_photos(created_at DESC) WHERE hidden = false;

ALTER TABLE public.guest_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated guest photo access" ON public.guest_photos;
CREATE POLICY "Authenticated guest photo access" ON public.guest_photos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_photos TO authenticated;

COMMIT;
