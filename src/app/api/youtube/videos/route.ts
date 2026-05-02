import { NextRequest, NextResponse } from "next/server";
import { getChannelVideos } from "@/lib/youtube";
import { hasAdminGroup, type JwtClaims } from "@/lib/auth/jwt";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Auth: admin-only (protects YouTube API quota)
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!hasAdminGroup(data?.claims as JwtClaims | null | undefined)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const channelId = request.nextUrl.searchParams.get("channelId");

  if (!channelId) {
    return NextResponse.json(
      { error: "Missing 'channelId' query parameter" },
      { status: 400 }
    );
  }

  try {
    const videos = await getChannelVideos(channelId, 12);
    return NextResponse.json(videos);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
