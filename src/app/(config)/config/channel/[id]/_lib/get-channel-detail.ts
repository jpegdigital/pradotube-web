import "server-only";

import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { VIDEOS_PAGE_SIZE } from "./constants";

export { VIDEOS_PAGE_SIZE };

export type LengthFilter = "eligible" | "all";

export interface ChannelDetailRow {
  youtube_id: string;
  title: string;
  custom_url: string | null;
  thumbnail_url: string | null;
  avatar_path: string | null;
  subscriber_count: number | null;
  video_count: number | null;
  view_count: number | null;
  creator_id: string | null;
  priority: number;
  min_duration_seconds: number;
  max_duration_seconds: number;
  min_duration_override: number | null;
  effective_min_duration: number;
  effective_max_duration: number;
  sync_mode: string;
  catalog_fraction: number;
  storage_budget_gb: number;
  calibrated_at: string | null;
  total_videos_sampled: number | null;
  videos_in_date_range: number | null;
  posts_per_week: number | null;
  avg_gap_days: number | null;
  median_gap_days: number | null;
  avg_duration_seconds: number | null;
  median_duration_seconds: number | null;
  duration_buckets: Record<string, number> | null;
  passing_min60_max3600: number | null;
  passing_min300_max3600: number | null;
  uploaded: number;
  downloaded: number;
}

export interface ChannelParentCreator {
  id: string;
  name: string;
  slug: string;
}

export interface ChannelDetailVideo {
  youtube_id: string;
  channel_id: string;
  title: string;
  thumbnail_url: string | null;
  published_at: string | null;
  discovered_at: string;
  duration_seconds: number | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  score: number | null;
  decision: string;
  decided_at: string | null;
  r2_synced_at: string | null;
  is_downloaded: boolean;
  storage_bytes: number | null;
  sync_tier: string | null;
}

export interface ChannelVideoStats {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  auto: number;
  onR2: number;
}

export interface ChannelDetail {
  channel: ChannelDetailRow;
  creator: ChannelParentCreator | null;
  initialVideos: ChannelDetailVideo[];
  hasMore: boolean;
  // Stats split by scope so the client can show counts for either toggle
  // state without round-tripping.
  statsEligible: ChannelVideoStats;
  statsAll: ChannelVideoStats;
}

const VIDEO_FIELDS =
  "youtube_id, channel_id, title, thumbnail_url, published_at, discovered_at, duration_seconds, view_count, like_count, comment_count, score, decision, decided_at, r2_synced_at, is_downloaded, storage_bytes, sync_tier";

const CHANNEL_FIELDS =
  "youtube_id, title, custom_url, thumbnail_url, avatar_path, subscriber_count, video_count, view_count, creator_id, priority, min_duration_seconds, max_duration_seconds, min_duration_override, sync_mode, catalog_fraction, storage_budget_gb, calibrated_at, total_videos_sampled, videos_in_date_range, posts_per_week, avg_gap_days, median_gap_days, avg_duration_seconds, median_duration_seconds, duration_buckets, passing_min60_max3600, passing_min300_max3600";

function parseDurationBuckets(
  raw: unknown
): Record<string, number> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function emptyStats(): ChannelVideoStats {
  return { total: 0, approved: 0, rejected: 0, pending: 0, auto: 0, onR2: 0 };
}

function tallyDecision(stats: ChannelVideoStats, decision: string, onR2: boolean) {
  stats.total += 1;
  if (decision === "approved") stats.approved += 1;
  else if (decision === "rejected") stats.rejected += 1;
  else if (decision === "pending") stats.pending += 1;
  else if (decision === "auto") stats.auto += 1;
  if (onR2) stats.onR2 += 1;
}

export async function getChannelDetail(
  channelId: string
): Promise<ChannelDetail | null> {
  await verifySession();
  const supabase = await createClient();

  const { data: channelRaw, error: channelErr } = await supabase
    .from("channels")
    .select(CHANNEL_FIELDS)
    .eq("youtube_id", channelId)
    .maybeSingle();

  if (channelErr) throw channelErr;
  if (!channelRaw) return null;

  const effectiveMin =
    channelRaw.min_duration_override ?? channelRaw.min_duration_seconds;
  const effectiveMax = channelRaw.max_duration_seconds;

  const [creatorRes, countsRes, videosRes, statsRes] = await Promise.all([
    channelRaw.creator_id
      ? supabase
          .from("creators")
          .select("id, name, slug")
          .eq("id", channelRaw.creator_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.rpc("video_counts_by_channel"),
    // Initial fetch defaults to the eligible window — that's what should be
    // on R2, which is the user's mental model when reviewing.
    supabase
      .from("videos")
      .select(VIDEO_FIELDS)
      .eq("channel_id", channelId)
      .gte("duration_seconds", effectiveMin)
      .lte("duration_seconds", effectiveMax)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("discovered_at", { ascending: false })
      .limit(VIDEOS_PAGE_SIZE + 1),
    // One pass for stats: include duration so we can split eligible vs all.
    supabase
      .from("videos")
      .select("decision, r2_synced_at, duration_seconds")
      .eq("channel_id", channelId),
  ]);

  if (creatorRes && "error" in creatorRes && creatorRes.error) throw creatorRes.error;
  if (countsRes.error) throw countsRes.error;
  if (videosRes.error) throw videosRes.error;
  if (statsRes.error) throw statsRes.error;

  const counts = new Map<string, { uploaded: number; downloaded: number }>();
  for (const row of countsRes.data ?? []) {
    counts.set(row.channel_id, {
      uploaded: Number(row.uploaded),
      downloaded: Number(row.downloaded),
    });
  }
  const channelCount = counts.get(channelId) ?? { uploaded: 0, downloaded: 0 };

  const videosRaw = videosRes.data ?? [];
  const hasMore = videosRaw.length > VIDEOS_PAGE_SIZE;
  const initialVideos = (
    hasMore ? videosRaw.slice(0, VIDEOS_PAGE_SIZE) : videosRaw
  ) as ChannelDetailVideo[];

  const statsAll = emptyStats();
  const statsEligible = emptyStats();
  for (const row of statsRes.data ?? []) {
    const onR2 = !!row.r2_synced_at;
    tallyDecision(statsAll, row.decision, onR2);
    const dur = row.duration_seconds;
    if (dur != null && dur >= effectiveMin && dur <= effectiveMax) {
      tallyDecision(statsEligible, row.decision, onR2);
    }
  }

  return {
    channel: {
      ...channelRaw,
      duration_buckets: parseDurationBuckets(channelRaw.duration_buckets),
      effective_min_duration: effectiveMin,
      effective_max_duration: effectiveMax,
      uploaded: channelCount.uploaded,
      downloaded: channelCount.downloaded,
    },
    creator: creatorRes?.data ?? null,
    initialVideos,
    hasMore,
    statsEligible,
    statsAll,
  };
}
