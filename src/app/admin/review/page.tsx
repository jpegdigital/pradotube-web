"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  useQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { avatarUrl } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/browser";
import { useCurrentUser } from "@/lib/auth/current-user-store";
import {
  ArrowLeft,
  Tv,
  Sun,
  Moon,
  Loader2,
  Check,
  X,
  ExternalLink,
  Eye,
  ThumbsUp,
  MessageSquare,
  ClipboardCheck,
  Sparkles,
  Undo2,
  Flame,
  Calendar,
  Clock,
  Inbox,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Trophy,
  Sprout,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChannelOption {
  youtube_id: string;
  title: string;
  avatar_path: string | null;
  custom_url: string | null;
  sync_mode: string;
  pending_count: number;
}

interface PendingVideo {
  youtube_id: string;
  channel_id: string;
  title: string;
  thumbnail_url: string | null;
  published_at: string | null;
  duration_seconds: number | null;
  score: number | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  discovered_at: string;
}

type Decision = "approved" | "rejected";

interface UndoEntry {
  videoId: string;
  channelId: string;
  decision: Decision;
  title: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function RainbowLogo({ className = "" }: { className?: string }) {
  const letters = [
    { char: "P", color: "var(--logo-green)" },
    { char: "r", color: "var(--logo-blue)" },
    { char: "a", color: "var(--logo-red)" },
    { char: "d", color: "var(--logo-yellow)" },
    { char: "o", color: "var(--logo-purple)" },
    { char: "T", color: "var(--logo-green)" },
    { char: "u", color: "var(--logo-orange)" },
    { char: "b", color: "var(--logo-blue)" },
    { char: "e", color: "var(--logo-red)" },
  ];
  return (
    <span className={`font-heading tracking-tight ${className}`}>
      {letters.map((l, i) => (
        <span key={i} className="logo-letter" style={{ color: l.color }}>
          {l.char}
        </span>
      ))}
    </span>
  );
}

function formatCount(num: number | null | undefined): string {
  const n = Number(num ?? 0);
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(seconds: number | null | undefined): string {
  const s = Number(seconds ?? 0);
  if (!Number.isFinite(s) || s <= 0) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const day = 86_400_000;
  const days = Math.floor(diffMs / day);
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function scoreTier(score: number | null | undefined): "fire" | "good" | "ok" | "low" {
  const s = Number(score ?? 0);
  if (s >= 0.7) return "fire";
  if (s >= 0.4) return "good";
  if (s >= 0.2) return "ok";
  return "low";
}

// ─── Data fetching ───────────────────────────────────────────────────────────

async function fetchReviewChannels(): Promise<ChannelOption[]> {
  const supabase = createClient();

  const [channelsResult, pendingResult] = await Promise.all([
    supabase
      .from("channels")
      .select("youtube_id, title, avatar_path, custom_url, sync_mode")
      .order("display_order", { ascending: true }),
    supabase
      .from("videos")
      .select("channel_id")
      .eq("decision", "pending")
      .is("r2_synced_at", null),
  ]);

  if (channelsResult.error) throw new Error("Failed to load channels");
  if (pendingResult.error) throw new Error("Failed to load pending videos");

  const counts = new Map<string, number>();
  for (const row of pendingResult.data ?? []) {
    counts.set(row.channel_id, (counts.get(row.channel_id) ?? 0) + 1);
  }

  const allChannels = (channelsResult.data ?? []).map((c) => ({
    youtube_id: c.youtube_id,
    title: c.title,
    avatar_path: c.avatar_path,
    custom_url: c.custom_url,
    sync_mode: c.sync_mode,
    pending_count: counts.get(c.youtube_id) ?? 0,
  }));

  // Surface channels that need attention: review-mode channels OR channels
  // with at least one pending video (the latter happens after a sync→review
  // flip demoted in-flight auto candidates).
  return allChannels
    .filter((c) => c.sync_mode === "review" || c.pending_count > 0)
    .sort((a, b) => {
      const aPriority = (a.sync_mode === "review" ? 1 : 0) * 1_000_000 + a.pending_count;
      const bPriority = (b.sync_mode === "review" ? 1 : 0) * 1_000_000 + b.pending_count;
      return bPriority - aPriority;
    });
}

type SortField =
  | "score"
  | "published_at"
  | "discovered_at"
  | "view_count"
  | "like_count"
  | "comment_count";
type SortDir = "desc" | "asc";

async function fetchPendingVideos(
  channelId: string,
  sortField: SortField,
  sortDir: SortDir
): Promise<PendingVideo[]> {
  const supabase = createClient();
  const ascending = sortDir === "asc";
  const { data, error } = await supabase
    .from("videos")
    .select(
      "youtube_id, channel_id, title, thumbnail_url, published_at, duration_seconds, score, view_count, like_count, comment_count, discovered_at"
    )
    .eq("channel_id", channelId)
    .eq("decision", "pending")
    .order(sortField, { ascending, nullsFirst: false })
    .limit(80);
  if (error) throw new Error("Failed to load review queue");
  return (data ?? []) as PendingVideo[];
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const [mounted, setMounted] = useState(false);
  useMountEffect(() => setMounted(true));

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: channels = [], isLoading: loadingChannels } = useQuery({
    queryKey: ["pending-channels"],
    queryFn: fetchReviewChannels,
    staleTime: 30 * 1000,
  });

  // Auto-pick the first channel with pending content on initial load.
  if (selectedChannelId === null && channels.length > 0) {
    const firstWithPending =
      channels.find((c) => c.pending_count > 0) ?? channels[0];
    setSelectedChannelId(firstWithPending.youtube_id);
  }

  const selectedChannel = useMemo(
    () => channels.find((c) => c.youtube_id === selectedChannelId) ?? null,
    [channels, selectedChannelId]
  );

  const { data: pendingVideos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ["pending-videos", selectedChannelId, sortField, sortDir],
    queryFn: () =>
      selectedChannelId
        ? fetchPendingVideos(selectedChannelId, sortField, sortDir)
        : Promise.resolve([]),
    enabled: !!selectedChannelId,
    staleTime: 15 * 1000,
  });

  // ─── Mutations (optimistic + undo) ─────────────────────────────────────────

  const decideMutation = useMutation({
    mutationFn: async ({
      videoId,
      decision,
    }: {
      videoId: string;
      decision: Decision | "pending";
    }) => {
      const supabase = createClient();
      const update: {
        decision: Decision | "pending";
        decided_at: string | null;
        decided_by: string | null;
      } =
        decision === "pending"
          ? { decision, decided_at: null, decided_by: null }
          : {
              decision,
              decided_at: new Date().toISOString(),
              decided_by: currentUser?.id ?? null,
            };
      const { error } = await supabase
        .from("videos")
        .update(update)
        .eq("youtube_id", videoId);
      if (error) throw error;
    },
    onMutate: async ({ videoId, decision }) => {
      const channelId = selectedChannelId;
      if (!channelId) return;
      const cacheKey = ["pending-videos", channelId, sortField, sortDir];
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<PendingVideo[]>(cacheKey);
      if (decision !== "pending") {
        queryClient.setQueryData<PendingVideo[]>(cacheKey, (old = []) =>
          old.filter((v) => v.youtube_id !== videoId)
        );
      }
      return { previous, cacheKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous && context.cacheKey) {
        queryClient.setQueryData(context.cacheKey, context.previous);
      }
      toast.error("Couldn't save decision");
    },
    onSettled: () => {
      if (selectedChannelId) {
        // Invalidate every sort variant for this channel.
        queryClient.invalidateQueries({
          queryKey: ["pending-videos", selectedChannelId],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["pending-channels"] });
    },
  });

  const decideVideo = useCallback(
    (video: PendingVideo, decision: Decision) => {
      decideMutation.mutate({ videoId: video.youtube_id, decision });
      setUndoStack((prev) => [
        ...prev.slice(-9),
        {
          videoId: video.youtube_id,
          channelId: video.channel_id,
          decision,
          title: video.title,
        },
      ]);
    },
    [decideMutation]
  );

  const undoLast = useCallback(() => {
    setUndoStack((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      decideMutation.mutate({ videoId: last.videoId, decision: "pending" });
      toast(`Undid ${last.decision === "approved" ? "approval" : "rejection"} of "${last.title}"`);
      return prev.slice(0, -1);
    });
  }, [decideMutation]);

  // ─── Render ────────────────────────────────────────────────────────────────

  const totalPending = channels.reduce((s, c) => s + c.pending_count, 0);
  const reviewed = undoStack.length;

  return (
    <div className="admin-root review-root min-h-screen">
      <Toaster position="bottom-right" />
      <div className="grain-overlay" />

      {/* Header */}
      <header className="player-header sticky top-0 z-50 border-b border-border/50 px-5 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Back to admin"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#89E219] shadow-sm">
                <Tv className="h-4.5 w-4.5 text-white" />
              </div>
              <RainbowLogo className="text-xl" />
            </Link>
            <span className="font-body ml-1 text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
              Review
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="font-body mr-2 hidden items-center gap-4 text-sm text-foreground/60 sm:flex">
              <span className="flex items-center gap-1.5">
                <Inbox className="h-3.5 w-3.5" />
                {totalPending} pending
              </span>
              {reviewed > 0 && (
                <span className="flex items-center gap-1.5 text-primary">
                  <Check className="h-3.5 w-3.5" />
                  {reviewed} reviewed
                </span>
              )}
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-xl p-2 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
              aria-label="Toggle theme"
            >
              {mounted ? (
                theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="review-shell relative z-10 mx-auto max-w-7xl px-4 pb-24 lg:px-6">
        {/* ─── Channel ticker ─── */}
        <section className="review-ticker-wrap">
          <div className="review-ticker-head">
            <h2 className="font-heading text-2xl text-foreground">
              Awaiting your verdict
            </h2>
            <p className="font-body text-sm text-muted-foreground">
              Pick a channel. Approve, reject, repeat.
            </p>
          </div>

          {loadingChannels ? (
            <div className="review-ticker-skeleton">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="channel-chip-skeleton" />
              ))}
            </div>
          ) : channels.length === 0 ? (
            <EmptyAllReviewed />
          ) : (
            <ChannelTicker
              channels={channels}
              selectedId={selectedChannelId}
              onSelect={setSelectedChannelId}
            />
          )}
        </section>

        {/* ─── Selected channel: video board ─── */}
        {selectedChannel && (
          <section className="review-board-wrap">
            <SelectedChannelHeader channel={selectedChannel} />

            <SortToolbar
              field={sortField}
              dir={sortDir}
              onFieldChange={setSortField}
              onDirChange={setSortDir}
              count={pendingVideos.length}
            />

            {loadingVideos ? (
              <div className="review-loading">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                <p className="font-body mt-3 text-sm text-muted-foreground">
                  Loading queue...
                </p>
              </div>
            ) : pendingVideos.length === 0 ? (
              <EmptyChannelInbox channel={selectedChannel} />
            ) : (
              <div className="review-grid">
                {pendingVideos.map((video, i) => (
                  <VideoReviewCard
                    key={video.youtube_id}
                    video={video}
                    index={i}
                    onApprove={() => decideVideo(video, "approved")}
                    onReject={() => decideVideo(video, "rejected")}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ─── Floating action dock ─── */}
      {undoStack.length > 0 && (
        <div className="review-dock">
          <button
            onClick={undoLast}
            className="review-dock-btn"
            title="Undo last decision"
          >
            <Undo2 className="h-3.5 w-3.5" />
            <span>Undo</span>
          </button>
          <span className="review-dock-stat">
            <Sparkles className="h-3.5 w-3.5" />
            {reviewed} this session
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ChannelTicker({
  channels,
  selectedId,
  onSelect,
}: {
  channels: ChannelOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="channel-ticker" role="tablist">
      {channels.map((c, i) => {
        const active = c.youtube_id === selectedId;
        const cleared = c.pending_count === 0;
        return (
          <button
            key={c.youtube_id}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(c.youtube_id)}
            className={`channel-chip channel-chip-accent-${i % 6} ${active ? "channel-chip-active" : ""} ${cleared ? "channel-chip-cleared" : ""}`}
            title={`${c.title} — ${c.pending_count} pending`}
          >
            <span className="channel-chip-avatar">
              {avatarUrl(c.avatar_path) ? (
                <img
                  src={avatarUrl(c.avatar_path)!}
                  alt={c.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-base font-bold">
                  {c.title.charAt(0)}
                </span>
              )}
            </span>
            <span className="channel-chip-body">
              <span className="channel-chip-name">{c.title}</span>
              <span className="channel-chip-meta">
                {c.sync_mode === "review" ? (
                  <>
                    <ClipboardCheck className="h-3 w-3" />
                    review
                  </>
                ) : (
                  <span className="opacity-60">{c.sync_mode}</span>
                )}
              </span>
            </span>
            <span
              className={`channel-chip-badge ${cleared ? "channel-chip-badge-cleared" : ""}`}
            >
              {cleared ? <Check className="h-3 w-3" /> : c.pending_count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SelectedChannelHeader({ channel }: { channel: ChannelOption }) {
  return (
    <div className="selected-channel">
      <div className="selected-channel-avatar">
        {avatarUrl(channel.avatar_path) ? (
          <img
            src={avatarUrl(channel.avatar_path)!}
            alt={channel.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl font-bold">
            {channel.title.charAt(0)}
          </span>
        )}
      </div>
      <div className="selected-channel-info">
        <h3 className="font-heading text-3xl leading-tight text-foreground">
          {channel.title}
        </h3>
        <div className="selected-channel-meta">
          <span
            className={`mode-badge mode-badge-${channel.sync_mode}`}
            title="Channel sync mode"
          >
            {channel.sync_mode === "review" && <ClipboardCheck className="h-3.5 w-3.5" />}
            {channel.sync_mode}
          </span>
          {channel.custom_url && (
            <a
              href={`https://www.youtube.com/${channel.custom_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="selected-channel-link"
            >
              <ExternalLink className="h-3 w-3" />
              {channel.custom_url}
            </a>
          )}
        </div>
      </div>
      <div className="selected-channel-counter">
        <span className="selected-channel-counter-num">
          {channel.pending_count}
        </span>
        <span className="selected-channel-counter-label">pending</span>
      </div>
    </div>
  );
}

function SortToolbar({
  field,
  dir,
  onFieldChange,
  onDirChange,
  count,
}: {
  field: SortField;
  dir: SortDir;
  onFieldChange: (f: SortField) => void;
  onDirChange: (d: SortDir) => void;
  count: number;
}) {
  const fields: Array<{
    key: SortField;
    label: string;
    icon: React.ReactNode;
    title: string;
  }> = [
    {
      key: "score",
      label: "Score",
      icon: <Trophy className="h-3 w-3" />,
      title: "Sort by ESE score (likes/comments/freshness)",
    },
    {
      key: "published_at",
      label: "Published",
      icon: <Calendar className="h-3 w-3" />,
      title: "Sort by original YouTube publish date",
    },
    {
      key: "discovered_at",
      label: "Found",
      icon: <Sprout className="h-3 w-3" />,
      title: "Sort by when sync first discovered the video",
    },
    {
      key: "view_count",
      label: "Views",
      icon: <Eye className="h-3 w-3" />,
      title: "Sort by view count",
    },
    {
      key: "like_count",
      label: "Likes",
      icon: <ThumbsUp className="h-3 w-3" />,
      title: "Sort by like count",
    },
    {
      key: "comment_count",
      label: "Comments",
      icon: <MessageSquare className="h-3 w-3" />,
      title: "Sort by comment count",
    },
  ];
  // Direction labels are field-aware so the meaning is obvious at a glance.
  const dirCopy: Record<SortField, { desc: string; asc: string }> = {
    score: { desc: "best first", asc: "worst first" },
    published_at: { desc: "newest first", asc: "oldest first" },
    discovered_at: { desc: "newest first", asc: "oldest first" },
    view_count: { desc: "most first", asc: "least first" },
    like_count: { desc: "most first", asc: "least first" },
    comment_count: { desc: "most first", asc: "least first" },
  };
  return (
    <div className="font-body mb-4 flex flex-wrap items-center gap-2.5 rounded-full border border-border bg-card/70 px-3.5 py-2.5">
      <div
        role="tablist"
        aria-label="Sort by"
        className="inline-flex items-center gap-1"
      >
        <span className="mr-0.5 border-r border-foreground/15 pr-1.5 text-[10px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">
          Sort
        </span>
        {fields.map((f) => {
          const active = field === f.key;
          return (
            <button
              key={f.key}
              role="tab"
              aria-selected={active}
              onClick={() => onFieldChange(f.key)}
              title={f.title}
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold leading-none transition-colors",
                active
                  ? "bg-card text-foreground ring-2 ring-[color-mix(in_srgb,var(--peach)_28%,transparent)]"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
              ].join(" ")}
            >
              {f.icon}
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onDirChange(dir === "desc" ? "asc" : "desc")}
        title={`Switch to ${dir === "desc" ? "ascending" : "descending"}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold leading-none text-foreground transition-colors hover:border-[color-mix(in_srgb,var(--peach)_45%,var(--border))] hover:bg-[color-mix(in_srgb,var(--peach)_10%,var(--card))] active:scale-[0.97]"
      >
        {dir === "desc" ? (
          <ArrowDownWideNarrow className="h-3.5 w-3.5 text-[var(--peach)]" />
        ) : (
          <ArrowUpNarrowWide className="h-3.5 w-3.5 text-[var(--peach)]" />
        )}
        <span>{dirCopy[field][dir]}</span>
      </button>

      <span className="ml-auto pl-2 text-[11px] font-bold tabular-nums text-muted-foreground">
        {count} {count === 1 ? "video" : "videos"}
      </span>
    </div>
  );
}

function VideoReviewCard({
  video,
  index,
  onApprove,
  onReject,
}: {
  video: PendingVideo;
  index: number;
  onApprove: () => void;
  onReject: () => void;
}) {
  const tier = scoreTier(video.score);

  return (
    <article
      className={`video-card video-card-tier-${tier}`}
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      <div className="video-card-thumb">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <span className="video-card-duration">
          <Clock className="h-3 w-3" />
          {formatDuration(video.duration_seconds)}
        </span>
        <span className={`video-card-score video-card-score-${tier}`}>
          {tier === "fire" && <Flame className="h-3 w-3" />}
          <span>{(Number(video.score ?? 0) * 100).toFixed(0)}</span>
        </span>
        <a
          href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="video-card-watch"
          title="Watch on YouTube"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Watch
        </a>
      </div>

      <div className="video-card-body">
        <h4 className="video-card-title">{video.title}</h4>
        <div className="video-card-stats">
          <span title="Views">
            <Eye className="h-3 w-3" />
            {formatCount(video.view_count)}
          </span>
          <span title="Likes">
            <ThumbsUp className="h-3 w-3" />
            {formatCount(video.like_count)}
          </span>
          <span title="Comments">
            <MessageSquare className="h-3 w-3" />
            {formatCount(video.comment_count)}
          </span>
          <span title="Published">
            <Calendar className="h-3 w-3" />
            {formatRelative(video.published_at)}
          </span>
        </div>
      </div>

      <div className="video-card-decision">
        <button
          onClick={onReject}
          className="decide-btn decide-btn-reject"
          title="Reject (N)"
        >
          <X className="h-4 w-4" />
          <span>Reject</span>
        </button>
        <button
          onClick={onApprove}
          className="decide-btn decide-btn-approve"
          title="Approve (Y)"
        >
          <Check className="h-4 w-4" />
          <span>Approve</span>
        </button>
      </div>
    </article>
  );
}

function EmptyAllReviewed() {
  return (
    <div className="review-empty review-empty-all">
      <div className="review-empty-icon">
        <Sparkles className="h-8 w-8" />
      </div>
      <h3 className="font-heading text-2xl text-foreground">Inbox zero!</h3>
      <p className="font-body mt-1.5 max-w-md text-sm text-muted-foreground">
        Nothing to review. Flip a channel to{" "}
        <span className="font-semibold text-foreground">review</span> mode in the{" "}
        <Link href="/admin" className="text-primary underline-offset-4 hover:underline">
          admin panel
        </Link>{" "}
        and the next sync will fill this queue.
      </p>
    </div>
  );
}

function EmptyChannelInbox({ channel }: { channel: ChannelOption }) {
  return (
    <div className="review-empty review-empty-channel">
      <div className="review-empty-icon">
        <Check className="h-8 w-8" />
      </div>
      <h3 className="font-heading text-2xl text-foreground">All clear here</h3>
      <p className="font-body mt-1.5 max-w-md text-sm text-muted-foreground">
        Nothing pending in{" "}
        <span className="font-semibold text-foreground">{channel.title}</span>.
        {channel.sync_mode === "review"
          ? " New uploads will land in this queue after the next sync run."
          : " Switch this channel to review mode if you want incoming videos to wait for approval."}
      </p>
    </div>
  );
}

