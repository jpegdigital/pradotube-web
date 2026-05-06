import "server-only";

import { avatarUrl } from "@/lib/avatars";
import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export interface WatchCreator {
  slug: string;
  name: string;
  avatar: string;
}

export async function getWatchCreators(): Promise<WatchCreator[]> {
  const { userId } = await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("creator:creators!inner(slug, name, avatar_path)")
    .eq("user_id", userId);

  if (error) throw error;

  return (data ?? [])
    .map((row) => ({
      slug: row.creator.slug,
      name: row.creator.name,
      avatar: avatarUrl(row.creator.avatar_path) ?? "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
