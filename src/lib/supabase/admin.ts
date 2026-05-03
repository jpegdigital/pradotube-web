import "server-only";

import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";
import type { Database } from "./database.types";

// Service-role client for routes that act on behalf of unauthenticated
// requests (device pairing) or need to bypass RLS (admin RPCs called from
// service-role context). Never instantiate this from a Server Component or
// browser path — the secret key would leak.
export function createAdminClient() {
  return createSupabaseJsClient<Database, "pradotube">(
    requireEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL"
    ),
    requireEnv(process.env.SUPABASE_SECRET_KEY, "SUPABASE_SECRET_KEY"),
    {
      db: { schema: "pradotube" },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
