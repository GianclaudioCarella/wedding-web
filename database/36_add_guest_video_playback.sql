-- Browser-friendly copy of a video (H.264 + AAC in MP4), for originals browsers
-- refuse to play, e.g. iPhone 16 .mov files with spatial (APAC) audio.
-- When set, the album streams this instead of original_key; downloads stay on the original.
ALTER TABLE public.guest_photos
  ADD COLUMN IF NOT EXISTS playback_key TEXT;

-- Videos already uploaded with that problem. Their play.mp4 copies were made by
-- remuxing the originals with ffmpeg (no re-encoding) and uploaded to S3 by hand:
--   ffmpeg -i original.mov -map 0:v:0 -map 0:a:0 -c copy -movflags +faststart play.mp4
UPDATE public.guest_photos
SET playback_key = 'photos/' || id || '/play.mp4'
WHERE playback_key IS NULL
  AND id IN (
    '3a51929d-4ed7-4be7-9752-f90a4e8e92f5',
    '88c50ae0-2614-41b5-9969-a81e23f607e6',
    '7313f654-f3c7-4685-980a-2ab487da30a5',
    '9e14260c-5ad5-4ee5-989f-eaaa9a70a33b',
    '716ccb29-3c18-4924-8bb5-5b13926ef330',
    '04a2170c-1b38-48a1-8de7-00cb688fff55'
  );
