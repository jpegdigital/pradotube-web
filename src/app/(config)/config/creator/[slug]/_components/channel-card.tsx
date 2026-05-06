"use client";

import {
  Archive,
  ChevronRight,
  ClipboardCheck,
  CloudCog,
  ExternalLink,
  Loader2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { StarRating } from "@/components/ui/star-rating";
import { avatarUrl } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";
import type {
  CreatorDetailChannel,
  OtherCreatorOption,
} from "../_lib/get-creator-detail";
import { MoveToGroup } from "./move-to-group";

type ChannelPatch = Database["pradotube"]["Tables"]["channels"]["Update"];

const SYNC_MODES = [
  {
    key: "sync" as const,
    label: "Sync",
    icon: <CloudCog className="h-3.5 w-3.5" />,
    title: "Sync — rolling window, auto-downloads new uploads",
  },
  {
    key: "archive" as const,
    label: "Archive",
    icon: <Archive className="h-3.5 w-3.5" />,
    title: "Archive — keeps every video permanently",
  },
  {
    key: "review" as const,
    label: "Review",
    icon: <ClipboardCheck className="h-3.5 w-3.5" />,
    title: "Review — every new video waits for human approval",
  },
];

function formatCount(n: number | null | undefined): string {
  const num = Number(n ?? 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

interface ChannelCardProps {
  channel: CreatorDetailChannel;
  currentCreatorId: string | null;
  currentCreatorName: string;
  otherCreators: OtherCreatorOption[];
  pendingCount?: number;
}

export function ChannelCard({
  channel,
  currentCreatorId,
  currentCreatorName,
  otherCreators,
  pendingCount = 0,
}: ChannelCardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

  const [priority, setPriority] = useState(channel.priority);
  const [syncMode, setSyncMode] = useState(channel.sync_mode);

  async function update(
    patch: ChannelPatch,
    successMsg?: string
  ): Promise<boolean> {
    setPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("channels")
        .update(patch)
        .eq("youtube_id", channel.youtube_id);
      if (error) {
        toast.error("Couldn't save change");
        return false;
      }
      if (successMsg) toast.success(successMsg);
      startTransition(() => router.refresh());
      return true;
    } finally {
      setPending(false);
    }
  }

  function handlePriority(next: number) {
    setPriority(next);
    void update({ priority: next });
  }

  async function handleSyncMode(next: "sync" | "archive" | "review") {
    if (next === syncMode) return;
    const previous = syncMode;
    setSyncMode(next);

    const supabase = createClient();
    const { error } = await supabase
      .from("channels")
      .update({ sync_mode: next })
      .eq("youtube_id", channel.youtube_id);
    if (error) {
      setSyncMode(previous);
      toast.error("Couldn't change sync mode");
      return;
    }

    if (next === "review") {
      const { data: demoted } = await supabase
        .from("videos")
        .update({ decision: "pending" })
        .eq("channel_id", channel.youtube_id)
        .eq("decision", "auto")
        .is("r2_synced_at", null)
        .select("youtube_id");
      const count = demoted?.length ?? 0;
      toast.success(
        count > 0
          ? `Review mode — ${count} video${count === 1 ? "" : "s"} sent to review`
          : "Sync mode: review"
      );
    } else {
      toast.success(`Sync mode: ${next}`);
    }
    startTransition(() => router.refresh());
  }

  async function handleMove(nextCreatorId: string | null) {
    setPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("channels")
        .update({ creator_id: nextCreatorId })
        .eq("youtube_id", channel.youtube_id);
      if (error) {
        toast.error("Couldn't move channel");
        return;
      }
      if (nextCreatorId && channel.avatar_path) {
        await supabase
          .from("creators")
          .update({ avatar_path: channel.avatar_path })
          .eq("id", nextCreatorId)
          .is("avatar_path", null);
      }
      toast.success(
        nextCreatorId
          ? `Moved "${channel.title}"`
          : `"${channel.title}" is now Ungrouped`
      );
      startTransition(() => router.refresh());
    } finally {
      setPending(false);
    }
  }

  async function handleRemove() {
    if (
      !window.confirm(
        `Remove "${channel.title}" from your library?\n\nVideos and downloads stay on R2.`
      )
    ) {
      return;
    }
    setPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("channels")
        .delete()
        .eq("youtube_id", channel.youtube_id);
      if (error) {
        toast.error("Couldn't remove channel");
        return;
      }
      toast.success("Channel removed");
      startTransition(() => router.refresh());
    } finally {
      setPending(false);
    }
  }

  const subscribers = formatCount(channel.subscriber_count);
  const totalVids = formatCount(channel.video_count);
  const channelHref = `/config/channel/${channel.youtube_id}`;
  const avatarSrc = avatarUrl(channel.avatar_path) ?? channel.thumbnail_url;

  return (
    <article className="config-channel-tile" aria-busy={pending || undefined}>
      <Link
        href={channelHref}
        className="config-channel-tile-link"
        aria-label={`Open ${channel.title}`}
      >
        <span className="config-channel-tile-avatar">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt=""
              loading="lazy"
              className="config-channel-tile-avatar-img"
            />
          ) : (
            <span className="config-channel-tile-avatar-fallback">
              {channel.title.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        <span className="config-channel-tile-info">
          <span className="config-channel-tile-title">{channel.title}</span>
          <span className="config-channel-tile-meta">
            {channel.custom_url && <span>{channel.custom_url}</span>}
            {channel.custom_url && <span aria-hidden>·</span>}
            <span>{subscribers} subs</span>
            <span aria-hidden>·</span>
            <span>{totalVids} videos</span>
            <span aria-hidden>·</span>
            <span
              className={
                channel.uploaded > 0
                  ? "config-channel-tile-meta-strong"
                  : undefined
              }
            >
              {channel.uploaded}/{totalVids} on R2
            </span>
            {pendingCount > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="config-channel-tile-pending">
                  {pendingCount} pending
                </span>
              </>
            )}
          </span>
        </span>
        <span className="config-channel-tile-chevron" aria-hidden>
          <ChevronRight className="h-4 w-4" />
        </span>
      </Link>

      <div className="config-channel-tile-controls">
        <span
          className="config-channel-tile-rating"
          title="Channel rating"
          aria-label="Channel rating"
        >
          <StarRating value={priority} onChange={handlePriority} size={20} />
        </span>

        <div role="tablist" className="config-pill-row config-pill-row-compact">
          {SYNC_MODES.map((mode) => (
            <button
              key={mode.key}
              role="tab"
              type="button"
              aria-selected={syncMode === mode.key}
              onClick={() => handleSyncMode(mode.key)}
              className={`config-pill config-pill-mode config-pill-mode-${mode.key}`}
              data-active={syncMode === mode.key || undefined}
              title={mode.title}
            >
              {mode.icon}
              <span>{mode.label}</span>
            </button>
          ))}
        </div>

        <div className="config-channel-tile-actions">
          <MoveToGroup
            channelTitle={channel.title}
            currentCreatorId={currentCreatorId}
            currentCreatorName={currentCreatorName}
            otherCreators={otherCreators}
            onMove={handleMove}
          />
          <a
            href={
              channel.custom_url
                ? `https://www.youtube.com/${channel.custom_url}`
                : `https://www.youtube.com/channel/${channel.youtube_id}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="config-action-btn"
            title="Open on YouTube"
            aria-label="Open on YouTube"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={handleRemove}
            className="config-action-btn config-action-btn-danger"
            disabled={pending}
            title="Remove channel"
            aria-label="Remove channel"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
