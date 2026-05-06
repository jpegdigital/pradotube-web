--
-- Baseline migration: pradotube schema snapshot (squashed history)
--
-- Generated 2026-05-05 from prod (project kwtczgqcllbpaykibgzx) via:
--   pg_dump --schema=pradotube --schema-only --no-owner --no-privileges \
--           --no-publications --no-subscriptions --no-tablespaces
--
-- Replaces all migrations dated 20260320..20260504. Old files were squashed
-- because they kept confusing AI agents about current state. For history,
-- see git log up to commit prior to this baseline.
--
-- The iam.is_admin() function and the iam schema are owned by the auth
-- service (separate codebase) — referenced here, not defined.
--
-- Dumped from database version 17.6 by pg_dump 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pradotube; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pradotube;


SET default_table_access_method = heap;

--
-- Name: videos; Type: TABLE; Schema: pradotube; Owner: -
--

CREATE TABLE pradotube.videos (
    youtube_id text NOT NULL,
    channel_id text NOT NULL,
    title text NOT NULL,
    description text,
    thumbnail_url text,
    published_at timestamp with time zone,
    duration text,
    view_count bigint,
    fetched_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    is_downloaded boolean DEFAULT false NOT NULL,
    media_path text,
    thumbnail_path text,
    subtitle_path text,
    duration_seconds integer,
    like_count bigint,
    comment_count bigint,
    tags text[],
    categories text[],
    chapters jsonb,
    width integer,
    height integer,
    fps real,
    language text,
    webpage_url text,
    handle text,
    downloaded_at timestamp with time zone,
    info_json_synced_at timestamp with time zone,
    r2_synced_at timestamp with time zone,
    source_tags text[] DEFAULT '{}'::text[] NOT NULL,
    sync_tier text,
    storage_bytes bigint,
    score real DEFAULT 0,
    decision text DEFAULT 'auto'::text NOT NULL,
    decided_at timestamp with time zone,
    decided_by uuid,
    discovered_at timestamp with time zone DEFAULT now() NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    error text,
    started_at timestamp with time zone,
    CONSTRAINT videos_decision_check CHECK ((decision = ANY (ARRAY['auto'::text, 'pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: claim_next_job(text, integer, integer, integer, text); Type: FUNCTION; Schema: pradotube; Owner: -
--

CREATE FUNCTION pradotube.claim_next_job(p_channel_id text, p_max_attempts integer, p_min_duration integer, p_max_duration integer, p_sort_key text DEFAULT 'published_at'::text) RETURNS SETOF pradotube.videos
    LANGUAGE plpgsql
    SET search_path TO 'pradotube'
    AS $$
BEGIN
  RETURN QUERY
  UPDATE videos
  SET started_at = now()
  WHERE youtube_id = (
    SELECT youtube_id FROM videos
    WHERE channel_id = p_channel_id
      AND r2_synced_at IS NULL
      AND decision IN ('auto', 'approved')
      AND attempts < p_max_attempts
      AND duration_seconds >= p_min_duration
      AND (p_max_duration IS NULL OR duration_seconds <= p_max_duration)
      AND (started_at IS NULL OR started_at < now() - interval '1 hour')
    ORDER BY
      CASE WHEN p_sort_key  = 'score' THEN score        END DESC NULLS LAST,
      CASE WHEN p_sort_key <> 'score' THEN published_at END DESC NULLS LAST
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;


--
-- Name: compute_unique_seconds(jsonb); Type: FUNCTION; Schema: pradotube; Owner: -
--

CREATE FUNCTION pradotube.compute_unique_seconds(p_ranges jsonb) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'pradotube'
    AS $$
DECLARE
    total INT := 0;
    r JSONB;
BEGIN
    FOR r IN SELECT * FROM jsonb_array_elements(p_ranges) LOOP
        total := total + ((r->1)::int - (r->0)::int);
    END LOOP;
    RETURN total;
END;
$$;


--
-- Name: consume_pairing_code(text, text, bytea, text); Type: FUNCTION; Schema: pradotube; Owner: -
--

CREATE FUNCTION pradotube.consume_pairing_code(p_code text, p_device_label text, p_device_secret_hash bytea, p_user_agent text) RETURNS TABLE(device_id uuid, kid_user_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pradotube', 'public'
    AS $$
DECLARE
  v_code_id        UUID;
  v_kid_user_id    UUID;
  v_parent_user_id UUID;
  v_device_id      UUID;
  v_max_attempts   CONSTANT SMALLINT := 5;
BEGIN
  UPDATE pairing_codes
     SET attempts = attempts + 1
   WHERE consumed_at IS NULL
     AND expires_at > now();

  UPDATE pairing_codes
     SET consumed_at = now()
   WHERE consumed_at IS NULL
     AND expires_at > now()
     AND attempts > v_max_attempts;

  UPDATE pairing_codes
     SET consumed_at = now()
   WHERE code = p_code
     AND consumed_at IS NULL
     AND expires_at > now()
     AND id = (
       SELECT id FROM pairing_codes
        WHERE code = p_code
          AND consumed_at IS NULL
          AND expires_at > now()
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
     )
  RETURNING id, pairing_codes.kid_user_id, pairing_codes.parent_user_id
    INTO v_code_id, v_kid_user_id, v_parent_user_id;

  IF v_code_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO kid_devices (
    kid_user_id, parent_user_id, device_secret_hash,
    device_label, user_agent
  )
  VALUES (
    v_kid_user_id, v_parent_user_id, p_device_secret_hash,
    NULLIF(p_device_label, ''), NULLIF(p_user_agent, '')
  )
  RETURNING id INTO v_device_id;

  device_id := v_device_id;
  kid_user_id := v_kid_user_id;
  RETURN NEXT;
END;
$$;


--
-- Name: continue_watching_for_user(uuid, integer); Type: FUNCTION; Schema: pradotube; Owner: -
--

CREATE FUNCTION pradotube.continue_watching_for_user(p_user_id uuid, p_limit integer DEFAULT 10) RETURNS TABLE(video_id text, title text, thumbnail_url text, media_path text, duration_seconds integer, last_position integer, unique_seconds integer, coverage_pct double precision, creator_name text, creator_avatar_url text, creator_id uuid, session_id uuid, session_start timestamp with time zone)
    LANGUAGE plpgsql
    SET search_path TO 'pradotube'
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (ws.video_id)
        ws.video_id,
        v.title,
        v.thumbnail_url,
        v.media_path,
        ws.duration_seconds,
        ws.last_position,
        ws.unique_seconds,
        CASE
            WHEN ws.duration_seconds > 0
            THEN ROUND((ws.unique_seconds::float / ws.duration_seconds::float) * 100, 1)
            ELSE 0
        END::FLOAT       AS coverage_pct,
        c.name           AS creator_name,
        c.avatar_url     AS creator_avatar_url,
        c.id             AS creator_id,
        ws.id            AS session_id,
        ws.session_start
    FROM watch_sessions ws
    JOIN videos v   ON v.video_id = ws.video_id
    JOIN creators c ON c.id = v.creator_id
    WHERE ws.user_id = p_user_id
      AND ws.completed = false
      AND ws.last_position > 10
    ORDER BY ws.video_id, ws.session_start DESC
    LIMIT p_limit;
END;
$$;


--
-- Name: fail_video_atomic(text, text); Type: FUNCTION; Schema: pradotube; Owner: -
--

CREATE FUNCTION pradotube.fail_video_atomic(p_video_id text, p_error text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'pradotube'
    AS $$
BEGIN
  UPDATE videos
  SET started_at = NULL,
      attempts = attempts + 1,
      error = left(p_error, 1000)
  WHERE youtube_id = p_video_id;
END;
$$;


--
-- Name: feed_for_user(uuid, integer, integer, uuid, text); Type: FUNCTION; Schema: pradotube; Owner: -
--

CREATE FUNCTION pradotube.feed_for_user(p_user_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_creator_id uuid DEFAULT NULL::uuid, p_search_text text DEFAULT NULL::text) RETURNS TABLE(video_id text, title text, thumbnail_url text, media_path text, duration_seconds integer, published_at timestamp with time zone, channel_title text, creator_id uuid, creator_name text, creator_slug text, creator_avatar_url text, creator_priority integer, view_count bigint, like_count bigint, comment_count bigint, width integer, height integer, fps real, tags text[], score double precision)
    LANGUAGE sql
    SET search_path TO 'pradotube'
    AS $$
  WITH subscribed_videos AS (
    SELECT
      v.youtube_id,
      v.title,
      v.thumbnail_url        AS video_thumbnail_url,
      v.media_path,
      v.duration_seconds,
      v.published_at,
      ch.title                AS channel_title,
      cr.id                   AS cr_id,
      cr.name                 AS cr_name,
      cr.slug                 AS cr_slug,
      av_ch.thumbnail_url     AS cr_avatar_url,
      cr.priority             AS creator_priority,
      cc.priority             AS channel_priority,
      v.view_count,
      v.like_count,
      v.comment_count,
      v.width,
      v.height,
      v.fps,
      v.tags,
      ROW_NUMBER() OVER (PARTITION BY v.channel_id ORDER BY v.published_at DESC) AS recency_rank,
      COUNT(*)     OVER (PARTITION BY v.channel_id)                              AS channel_total,
      CASE WHEN v.published_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1.0 ELSE 0.0 END AS freshness
    FROM user_subscriptions us
    JOIN creators cr           ON cr.id = us.creator_id
    JOIN curated_channels cc   ON cc.creator_id = cr.id
    JOIN videos v              ON v.channel_id = cc.channel_id
    JOIN channels ch           ON ch.youtube_id = v.channel_id
    LEFT JOIN channels av_ch   ON av_ch.youtube_id = cr.avatar_channel_id
    WHERE us.user_id = p_user_id
      AND v.r2_synced_at IS NOT NULL
      AND (p_creator_id IS NULL OR cr.id = p_creator_id)
      AND (p_search_text IS NULL OR p_search_text = '' OR (
        v.title ILIKE '%' || p_search_text || '%'
        OR cr.name ILIKE '%' || p_search_text || '%'
        OR ch.title ILIKE '%' || p_search_text || '%'
        OR EXISTS (SELECT 1 FROM unnest(v.tags) t WHERE t ILIKE '%' || p_search_text || '%')
      ))
  ),
  scored AS (
    SELECT
      sv.*,
      CASE
        WHEN sv.channel_total <= 1 THEN 1.0
        ELSE 1.0 - ((sv.recency_rank - 1)::double precision / (sv.channel_total - 1)::double precision)
      END AS relative_recency,
      (sv.channel_priority::double precision / 100.0) * (sv.creator_priority::double precision / 100.0) AS priority_score,
      (('x' || substr(md5(to_char(CURRENT_DATE, 'YYYY-MM-DD') || ':' || sv.youtube_id), 1, 8))::bit(32)::bigint
        & x'7FFFFFFF'::bigint)::double precision / 2147483647.0 AS jitter
    FROM subscribed_videos sv
  ),
  final_scored AS (
    SELECT
      s.*,
      0.3 * s.relative_recency
        + 0.5 * s.priority_score
        + 0.1 * s.jitter
        + 0.1 * s.freshness AS final_score
    FROM scored s
  ),
  diversified AS (
    SELECT
      fs.*,
      ROW_NUMBER() OVER (PARTITION BY fs.cr_id ORDER BY fs.final_score DESC) AS creator_rank
    FROM final_scored fs
  )
  SELECT
    d.youtube_id    AS video_id,
    d.title,
    d.video_thumbnail_url AS thumbnail_url,
    d.media_path,
    d.duration_seconds,
    d.published_at,
    d.channel_title,
    d.cr_id         AS creator_id,
    d.cr_name       AS creator_name,
    d.cr_slug       AS creator_slug,
    d.cr_avatar_url AS creator_avatar_url,
    d.creator_priority,
    d.view_count,
    d.like_count,
    d.comment_count,
    d.width,
    d.height,
    d.fps,
    d.tags,
    d.final_score   AS score
  FROM diversified d
  ORDER BY
    CASE WHEN p_creator_id IS NULL THEN d.creator_rank ELSE 1 END ASC,
    d.final_score DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;


--
-- Name: get_distinct_video_channel_ids(); Type: FUNCTION; Schema: pradotube; Owner: -
--

CREATE FUNCTION pradotube.get_distinct_video_channel_ids() RETURNS TABLE(channel_id text)
    LANGUAGE sql
    SET search_path TO 'pradotube'
    AS $$
    SELECT DISTINCT v.channel_id
    FROM videos v
    WHERE v.channel_id IS NOT NULL;
$$;


--
-- Name: list_users(); Type: FUNCTION; Schema: pradotube; Owner: -
--

CREATE FUNCTION pradotube.list_users() RETURNS TABLE(id uuid, email text, first_name text, last_name text, is_admin boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'auth', 'iam'
    AS $$
  SELECT
    u.id,
    u.email::text,
    (u.raw_user_meta_data->>'first_name')::text AS first_name,
    (u.raw_user_meta_data->>'last_name')::text  AS last_name,
    EXISTS (
      SELECT 1
      FROM iam.memberships m
      JOIN iam.groups g ON g.id = m.group_id
      WHERE m.user_id = u.id
        AND g.name IN ('global:admin', 'pradotube:admin')
    ) AS is_admin
  FROM auth.users u
  WHERE iam.is_admin('pradotube')
  ORDER BY (u.raw_user_meta_data->>'first_name'), u.email;
$$;


--
-- Name: merge_ranges(jsonb); Type: FUNCTION; Schema: pradotube; Owner: -
--

CREATE FUNCTION pradotube.merge_ranges(p_ranges jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'pradotube'
    AS $$
DECLARE
    sorted JSONB;
    merged JSONB := '[]'::jsonb;
    current_start INT;
    current_end   INT;
    r JSONB;
    s INT;
    e INT;
BEGIN
    SELECT jsonb_agg(elem ORDER BY (elem->0)::int)
    INTO sorted
    FROM jsonb_array_elements(p_ranges) AS elem;

    IF sorted IS NULL OR jsonb_array_length(sorted) = 0 THEN
        RETURN '[]'::jsonb;
    END IF;

    current_start := (sorted->0->0)::int;
    current_end   := (sorted->0->1)::int;

    FOR i IN 1..jsonb_array_length(sorted) - 1 LOOP
        r := sorted->i;
        s := (r->0)::int;
        e := (r->1)::int;
        IF s <= current_end + 1 THEN
            current_end := GREATEST(current_end, e);
        ELSE
            merged := merged || jsonb_build_array(jsonb_build_array(current_start, current_end));
            current_start := s;
            current_end   := e;
        END IF;
    END LOOP;

    merged := merged || jsonb_build_array(jsonb_build_array(current_start, current_end));
    RETURN merged;
END;
$$;


--
-- Name: revoke_kid_device(uuid); Type: FUNCTION; Schema: pradotube; Owner: -
--

CREATE FUNCTION pradotube.revoke_kid_device(p_device_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pradotube', 'public'
    AS $$
DECLARE
  v_session_id UUID;
BEGIN
  IF NOT iam.is_admin('pradotube') THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  SELECT session_id INTO v_session_id
    FROM pradotube.kid_devices
   WHERE id = p_device_id;

  UPDATE pradotube.kid_devices
     SET revoked_at = COALESCE(revoked_at, now()),
         revoked_by = (select auth.uid()),
         session_id = NULL
   WHERE id = p_device_id;

  IF v_session_id IS NOT NULL THEN
    DELETE FROM auth.refresh_tokens WHERE session_id = v_session_id;
    DELETE FROM auth.sessions       WHERE id         = v_session_id;
  END IF;
END;
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: pradotube; Owner: -
--

CREATE FUNCTION pradotube.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('pradotube') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: search_creators(text, integer); Type: FUNCTION; Schema: pradotube; Owner: -
--

CREATE FUNCTION pradotube.search_creators(p_query text, p_limit integer DEFAULT 10) RETURNS TABLE(id uuid, name text, slug text, avatar_url text, priority integer)
    LANGUAGE sql
    SET search_path TO 'pradotube'
    AS $$
  SELECT
    cr.id,
    cr.name,
    cr.slug,
    av_ch.thumbnail_url AS avatar_url,
    cr.priority
  FROM creators cr
  LEFT JOIN channels av_ch ON av_ch.youtube_id = cr.avatar_channel_id
  WHERE
    p_query = '' OR
    cr.name ILIKE '%' || p_query || '%' OR
    cr.slug ILIKE '%' || p_query || '%'
  ORDER BY
    CASE WHEN p_query != '' AND cr.sort_name ILIKE p_query || '%' THEN 0 ELSE 1 END,
    cr.priority DESC,
    cr.sort_name
  LIMIT p_limit;
$$;


--
-- Name: search_videos(text, integer); Type: FUNCTION; Schema: pradotube; Owner: -
--

CREATE FUNCTION pradotube.search_videos(p_query text, p_limit integer DEFAULT 20) RETURNS TABLE(video_id text, title text, thumbnail_url text, media_path text, duration_seconds integer, published_at timestamp with time zone, channel_title text, creator_id uuid, creator_name text, creator_slug text, creator_avatar_url text, creator_priority integer, view_count bigint, like_count bigint, comment_count bigint, width integer, height integer, fps real, tags text[], score double precision)
    LANGUAGE sql
    SET search_path TO 'pradotube'
    AS $$
  SELECT
    v.youtube_id      AS video_id,
    v.title,
    v.thumbnail_url,
    v.media_path,
    v.duration_seconds,
    v.published_at,
    ch.title          AS channel_title,
    cr.id             AS creator_id,
    cr.name           AS creator_name,
    cr.slug           AS creator_slug,
    av_ch.thumbnail_url AS creator_avatar_url,
    cr.priority       AS creator_priority,
    v.view_count,
    v.like_count,
    v.comment_count,
    v.width,
    v.height,
    v.fps,
    v.tags,
    (CASE
      WHEN v.title ILIKE p_query || '%' THEN 1.0
      WHEN v.title ILIKE '%' || p_query || '%' THEN 0.8
      ELSE 0.5
    END * (cr.priority::double precision / 100.0)) AS score
  FROM videos v
  JOIN channels ch           ON ch.youtube_id = v.channel_id
  JOIN curated_channels cc   ON cc.channel_id = v.channel_id
  JOIN creators cr           ON cr.id = cc.creator_id
  LEFT JOIN channels av_ch   ON av_ch.youtube_id = cr.avatar_channel_id
  WHERE v.r2_synced_at IS NOT NULL
    AND (
      v.title ILIKE '%' || p_query || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(v.tags) t
        WHERE t ILIKE '%' || p_query || '%'
      )
    )
  ORDER BY score DESC, v.published_at DESC
  LIMIT p_limit;
$$;


--
-- Name: set_creator_avatar_from_channel(); Type: FUNCTION; Schema: pradotube; Owner: -
--

CREATE FUNCTION pradotube.set_creator_avatar_from_channel() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE pradotube.creators c
     SET thumbnail_url = NEW.thumbnail_url
   WHERE c.id = NEW.creator_id
     AND c.thumbnail_url IS NULL;
  RETURN NEW;
END;
$$;


--
-- Name: touch_kid_device(uuid); Type: FUNCTION; Schema: pradotube; Owner: -
--

CREATE FUNCTION pradotube.touch_kid_device(p_device_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pradotube', 'public'
    AS $$
BEGIN
  UPDATE kid_devices
     SET last_seen_at = now()
   WHERE id = p_device_id
     AND revoked_at IS NULL;
END;
$$;


--
-- Name: upsert_watch_heartbeat(uuid, text, uuid, jsonb, integer, integer, integer, text, text); Type: FUNCTION; Schema: pradotube; Owner: -
--

CREATE FUNCTION pradotube.upsert_watch_heartbeat(p_user_id uuid, p_video_id text, p_session_id uuid DEFAULT NULL::uuid, p_new_range jsonb DEFAULT NULL::jsonb, p_elapsed integer DEFAULT 0, p_position integer DEFAULT 0, p_duration integer DEFAULT NULL::integer, p_source text DEFAULT 'feed'::text, p_previous_video_id text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'pradotube'
    AS $$
DECLARE
    v_session_id UUID;
    v_ranges     JSONB;
    v_unique     INT;
    v_total      INT;
    v_completed  BOOLEAN;
    v_duration   INT;
BEGIN
    IF p_session_id IS NULL THEN
        INSERT INTO watch_sessions (user_id, video_id, duration_seconds, source, previous_video_id)
        VALUES (p_user_id, p_video_id, p_duration, p_source, p_previous_video_id)
        RETURNING id INTO v_session_id;
    ELSE
        v_session_id := p_session_id;
    END IF;

    SELECT watched_ranges, total_watch_time, duration_seconds
    INTO v_ranges, v_total, v_duration
    FROM watch_sessions
    WHERE id = v_session_id;

    IF v_duration IS NULL AND p_duration IS NOT NULL THEN
        v_duration := p_duration;
    END IF;

    IF p_new_range IS NOT NULL AND jsonb_typeof(p_new_range) = 'array' AND jsonb_array_length(p_new_range) = 2 THEN
        v_ranges := merge_ranges(v_ranges || jsonb_build_array(p_new_range));
    END IF;

    v_unique := compute_unique_seconds(v_ranges);
    v_completed := CASE
        WHEN v_duration IS NOT NULL AND v_duration > 0
        THEN (v_unique::float / v_duration::float) >= 0.85
        ELSE false
    END;

    UPDATE watch_sessions SET
        watched_ranges   = v_ranges,
        unique_seconds   = v_unique,
        total_watch_time = v_total + COALESCE(p_elapsed, 0),
        last_position    = p_position,
        duration_seconds = COALESCE(v_duration, duration_seconds),
        completed        = v_completed,
        session_end      = now(),
        updated_at       = now()
    WHERE id = v_session_id;

    RETURN v_session_id;
END;
$$;


--
-- Name: video_counts_by_channel(); Type: FUNCTION; Schema: pradotube; Owner: -
--

CREATE FUNCTION pradotube.video_counts_by_channel() RETURNS TABLE(channel_id text, downloaded bigint, uploaded bigint)
    LANGUAGE sql
    SET search_path TO 'pradotube'
    AS $$
  SELECT v.channel_id,
    COUNT(*) FILTER (WHERE v.r2_synced_at IS NOT NULL) AS downloaded,
    COUNT(*) FILTER (WHERE v.r2_synced_at IS NOT NULL) AS uploaded
  FROM videos v
  WHERE v.channel_id IS NOT NULL
  GROUP BY v.channel_id;
$$;


--
-- Name: watch_history_for_user(uuid, integer, integer); Type: FUNCTION; Schema: pradotube; Owner: -
--

CREATE FUNCTION pradotube.watch_history_for_user(p_user_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS TABLE(session_id uuid, video_id text, title text, thumbnail_url text, creator_name text, creator_avatar_url text, duration_seconds integer, unique_seconds integer, total_watch_time integer, last_position integer, completed boolean, source text, session_start timestamp with time zone, session_end timestamp with time zone, coverage_pct double precision, watched_ranges jsonb)
    LANGUAGE plpgsql
    SET search_path TO 'pradotube'
    AS $$
BEGIN
    RETURN QUERY
    WITH latest_per_video AS (
        SELECT DISTINCT ON (ws.video_id)
            ws.id,
            ws.video_id,
            ws.duration_seconds,
            ws.unique_seconds,
            ws.total_watch_time,
            ws.last_position,
            ws.completed,
            ws.source,
            ws.session_start,
            ws.session_end
        FROM watch_sessions ws
        WHERE ws.user_id = p_user_id
        ORDER BY ws.video_id, ws.session_start DESC
    ),
    aggregated_ranges AS (
        SELECT
            ws.video_id,
            jsonb_agg(range_elem) AS all_ranges
        FROM watch_sessions ws,
             jsonb_array_elements(ws.watched_ranges) AS range_elem
        WHERE ws.user_id = p_user_id
        GROUP BY ws.video_id
    )
    SELECT
        lv.id              AS session_id,
        lv.video_id,
        v.title,
        v.thumbnail_url,
        cr.name            AS creator_name,
        av_ch.thumbnail_url AS creator_avatar_url,
        lv.duration_seconds,
        lv.unique_seconds,
        lv.total_watch_time,
        lv.last_position,
        lv.completed,
        lv.source,
        lv.session_start,
        lv.session_end,
        CASE
            WHEN lv.duration_seconds > 0
            THEN ROUND((lv.unique_seconds::numeric / lv.duration_seconds::numeric) * 100, 1)::double precision
            ELSE 0
        END                AS coverage_pct,
        COALESCE(ar.all_ranges, '[]'::jsonb) AS watched_ranges
    FROM latest_per_video lv
    JOIN videos v              ON v.youtube_id = lv.video_id
    JOIN curated_channels cc   ON cc.channel_id = v.channel_id
    JOIN creators cr           ON cr.id = cc.creator_id
    LEFT JOIN channels av_ch   ON av_ch.youtube_id = cr.avatar_channel_id
    LEFT JOIN aggregated_ranges ar ON ar.video_id = lv.video_id
    ORDER BY lv.session_start DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


--
-- Name: channels; Type: TABLE; Schema: pradotube; Owner: -
--

CREATE TABLE pradotube.channels (
    youtube_id text NOT NULL,
    title text NOT NULL,
    description text,
    custom_url text,
    thumbnail_url text,
    banner_url text,
    subscriber_count bigint DEFAULT 0,
    subscriber_count_hidden boolean DEFAULT false,
    video_count bigint DEFAULT 0,
    view_count bigint DEFAULT 0,
    published_at timestamp with time zone,
    fetched_at timestamp with time zone DEFAULT now(),
    videos_fetched_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    creator_id uuid,
    display_order integer DEFAULT 0,
    notes text,
    priority integer DEFAULT 50 NOT NULL,
    date_range_override text,
    min_duration_override integer,
    max_videos_override integer,
    sync_mode text DEFAULT 'sync'::text NOT NULL,
    last_full_refresh_at timestamp with time zone,
    min_duration_seconds integer DEFAULT 60 NOT NULL,
    max_duration_seconds integer DEFAULT 3600 NOT NULL,
    catalog_fraction numeric DEFAULT 0.60 NOT NULL,
    scoring_alpha numeric DEFAULT 0.30 NOT NULL,
    storage_budget_gb numeric DEFAULT 10.0 NOT NULL,
    calibrated_at timestamp with time zone,
    total_videos_sampled integer,
    videos_in_date_range integer,
    posts_per_week numeric,
    avg_gap_days numeric,
    median_gap_days numeric,
    avg_duration_seconds integer,
    median_duration_seconds integer,
    passing_min60 integer,
    passing_min60_max3600 integer,
    passing_min300 integer,
    passing_min300_max3600 integer,
    duration_buckets jsonb,
    CONSTRAINT channels_priority_check CHECK (((priority >= 0) AND (priority <= 100))),
    CONSTRAINT channels_sync_mode_check CHECK ((sync_mode = ANY (ARRAY['sync'::text, 'archive'::text, 'review'::text, 'manual'::text])))
);


--
-- Name: COLUMN channels.date_range_override; Type: COMMENT; Schema: pradotube; Owner: -
--

COMMENT ON COLUMN pradotube.channels.date_range_override IS 'ytdl-sub date_range.after override, e.g. "today-2years". NULL = use default.';


--
-- Name: COLUMN channels.max_videos_override; Type: COMMENT; Schema: pradotube; Owner: -
--

COMMENT ON COLUMN pradotube.channels.max_videos_override IS 'Per-channel override for max videos. NULL = use global config default.';


--
-- Name: creators; Type: TABLE; Schema: pradotube; Owner: -
--

CREATE TABLE pradotube.creators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    priority integer DEFAULT 50 NOT NULL,
    sort_name text,
    thumbnail_url text
);


--
-- Name: TABLE creators; Type: COMMENT; Schema: pradotube; Owner: -
--

COMMENT ON TABLE pradotube.creators IS 'Curator/group of channels';


--
-- Name: kid_devices; Type: TABLE; Schema: pradotube; Owner: -
--

CREATE TABLE pradotube.kid_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kid_user_id uuid NOT NULL,
    parent_user_id uuid,
    device_secret_hash bytea NOT NULL,
    device_label text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone,
    revoked_at timestamp with time zone,
    revoked_by uuid,
    session_id uuid
);


--
-- Name: pairing_codes; Type: TABLE; Schema: pradotube; Owner: -
--

CREATE TABLE pradotube.pairing_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    kid_user_id uuid NOT NULL,
    parent_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    attempts smallint DEFAULT 0 NOT NULL,
    CONSTRAINT pairing_codes_code_check CHECK ((code ~ '^[0-9]{6}$'::text))
);


--
-- Name: user_subscriptions; Type: TABLE; Schema: pradotube; Owner: -
--

CREATE TABLE pradotube.user_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_feed_candidates; Type: VIEW; Schema: pradotube; Owner: -
--

CREATE VIEW pradotube.user_feed_candidates WITH (security_invoker='true') AS
 SELECT v.youtube_id AS video_id,
    v.title,
    v.thumbnail_url,
    v.thumbnail_path,
    v.duration_seconds,
    v.published_at,
    v.view_count,
    v.like_count,
    v.channel_id,
    ch.priority AS channel_priority,
    cr.id AS creator_id,
    cr.name AS creator_name,
    cr.priority AS creator_priority,
    cr.thumbnail_url AS creator_avatar,
    ( SELECT (count(*))::integer AS count
           FROM pradotube.channels ch2
          WHERE (ch2.creator_id = cr.id)) AS creator_channel_count,
    cr.slug AS creator_slug
   FROM (((pradotube.videos v
     JOIN pradotube.channels ch ON ((ch.youtube_id = v.channel_id)))
     JOIN pradotube.creators cr ON ((cr.id = ch.creator_id)))
     JOIN pradotube.user_subscriptions us ON (((us.creator_id = cr.id) AND (us.user_id = ( SELECT auth.uid() AS uid)))))
  WHERE (v.r2_synced_at IS NOT NULL);


--
-- Name: user_feed_scored; Type: VIEW; Schema: pradotube; Owner: -
--

CREATE VIEW pradotube.user_feed_scored WITH (security_invoker='true') AS
 WITH base AS (
         SELECT fc.video_id,
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
            fc.creator_avatar,
            fc.creator_channel_count,
            fc.creator_slug,
                CASE
                    WHEN (count(*) OVER (PARTITION BY fc.channel_id) = 1) THEN (1.0)::double precision
                    ELSE ((1.0)::double precision - (((row_number() OVER (PARTITION BY fc.channel_id ORDER BY fc.published_at DESC NULLS LAST, fc.video_id DESC) - 1))::double precision / (NULLIF((count(*) OVER (PARTITION BY fc.channel_id) - 1), 0))::double precision))
                END AS rel_recency,
                CASE
                    WHEN (fc.published_at >= (now() - '168:00:00'::interval)) THEN 1.0
                    ELSE 0.0
                END AS freshness,
            (((fc.channel_priority)::double precision / (100.0)::double precision) * ((fc.creator_priority)::double precision / (100.0)::double precision)) AS priority_norm,
            ((abs(hashtext((((CURRENT_DATE)::text || ':'::text) || fc.video_id))))::double precision / (2147483647.0)::double precision) AS jitter
           FROM pradotube.user_feed_candidates fc
        ), scored AS (
         SELECT base.video_id,
            base.title,
            base.thumbnail_url,
            base.thumbnail_path,
            base.duration_seconds,
            base.published_at,
            base.view_count,
            base.like_count,
            base.channel_id,
            base.channel_priority,
            base.creator_id,
            base.creator_name,
            base.creator_priority,
            base.creator_avatar,
            base.creator_channel_count,
            base.creator_slug,
            base.rel_recency,
            base.freshness,
            base.priority_norm,
            base.jitter,
            ((((base.rel_recency * (0.3)::double precision) + (base.priority_norm * (0.5)::double precision)) + (base.jitter * (0.1)::double precision)) + ((base.freshness * 0.1))::double precision) AS score
           FROM base
        ), interleaved AS (
         SELECT scored.video_id,
            scored.title,
            scored.thumbnail_url,
            scored.thumbnail_path,
            scored.duration_seconds,
            scored.published_at,
            scored.view_count,
            scored.like_count,
            scored.channel_id,
            scored.channel_priority,
            scored.creator_id,
            scored.creator_name,
            scored.creator_priority,
            scored.creator_avatar,
            scored.creator_channel_count,
            scored.creator_slug,
            scored.rel_recency,
            scored.freshness,
            scored.priority_norm,
            scored.jitter,
            scored.score,
            row_number() OVER (PARTITION BY scored.creator_id ORDER BY scored.score DESC, scored.video_id) AS creator_rank
           FROM scored
        )
 SELECT video_id,
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
    (row_number() OVER (ORDER BY creator_rank, score DESC, video_id))::integer AS feed_rank
   FROM interleaved;


--
-- Name: watch_sessions; Type: TABLE; Schema: pradotube; Owner: -
--

CREATE TABLE pradotube.watch_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    video_id text NOT NULL,
    watched_ranges jsonb DEFAULT '[]'::jsonb NOT NULL,
    unique_seconds integer DEFAULT 0 NOT NULL,
    total_watch_time integer DEFAULT 0 NOT NULL,
    duration_seconds integer,
    last_position integer DEFAULT 0 NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    source text DEFAULT 'feed'::text NOT NULL,
    previous_video_id text,
    session_start timestamp with time zone DEFAULT now() NOT NULL,
    session_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: channels channels_pkey; Type: CONSTRAINT; Schema: pradotube; Owner: -
--

ALTER TABLE ONLY pradotube.channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (youtube_id);


--
-- Name: creators creators_pkey; Type: CONSTRAINT; Schema: pradotube; Owner: -
--

ALTER TABLE ONLY pradotube.creators
    ADD CONSTRAINT creators_pkey PRIMARY KEY (id);


--
-- Name: creators creators_slug_key; Type: CONSTRAINT; Schema: pradotube; Owner: -
--

ALTER TABLE ONLY pradotube.creators
    ADD CONSTRAINT creators_slug_key UNIQUE (slug);


--
-- Name: kid_devices kid_devices_pkey; Type: CONSTRAINT; Schema: pradotube; Owner: -
--

ALTER TABLE ONLY pradotube.kid_devices
    ADD CONSTRAINT kid_devices_pkey PRIMARY KEY (id);


--
-- Name: pairing_codes pairing_codes_pkey; Type: CONSTRAINT; Schema: pradotube; Owner: -
--

ALTER TABLE ONLY pradotube.pairing_codes
    ADD CONSTRAINT pairing_codes_pkey PRIMARY KEY (id);


--
-- Name: user_subscriptions user_subscriptions_pkey; Type: CONSTRAINT; Schema: pradotube; Owner: -
--

ALTER TABLE ONLY pradotube.user_subscriptions
    ADD CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: user_subscriptions user_subscriptions_user_id_creator_id_key; Type: CONSTRAINT; Schema: pradotube; Owner: -
--

ALTER TABLE ONLY pradotube.user_subscriptions
    ADD CONSTRAINT user_subscriptions_user_id_creator_id_key UNIQUE (user_id, creator_id);


--
-- Name: videos videos_pkey; Type: CONSTRAINT; Schema: pradotube; Owner: -
--

ALTER TABLE ONLY pradotube.videos
    ADD CONSTRAINT videos_pkey PRIMARY KEY (youtube_id);


--
-- Name: watch_sessions watch_sessions_pkey; Type: CONSTRAINT; Schema: pradotube; Owner: -
--

ALTER TABLE ONLY pradotube.watch_sessions
    ADD CONSTRAINT watch_sessions_pkey PRIMARY KEY (id);


--
-- Name: idx_channels_creator; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_channels_creator ON pradotube.channels USING btree (creator_id);


--
-- Name: idx_channels_display_order; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_channels_display_order ON pradotube.channels USING btree (display_order);


--
-- Name: idx_creators_display_order; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_creators_display_order ON pradotube.creators USING btree (display_order);


--
-- Name: idx_creators_slug; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_creators_slug ON pradotube.creators USING btree (slug);


--
-- Name: idx_creators_sort_name; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_creators_sort_name ON pradotube.creators USING btree (sort_name);


--
-- Name: idx_kid_devices_kid; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_kid_devices_kid ON pradotube.kid_devices USING btree (kid_user_id) WHERE (revoked_at IS NULL);


--
-- Name: idx_kid_devices_parent; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_kid_devices_parent ON pradotube.kid_devices USING btree (parent_user_id);


--
-- Name: idx_kid_devices_session; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_kid_devices_session ON pradotube.kid_devices USING btree (session_id) WHERE (session_id IS NOT NULL);


--
-- Name: idx_pairing_codes_kid; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_pairing_codes_kid ON pradotube.pairing_codes USING btree (kid_user_id);


--
-- Name: idx_user_subscriptions_creator; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_user_subscriptions_creator ON pradotube.user_subscriptions USING btree (creator_id);


--
-- Name: idx_user_subscriptions_user; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_user_subscriptions_user ON pradotube.user_subscriptions USING btree (user_id);


--
-- Name: idx_videos_channel; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_videos_channel ON pradotube.videos USING btree (channel_id, published_at DESC);


--
-- Name: idx_videos_claim; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_videos_claim ON pradotube.videos USING btree (channel_id, attempts) INCLUDE (published_at, score, duration_seconds, started_at) WHERE ((r2_synced_at IS NULL) AND (decision = ANY (ARRAY['auto'::text, 'approved'::text])));


--
-- Name: idx_videos_downloaded; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_videos_downloaded ON pradotube.videos USING btree (is_downloaded) WHERE (is_downloaded = true);


--
-- Name: idx_videos_r2_pending; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_videos_r2_pending ON pradotube.videos USING btree (is_downloaded) WHERE ((r2_synced_at IS NULL) AND (is_downloaded = true));


--
-- Name: idx_videos_r2_synced; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_videos_r2_synced ON pradotube.videos USING btree (r2_synced_at) WHERE (r2_synced_at IS NOT NULL);


--
-- Name: idx_videos_review_queue; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_videos_review_queue ON pradotube.videos USING btree (channel_id, score DESC) WHERE (decision = 'pending'::text);


--
-- Name: idx_videos_source_tags; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_videos_source_tags ON pradotube.videos USING gin (source_tags);


--
-- Name: idx_videos_sync_tier; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_videos_sync_tier ON pradotube.videos USING btree (channel_id, sync_tier) WHERE (r2_synced_at IS NOT NULL);


--
-- Name: idx_watch_sessions_user_incomplete; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_watch_sessions_user_incomplete ON pradotube.watch_sessions USING btree (user_id) WHERE ((completed = false) AND (last_position > 0));


--
-- Name: idx_watch_sessions_user_recent; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_watch_sessions_user_recent ON pradotube.watch_sessions USING btree (user_id, session_start DESC);


--
-- Name: idx_watch_sessions_user_video; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE INDEX idx_watch_sessions_user_video ON pradotube.watch_sessions USING btree (user_id, video_id);


--
-- Name: uniq_pairing_codes_active; Type: INDEX; Schema: pradotube; Owner: -
--

CREATE UNIQUE INDEX uniq_pairing_codes_active ON pradotube.pairing_codes USING btree (code) WHERE (consumed_at IS NULL);


--
-- Name: channels trg_set_creator_avatar; Type: TRIGGER; Schema: pradotube; Owner: -
--

CREATE TRIGGER trg_set_creator_avatar AFTER INSERT OR UPDATE OF creator_id ON pradotube.channels FOR EACH ROW WHEN ((new.creator_id IS NOT NULL)) EXECUTE FUNCTION pradotube.set_creator_avatar_from_channel();


--
-- Name: channels channels_creator_id_fkey; Type: FK CONSTRAINT; Schema: pradotube; Owner: -
--

ALTER TABLE ONLY pradotube.channels
    ADD CONSTRAINT channels_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES pradotube.creators(id) ON DELETE SET NULL;


--
-- Name: kid_devices kid_devices_kid_user_id_fkey; Type: FK CONSTRAINT; Schema: pradotube; Owner: -
--

ALTER TABLE ONLY pradotube.kid_devices
    ADD CONSTRAINT kid_devices_kid_user_id_fkey FOREIGN KEY (kid_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: kid_devices kid_devices_parent_user_id_fkey; Type: FK CONSTRAINT; Schema: pradotube; Owner: -
--

ALTER TABLE ONLY pradotube.kid_devices
    ADD CONSTRAINT kid_devices_parent_user_id_fkey FOREIGN KEY (parent_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: kid_devices kid_devices_revoked_by_fkey; Type: FK CONSTRAINT; Schema: pradotube; Owner: -
--

ALTER TABLE ONLY pradotube.kid_devices
    ADD CONSTRAINT kid_devices_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: pairing_codes pairing_codes_kid_user_id_fkey; Type: FK CONSTRAINT; Schema: pradotube; Owner: -
--

ALTER TABLE ONLY pradotube.pairing_codes
    ADD CONSTRAINT pairing_codes_kid_user_id_fkey FOREIGN KEY (kid_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pairing_codes pairing_codes_parent_user_id_fkey; Type: FK CONSTRAINT; Schema: pradotube; Owner: -
--

ALTER TABLE ONLY pradotube.pairing_codes
    ADD CONSTRAINT pairing_codes_parent_user_id_fkey FOREIGN KEY (parent_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_subscriptions user_subscriptions_creator_id_fkey; Type: FK CONSTRAINT; Schema: pradotube; Owner: -
--

ALTER TABLE ONLY pradotube.user_subscriptions
    ADD CONSTRAINT user_subscriptions_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES pradotube.creators(id);


--
-- Name: videos videos_channel_id_fkey; Type: FK CONSTRAINT; Schema: pradotube; Owner: -
--

ALTER TABLE ONLY pradotube.videos
    ADD CONSTRAINT videos_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES pradotube.channels(youtube_id);


--
-- Name: channels; Type: ROW SECURITY; Schema: pradotube; Owner: -
--

ALTER TABLE pradotube.channels ENABLE ROW LEVEL SECURITY;

--
-- Name: channels channels_delete_admin; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY channels_delete_admin ON pradotube.channels FOR DELETE TO authenticated USING (iam.is_admin('pradotube'::text));


--
-- Name: channels channels_insert_admin; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY channels_insert_admin ON pradotube.channels FOR INSERT TO authenticated WITH CHECK (iam.is_admin('pradotube'::text));


--
-- Name: channels channels_select_authed; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY channels_select_authed ON pradotube.channels FOR SELECT TO authenticated USING (true);


--
-- Name: channels channels_update_admin; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY channels_update_admin ON pradotube.channels FOR UPDATE TO authenticated USING (iam.is_admin('pradotube'::text));


--
-- Name: creators; Type: ROW SECURITY; Schema: pradotube; Owner: -
--

ALTER TABLE pradotube.creators ENABLE ROW LEVEL SECURITY;

--
-- Name: creators creators_delete_admin; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY creators_delete_admin ON pradotube.creators FOR DELETE TO authenticated USING (iam.is_admin('pradotube'::text));


--
-- Name: creators creators_insert_admin; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY creators_insert_admin ON pradotube.creators FOR INSERT TO authenticated WITH CHECK (iam.is_admin('pradotube'::text));


--
-- Name: creators creators_select_authed; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY creators_select_authed ON pradotube.creators FOR SELECT TO authenticated USING (true);


--
-- Name: creators creators_update_admin; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY creators_update_admin ON pradotube.creators FOR UPDATE TO authenticated USING (iam.is_admin('pradotube'::text));


--
-- Name: kid_devices; Type: ROW SECURITY; Schema: pradotube; Owner: -
--

ALTER TABLE pradotube.kid_devices ENABLE ROW LEVEL SECURITY;

--
-- Name: kid_devices kid_devices_select_admin; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY kid_devices_select_admin ON pradotube.kid_devices FOR SELECT TO authenticated USING (iam.is_admin('pradotube'::text));


--
-- Name: kid_devices kid_devices_select_own; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY kid_devices_select_own ON pradotube.kid_devices FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = kid_user_id));


--
-- Name: pairing_codes; Type: ROW SECURITY; Schema: pradotube; Owner: -
--

ALTER TABLE pradotube.pairing_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: pairing_codes pairing_codes_admin; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY pairing_codes_admin ON pradotube.pairing_codes TO authenticated USING (iam.is_admin('pradotube'::text)) WITH CHECK (iam.is_admin('pradotube'::text));


--
-- Name: user_subscriptions subscriptions_delete_admin; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY subscriptions_delete_admin ON pradotube.user_subscriptions FOR DELETE TO authenticated USING (iam.is_admin('pradotube'::text));


--
-- Name: user_subscriptions subscriptions_insert_admin; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY subscriptions_insert_admin ON pradotube.user_subscriptions FOR INSERT TO authenticated WITH CHECK (iam.is_admin('pradotube'::text));


--
-- Name: user_subscriptions subscriptions_select_admin; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY subscriptions_select_admin ON pradotube.user_subscriptions FOR SELECT TO authenticated USING (iam.is_admin('pradotube'::text));


--
-- Name: user_subscriptions subscriptions_select_own; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY subscriptions_select_own ON pradotube.user_subscriptions FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_subscriptions subscriptions_update_admin; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY subscriptions_update_admin ON pradotube.user_subscriptions FOR UPDATE TO authenticated USING (iam.is_admin('pradotube'::text));


--
-- Name: user_subscriptions; Type: ROW SECURITY; Schema: pradotube; Owner: -
--

ALTER TABLE pradotube.user_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: videos; Type: ROW SECURITY; Schema: pradotube; Owner: -
--

ALTER TABLE pradotube.videos ENABLE ROW LEVEL SECURITY;

--
-- Name: videos videos_delete_admin; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY videos_delete_admin ON pradotube.videos FOR DELETE TO authenticated USING (iam.is_admin('pradotube'::text));


--
-- Name: videos videos_insert_admin; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY videos_insert_admin ON pradotube.videos FOR INSERT TO authenticated WITH CHECK (iam.is_admin('pradotube'::text));


--
-- Name: videos videos_select_authed; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY videos_select_authed ON pradotube.videos FOR SELECT TO authenticated USING (true);


--
-- Name: videos videos_select_subscribed; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY videos_select_subscribed ON pradotube.videos FOR SELECT TO authenticated USING ((channel_id IN ( SELECT ch.youtube_id
   FROM (pradotube.channels ch
     JOIN pradotube.user_subscriptions us ON ((us.creator_id = ch.creator_id)))
  WHERE (us.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: videos videos_update_admin; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY videos_update_admin ON pradotube.videos FOR UPDATE TO authenticated USING (iam.is_admin('pradotube'::text));


--
-- Name: watch_sessions; Type: ROW SECURITY; Schema: pradotube; Owner: -
--

ALTER TABLE pradotube.watch_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: watch_sessions watch_sessions_insert_own; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY watch_sessions_insert_own ON pradotube.watch_sessions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: watch_sessions watch_sessions_select_own; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY watch_sessions_select_own ON pradotube.watch_sessions FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: watch_sessions watch_sessions_update_own; Type: POLICY; Schema: pradotube; Owner: -
--

CREATE POLICY watch_sessions_update_own ON pradotube.watch_sessions FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- End baseline
--

