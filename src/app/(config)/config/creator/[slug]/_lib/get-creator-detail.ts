import "server-only";

import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export interface CreatorDetailRow {
  id: string;
  name: string;
  slug: string;
  avatar_path: string | null;
  priority: number;
}

export interface CreatorDetailChannel {
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
  min_duration_override: number | null;
  sync_mode: string;
  uploaded: number;
  downloaded: number;
  pending: number;
}

export interface OtherCreatorOption {
  id: string;
  name: string;
  slug: string;
}

export interface CreatorDetail {
  creator: CreatorDetailRow;
  channels: CreatorDetailChannel[];
  otherCreators: OtherCreatorOption[];
}

const CHANNEL_FIELDS =
  "youtube_id, title, custom_url, thumbnail_url, avatar_path, subscriber_count, video_count, view_count, creator_id, priority, min_duration_override, sync_mode";

export async function getCreatorDetail(
  slug: string
): Promise<CreatorDetail | null> {
  await verifySession();
  const supabase = await createClient();

  const { data: creator, error: creatorErr } = await supabase
    .from("creators")
    .select("id, name, slug, avatar_path, priority")
    .eq("slug", slug)
    .maybeSingle();

  if (creatorErr) throw creatorErr;
  if (!creator) return null;

  const [channelsRes, countsRes, pendingRes, allCreatorsRes] = await Promise.all([
    supabase
      .from("channels")
      .select(CHANNEL_FIELDS)
      .eq("creator_id", creator.id)
      .order("display_order", { ascending: true }),
    supabase.rpc("video_counts_by_channel"),
    supabase
      .from("videos")
      .select("channel_id")
      .eq("decision", "pending")
      .is("r2_synced_at", null),
    supabase
      .from("creators")
      .select("id, name, slug")
      .neq("id", creator.id)
      .order("sort_name", { ascending: true }),
  ]);

  if (channelsRes.error) throw channelsRes.error;
  if (countsRes.error) throw countsRes.error;
  if (pendingRes.error) throw pendingRes.error;
  if (allCreatorsRes.error) throw allCreatorsRes.error;

  const counts = new Map<string, { uploaded: number; downloaded: number }>();
  for (const row of countsRes.data ?? []) {
    counts.set(row.channel_id, {
      uploaded: Number(row.uploaded),
      downloaded: Number(row.downloaded),
    });
  }

  const pendingByChannel = new Map<string, number>();
  for (const row of pendingRes.data ?? []) {
    pendingByChannel.set(row.channel_id, (pendingByChannel.get(row.channel_id) ?? 0) + 1);
  }

  const channels: CreatorDetailChannel[] = (channelsRes.data ?? []).map(
    (ch) => ({
      ...ch,
      uploaded: counts.get(ch.youtube_id)?.uploaded ?? 0,
      downloaded: counts.get(ch.youtube_id)?.downloaded ?? 0,
      pending: pendingByChannel.get(ch.youtube_id) ?? 0,
    })
  );

  return {
    creator,
    channels,
    otherCreators: allCreatorsRes.data ?? [],
  };
}
