import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  encodeDeviceCookie,
  generateDeviceSecret,
  hashDeviceSecret,
} from "@/lib/auth/device-cookie";
import { deviceCookieOptions } from "@/lib/supabase/cookie-options";

interface ClaimRequest {
  code?: string;
  deviceLabel?: string;
}

export async function POST(request: NextRequest) {
  let body: ClaimRequest;
  try {
    body = (await request.json()) as ClaimRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.code || !/^[0-9]{6}$/.test(body.code)) {
    return NextResponse.json({ error: "invalid code" }, { status: 400 });
  }

  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 256);
  const deviceLabel = (body.deviceLabel ?? "").trim().slice(0, 80);

  const { rawSecret, rawSecretBase64Url } = generateDeviceSecret();
  const secretHash = await hashDeviceSecret(rawSecret);

  const admin = createAdminClient();
  const { data: rpcData, error: rpcError } = await admin.rpc(
    "consume_pairing_code",
    {
      p_code: body.code,
      p_device_label: deviceLabel,
      p_device_secret_hash: bytesToHex(secretHash),
      p_user_agent: userAgent,
    }
  );

  if (rpcError || !rpcData || rpcData.length === 0) {
    console.error("[devices/claim] rpc failed", rpcError);
    return NextResponse.json(
      { error: "invalid or expired code" },
      { status: 400 }
    );
  }

  const { device_id: deviceId, kid_user_id: kidUserId } = rpcData[0];

  // Look up the kid's email so we can mint a magic link for them.
  const { data: userData, error: userError } =
    await admin.auth.admin.getUserById(kidUserId);
  if (userError || !userData.user?.email) {
    console.error("[devices/claim] getUserById failed", userError);
    return NextResponse.json(
      { error: "user lookup failed" },
      { status: 500 }
    );
  }
  const email = userData.user.email;

  // Server-side admin generateLink does NOT trigger an email send — it
  // just returns the magic link / token. We exchange the token_hash via
  // verifyOtp on the SSR client, which writes a real Supabase session
  // (signed by the project's actual signing key) into the cookie store.
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("[devices/claim] generateLink failed", linkError);
    return NextResponse.json(
      { error: "could not mint session" },
      { status: 500 }
    );
  }

  const ssr = await createClient();
  const { data: verifyData, error: verifyError } = await ssr.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });
  if (verifyError) {
    console.error("[devices/claim] verifyOtp failed", verifyError);
    return NextResponse.json(
      { error: "could not establish session" },
      { status: 500 }
    );
  }

  // Bind the kid_devices row to the Supabase session id we just minted, so
  // revoke_kid_device can drop only this session and not the kid's other
  // sessions. The session_id claim is on the access token verifyOtp just
  // returned — decode locally rather than calling getClaims, which would
  // re-verify the token and round-trip GoTrue for nothing.
  const sessionId = readSessionIdFromAccessToken(
    verifyData?.session?.access_token
  );
  if (sessionId) {
    const { error: bindError } = await admin
      .from("kid_devices")
      .update({ session_id: sessionId })
      .eq("id", deviceId);
    if (bindError) {
      console.error("[devices/claim] session_id bind failed", bindError);
    }
  } else {
    console.error("[devices/claim] no session_id in access token");
  }

  const cookieStore = await cookies();
  cookieStore.set(
    "pt_device",
    encodeDeviceCookie(deviceId, rawSecretBase64Url),
    deviceCookieOptions
  );

  return NextResponse.json({ ok: true });
}

// Pulls session_id out of the access token returned by verifyOtp. We trust
// this token without re-verifying its signature — it just came back from a
// successful verifyOtp call on the SSR client, against our project's signing
// key.
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

function bytesToHex(bytes: Uint8Array): string {
  let hex = "\\x";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}
