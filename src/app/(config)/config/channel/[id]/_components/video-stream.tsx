"use client";

import {
  Archive,
  Calendar,
  Check,
  CheckCircle2,
  CircleDashed,
  Clock,
  CloudOff,
  Eye,
  ExternalLink,
  Filter,
  Flame,
  HardDrive,
  HardDriveDownload,
  Inbox,
  Library,
  Loader2,
  MessageSquare,
  RotateCcw,
  Ruler,
  Sparkles,
  ThumbsUp,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { useCurrentUser } from "@/lib/auth/current-user-store";
import type {
  ChannelDetailVideo,
  ChannelVideoStats,
} from "../_lib/get-channel-detail";
import { VIDEOS_PAGE_SIZE } from "../_lib/constants";

type DecisionFilter = "all" | "pending" | "auto" | "approved" | "rejected";
type R2Filter = "any" | "on" | "off";
type LengthFilter = "eligible" | "all";
type Decision = "approved" | "rejected" | "pending" | "auto";

interface VideoStreamProps {
  channelId: string;
  syncMode: string;
  minDuration: number;
  maxDuration: number;
  initialVideos: ChannelDetailVideo[];
  initialHasMore: boolean;
  statsEligible: ChannelVideoStats;
  statsAll: ChannelVideoStats;
}

const VIDEO_FIELDS =
  "youtube_id, channel_id, title, thumbnail_url, published_at, discovered_at, duration_seconds, view_count, like_count, comment_count, score, decision, decided_at, r2_synced_at, is_downloaded, storage_bytes, sync_tier";

function formatCount(n: number | null | undefined): string {
  const num = Number(n ?? 0);
  if (!Number.isFinite(num)) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

function formatDuration(seconds: number | null | undefined): string {
  const s = Number(seconds ?? 0);
  if (!Number.isFinite(s) || s <= 0) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatMinutes(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h${rem}m`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "no date";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "no date";
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}

function formatBytes(bytes: number | null | undefined): string {
  const b = Number(bytes ?? 0);
  if (!Number.isFinite(b) || b <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = b;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(size >= 100 ? 0 : 1)}${units[i]}`;
}

function decisionLabel(d: string): string {
  switch (d) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "auto":
      return "Auto";
    case "pending":
      return "Pending";
    default:
      return d;
  }
}

export function VideoStream({
  channelId,
  syncMode,
  minDuration,
  maxDuration,
  initialVideos,
  initialHasMore,
  statsEligible,
  statsAll,
}: VideoStreamProps) {
  const currentUser = useCurrentUser();

  const [lengthFilter, setLengthFilter] = useState<LengthFilter>("eligible");
  const activeStats = lengthFilter === "eligible" ? statsEligible : statsAll;

  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>(
    syncMode === "review" && statsEligible.pending > 0 ? "pending" : "all"
  );
  const [r2Filter, setR2Filter] = useState<R2Filter>("any");
  const [videos, setVideos] = useState<ChannelDetailVideo[]>(initialVideos);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refetching, setRefetching] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  // Skip the first refetch — initial render already has server data.
  const initializedRef = useRef(false);

  const filterCounts: Record<DecisionFilter, number> = {
    all: activeStats.total,
    pending: activeStats.pending,
    auto: activeStats.auto,
    approved: activeStats.approved,
    rejected: activeStats.rejected,
  };

  const fetchPage = useCallback(
    async (
      offset: number,
      d: DecisionFilter,
      r: R2Filter,
      l: LengthFilter
    ): Promise<{ rows: ChannelDetailVideo[]; more: boolean }> => {
      const supabase = createClient();
      let q = supabase
        .from("videos")
        .select(VIDEO_FIELDS)
        .eq("channel_id", channelId);

      if (d !== "all") q = q.eq("decision", d);
      if (r === "on") q = q.not("r2_synced_at", "is", null);
      else if (r === "off") q = q.is("r2_synced_at", null);
      if (l === "eligible") {
        q = q.gte("duration_seconds", minDuration).lte(
          "duration_seconds",
          maxDuration
        );
      }

      const { data, error } = await q
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("discovered_at", { ascending: false })
        .range(offset, offset + VIDEOS_PAGE_SIZE);

      if (error) throw error;
      const rows = (data ?? []) as ChannelDetailVideo[];
      const more = rows.length > VIDEOS_PAGE_SIZE;
      return { rows: more ? rows.slice(0, VIDEOS_PAGE_SIZE) : rows, more };
    },
    [channelId, minDuration, maxDuration]
  );

  // Refetch when any filter changes (skip initial mount).
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    let cancelled = false;
    setRefetching(true);
    (async () => {
      try {
        const { rows, more } = await fetchPage(
          0,
          decisionFilter,
          r2Filter,
          lengthFilter
        );
        if (cancelled) return;
        setVideos(rows);
        setHasMore(more);
      } catch {
        if (!cancelled) toast.error("Couldn't load videos");
      } finally {
        if (!cancelled) setRefetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [decisionFilter, r2Filter, lengthFilter, fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || refetching || !hasMore) return;
    setLoadingMore(true);
    try {
      const { rows, more } = await fetchPage(
        videos.length,
        decisionFilter,
        r2Filter,
        lengthFilter
      );
      const existing = new Set(videos.map((v) => v.youtube_id));
      const fresh = rows.filter((r) => !existing.has(r.youtube_id));
      setVideos((cur) => [...cur, ...fresh]);
      setHasMore(more);
    } catch {
      toast.error("Couldn't load more");
    } finally {
      setLoadingMore(false);
    }
  }, [
    videos,
    decisionFilter,
    r2Filter,
    lengthFilter,
    fetchPage,
    hasMore,
    loadingMore,
    refetching,
  ]);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) void loadMore();
        },
        { rootMargin: "600px" }
      );
      observer.observe(node);
      return () => observer.disconnect();
    },
    [loadMore]
  );

  async function decide(video: ChannelDetailVideo, next: Decision) {
    if (video.decision === next) return;
    const previous = video.decision;
    setBusy((b) => ({ ...b, [video.youtube_id]: true }));

    setVideos((cur) =>
      cur
        .map((v) =>
          v.youtube_id === video.youtube_id
            ? { ...v, decision: next, decided_at: new Date().toISOString() }
            : v
        )
        .filter((v) =>
          decisionFilter === "all" ? true : v.decision === decisionFilter
        )
    );

    try {
      const supabase = createClient();
      const update =
        next === "pending"
          ? { decision: next, decided_at: null, decided_by: null }
          : {
              decision: next,
              decided_at: new Date().toISOString(),
              decided_by: currentUser?.id ?? null,
            };
      const { error } = await supabase
        .from("videos")
        .update(update)
        .eq("youtube_id", video.youtube_id);
      if (error) throw error;
      toast.success(`${decisionLabel(next)} · ${truncate(video.title, 36)}`);
    } catch {
      setVideos((cur) => {
        const exists = cur.some((v) => v.youtube_id === video.youtube_id);
        if (exists) {
          return cur.map((v) =>
            v.youtube_id === video.youtube_id
              ? { ...v, decision: previous, decided_at: video.decided_at }
              : v
          );
        }
        return [...cur, { ...video, decision: previous }].sort(
          (a, b) =>
            new Date(b.published_at ?? b.discovered_at).getTime() -
            new Date(a.published_at ?? a.discovered_at).getTime()
        );
      });
      toast.error("Couldn't save decision");
    } finally {
      setBusy((b) => {
        const next = { ...b };
        delete next[video.youtube_id];
        return next;
      });
    }
  }

  const filteredCount = statsAll.total - statsEligible.total;

  return (
    <section className="video-stream">
      <ChannelStatsStrip
        stats={activeStats}
        scope={lengthFilter}
        minDuration={minDuration}
        maxDuration={maxDuration}
        filteredCount={filteredCount}
      />

      <VideoStreamToolbar
        decisionFilter={decisionFilter}
        onDecisionChange={setDecisionFilter}
        r2Filter={r2Filter}
        onR2Change={setR2Filter}
        lengthFilter={lengthFilter}
        onLengthChange={setLengthFilter}
        counts={filterCounts}
        onR2={activeStats.onR2}
        total={activeStats.total}
        eligibleTotal={statsEligible.total}
        allTotal={statsAll.total}
        loading={refetching}
        visible={videos.length}
      />

      {refetching && videos.length === 0 ? (
        <div className="video-stream-loading">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="font-body">Loading videos…</span>
        </div>
      ) : videos.length === 0 ? (
        <EmptyState filter={decisionFilter} r2={r2Filter} length={lengthFilter} />
      ) : (
        <ol className="video-stream-list">
          {videos.map((v, i) => (
            <VideoRow
              key={v.youtube_id}
              video={v}
              index={i}
              busy={!!busy[v.youtube_id]}
              syncMode={syncMode}
              minDuration={minDuration}
              maxDuration={maxDuration}
              onDecide={(d) => decide(v, d)}
            />
          ))}
        </ol>
      )}

      {hasMore && videos.length > 0 && (
        <div ref={sentinelRef} className="video-stream-sentinel" aria-hidden>
          {loadingMore ? (
            <span className="video-stream-loading-inline font-body">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more…
            </span>
          ) : null}
        </div>
      )}

      {!hasMore && videos.length > 0 && (
        <p className="video-stream-end font-body">
          End of channel · {videos.length} shown
        </p>
      )}
    </section>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function ChannelStatsStrip({
  stats,
  scope,
  minDuration,
  maxDuration,
  filteredCount,
}: {
  stats: ChannelVideoStats;
  scope: LengthFilter;
  minDuration: number;
  maxDuration: number;
  filteredCount: number;
}) {
  return (
    <div className="channel-stats-strip font-body">
      <span
        className="channel-stat-scope"
        title={
          scope === "eligible"
            ? `Counts reflect videos in the channel's eligible window (${formatMinutes(minDuration)}–${formatMinutes(maxDuration)}). Toggle to "All" in the toolbar to include filtered videos.`
            : "Counts reflect every video for this channel."
        }
      >
        <Ruler className="h-3 w-3" />
        {scope === "eligible" ? "Eligible" : "All"} ·{" "}
        <span className="channel-stat-scope-num">{stats.total}</span>
      </span>
      <span className="channel-stat channel-stat-r2">
        <span className="channel-stat-num">{stats.onR2}</span>
        <span className="channel-stat-label">on R2</span>
      </span>
      {stats.pending > 0 && (
        <span className="channel-stat channel-stat-pending">
          <span className="channel-stat-num">{stats.pending}</span>
          <span className="channel-stat-label">pending</span>
        </span>
      )}
      <span className="channel-stat channel-stat-approved">
        <span className="channel-stat-num">
          {stats.approved + stats.auto}
        </span>
        <span className="channel-stat-label">approved</span>
      </span>
      {stats.rejected > 0 && (
        <span className="channel-stat channel-stat-rejected">
          <span className="channel-stat-num">{stats.rejected}</span>
          <span className="channel-stat-label">rejected</span>
        </span>
      )}
      {scope === "eligible" && filteredCount > 0 && (
        <span className="channel-stat-filtered" title="Videos outside the eligible duration window">
          + {filteredCount} filtered
        </span>
      )}
    </div>
  );
}

interface VideoStreamToolbarProps {
  decisionFilter: DecisionFilter;
  onDecisionChange: (d: DecisionFilter) => void;
  r2Filter: R2Filter;
  onR2Change: (r: R2Filter) => void;
  lengthFilter: LengthFilter;
  onLengthChange: (l: LengthFilter) => void;
  counts: Record<DecisionFilter, number>;
  onR2: number;
  total: number;
  eligibleTotal: number;
  allTotal: number;
  loading: boolean;
  visible: number;
}

function VideoStreamToolbar({
  decisionFilter,
  onDecisionChange,
  r2Filter,
  onR2Change,
  lengthFilter,
  onLengthChange,
  counts,
  onR2,
  total,
  eligibleTotal,
  allTotal,
  loading,
  visible,
}: VideoStreamToolbarProps) {
  const decisionFilters: Array<{
    key: DecisionFilter;
    label: string;
    icon: React.ReactNode;
  }> = [
    { key: "all", label: "All", icon: <Inbox className="h-3 w-3" /> },
    {
      key: "pending",
      label: "Pending",
      icon: <CircleDashed className="h-3 w-3" />,
    },
    { key: "auto", label: "Auto", icon: <CheckCircle2 className="h-3 w-3" /> },
    { key: "approved", label: "Approved", icon: <Check className="h-3 w-3" /> },
    { key: "rejected", label: "Rejected", icon: <X className="h-3 w-3" /> },
  ];

  const r2Filters: Array<{
    key: R2Filter;
    label: string;
    icon: React.ReactNode;
  }> = [
    { key: "any", label: `R2 · all (${total})`, icon: <HardDriveDownload className="h-3 w-3" /> },
    { key: "on", label: `On R2 · ${onR2}`, icon: <HardDriveDownload className="h-3 w-3" /> },
    {
      key: "off",
      label: `Off R2 · ${total - onR2}`,
      icon: <CloudOff className="h-3 w-3" />,
    },
  ];

  const lengthFilters: Array<{
    key: LengthFilter;
    label: string;
    icon: React.ReactNode;
    title: string;
  }> = [
    {
      key: "eligible",
      label: `Eligible · ${eligibleTotal}`,
      icon: <Filter className="h-3 w-3" />,
      title: "Only videos within the channel's min/max duration window — what should be on R2.",
    },
    {
      key: "all",
      label: `All · ${allTotal}`,
      icon: <Ruler className="h-3 w-3" />,
      title: "Include videos outside the duration window for debugging.",
    },
  ];

  return (
    <div className="video-stream-toolbar">
      <div className="video-stream-toolbar-section">
        <span className="video-stream-toolbar-label font-body">Decision</span>
        <div role="tablist" className="video-stream-pill-row">
          {decisionFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={decisionFilter === f.key}
              onClick={() => onDecisionChange(f.key)}
              className={`video-stream-pill video-stream-pill-${f.key}`}
              data-active={decisionFilter === f.key || undefined}
            >
              {f.icon}
              <span>{f.label}</span>
              <span className="video-stream-pill-count">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="video-stream-toolbar-section">
        <span className="video-stream-toolbar-label font-body">Storage</span>
        <div role="tablist" className="video-stream-pill-row">
          {r2Filters.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={r2Filter === f.key}
              onClick={() => onR2Change(f.key)}
              className={`video-stream-pill video-stream-pill-r2-${f.key}`}
              data-active={r2Filter === f.key || undefined}
            >
              {f.icon}
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="video-stream-toolbar-section">
        <span className="video-stream-toolbar-label font-body">Length</span>
        <div role="tablist" className="video-stream-pill-row">
          {lengthFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={lengthFilter === f.key}
              onClick={() => onLengthChange(f.key)}
              className={`video-stream-pill video-stream-pill-length-${f.key}`}
              data-active={lengthFilter === f.key || undefined}
              title={f.title}
            >
              {f.icon}
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      <span className="video-stream-toolbar-status font-body">
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Filtering…
          </>
        ) : (
          <>
            <span className="video-stream-toolbar-status-num">{visible}</span>
            <span>shown</span>
          </>
        )}
      </span>
    </div>
  );
}

interface VideoRowProps {
  video: ChannelDetailVideo;
  index: number;
  busy: boolean;
  syncMode: string;
  minDuration: number;
  maxDuration: number;
  onDecide: (d: Decision) => void;
}

function VideoRow({
  video,
  index,
  busy,
  syncMode,
  minDuration,
  maxDuration,
  onDecide,
}: VideoRowProps) {
  const tier = scoreTier(video.score);
  const onR2 = !!video.r2_synced_at;
  const decision = (video.decision ?? "pending") as Decision;
  const dur = video.duration_seconds;
  const outOfRange =
    dur != null && (dur < minDuration || dur > maxDuration);

  return (
    <li
      className={`video-row video-row-${decision} video-row-tier-${tier}`}
      data-busy={busy || undefined}
      data-out-of-range={outOfRange || undefined}
      style={{ animationDelay: `${Math.min(index, 16) * 22}ms` }}
    >
      <div className="video-row-thumb">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt=""
            loading="lazy"
            className="video-row-thumb-img"
          />
        ) : (
          <div className="video-row-thumb-blank">
            <Inbox className="h-5 w-5" />
          </div>
        )}
        <span
          className={`video-row-thumb-duration${outOfRange ? " video-row-thumb-duration-out" : ""}`}
          title={
            outOfRange
              ? `Outside eligible window (${formatMinutes(minDuration)}–${formatMinutes(maxDuration)})`
              : undefined
          }
        >
          <Clock className="h-3 w-3" />
          {formatDuration(video.duration_seconds)}
        </span>
        {tier === "fire" && (
          <span
            className="video-row-thumb-score"
            title={`Score ${(Number(video.score ?? 0) * 100).toFixed(0)}`}
          >
            <Flame className="h-3 w-3" />
            {(Number(video.score ?? 0) * 100).toFixed(0)}
          </span>
        )}
      </div>

      <div className="video-row-body">
        <h3 className="video-row-title font-heading">{video.title}</h3>
        <div className="video-row-meta font-body">
          <span title="Published">
            <Calendar className="h-3 w-3" />
            {formatDate(video.published_at)}
          </span>
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
          {video.storage_bytes && video.storage_bytes > 0 ? (
            <span
              className="video-row-meta-storage"
              title={onR2 ? "Stored on R2" : "Local storage size"}
            >
              <HardDrive className="h-3 w-3" />
              {formatBytes(video.storage_bytes)}
            </span>
          ) : null}
          <SyncTierBadge tier={video.sync_tier} />
          <a
            href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="video-row-meta-link"
            title="Open on YouTube"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
            YouTube
          </a>
          {outOfRange && (
            <span className="video-row-meta-badge" title="Outside duration window">
              <Filter className="h-3 w-3" />
              filtered
            </span>
          )}
        </div>
      </div>

      <aside className="video-row-rail">
        <span
          className={`video-row-r2 ${onR2 ? "video-row-r2-on" : "video-row-r2-off"}`}
          title={
            onR2
              ? `Synced to R2${video.storage_bytes ? ` · ${formatBytes(video.storage_bytes)}` : ""}`
              : video.is_downloaded
                ? "Downloaded — not yet on R2"
                : "Not downloaded"
          }
        >
          <span className="video-row-r2-dot" aria-hidden />
          {onR2 ? "On R2" : video.is_downloaded ? "Queued" : "Off R2"}
        </span>

        <DecisionControl
          decision={decision}
          syncMode={syncMode}
          busy={busy}
          onDecide={onDecide}
        />
      </aside>
    </li>
  );
}

