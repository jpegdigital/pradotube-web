import { Calendar, Clock, MessageSquare, Tag, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { avatarUrl } from "@/lib/avatars";
import type { Video } from "../_lib/get-video";
import { TagsList } from "./tags-list";

interface WatchDetailsProps {
  video: Video;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const sPad = s.toString().padStart(2, "0");
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sPad}`;
  return `${m}:${sPad}`;
}

function getCreator(video: Video) {
  const creators = video.channels?.creators;
  if (!creators) return null;
  return Array.isArray(creators) ? (creators[0] ?? null) : creators;
}

function StatPill({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="video-stat-pill" title={label}>
      <Icon className="h-3.5 w-3.5" />
      <span>{value}</span>
    </div>
  );
}

export function WatchDetails({ video }: WatchDetailsProps) {
  const creator = getCreator(video);
  const creatorAvatar = creator ? avatarUrl(creator.avatar_path) : null;
  const tags = video.tags ?? [];
  const categories = video.categories ?? [];
  const duration = video.duration_seconds ?? 0;

  return (
    <>
      <div className="mt-5">
        <h2 className="font-heading text-xl sm:text-2xl lg:text-3xl text-foreground leading-snug">
          {video.title}
        </h2>

        {creator && (
          <div className="mt-4 flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full ring-1 ring-primary/20">
              {creatorAvatar ? (
                <img
                  src={creatorAvatar}
                  alt={creator.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary/10">
                  <span className="font-heading text-sm font-semibold text-primary">
                    {creator.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <Link
              href={creator.slug ? `/shows/${creator.slug}` : "/shows"}
              className="font-body text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {creator.name}
            </Link>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {video.published_at && (
          <StatPill
            icon={Calendar}
            value={formatDate(video.published_at)}
            label="Upload date"
          />
        )}
        {duration > 0 && (
          <StatPill
            icon={Clock}
            value={formatTimestamp(duration)}
            label="Duration"
          />
        )}
        {video.like_count != null && Number(video.like_count) > 0 && (
          <StatPill
            icon={ThumbsUp}
            value={formatCount(Number(video.like_count))}
            label="Likes"
          />
        )}
        {video.comment_count != null && Number(video.comment_count) > 0 && (
          <StatPill
            icon={MessageSquare}
            value={formatCount(Number(video.comment_count))}
            label="Comments"
          />
        )}
      </div>

      {tags.length > 0 && (
        <div className="mt-5">
          <h3 className="font-heading text-base text-foreground mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            Tags
          </h3>
          <TagsList tags={tags} />
        </div>
      )}

      <div className="mt-8 border-t border-border/40 pt-4">
        <div className="flex flex-wrap gap-x-6 gap-y-1 font-body text-xs text-muted-foreground/60">
          <span>Video ID: {video.youtube_id}</span>
          {video.language && <span>Language: {video.language}</span>}
          {categories.length > 0 && (
            <span>Category: {categories.join(", ")}</span>
          )}
        </div>
      </div>
    </>
  );
}
