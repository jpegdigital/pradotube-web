import "server-only";

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
    .select("creator:creators!inner(slug, name, thumbnail_url)")
    .eq("user_id", userId);

  if (error) throw error;

  return (data ?? [])
    .map((row) => ({
      slug: row.creator.slug,
      name: row.creator.name,
      avatar: row.creator.thumbnail_url ?? "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