function scoreTier(score: number | null | undefined): "fire" | "good" | "ok" | "low" {
  const s = Number(score ?? 0);
  if (s >= 0.7) return "fire";
  if (s >= 0.4) return "good";
  if (s >= 0.2) return "ok";
  return "low";
}

function DecisionControl({
  decision,
  syncMode,
  busy,
  onDecide,
}: {
  decision: Decision;
  syncMode: string;
  busy: boolean;
  onDecide: (d: Decision) => void;
}) {
  const isReview = syncMode === "review";

  // "Auto" channels (sync / archive) make decisions without a human in the
  // loop — surface only the badge so the disposition is readable but not
  // clickable.
  if (!isReview) {
    return (
      <div className="video-row-decided">
        <span
          className={`video-row-badge video-row-badge-${decision}`}
          title={`Decision: ${decisionLabel(decision)} · sync mode auto-decides`}
        >
          {decision === "approved" && <Check className="h-3 w-3" />}
          {decision === "auto" && <CheckCircle2 className="h-3 w-3" />}
          {decision === "rejected" && <X className="h-3 w-3" />}
          {decision === "pending" && <CircleDashed className="h-3 w-3" />}
          <span>{decisionLabel(decision)}</span>
        </span>
      </div>
    );
  }

  if (decision === "pending") {
    return (
      <div className="video-row-decide">
        <button
          type="button"
          onClick={() => onDecide("rejected")}
          className="video-row-decide-btn video-row-decide-reject"
          disabled={busy}
          title="Reject"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          <span>Reject</span>
        </button>
        <button
          type="button"
          onClick={() => onDecide("approved")}
          className="video-row-decide-btn video-row-decide-approve"
          disabled={busy}
          title="Approve"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          <span>Approve</span>
        </button>
      </div>
    );
  }

  return (
    <div className="video-row-decided">
      <span
        className={`video-row-badge video-row-badge-${decision}`}
        title={`Decision: ${decisionLabel(decision)}`}
      >
        {decision === "approved" && <Check className="h-3 w-3" />}
        {decision === "auto" && <CheckCircle2 className="h-3 w-3" />}
        {decision === "rejected" && <X className="h-3 w-3" />}
        <span>{decisionLabel(decision)}</span>
      </span>
      <DecideMenu
        decision={decision}
        syncMode={syncMode}
        busy={busy}
        onDecide={onDecide}
      />
    </div>
  );
}

