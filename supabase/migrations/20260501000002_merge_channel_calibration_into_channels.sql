-- Merge channel_calibration into channels.
--
-- channel_calibration was always 1-1 with channels (PK on channel_id, FK to
-- channels.youtube_id). The current pipeline overwrites the row each
-- calibration run, so there's no history to preserve. Folding it into
-- channels makes channels the canonical home for everything channel-shaped:
-- YouTube facts + admin knobs + latest calibration.
--
-- This migration:
--   1. Adds the calibration columns to channels.
--   2. Backfills them from channel_calibration.
--   3. Drops channel_calibration's policies and the table itself.

SET search_path TO pradotube, public;

-- 1. Add calibration columns. All nullable so an uncalibrated channel reads
--    as NULL rather than misleadingly-zeroed.

ALTER TABLE channels
  ADD COLUMN calibrated_at           timestamptz,
  ADD COLUMN total_videos_sampled    integer,
  ADD COLUMN videos_in_date_range    integer,
  ADD COLUMN posts_per_week          numeric,
  ADD COLUMN avg_gap_days            numeric,
  ADD COLUMN median_gap_days         numeric,
  ADD COLUMN avg_duration_seconds    integer,
  ADD COLUMN median_duration_seconds integer,
  ADD COLUMN passing_min60           integer,
  ADD COLUMN passing_min60_max3600   integer,
  ADD COLUMN passing_min300          integer,
  ADD COLUMN passing_min300_max3600  integer,
  ADD COLUMN duration_buckets        jsonb;

-- 2. Backfill from channel_calibration.

UPDATE channels ch
SET calibrated_at           = cal.calibrated_at,
    total_videos_sampled    = cal.total_videos_sampled,
    videos_in_date_range    = cal.videos_in_date_range,
    posts_per_week          = cal.posts_per_week,
    avg_gap_days            = cal.avg_gap_days,
    median_gap_days         = cal.median_gap_days,
    avg_duration_seconds    = cal.avg_duration_seconds,
    median_duration_seconds = cal.median_duration_seconds,
    passing_min60           = cal.passing_min60,
    passing_min60_max3600   = cal.passing_min60_max3600,
    passing_min300          = cal.passing_min300,
    passing_min300_max3600  = cal.passing_min300_max3600,
    duration_buckets        = cal.duration_buckets
FROM channel_calibration cal
WHERE cal.channel_id = ch.youtube_id;

-- 3. Drop channel_calibration policies and the table.

DROP POLICY IF EXISTS "channel_calibration_select_authed" ON channel_calibration;
DROP POLICY IF EXISTS "channel_calibration_insert_admin"  ON channel_calibration;
DROP POLICY IF EXISTS "channel_calibration_update_admin"  ON channel_calibration;
DROP POLICY IF EXISTS "channel_calibration_delete_admin"  ON channel_calibration;

DROP TABLE channel_calibration;
