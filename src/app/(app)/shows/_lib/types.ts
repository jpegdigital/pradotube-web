export interface ShowVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  thumbnailPath: string | null;
  durationSeconds: number;
  publishedAt: string | null;
  viewCount: number | null;
  creatorName: string;
  creatorAvatar: string;
}

export interface ShowCreator {
  slug: string;
  name: string;
  avatar: string;
}

export interface ShowsPage {
  videos: ShowVideo[];
  nextCursor: number | null;
}

export interface ShowsInitial {
  firstPage: ShowsPage;
  creators: ShowCreator[];
}

export type ShowsSortField =
  | "feed_rank"
  | "published_at"
  | "title"
  | "like_count";
export type ShowsSortDir = "asc" | "desc";

export const SHOWS_SORT_FIELDS: ShowsSortField[] = [
  "feed_rank",
  "published_at",
  "title",
  "like_count",
];

// Natural direction = the dir that means "best/newest/easiest" for that field.
// Used as the initial dir on first load and when switching fields, so kids
// don't get "oldest first" by accident after toggling Title to A→Z.
export const NATURAL_DIR: Record<ShowsSortField, ShowsSortDir> = {
  feed_rank: "asc",
  published_at: "desc",
  title: "asc",
  like_count: "desc",
};

export const DEFAULT_SHOWS_SORT: ShowsSortField = "feed_rank";
export const DEFAULT_SHOWS_DIR: ShowsSortDir = NATURAL_DIR[DEFAULT_SHOWS_SORT];
