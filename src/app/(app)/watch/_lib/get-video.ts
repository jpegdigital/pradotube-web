import "server-only";

import type { QueryData } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export interface Chapter {
  title: string;
  start_time: number;
  end_time: number;
}

const VIDEO_ID_RE = /^[\w-]{10,12}$/;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function videoQuery(supabase: SupabaseClient, id: string) {
  return supabase
    .from("videos")
    .select(
      `youtube_id, channel_id, title, thumbnail_url,
       thumbnail_path, media_path, published_at, duration_seconds,
       like_count, comment_count, tags, categories, chapters,
       language, webpage_url, handle,
       channels(
         title,
         creators(id, name, slug, thumbnail_url)
       )`
    )
    .eq("youtube_id", id)
    .not("r2_synced_at", "is", null)
    .maybeSingle();
}

type VideoRow = NonNullable<QueryData<ReturnType<typeof videoQuery>>>;

export type Video = Omit<VideoRow, "chapters" | "media_path"> & {
  chapters: Chapter[];
  media_path: string;
};

export async function getVideo(id: string): Promise<Video> {
  await verifySession();
  if (!VIDEO_ID_RE.test(id)) notFound();

  const supabase = await createClient();
  const { data, error } = await videoQuery(supabase, id);

  if (error) throw error;
  if (!data || !data.media_path) notFound();

  return {
    ...data,
    media_path: data.media_path,
    chapters: Array.isArray(data.chapters)
      ? (data.chapters as unknown as Chapter[])
      : [],
  };
}
