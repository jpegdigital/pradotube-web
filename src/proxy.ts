import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireEnv } from "@/lib/env";
import { hasAdminGroup, type JwtClaims } from "@/lib/auth/jwt";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

// The proxy owns one job: session lifecycle. On every matched request it
// validates the Supabase JWT locally (via getClaims → JWKS signature check)
// and, if the access token is near expiry, exchanges the refresh token for
// a fresh one and writes the new cookies on the outgoing response.
//
// After this runs, every downstream layer (Server Components, Server
// Actions, Route Handlers, the DAL) can assume the session cookie is fresh
// and authoritative.
export async function proxy(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host");
  const proto = forwardedProto ?? request.nextUrl.protocol.replace(":", "");
  const originalUrl = host
    ? `${proto}://${host}${request.nextUrl.pathname}${request.nextUrl.search}`
    : request.nextUrl.href;

  const { response, claims } = await updateSupabaseSession(request, {
    "x-original-url": originalUrl,
  });

  if (!claims) {
    const redirect = new URL(
      "/login",
      requireEnv(process.env.NEXT_PUBLIC_AUTH_URL, "NEXT_PUBLIC_AUTH_URL")
    );
    redirect.searchParams.set("next", originalUrl);
    return NextResponse.redirect(redirect);
  }

  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    !hasAdminGroup(claims as JwtClaims)
  ) {
    return NextResponse.redirect(new URL("/403", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|apple-icon|icon/|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|woff|woff2|ttf|otf|mp4|webm|map)$).*)",
  ],
};
