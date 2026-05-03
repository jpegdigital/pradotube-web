import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAdminGroup, type JwtClaims } from "@/lib/auth/jwt";

const CODE_TTL_MINUTES = 5;
const MAX_INSERT_RETRIES = 3;

interface PairRequest {
  kidUserId?: string;
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
  const parentUserId = claims.sub;

  let body: PairRequest;
  try {
    body = (await request.json()) as PairRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.kidUserId || typeof body.kidUserId !== "string") {
    return NextResponse.json(
      { error: "kidUserId required" },
      { status: 400 }
    );
  }

  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
  const admin = createAdminClient();

  // Retry on the rare collision against the partial unique index. With a 1M
  // code space and a low generation rate, expected collisions are
  // negligible; three tries handles even adversarial cases without spinning.
  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_INSERT_RETRIES; attempt++) {
    const code = generateSixDigitCode();
    const { error } = await admin.from("pairing_codes").insert({
      code,
      kid_user_id: body.kidUserId,
      parent_user_id: parentUserId,
      expires_at: expiresAt.toISOString(),
    });
    if (!error) {
      return NextResponse.json({
        code,
        expiresAt: expiresAt.toISOString(),
      });
    }
    lastError = error;
    if (error.code !== "23505") break; // not a unique violation — bail
  }

  const detail =
    lastError && typeof lastError === "object"
      ? {
          message: (lastError as { message?: string }).message,
          code: (lastError as { code?: string }).code,
          details: (lastError as { details?: string }).details,
          hint: (lastError as { hint?: string }).hint,
        }
      : { raw: String(lastError) };
  console.error("[devices/pair] insert failed", detail);
  return NextResponse.json(
    { error: "could not create code", detail },
    { status: 500 }
  );
}

function generateSixDigitCode(): string {
  // Reject-sample to avoid the modulo bias against 1_000_000.
  const buf = new Uint32Array(1);
  let n: number;
  do {
    crypto.getRandomValues(buf);
    n = buf[0];
  } while (n >= 4_294_000_000);
  return (n % 1_000_000).toString().padStart(6, "0");
}
