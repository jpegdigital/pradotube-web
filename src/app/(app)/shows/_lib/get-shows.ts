import "server-only";

import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export interface ShowVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  thumbnailPath: string | null;
  durationSeconds: number;
  publishedAt: string | null;
  viewCount: number | null;
  creatorName: string;
  creatorAvatar: string;
  feedRank: number;
}

export interface ShowCreator {
  slug: string;
  name: string;
  avatar: string;
}

export interface ShowsPage {
  videos: ShowVideo[];
  nextCursor: number | null;
}

export interface ShowsInitial {
  firstPage: ShowsPage;
  creators: ShowCreator[];
}

export interface GetShowsPageOptions {
  slug?: string;
  cursor?: number;
  limit?: number;
}

const DEFAULT_LIMIT = 24;

export async function getShowsPage(
  opts: GetShowsPageOptions = {}
): Promise<ShowsPage> {
  await verifySession();
  const supabase = await createClient();

  const limit = opts.limit ?? DEFAULT_LIMIT;

  let query = supabase
    .from("user_feed_scored")
    .select(
      "video_id, title, thumbnail_url, thumbnail_path, duration_seconds, published_at, view_count, creator_name, creator_avatar, feed_rank"
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
  const videos: ShowVideo[] = page.map((r) => ({
    id: r.video_id!,
    title: r.title!,
    thumbnailUrl: r.thumbnail_url ?? "",
    thumbnailPath: r.thumbnail_path,
    durationSeconds: r.duration_seconds ?? 0,
    publishedAt: r.published_at,
    viewCount: r.view_count != null ? Number(r.view_count) : null,
    creatorName: r.creator_name!,
    creatorAvatar: r.creator_avatar ?? "",
    feedRank: r.feed_rank!,
  }));

  return {
    videos,
    nextCursor: hasMore ? page[page.length - 1].feed_rank ?? null : null,
  };
}

export async function getShowsInitial(slug?: string): Promise<ShowsInitial> {
  await verifySession();
  const supabase = await createClient();

  const [firstPage, chipsRes] = await Promise.all([
    getShowsPage({ slug }),
    supabase
      .from("user_feed_candidates")
      .select("creator_id, creator_slug, creator_name, creator_avatar"),
  ]);

  if (chipsRes.error) throw chipsRes.error;

  const creatorMap = new Map<string, ShowCreator>();
  for (const r of chipsRes.data ?? []) {
    if (!r.creator_id || !r.creator_slug || !r.creator_name) continue;
    if (!creatorMap.has(r.creator_id)) {
      creatorMap.set(r.creator_id, {
        slug: r.creator_slug,
        name: r.creator_name,
        avatar: r.creator_avatar ?? "",
      });
    }
  }
  const creators = [...creatorMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return { firstPage, creators };
}
