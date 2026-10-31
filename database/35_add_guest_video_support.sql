-- Videos in the guest album. For videos, original_key is the video file and
-- display_key/thumb_key are JPEG poster frames captured in the browser.
ALTER TABLE public.guest_photos
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  ADD COLUMN IF NOT EXISTS duration_seconds REAL CHECK (duration_seconds >= 0);
