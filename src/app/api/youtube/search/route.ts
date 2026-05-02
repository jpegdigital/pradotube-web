import { NextRequest, NextResponse } from "next/server";
import { searchChannels } from "@/lib/youtube";
import { hasAdminGroup, type JwtClaims } from "@/lib/auth/jwt";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Auth: admin-only (protects YouTube API quota)
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!hasAdminGroup(data?.claims as JwtClaims | null | undefined)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const query = request.nextUrl.searchParams.get("q");

  if (!query) {
    return NextResponse.json(
      { error: "Missing 'q' query parameter" },
      { status: 400 }
    );
  }

  try {
    const channels = await searchChannels(query, 8);
    return NextResponse.json(channels);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
