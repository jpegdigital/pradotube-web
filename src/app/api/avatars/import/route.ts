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

const FETCH_TIMEOUT_MS = 12_000;

interface ImportBody {
  kind: "creator" | "channel";
  id: string;
  sourceUrl: string;
  alsoSetCreator?: boolean;
}

function isAllowedHost(url: URL): boolean {
  return (
    url.hostname.endsWith(".ggpht.com") ||
    url.hostname.endsWith(".googleusercontent.com") ||
    url.hostname.endsWith(".ytimg.com")
  );
}

function upgradeYoutubeSize(url: string): string {
  return url.replace(/=s\d+(-[^?]*)?/, "=s512-c-k-c0x00ffffff-no-rj");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!hasAdminGroup(data?.claims as JwtClaims | null | undefined)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as ImportBody | null;
  if (
    !body ||
    (body.kind !== "creator" && body.kind !== "channel") ||
    typeof body.id !== "string" ||
    typeof body.sourceUrl !== "string"
  ) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (body.kind === "creator" && !CREATOR_ID_RE.test(body.id)) {
    return NextResponse.json({ error: "Invalid creator id" }, { status: 400 });
  }
  if (body.kind === "channel" && !CHANNEL_ID_RE.test(body.id)) {
    return NextResponse.json({ error: "Invalid channel id" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(body.sourceUrl);
  } catch {
    return NextResponse.json({ error: "Invalid sourceUrl" }, { status: 400 });
  }
  if (parsed.protocol !== "https:" || !isAllowedHost(parsed)) {
    return NextResponse.json(
      { error: "sourceUrl host not allowed" },
      { status: 400 }
    );
  }

  const upgraded = upgradeYoutubeSize(parsed.toString());

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  let raw: Buffer;
  try {
    const res = await fetch(upgraded, { signal: ctrl.signal });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Source fetch ${res.status}` },
        { status: 502 }
      );
    }
    raw = Buffer.from(await res.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }

  let webp: Buffer;
  try {
    webp = await normalizeToWebp(raw);
  } catch {
    return NextResponse.json(
      { error: "Could not decode image" },
      { status: 415 }
    );
  }

  const key = avatarKeyFor(body.kind, body.id);
  await putAvatarToR2(key, webp);

  if (body.kind === "creator") {
    const { error } = await supabase
      .from("creators")
      .update({ avatar_path: key })
      .eq("id", body.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error: chErr } = await supabase
      .from("channels")
      .update({ avatar_path: key })
      .eq("youtube_id", body.id);
    if (chErr) {
      return NextResponse.json({ error: chErr.message }, { status: 500 });
    }

    if (body.alsoSetCreator) {
      const { data: ch } = await supabase
        .from("channels")
        .select("creator_id")
        .eq("youtube_id", body.id)
        .maybeSingle();
      if (ch?.creator_id) {
        const { data: cr } = await supabase
          .from("creators")
          .select("avatar_path")
          .eq("id", ch.creator_id)
          .maybeSingle();
        if (cr && !cr.avatar_path) {
          const creatorKey = avatarKeyFor("creator", ch.creator_id);
          await putAvatarToR2(creatorKey, webp);
          await supabase
            .from("creators")
            .update({ avatar_path: creatorKey })
            .eq("id", ch.creator_id);
        }
      }
    }
  }

  return NextResponse.json({ avatar_path: key, version: Date.now() });
}
