-- Add thumbnail_url to creators, backfilled from the avatar channel's thumbnail.
-- Decouples the creator avatar from the live channels.thumbnail_url so the
-- creator card can keep a stable image even if the channel record changes.

ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

UPDATE creators c
   SET thumbnail_url = ch.thumbnail_url
  FROM channels ch
 WHERE c.avatar_channel_id = ch.youtube_id
   AND c.thumbnail_url IS NULL;
