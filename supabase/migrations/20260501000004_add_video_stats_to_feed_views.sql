-- Add view_count and like_count to the feed views so the /shows tiles can
-- display engagement metadata alongside published_at. Both columns already
-- exist on pradotube.videos (added in 20260321000001_add_download_tracking).
--
-- This is a CREATE OR REPLACE on two views — no data movement, no data loss.

SET search_path TO pradotube, public;

DROP VIEW IF EXISTS pradotube.user_feed_scored;
DROP VIEW IF EXISTS pradotube.user_feed_candidates;

CREATE VIEW pradotube.user_feed_candidates
  WITH (security_invoker = true) AS
SELECT
  v.youtube_id        AS video_id,
  v.title,
  v.thumbnail_url,
  v.thumbnail_path,
  v.duration_seconds,
  v.published_at,
  v.view_count,
  v.like_count,
  v.channel_id,
  ch.priority         AS channel_priority,
  cr.id               AS creator_id,
  cr.name             AS creator_name,
  cr.priority         AS creator_priority,
  cr.thumbnail_url    AS creator_avatar,
  (
    SELECT COUNT(*)::int
    FROM pradotube.channels ch2
    WHERE ch2.creator_id = cr.id
  )                   AS creator_channel_count,
  cr.slug             AS creator_slug
FROM pradotube.videos v
JOIN pradotube.channels ch           ON ch.youtube_id = v.channel_id
JOIN pradotube.creators cr           ON cr.id = ch.creator_id
JOIN pradotube.user_subscriptions us ON us.creator_id = cr.id
                                      AND us.user_id = (SELECT auth.uid())
WHERE v.r2_synced_at IS NOT NULL;

GRANT SELECT ON pradotube.user_feed_candidates TO authenticated;

CREATE VIEW pradotube.user_feed_scored
  WITH (security_invoker = true) AS
WITH base AS (
  SELECT
    fc.*,
    CASE
      WHEN COUNT(*) OVER (PARTITION BY fc.channel_id) = 1 THEN 1.0
      ELSE 1.0 - (
        ROW_NUMBER() OVER (
          PARTITION BY fc.channel_id
          ORDER BY fc.published_at DESC NULLS LAST, fc.video_id DESC
        ) - 1
      )::float / NULLIF(COUNT(*) OVER (PARTITION BY fc.channel_id) - 1, 0)
    END AS rel_recency,
    CASE
      WHEN fc.published_at >= now() - interval '168 hours' THEN 1.0
      ELSE 0.0
    END AS freshness,
    (fc.channel_priority::float / 100.0)
      * (fc.creator_priority::float / 100.0) AS priority_norm,
    (abs(hashtext(current_date::text || ':' || fc.video_id))::float
      / 2147483647.0) AS jitter
  FROM pradotube.user_feed_candidates fc
),
scored AS (
  SELECT
    base.*,
    rel_recency * 0.3
      + priority_norm * 0.5
      + jitter * 0.1
      + freshness * 0.1 AS score
  FROM base
),
interleaved AS (
  SELECT
    scored.*,
    ROW_NUMBER() OVER (
      PARTITION BY creator_id
      ORDER BY score DESC, video_id ASC
    ) AS creator_rank
  FROM scored
)
SELECT
  video_id,
  title,
  thumbnail_url,
  thumbnail_path,
  duration_seconds,
  published_at,
  view_count,
  like_count,
  channel_id,
  channel_priority,
  creator_id,
  creator_name,
  creator_priority,
  creator_avatar,
  creator_channel_count,
  creator_slug,
  rel_recency,
  freshness,
  priority_norm,
  jitter,
  score,
  creator_rank,
  ROW_NUMBER() OVER (
    ORDER BY creator_rank ASC, score DESC, video_id ASC
  )::int AS feed_rank
FROM interleaved;

GRANT SELECT ON pradotube.user_feed_scored TO authenticated;
