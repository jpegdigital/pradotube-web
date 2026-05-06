-- Add avatar_path column to creators and channels.
--
-- Avatars move from external URLs (mostly yt3.googleusercontent.com) to R2-hosted
-- objects. The full URL is reconstructed at read time as:
--   ${NEXT_PUBLIC_R2_PUBLIC_URL}/${avatar_path}
--
-- This column is additive: thumbnail_url remains in place so existing views and
-- the set_creator_avatar_from_channel trigger keep working. Once all rows have
-- been migrated and view/trigger callers have been updated to coalesce on
-- avatar_path, thumbnail_url can be dropped in a follow-up migration.

ALTER TABLE pradotube.creators ADD COLUMN avatar_path text;
ALTER TABLE pradotube.channels ADD COLUMN avatar_path text;

COMMENT ON COLUMN pradotube.creators.avatar_path IS 'R2 object key for the creator avatar (e.g. creators/{id}/avatar.webp). Frontend URL: ${NEXT_PUBLIC_R2_PUBLIC_URL}/${avatar_path}. Prefer over thumbnail_url when set.';
COMMENT ON COLUMN pradotube.channels.avatar_path IS 'R2 object key for the channel avatar (e.g. channels/{youtube_id}/avatar.webp). Frontend URL: ${NEXT_PUBLIC_R2_PUBLIC_URL}/${avatar_path}. Prefer over thumbnail_url when set.';
