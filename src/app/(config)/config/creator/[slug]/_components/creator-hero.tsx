"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { StarRating } from "@/components/ui/star-rating";
import { createClient } from "@/lib/supabase/browser";
import type { CreatorDetailRow } from "../_lib/get-creator-detail";
import { AvatarButton } from "./avatar-button";
import { DeleteDialog } from "./delete-dialog";
import { RenameDialog } from "./rename-dialog";

interface CreatorHeroProps {
  creator: CreatorDetailRow;
  channelCount: number;
  syncedTotal: number;
}

export function CreatorHero({
  creator,
  channelCount,
  syncedTotal,
}: CreatorHeroProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [priority, setPriority] = useState(creator.priority);

  async function handlePriority(next: number) {
    setPriority(next);
    const supabase = createClient();
    const { error } = await supabase
      .from("creators")
      .update({ priority: next })
      .eq("id", creator.id);
    if (error) {
      toast.error("Couldn't save rating");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <header className="config-hero">
      <AvatarButton
        kind="creator"
        id={creator.id}
        avatarPath={creator.avatar_path}
        fallbackInitial={creator.name.charAt(0).toUpperCase()}
        size="lg"
        onUploaded={() => startTransition(() => router.refresh())}
      />

      <div className="config-hero-body">
        <span className="config-hero-eyebrow font-body">Creator</span>
        <div className="config-hero-name-row">
          <h1 className="config-hero-title font-heading">{creator.name}</h1>
          <RenameDialog
            creatorId={creator.id}
            currentName={creator.name}
            currentSlug={creator.slug}
          />
          <DeleteDialog
            creatorId={creator.id}
            creatorName={creator.name}
            channelCount={channelCount}
          />
        </div>
        <div className="config-hero-meta font-body">
          <code className="config-hero-slug">/shows/{creator.slug}</code>
          <span aria-hidden>·</span>
          <span>
            {channelCount} channel{channelCount === 1 ? "" : "s"}
          </span>
          <span aria-hidden>·</span>
          <span>{syncedTotal} synced</span>
        </div>
      </div>

      <div className="config-hero-rating">
        <span className="config-control-hint font-body">Creator rating</span>
        <StarRating value={priority} onChange={handlePriority} size={22} />
      </div>
    </header>
  );
}
