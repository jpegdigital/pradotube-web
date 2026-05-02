import "server-only";

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/env";
import { cookieOptions } from "./cookie-options";
import type { Database } from "./database.types";

/**
 * Cookie propagation pattern:
 *   1. `getAll` reads from `request.cookies`.
 *   2. `setAll` mutates `request.cookies` (so Server Components downstream
 *      see the fresh cookies this render pass — not just next request) AND
 *      writes `Set-Cookie` on the response (so the browser keeps them).
 *   3. We rebuild the response after mutating `request.cookies` because
 *      `NextResponse.next({ request })` snapshots cookies at construction.
 *
 * CDN safety:
 *   `cacheHeaders` carries Cache-Control / Expires / Pragma that must be
 *   applied when cookies get refreshed. Without them, a CDN can cache a
 *   response containing a Set-Cookie and serve it to another user, leaking
 *   the session.
 *
 * Do not run code between `createServerClient` and `getClaims()` — the
 * auth client's internal state can desync with the cookie store.
 */
export async function updateSupabaseSession(
  request: NextRequest,
  forwardRequestHeaders?: Record<string, string>
) {
  const requestHeaders = new Headers(request.headers);
  if (forwardRequestHeaders) {
    for (const [name, value] of Object.entries(forwardRequestHeaders)) {
      requestHeaders.set(name, value);
    }
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient<Database, "pradotube">(
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
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, cacheHeaders) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          if (cacheHeaders) {
            for (const [name, value] of Object.entries(cacheHeaders)) {
              response.headers.set(name, value);
            }
          }
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  return { response, claims: data?.claims ?? null };
}
