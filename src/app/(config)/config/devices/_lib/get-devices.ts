import "server-only";

import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export interface DevicesKid {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface DevicesRow {
  id: string;
  kidUserId: string;
  deviceLabel: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
}

export interface DevicesPaneData {
  kids: DevicesKid[];
  devices: DevicesRow[];
}

export async function getDevicesPaneData(): Promise<DevicesPaneData> {
  await verifySession();
  const supabase = await createClient();

  const [usersRes, devicesRes] = await Promise.all([
    supabase.rpc("list_users"),
    supabase
      .from("kid_devices")
      .select(
        "id, kid_user_id, device_label, user_agent, created_at, last_seen_at, revoked_at"
      )
      .order("created_at", { ascending: false }),
  ]);

  if (usersRes.error) throw usersRes.error;
  if (devicesRes.error) throw devicesRes.error;

  const kids: DevicesKid[] = (usersRes.data ?? [])
    .filter((u) => !u.is_admin)
    .map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
    }))
    .sort((a, b) => {
      const an = (a.firstName ?? a.email).toLowerCase();
      const bn = (b.firstName ?? b.email).toLowerCase();
      return an.localeCompare(bn);
    });

  const devices: DevicesRow[] = (devicesRes.data ?? []).map((d) => ({
    id: d.id,
    kidUserId: d.kid_user_id,
    deviceLabel: d.device_label,
    userAgent: d.user_agent,
    createdAt: d.created_at,
    lastSeenAt: d.last_seen_at,
    revokedAt: d.revoked_at,
  }));

  return { kids, devices };
}
