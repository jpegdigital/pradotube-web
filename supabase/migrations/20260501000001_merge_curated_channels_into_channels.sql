-- Merge curated_channels into channels.
--
-- curated_channels was always 1-1 with channels (UNIQUE on channel_id), so it
-- has been folded into channels. Every row in channels is now a curated channel.
-- Removing a channel hard-deletes the row and cascades to videos.
--
-- This migration:
--   1. Adds the curation columns to channels.
--   2. Backfills them from curated_channels.
--   3. Recreates the trigger that auto-sets creators.avatar_channel_id to
--      fire on channels instead of curated_channels.
--   4. Recreates user_feed_candidates and user_feed_scored to join channels
--      directly.
--   5. Rewrites the videos_select_subscribed RLS policy to join channels.
--   6. Drops curated_channels and its policies/indexes.

SET search_path TO pradotube, public;

-- 1. Add curation columns to channels.

ALTER TABLE channels
  ADD COLUMN creator_id            uuid REFERENCES creators(id) ON DELETE SET NULL,
  ADD COLUMN display_order         integer DEFAULT 0,
  ADD COLUMN notes                 text,
  ADD COLUMN priority              integer NOT NULL DEFAULT 50
    CHECK (priority >= 0 AND priority <= 100),
  ADD COLUMN date_range_override   text,
  ADD COLUMN min_duration_override integer,
  ADD COLUMN max_videos_override   integer,
  ADD COLUMN sync_mode             text NOT NULL DEFAULT 'sync',
  ADD COLUMN last_full_refresh_at  timestamptz,
  ADD COLUMN min_duration_seconds  integer NOT NULL DEFAULT 60,
  ADD COLUMN max_duration_seconds  integer NOT NULL DEFAULT 3600,
  ADD COLUMN catalog_fraction      numeric NOT NULL DEFAULT 0.60,
  ADD COLUMN scoring_alpha         numeric NOT NULL DEFAULT 0.30,
  ADD COLUMN storage_budget_gb     numeric NOT NULL DEFAULT 10.0;

COMMENT ON COLUMN channels.date_range_override IS 'ytdl-sub date_range.after override, e.g. "today-2years". NULL = use default.';
COMMENT ON COLUMN channels.max_videos_override IS 'Per-channel override for max videos. NULL = use global config default.';

CREATE INDEX idx_channels_creator       ON channels(creator_id);
CREATE INDEX idx_channels_display_order ON channels(display_order);

-- 2. Backfill curation data from curated_channels.

UPDATE channels ch
SET creator_id            = cc.creator_id,
    display_order         = COALESCE(cc.display_order, 0),
    notes                 = cc.notes,
    priority              = cc.priority,
    date_range_override   = cc.date_range_override,
    min_duration_override = cc.min_duration_override,
    max_videos_override   = cc.max_videos_override,
    sync_mode             = cc.sync_mode,
    last_full_refresh_at  = cc.last_full_refresh_at,
    min_duration_seconds  = cc.min_duration_seconds,
    max_duration_seconds  = cc.max_duration_seconds,
    catalog_fraction      = cc.catalog_fraction,
    scoring_alpha         = cc.scoring_alpha,
    storage_budget_gb     = cc.storage_budget_gb
FROM curated_channels cc
WHERE cc.channel_id = ch.youtube_id;

-- 3. Recreate the avatar trigger on channels. First channel assigned to a
--    creator wins; guarded by avatar_channel_id IS NULL so manual overrides
--    are preserved.

DROP TRIGGER IF EXISTS trg_set_creator_avatar ON curated_channels;

CREATE OR REPLACE FUNCTION pradotube.set_creator_avatar_from_channel()
RETURNS trigger AS $$
BEGIN
  UPDATE pradotube.creators c
     SET avatar_channel_id = NEW.youtube_id,
         thumbnail_url     = NEW.thumbnail_url
   WHERE c.id = NEW.creator_id
     AND c.avatar_channel_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS pradotube.set_creator_avatar_from_curated_channel();

CREATE TRIGGER trg_set_creator_avatar
AFTER INSERT OR UPDATE OF creator_id ON channels
FOR EACH ROW
WHEN (NEW.creator_id IS NOT NULL)
EXECUTE FUNCTION pradotube.set_creator_avatar_from_channel();

-- 4. Recreate views to join channels directly.
--    DROP first because column counts/order may change.

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

-- 5. Rewrite videos_select_subscribed RLS policy.
--    Subscribed users can read videos whose channel.creator_id matches one of
--    their user_subscriptions.creator_id.

DROP POLICY IF EXISTS "videos_select_subscribed" ON videos;

CREATE POLICY "videos_select_subscribed" ON videos
  FOR SELECT TO authenticated
  USING (
    channel_id IN (
      SELECT ch.youtube_id
      FROM channels ch
      INNER JOIN user_subscriptions us ON us.creator_id = ch.creator_id
      WHERE us.user_id = (SELECT auth.uid())
    )
  );

-- 6. Drop curated_channels and its policies/indexes.

DROP POLICY IF EXISTS "curated_channels_select_authed" ON curated_channels;
DROP POLICY IF EXISTS "curated_channels_insert_admin" ON curated_channels;
DROP POLICY IF EXISTS "curated_channels_update_admin" ON curated_channels;
DROP POLICY IF EXISTS "curated_channels_delete_admin" ON curated_channels;

DROP TABLE curated_channels;
