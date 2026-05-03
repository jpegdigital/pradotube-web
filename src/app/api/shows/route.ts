import { NextRequest, NextResponse } from "next/server";
import {
  getShowsPage,
  SHOWS_SORT_FIELDS,
  type ShowsSortDir,
  type ShowsSortField,
} from "@/app/(app)/shows/_lib/get-shows";

const MAX_LIMIT = 60;
const MAX_Q_LENGTH = 100;
const SORT_FIELDS = new Set<ShowsSortField>(SHOWS_SORT_FIELDS);
const SORT_DIRS = new Set<ShowsSortDir>(["asc", "desc"]);

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

  const sortParam = params.get("sort");
  if (sortParam !== null && !SORT_FIELDS.has(sortParam as ShowsSortField)) {
    return NextResponse.json({ error: "Invalid sort" }, { status: 400 });
  }
  const sort = (sortParam as ShowsSortField | null) ?? undefined;

  const dirParam = params.get("dir");
  if (dirParam !== null && !SORT_DIRS.has(dirParam as ShowsSortDir)) {
    return NextResponse.json({ error: "Invalid dir" }, { status: 400 });
  }
  const dir = (dirParam as ShowsSortDir | null) ?? undefined;

  const qParam = params.get("q");
  if (qParam !== null && qParam.length > MAX_Q_LENGTH) {
    return NextResponse.json({ error: "Search too long" }, { status: 400 });
  }
  const q = qParam ?? undefined;

  const page = await getShowsPage({ slug, cursor, limit, sort, dir, q });
  return NextResponse.json(page);
}
