import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { requireEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { hasAdminGroup, type JwtClaims } from "@/lib/auth/jwt";
import type { SessionDTO } from "./dto";

// cache() memoizes the result for one React render pass, so calling
// verifySession() from a page, a layout, and three nested server
// components during the same request triggers exactly one getClaims()
// call. getClaims() verifies the JWT locally against cached JWKS — no
// network round trip, no token refresh, no race with the browser client.
//
// On failure we redirect(). redirect() throws NEXT_REDIRECT, which React
// propagates out through every caller; because the throw happens inside
// the cached function, subsequent callers in the same render see the
// same rejection instead of re-running the check.
export const verifySession = cache(async (): Promise<SessionDTO> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims || typeof claims.sub !== "string") {
    const originalUrl = (await headers()).get("x-original-url");
    const authUrl = new URL(
      "/login",
      requireEnv(process.env.NEXT_PUBLIC_AUTH_URL, "NEXT_PUBLIC_AUTH_URL")
    );
    if (originalUrl) {
      authUrl.searchParams.set("next", originalUrl);
    }
    redirect(authUrl.toString());
  }

  return {
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    isAdmin: hasAdminGroup(claims as JwtClaims),
  };
});
