import Link from "next/link";

interface VideoCardProps {
  id: string;
  title: string;
  thumbnailUrl: string;
  thumbnailPath: string | null;
  creatorName: string;
  creatorAvatar: string;
  durationSeconds: number;
  publishedAt: string | null;
  viewCount: number | null;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const sPad = s.toString().padStart(2, "0");
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sPad}`;
  return `${m}:${sPad}`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1)}K`;
  }
  return n.toLocaleString();
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const day = 86_400_000;
  const days = Math.floor(diffMs / day);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground/35 select-none">
      ·
    </span>
  );
}

export function VideoCard({
  id,
  title,
  thumbnailUrl,
  thumbnailPath,
  creatorName,
  creatorAvatar,
  durationSeconds,
  publishedAt,
  viewCount,
}: VideoCardProps) {
  const thumb = thumbnailPath
    ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${thumbnailPath}`
    : thumbnailUrl;

  const hasViews = viewCount != null && viewCount > 0;
  const hasDate = !!publishedAt;

  return (
    <Link
      href={`/watch/${id}`}
      className="group flex flex-col gap-3 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl transition-opacity active:opacity-90"
    >
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-secondary ring-1 ring-border/30 transition-all duration-300 group-hover:ring-border group-hover:shadow-xl group-hover:shadow-primary/8 group-hover:-translate-y-1 group-active:translate-y-0 group-active:duration-100">
        {thumb ? (
          <img
            src={thumb}
            alt={title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <span className="font-heading text-2xl text-muted-foreground/40">
              {title.charAt(0)}
            </span>
          </div>
        )}

        {durationSeconds > 0 && (
          <div className="absolute bottom-2 right-2 rounded-lg bg-black/75 px-2 py-0.5 font-body text-[11px] sm:text-xs font-bold text-white tabular-nums backdrop-blur-sm">
            {formatDuration(durationSeconds)}
          </div>
        )}
      </div>

      <div className="flex gap-3 px-1">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-secondary ring-1 ring-border/40 sm:h-10 sm:w-10">
          {creatorAvatar ? (
            <img
              src={creatorAvatar}
              alt={creatorName}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <span className="font-heading text-sm text-primary">
                {creatorName.charAt(0)}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-body text-[15px] sm:text-base font-bold text-foreground leading-[1.25] tracking-[-0.005em] text-balance line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="mt-1 truncate font-body text-sm font-medium text-muted-foreground">
            {creatorName}
          </p>
          {(hasViews || hasDate) && (
            <p className="mt-0 flex min-w-0 items-center gap-1.5 font-body text-xs font-medium text-muted-foreground/80">
              {hasViews && (
                <span className="shrink-0 tabular-nums">
                  {formatCount(viewCount!)} plays
                </span>
              )}
              {hasViews && hasDate && <Dot />}
              {hasDate && (
                <span className="shrink-0">
                  {formatRelative(publishedAt!)}
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
