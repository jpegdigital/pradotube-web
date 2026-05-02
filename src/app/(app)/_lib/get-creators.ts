import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/supabase/types";

export async function getSubscribedCreators(): Promise<Row<"creators">[]> {
  const { userId } = await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("creator:creators!inner(*)")
    .eq("user_id", userId);

  if (error) throw error;

  return (data ?? [])
    .map((row) => row.creator)
    .sort((a, b) => a.name.localeCompare(b.name));
}
