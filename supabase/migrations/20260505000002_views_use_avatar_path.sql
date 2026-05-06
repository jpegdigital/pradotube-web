-- Switch user_feed_candidates and user_feed_scored to expose creator avatar
-- as an R2 object path (creator_avatar_path) instead of an external URL.
-- The frontend builds the full URL from NEXT_PUBLIC_R2_PUBLIC_URL.
--
-- The legacy `creator_avatar` column (which emitted creators.thumbnail_url) is
-- removed. After the avatar_path backfill (20260505000001) every creator has
-- avatar_path populated, so this is not a regression.

DROP VIEW IF EXISTS pradotube.user_feed_scored;
DROP VIEW IF EXISTS pradotube.user_feed_candidates;

CREATE VIEW pradotube.user_feed_candidates WITH (security_invoker = true) AS
SELECT
    v.youtube_id              AS video_id,
    v.title,
    v.thumbnail_url,
    v.thumbnail_path,
    v.duration_seconds,
    v.published_at,
    v.view_count,
    v.like_count,
    v.channel_id,
    ch.priority               AS channel_priority,
    cr.id                     AS creator_id,
    cr.name                   AS creator_name,
    cr.priority               AS creator_priority,
    cr.avatar_path            AS creator_avatar_path,
    (SELECT count(*)::integer FROM pradotube.channels ch2 WHERE ch2.creator_id = cr.id) AS creator_channel_count,
    cr.slug                   AS creator_slug
FROM pradotube.videos v
JOIN pradotube.channels ch          ON ch.youtube_id = v.channel_id
JOIN pradotube.creators cr          ON cr.id = ch.creator_id
JOIN pradotube.user_subscriptions us ON us.creator_id = cr.id AND us.user_id = (SELECT auth.uid())
WHERE v.r2_synced_at IS NOT NULL;

CREATE VIEW pradotube.user_feed_scored WITH (security_invoker = true) AS
WITH base AS (
    SELECT
        fc.video_id,
        fc.title,
        fc.thumbnail_url,
        fc.thumbnail_path,
        fc.duration_seconds,
        fc.published_at,
        fc.view_count,
        fc.like_count,
        fc.channel_id,
        fc.channel_priority,
        fc.creator_id,
        fc.creator_name,
        fc.creator_priority,
        fc.creator_avatar_path,
        fc.creator_channel_count,
        fc.creator_slug,
        CASE
            WHEN count(*) OVER (PARTITION BY fc.channel_id) = 1 THEN 1.0::double precision
            ELSE 1.0 - (row_number() OVER (PARTITION BY fc.channel_id ORDER BY fc.published_at DESC NULLS LAST, fc.video_id DESC) - 1)::double precision
                / NULLIF(count(*) OVER (PARTITION BY fc.channel_id) - 1, 0)::double precision
        END AS rel_recency,
        CASE WHEN fc.published_at >= (now() - INTERVAL '168 hours') THEN 1.0 ELSE 0.0 END AS freshness,
        fc.channel_priority::double precision / 100.0 * (fc.creator_priority::double precision / 100.0) AS priority_norm,
        abs(hashtext((CURRENT_DATE::text || ':') || fc.video_id))::double precision / 2147483647.0 AS jitter
    FROM pradotube.user_feed_candidates fc
), scored AS (
    SELECT
        base.*,
        base.rel_recency * 0.3 + base.priority_norm * 0.5 + base.jitter * 0.1 + base.freshness * 0.1 AS score
    FROM base
), interleaved AS (
    SELECT
        scored.*,
        row_number() OVER (PARTITION BY scored.creator_id ORDER BY scored.score DESC, scored.video_id) AS creator_rank
    FROM scored
)
SELECT
    video_id, title, thumbnail_url, thumbnail_path, duration_seconds, published_at,
    view_count, like_count, channel_id, channel_priority, creator_id, creator_name,
    creator_priority, creator_avatar_path, creator_channel_count, creator_slug,
    rel_recency, freshness, priority_norm, jitter, score, creator_rank,
    row_number() OVER (ORDER BY creator_rank, score DESC, video_id)::integer AS feed_rank
FROM interleaved;
