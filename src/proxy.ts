import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hasAdminGroup, type JwtClaims } from "@/lib/auth/jwt";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

// Public same-origin routes that bypass the entire auth gate. /setup is
// the kid-friendly landing for unpaired devices; /pair is the code-entry
// flow that issues the device cookie. Both must be reachable without a
// session AND without a device cookie.
const PUBLIC_PATHS = new Set(["/setup", "/pair"]);

// The proxy owns one job: session lifecycle. On every matched request it
// validates the Supabase JWT (via getClaims) and, when the cookie is missing
// or invalid, decides where to send the user:
//
//   - paired iPad (pt_device cookie present) → same-origin refresh hop
//   - unpaired browser/iPad → same-origin /setup landing
//
// The IAM (auth subdomain) is no longer in the auto-redirect path. Parents
// reach it through an explicit "I'm a grown-up" click on /setup, so kid
// PWAs never lose their start_url to a cross-origin navigation.
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (PUBLIC_PATHS.has(path)) {
    return NextResponse.next();
  }

  // We MUST derive the redirect base from the Host header (or x-forwarded-host
  // behind a proxy) and never from request.url. In Next dev with
  // --hostname 0.0.0.0, request.url reports the bind hostname (0.0.0.0) rather
  // than what the browser actually requested, so URL("/x", request.url) would
  // bounce the user off-host. The Host header is the only reliable source.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host");
  const proto = forwardedProto ?? request.nextUrl.protocol.replace(":", "");
  const baseUrl = host ? `${proto}://${host}` : request.nextUrl.origin;
  const originalUrl = `${baseUrl}${path}${request.nextUrl.search}`;

  const { response, claims } = await updateSupabaseSession(request, {
    "x-original-url": originalUrl,
  });

  if (!claims) {
    if (request.cookies.has("pt_device")) {
      // Paired device — silently refresh via same-origin route.
      const refresh = new URL("/api/session/refresh", baseUrl);
      refresh.searchParams.set("next", originalUrl);
      return NextResponse.redirect(refresh);
    }
    return NextResponse.redirect(new URL("/setup", baseUrl));
  }

  if (path.startsWith("/admin") && !hasAdminGroup(claims as JwtClaims)) {
    return NextResponse.redirect(new URL("/403", baseUrl));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|apple-icon|icon/|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|woff|woff2|ttf|otf|mp4|webm|map)$).*)",
  ],
};
