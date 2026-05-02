import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireEnv } from "@/lib/env";
import { cookieOptions } from "./cookie-options";
import type { Database } from "./database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database, "pradotube">(
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    ),
    {
      db: { schema: "pradotube" },
      cookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component render contexts cannot mutate cookies.
            // proxy.ts refreshes the session cookie on every request before
            // the Server Component renders, so by the time this client is
            // used, the cookie is already fresh and setAll here is a no-op
            // the library only reaches on edge cases (e.g. an in-render
            // explicit refreshSession() call). Silent catch is safe because
            // any dropped write would be re-established on the next request
            // through proxy.ts.
          }
        },
      },
    }
  );
}
