import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasAdminGroup, type JwtClaims } from "@/lib/auth/jwt";

interface RevokeRequest {
  deviceId?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims || typeof claims.sub !== "string") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasAdminGroup(claims as JwtClaims)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: RevokeRequest;
  try {
    body = (await request.json()) as RevokeRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.deviceId || typeof body.deviceId !== "string") {
    return NextResponse.json(
      { error: "deviceId required" },
      { status: 400 }
    );
  }

  // RPC re-checks admin via iam.is_admin('pradotube') inside the function
  // body, so even if a non-admin reached this route they'd be rejected at the
  // SQL boundary. Defense in depth.
  const { error } = await supabase.rpc("revoke_kid_device", {
    p_device_id: body.deviceId,
  });
  if (error) {
    console.error("[devices/revoke] rpc failed", error);
    return NextResponse.json({ error: "revoke failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
