-- View: user_feed_candidates
--
-- Flat per-video row with everything the "up next" / feed query needs:
-- video metadata, channel + creator priorities, precomputed creator avatar
-- (creators.thumbnail_url is maintained by trigger), and the count of
-- curated channels per creator (used by feed-scoring's fairness term).
--
-- Self-filters on auth.uid() and r2_synced_at so callers get their own feed
-- of playable videos in one query. security_invoker = true ensures the
-- underlying tables' RLS still applies.

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
  )                   AS creator_channel_count
FROM pradotube.videos v
JOIN pradotube.curated_channels cc   ON cc.channel_id = v.channel_id
JOIN pradotube.creators cr           ON cr.id = cc.creator_id
JOIN pradotube.user_subscriptions us ON us.creator_id = cr.id
                                      AND us.user_id = (SELECT auth.uid())
WHERE v.r2_synced_at IS NOT NULL;

GRANT SELECT ON pradotube.user_feed_candidates TO authenticated;
