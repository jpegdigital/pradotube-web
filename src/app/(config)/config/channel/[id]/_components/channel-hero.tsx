"use client";

import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { StarRating } from "@/components/ui/star-rating";
import { createClient } from "@/lib/supabase/browser";
import { AvatarButton } from "../../../creator/[slug]/_components/avatar-button";
import type {
  ChannelDetailRow,
  ChannelParentCreator,
} from "../_lib/get-channel-detail";

interface ChannelHeroProps {
  channel: ChannelDetailRow;
  creator: ChannelParentCreator | null;
}

function formatCount(n: number | null | undefined): string {
  const num = Number(n ?? 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

export function ChannelHero({ channel, creator }: ChannelHeroProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [priority, setPriority] = useState(channel.priority);

  async function handlePriority(next: number) {
    setPriority(next);
    const supabase = createClient();
    const { error } = await supabase
      .from("channels")
      .update({ priority: next })
      .eq("youtube_id", channel.youtube_id);
    if (error) {
      toast.error("Couldn't save rating");
      return;
    }
    startTransition(() => router.refresh());
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
      router.push(creator ? `/config/creator/${creator.slug}` : "/config");
    } finally {
      setPending(false);
    }
  }

  const subs = formatCount(channel.subscriber_count);
  const totalVids = formatCount(channel.video_count);
  const youtubeUrl = channel.custom_url
    ? `https://www.youtube.com/${channel.custom_url}`
    : `https://www.youtube.com/channel/${channel.youtube_id}`;

  return (
    <header className="config-channel-hero">
      <div className="config-channel-hero-breadcrumb font-body">
        {creator ? (
          <Link
            href={`/config/creator/${creator.slug}`}
            className="config-channel-hero-back"
          >
            <span aria-hidden>←</span>
            <span>{creator.name}</span>
          </Link>
        ) : (
          <Link href="/config/ungrouped" className="config-channel-hero-back">
            <span aria-hidden>←</span>
            <span>Ungrouped</span>
          </Link>
        )}
        <span aria-hidden className="config-channel-hero-sep">
          /
        </span>
        <span className="config-channel-hero-crumb">Channel</span>
      </div>

      <div className="config-channel-hero-row">
        <AvatarButton
          kind="channel"
          id={channel.youtube_id}
          avatarPath={channel.avatar_path}
          fallbackUrl={channel.thumbnail_url}
          fallbackInitial={channel.title.charAt(0).toUpperCase()}
          size="lg"
          onUploaded={() => startTransition(() => router.refresh())}
        />

        <div className="config-channel-hero-body">
          <span className="config-channel-hero-eyebrow font-body">Channel</span>
          <h1 className="config-channel-hero-title font-heading">
            {channel.title}
          </h1>
          <div className="config-channel-hero-meta font-body">
            {channel.custom_url && (
              <code className="config-channel-hero-handle">
                {channel.custom_url}
              </code>
            )}
            {channel.custom_url && <span aria-hidden>·</span>}
            <span>{subs} subs</span>
            <span aria-hidden>·</span>
            <span>{totalVids} on YouTube</span>
            <span aria-hidden>·</span>
            <span className="config-channel-hero-meta-strong">
              {channel.uploaded} on R2
            </span>
          </div>
        </div>

        <div className="config-channel-hero-aside">
          <div className="config-channel-hero-rating">
            <span className="config-control-hint font-body">Channel rating</span>
            <StarRating value={priority} onChange={handlePriority} size={22} />
          </div>
          <div className="config-channel-hero-actions">
            <a
              href={youtubeUrl}
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
      </div>
    </header>
  );
}
