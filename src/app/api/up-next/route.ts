import { NextRequest, NextResponse } from "next/server";
import { getUpNext } from "@/app/(app)/watch/_lib/get-up-next";

const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

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

  const page = await getUpNext({ cursor, limit });
  return NextResponse.json(page);
}
