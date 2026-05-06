import "server-only";

import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type {
  CreatorDetailChannel,
  OtherCreatorOption,
} from "../../creator/[slug]/_lib/get-creator-detail";

export interface UngroupedDetail {
  channels: CreatorDetailChannel[];
  allCreators: OtherCreatorOption[];
}

const CHANNEL_FIELDS =
  "youtube_id, title, custom_url, thumbnail_url, avatar_path, subscriber_count, video_count, view_count, creator_id, priority, min_duration_override, sync_mode";

export async function getUngroupedDetail(): Promise<UngroupedDetail> {
  await verifySession();
  const supabase = await createClient();

  const [channelsRes, countsRes, pendingRes, creatorsRes] = await Promise.all([
    supabase
      .from("channels")
      .select(CHANNEL_FIELDS)
      .is("creator_id", null)
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
      .order("sort_name", { ascending: true }),
  ]);

  if (channelsRes.error) throw channelsRes.error;
  if (countsRes.error) throw countsRes.error;
  if (pendingRes.error) throw pendingRes.error;
  if (creatorsRes.error) throw creatorsRes.error;

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
    channels,
    allCreators: creatorsRes.data ?? [],
  };
}
