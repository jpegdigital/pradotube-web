import { createBrowserClient } from "@supabase/ssr";
import { requireEnv } from "@/lib/env";
import { cookieOptions } from "./cookie-options";
import type { Database } from "./database.types";

type BrowserClient = ReturnType<typeof createBrowserClient<Database, "pradotube">>;

let client: BrowserClient | undefined;

export function createClient() {
  if (!client) {
    client = createBrowserClient<Database, "pradotube">(
      requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
      ),
      {
        db: { schema: "pradotube" },
        cookieOptions,
      }
    );
  }
  return client;
}