const SYNC_TIER_META: Record<
  "fresh" | "catalog" | "archive",
  { label: string; icon: React.ReactNode; detail: string }
> = {
  fresh: {
    label: "Fresh",
    icon: <Sparkles className="h-3 w-3" />,
    detail: "Fresh upload — pulled from the channel's recent playlist sweep.",
  },
  catalog: {
    label: "Catalog",
    icon: <Library className="h-3 w-3" />,
    detail: "Catalog backfill — pulled from the historical search-based fetch.",
  },
  archive: {
    label: "Archive",
    icon: <Archive className="h-3 w-3" />,
    detail: "Archive tier — kept permanently regardless of rolling window.",
  },
};

function SyncTierBadge({ tier }: { tier: string | null | undefined }) {
  if (!tier) return null;
  const meta = SYNC_TIER_META[tier as keyof typeof SYNC_TIER_META];
  if (!meta) return null;
  return (
    <span
      className={`video-row-source video-row-source-${tier}`}
      title={meta.detail}
    >
      {meta.icon}
      <span>{meta.label}</span>
    </span>
  );
}

function DecideMenu({
  decision,
  syncMode,
  busy,
  onDecide,
}: {
  decision: Decision;
  syncMode: string;
  busy: boolean;
  onDecide: (d: Decision) => void;
}) {
  const actions: Array<{ key: Decision; icon: React.ReactNode; label: string; cls: string }> = [];
  if (decision !== "approved")
    actions.push({
      key: "approved",
      icon: <Check className="h-3 w-3" />,
      label: "Approve",
      cls: "video-row-mini-approve",
    });
  if (decision !== "rejected")
    actions.push({
      key: "rejected",
      icon: <X className="h-3 w-3" />,
      label: "Reject",
      cls: "video-row-mini-reject",
    });
  if (syncMode === "review" && decision !== "pending")
    actions.push({
      key: "pending",
      icon: <RotateCcw className="h-3 w-3" />,
      label: "Reset",
      cls: "video-row-mini-reset",
    });

  return (
    <div className="video-row-mini-actions">
      {actions.map((a) => (
        <button
          key={a.key}
          type="button"
          onClick={() => onDecide(a.key)}
          className={`video-row-mini ${a.cls}`}
          disabled={busy}
          title={a.label}
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : a.icon}
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  );
}

function EmptyState({
  filter,
  r2,
  length,
}: {
  filter: DecisionFilter;
  r2: R2Filter;
  length: LengthFilter;
}) {
  const messages: Record<DecisionFilter, string> = {
    all: "This channel has no videos here.",
    pending: "Nothing waiting on you here.",
    auto: "No auto-approved videos.",
    approved: "Nothing approved yet.",
    rejected: "No rejections — clean slate.",
  };
  const r2Hint =
    r2 === "on"
      ? " (with R2 filter on)"
      : r2 === "off"
        ? " (off-R2 only)"
        : "";
  const lengthHint =
    length === "eligible"
      ? " Switch the Length filter to All to include videos outside the duration window."
      : "";
  return (
    <div className="video-stream-empty">
      <span className="video-stream-empty-icon">
        <Inbox className="h-7 w-7" />
      </span>
      <p className="font-body">
        {messages[filter]}
        {r2Hint}
        {lengthHint}
      </p>
    </div>
  );
}
