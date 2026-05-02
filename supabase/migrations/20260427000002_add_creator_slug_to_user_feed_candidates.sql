-- Add creator_slug to user_feed_candidates so the /shows/[slug] route can
-- filter and link without an extra join. CREATE OR REPLACE VIEW preserves
-- the existing GRANT SELECT; the new column is appended last because
-- Postgres won't let CREATE OR REPLACE VIEW reorder existing columns.

SET search_path TO pradotube, public;

CREATE OR REPLACE VIEW pradotube.user_feed_candidates
  WITH (security_invoker = true) AS
SELECT
  v.youtube_id        AS video_id,
  v.title,
  v.thumbnail_url,
  v.thumbnail_path,
  v.duration_seconds,
  v.published_at,
  v.channel_id,
  cc.priority         AS channel_priority,
  cr.id               AS creator_id,
  cr.name             AS creator_name,
  cr.priority         AS creator_priority,
  cr.thumbnail_url    AS creator_avatar,
  (
    SELECT COUNT(*)::int
    FROM pradotube.curated_channels cc2
    WHERE cc2.creator_id = cr.id
  )                   AS creator_channel_count,
  cr.slug             AS creator_slug
FROM pradotube.videos v
JOIN pradotube.curated_channels cc   ON cc.channel_id = v.channel_id
JOIN pradotube.creators cr           ON cr.id = cc.creator_id
JOIN pradotube.user_subscriptions us ON us.creator_id = cr.id
                                      AND us.user_id = (SELECT auth.uid())
WHERE v.r2_synced_at IS NOT NULL;
