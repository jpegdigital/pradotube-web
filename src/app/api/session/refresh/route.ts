import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  constantTimeEqual,
  decodeDeviceCookie,
  encodeDeviceCookie,
  hashDeviceSecret,
} from "@/lib/auth/device-cookie";
import { base64urlEncode } from "@/lib/auth/base64url";
import { deviceCookieOptions } from "@/lib/supabase/cookie-options";

// Same-origin refresh hop. The proxy redirects here when it sees a
// `pt_device` cookie but no valid Supabase session. We verify the device,
// mint a fresh Supabase session (via admin generateLink + verifyOtp), and
// re-up the device cookie. Any failure routes to /setup — never to the
// IAM, so the kid PWA stays on the same origin.
export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get("pt_device")?.value;
  const next = sanitizeNext(request.nextUrl.searchParams.get("next"));
  const baseUrl = resolveBaseUrl(request);

  if (!cookieValue) {
    return redirectToSetup(baseUrl);
  }

  const decoded = decodeDeviceCookie(cookieValue);
  if (!decoded) {
    return redirectToSetup(baseUrl, /* clearCookie */ true);
  }

  const admin = createAdminClient();
  const { data: device, error: deviceError } = await admin
    .from("kid_devices")
    .select("id, kid_user_id, device_secret_hash, revoked_at")
    .eq("id", decoded.deviceId)
    .maybeSingle();

  if (deviceError || !device || device.revoked_at !== null) {
    return redirectToSetup(baseUrl, true);
  }

  const cookieHash = await hashDeviceSecret(decoded.rawSecret);
  const storedHash = parseBytea(device.device_secret_hash);
  if (!storedHash || !constantTimeEqual(cookieHash, storedHash)) {
    return redirectToSetup(baseUrl, true);
  }

  const { data: userData, error: userError } =
    await admin.auth.admin.getUserById(device.kid_user_id);
  if (userError || !userData.user?.email) {
    console.error("[session/refresh] getUserById failed", userError);
    return redirectToSetup(baseUrl, true);
  }
  const email = userData.user.email;

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("[session/refresh] generateLink failed", linkError);
    return redirectToSetup(baseUrl, true);
  }

  const ssr = await createClient();
  const { data: verifyData, error: verifyError } = await ssr.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });
  if (verifyError) {
    console.error("[session/refresh] verifyOtp failed", verifyError);
    return redirectToSetup(baseUrl, true);
  }

  // Bind the kid_devices row to the new session_id so the parent's next
  // revoke drops only this session. Best-effort: a bind failure leaves
  // session_id NULL on the device, which means revoke falls back to the
  // soft path (flag-only) for this device until a future refresh re-binds.
  const sessionId = readSessionIdFromAccessToken(
    verifyData?.session?.access_token
  );
  if (sessionId) {
    const { error: bindError } = await admin
      .from("kid_devices")
      .update({ session_id: sessionId })
      .eq("id", device.id);
    if (bindError) {
      console.error("[session/refresh] session_id bind failed", bindError);
    }
  } else {
    console.error("[session/refresh] no session_id in access token");
  }

  // Re-up pt_device on the same cookie store the SSR client just used,
  // so the 400-day max-age slides forward whenever the iPad refreshes.
  const cookieStore = await cookies();
  cookieStore.set(
    "pt_device",
    encodeDeviceCookie(device.id, base64urlEncode(decoded.rawSecret)),
    deviceCookieOptions
  );

  // Best-effort touch — failure here doesn't void the session we just minted.
  await admin.rpc("touch_kid_device", { p_device_id: device.id });

  return NextResponse.redirect(new URL(next, baseUrl));
}

// Same reasoning as proxy.ts: trust the Host header, not request.url. In dev
// with --hostname 0.0.0.0 request.url reports the bind hostname.
function resolveBaseUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host");
  const proto = forwardedProto ?? request.nextUrl.protocol.replace(":", "");
  return host ? `${proto}://${host}` : request.nextUrl.origin;
}

function redirectToSetup(baseUrl: string, clearCookie = false): NextResponse {
  const response = NextResponse.redirect(new URL("/setup", baseUrl));
  if (clearCookie) {
    response.cookies.set({
      name: "pt_device",
      value: "",
      ...deviceCookieOptions,
      maxAge: 0,
    });
  }
  return response;
}

function sanitizeNext(raw: string | null): string {
  if (!raw) return "/";
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) return decoded;
    const parsed = new URL(decoded);
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return "/";
  }
}

function readSessionIdFromAccessToken(
  token: string | null | undefined
): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const payload = JSON.parse(json) as { session_id?: unknown };
    return typeof payload.session_id === "string" ? payload.session_id : null;
  } catch {
    return null;
  }
}

function parseBytea(value: unknown): Uint8Array | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("\\x")) return null;
  const hex = value.slice(2);
  if (hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
