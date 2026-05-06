import "server-only";

import { avatarUrl } from "@/lib/avatars";
import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export interface UpNextVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  thumbnailPath: string | null;
  durationSeconds: number;
  creatorName: string;
  creatorSlug: string;
  creatorAvatar: string;
  feedRank: number;
}

export interface UpNextPage {
  videos: UpNextVideo[];
  nextCursor: number | null;
}

export interface GetUpNextOptions {
  limit?: number;
  cursor?: number;
  slug?: string;
}

const DEFAULT_LIMIT = 60;

export async function getUpNext(
  opts: GetUpNextOptions = {}
): Promise<UpNextPage> {
  await verifySession();
  const supabase = await createClient();

  const limit = opts.limit ?? DEFAULT_LIMIT;

  let query = supabase
    .from("user_feed_scored")
    .select(
      "video_id, title, thumbnail_url, thumbnail_path, duration_seconds, creator_name, creator_slug, creator_avatar_path, feed_rank"
    )
    .order("feed_rank", { ascending: true })
    .limit(limit + 1);

  if (opts.slug) query = query.eq("creator_slug", opts.slug);
  if (opts.cursor !== undefined) query = query.gt("feed_rank", opts.cursor);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  // View columns are typed nullable by Postgres but non-null in practice
  // because user_feed_scored filters r2_synced_at IS NOT NULL and INNER JOINs
  // channels + creators.
  const videos: UpNextVideo[] = page.map((r) => ({
    id: r.video_id!,
    title: r.title!,
    thumbnailUrl: r.thumbnail_url ?? "",
    thumbnailPath: r.thumbnail_path,
    durationSeconds: r.duration_seconds ?? 0,
    creatorName: r.creator_name!,
    creatorSlug: r.creator_slug!,
    creatorAvatar: avatarUrl(r.creator_avatar_path) ?? "",
    feedRank: r.feed_rank!,
  }));

  return {
    videos,
    nextCursor: hasMore ? page[page.length - 1].feed_rank ?? null : null,
  };
}
