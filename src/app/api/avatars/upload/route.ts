import { NextRequest, NextResponse } from "next/server";
import { hasAdminGroup, type JwtClaims } from "@/lib/auth/jwt";
import { createClient } from "@/lib/supabase/server";
import {
  CHANNEL_ID_RE,
  CREATOR_ID_RE,
  avatarKeyFor,
  normalizeToWebp,
  putAvatarToR2,
} from "@/lib/avatars/r2-server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!hasAdminGroup(data?.claims as JwtClaims | null | undefined)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const kind = form.get("kind");
  const id = form.get("id");
  const file = form.get("file");

  if (kind !== "creator" && kind !== "channel") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }
  if (typeof id !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  if (kind === "creator" && !CREATOR_ID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid creator id" }, { status: 400 });
  }
  if (kind === "channel" && !CHANNEL_ID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid channel id" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 8 MB)" },
      { status: 413 }
    );
  }

  const raw = Buffer.from(await file.arrayBuffer());

  let webp: Buffer;
  try {
    webp = await normalizeToWebp(raw);
  } catch {
    return NextResponse.json(
      { error: "Could not decode image" },
      { status: 415 }
    );
  }

  const key = avatarKeyFor(kind, id);
  await putAvatarToR2(key, webp);

  if (kind === "creator") {
    const { error } = await supabase
      .from("creators")
      .update({ avatar_path: key })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("channels")
      .update({ avatar_path: key })
      .eq("youtube_id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ avatar_path: key, version: Date.now() });
}
