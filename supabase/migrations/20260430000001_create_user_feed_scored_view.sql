-- View: user_feed_scored
--
-- Stable, paginatable scored feed. Built on top of user_feed_candidates so it
-- inherits the per-user filter (auth.uid()) and the r2_synced_at gate.
--
-- Score formula (mirrors the JS scoreVideo it replaces):
--   score = rel_recency * 0.3
--         + priority    * 0.5
--         + jitter      * 0.1
--         + freshness   * 0.1
--
-- where:
--   rel_recency  per-channel rank in [0, 1], newest = 1.0
--   priority     (channel_priority/100) * (creator_priority/100)
--   freshness    1.0 if published within the last 168h, else 0.0
--   jitter       deterministic per-(date, video) hash in [0, 1)
--
-- Diversification is replaced by a window-function interleave: each creator
-- gets a per-creator score rank, and feed_rank orders by (creator_rank ASC,
-- score DESC, video_id ASC). This produces a round-robin between creators
-- ranked by score within each round — strictly per-row pure, fully stable
-- for the day, and trivially cursor-paginatable via WHERE feed_rank > :cursor.
--
-- For single-creator queries (e.g. /shows/[slug]) feed_rank degenerates to
-- the score order within that creator, so the same column works for both.

SET search_path TO pradotube, public;

CREATE OR REPLACE VIEW pradotube.user_feed_scored
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
