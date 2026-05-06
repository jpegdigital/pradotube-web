import "server-only";

import { verifySession } from "@/lib/auth/dal";
import { avatarUrl } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/server";

export interface SubsUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isAdmin: boolean;
}

export interface SubsCreator {
  id: string;
  name: string;
  slug: string;
  avatar: string | null;
  priority: number;
}

export interface SubscriptionMatrixData {
  users: SubsUser[];
  creators: SubsCreator[];
  pairs: Array<[string, string]>;
}

export async function getSubscriptionMatrix(): Promise<SubscriptionMatrixData> {
  await verifySession();
  const supabase = await createClient();

  const [usersRes, creatorsRes, subsRes] = await Promise.all([
    supabase.rpc("list_users"),
    supabase
      .from("creators")
      .select("id, name, slug, avatar_path, priority")
      .order("sort_name", { ascending: true }),
    supabase.from("user_subscriptions").select("user_id, creator_id"),
  ]);

  if (usersRes.error) throw usersRes.error;
  if (creatorsRes.error) throw creatorsRes.error;
  if (subsRes.error) throw subsRes.error;

  const users: SubsUser[] = (usersRes.data ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name,
    isAdmin: u.is_admin,
  }));

  // Sort: admins last, then by first name; keeps kid columns leftmost.
  users.sort((a, b) => {
    if (a.isAdmin !== b.isAdmin) return a.isAdmin ? 1 : -1;
    const an = (a.firstName ?? a.email).toLowerCase();
    const bn = (b.firstName ?? b.email).toLowerCase();
    return an.localeCompare(bn);
  });

  const creators: SubsCreator[] = (creatorsRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    avatar: avatarUrl(c.avatar_path),
    priority: c.priority,
  }));

  const pairs: Array<[string, string]> = (subsRes.data ?? []).map((s) => [
    s.user_id,
    s.creator_id,
  ]);

  return { users, creators, pairs };
}
