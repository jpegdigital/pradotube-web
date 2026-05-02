import { NextRequest, NextResponse } from "next/server";
import { getShowsPage } from "@/app/(app)/shows/_lib/get-shows";

const MAX_LIMIT = 60;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const slug = params.get("creator") ?? undefined;

  const cursorParam = params.get("cursor");
  const cursor = cursorParam ? Number(cursorParam) : undefined;
  if (cursor !== undefined && (!Number.isInteger(cursor) || cursor < 0)) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }

  const limitParam = params.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  if (
    limit !== undefined &&
    (!Number.isInteger(limit) || limit <= 0 || limit > MAX_LIMIT)
  ) {
    return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
  }

  const page = await getShowsPage({ slug, cursor, limit });
  return NextResponse.json(page);
}
