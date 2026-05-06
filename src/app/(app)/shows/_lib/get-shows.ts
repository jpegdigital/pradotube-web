import "server-only";

import { avatarUrl } from "@/lib/avatars";
import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_SHOWS_DIR,
  DEFAULT_SHOWS_SORT,
  type ShowCreator,
  type ShowsInitial,
  type ShowsPage,
  type ShowsSortDir,
  type ShowsSortField,
  type ShowVideo,
} from "./types";

export type {
  ShowCreator,
  ShowsInitial,
  ShowsPage,
  ShowsSortDir,
  ShowsSortField,
  ShowVideo,
} from "./types";
export {
  DEFAULT_SHOWS_DIR,
  DEFAULT_SHOWS_SORT,
  SHOWS_SORT_FIELDS,
} from "./types";

export interface GetShowsPageOptions {
  slug?: string;
  cursor?: number;
  limit?: number;
  sort?: ShowsSortField;
  dir?: ShowsSortDir;
  q?: string;
}

const DEFAULT_LIMIT = 24;
const MAX_SEARCH_LENGTH = 100;

// Escape ILIKE wildcards so user input is matched literally.
function escapeIlike(input: string): string {
  return input.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function getShowsPage(
  opts: GetShowsPageOptions = {}
): Promise<ShowsPage> {
  await verifySession();
  const supabase = await createClient();

  const limit = opts.limit ?? DEFAULT_LIMIT;
  const sort = opts.sort ?? DEFAULT_SHOWS_SORT;
  const dir = opts.dir ?? DEFAULT_SHOWS_DIR;
  const offset = opts.cursor ?? 0;

  let query = supabase
    .from("user_feed_scored")
    .select(
      "video_id, title, thumbnail_url, thumbnail_path, duration_seconds, published_at, view_count, creator_name, creator_avatar_path"
    )
    .order(sort, { ascending: dir === "asc", nullsFirst: false })
    .order("video_id", { ascending: true })
    .range(offset, offset + limit);

  if (opts.slug) query = query.eq("creator_slug", opts.slug);

  if (opts.q) {
    const trimmed = opts.q.trim().slice(0, MAX_SEARCH_LENGTH);
    if (trimmed) {
      query = query.ilike("title", `%${escapeIlike(trimmed)}%`);
    }
  }

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
    creatorAvatar: avatarUrl(r.creator_avatar_path) ?? "",
  }));

  return {
    videos,
    nextCursor: hasMore ? offset + limit : null,
  };
}

export async function getShowsInitial(slug?: string): Promise<ShowsInitial> {
  const { userId } = await verifySession();
  const supabase = await createClient();

  const [firstPage, subsRes] = await Promise.all([
    getShowsPage({ slug }),
    supabase
      .from("user_subscriptions")
      .select("creator:creators!inner(slug, name, avatar_path)")
      .eq("user_id", userId),
  ]);

  if (subsRes.error) throw subsRes.error;

  const creators: ShowCreator[] = (subsRes.data ?? [])
    .map((row) => ({
      slug: row.creator.slug,
      name: row.creator.name,
      avatar: avatarUrl(row.creator.avatar_path) ?? "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { firstPage, creators };
}
