import "server-only";

import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { avatarUrl } from "@/lib/avatars";

export interface ConfigSidebarChannel {
  youtube_id: string;
  title: string;
  custom_url: string | null;
  avatar: string | null;
  thumbnail_url: string | null;
  sync_mode: string;
  uploaded: number;
  pending: number;
}

export interface ConfigCreatorListItem {
  id: string;
  name: string;
  slug: string;
  avatar: string | null;
  priority: number;
  channelCount: number;
  syncedCount: number;
  pendingCount: number;
  channels: ConfigSidebarChannel[];
}

export interface ConfigSidebarData {
  creators: ConfigCreatorListItem[];
  ungroupedChannels: ConfigSidebarChannel[];
  ungroupedChannelCount: number;
  ungroupedSyncedCount: number;
  totalChannelCount: number;
  totalSyncedCount: number;
}

const CHANNEL_FIELDS =
  "youtube_id, title, custom_url, thumbnail_url, avatar_path, sync_mode, creator_id, display_order";

export async function getConfigSidebar(): Promise<ConfigSidebarData> {
  await verifySession();
  const supabase = await createClient();

  const [creatorsRes, channelsRes, countsRes, pendingRes] = await Promise.all([
    supabase
      .from("creators")
      .select("id, name, slug, avatar_path, priority")
      .order("sort_name", { ascending: true }),
    supabase
      .from("channels")
      .select(CHANNEL_FIELDS)
      .order("display_order", { ascending: true }),
    supabase.rpc("video_counts_by_channel"),
    supabase
      .from("videos")
      .select("channel_id")
      .eq("decision", "pending")
      .is("r2_synced_at", null),
  ]);

  if (creatorsRes.error) throw creatorsRes.error;
  if (channelsRes.error) throw channelsRes.error;
  if (countsRes.error) throw countsRes.error;
  if (pendingRes.error) throw pendingRes.error;

  const uploadedByChannel = new Map<string, number>();
  for (const row of countsRes.data ?? []) {
    uploadedByChannel.set(row.channel_id, Number(row.uploaded));
  }

  const pendingByChannel = new Map<string, number>();
  for (const row of pendingRes.data ?? []) {
    pendingByChannel.set(row.channel_id, (pendingByChannel.get(row.channel_id) ?? 0) + 1);
  }

  const channelsByCreator = new Map<string, ConfigSidebarChannel[]>();
  const ungroupedChannels: ConfigSidebarChannel[] = [];
  let ungroupedSyncedCount = 0;

  for (const ch of channelsRes.data ?? []) {
    const uploaded = uploadedByChannel.get(ch.youtube_id) ?? 0;
    const item: ConfigSidebarChannel = {
      youtube_id: ch.youtube_id,
      title: ch.title,
      custom_url: ch.custom_url,
      avatar: avatarUrl(ch.avatar_path),
      thumbnail_url: ch.thumbnail_url,
      sync_mode: ch.sync_mode,
      uploaded,
      pending: pendingByChannel.get(ch.youtube_id) ?? 0,
    };

    if (!ch.creator_id) {
      ungroupedChannels.push(item);
      ungroupedSyncedCount += uploaded;
      continue;
    }
    const arr = channelsByCreator.get(ch.creator_id);
    if (arr) arr.push(item);
    else channelsByCreator.set(ch.creator_id, [item]);
  }

  let totalChannelCount = ungroupedChannels.length;
  let totalSyncedCount = ungroupedSyncedCount;

  const creators: ConfigCreatorListItem[] = (creatorsRes.data ?? []).map((c) => {
    const channels = channelsByCreator.get(c.id) ?? [];
    const syncedCount = channels.reduce((sum, ch) => sum + ch.uploaded, 0);
    const pendingCount = channels.reduce((sum, ch) => sum + ch.pending, 0);
    totalChannelCount += channels.length;
    totalSyncedCount += syncedCount;
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      avatar: avatarUrl(c.avatar_path),
      priority: c.priority,
      channelCount: channels.length,
      syncedCount,
      pendingCount,
      channels,
    };
  });

  return {
    creators,
    ungroupedChannels,
    ungroupedChannelCount: ungroupedChannels.length,
    ungroupedSyncedCount,
    totalChannelCount,
    totalSyncedCount,
  };
}
