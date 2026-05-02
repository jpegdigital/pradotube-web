"use client";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

import {
  isHLSProvider,
  MediaPlayer,
  type MediaPlayerInstance,
  MediaProvider,
  type MediaProviderAdapter,
  Poster,
  Track,
} from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import Hls from "hls.js";
import { useMemo, useRef } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";
import type { Chapter } from "../_lib/get-video";
import {
  PLAYER_SEEK_EVENT,
  PLAYER_TIME_EVENT,
  type SeekEventDetail,
  type TimeEventDetail,
} from "../_lib/player-events";

interface LocalPlayerProps {
  mediaPath: string;
  thumbnail: string;
  title: string;
  chapters: Chapter[];
}

function chaptersToVttContent(chapters: Chapter[]) {
  return {
    cues: chapters.map((c) => ({
      startTime: c.start_time,
      endTime: c.end_time,
      text: c.title,
    })),
  };
}

function onProviderChange(provider: MediaProviderAdapter | null) {
  if (isHLSProvider(provider)) {
    provider.library = Hls;
  }
}

export function LocalPlayer({
  mediaPath,
  thumbnail,
  title,
  chapters,
}: LocalPlayerProps) {
  const playerRef = useRef<MediaPlayerInstance>(null);
  const src = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${mediaPath}`;

  const chaptersContent = useMemo(
    () => (chapters.length > 0 ? chaptersToVttContent(chapters) : null),
    [chapters]
  );

  useMountEffect(() => {
    const onSeek = (e: Event) => {
      const detail = (e as CustomEvent<SeekEventDetail>).detail;
      const player = playerRef.current;
      if (!player) return;
      player.currentTime = detail.time;
      void player.play();
    };
    window.addEventListener(PLAYER_SEEK_EVENT, onSeek);

    const player = playerRef.current;
    const disposeTime = player?.listen("time-update", (event) => {
      window.dispatchEvent(
        new CustomEvent<TimeEventDetail>(PLAYER_TIME_EVENT, {
          detail: { time: event.detail.currentTime },
        })
      );
    });

    return () => {
      window.removeEventListener(PLAYER_SEEK_EVENT, onSeek);
      disposeTime?.();
    };
  });

  return (
    <MediaPlayer
      ref={playerRef}
      src={src}
      title={title}
      autoPlay
      playsInline
      logLevel="silent"
      onProviderChange={onProviderChange}
      className="h-full w-full bg-black"
    >
      <MediaProvider>
        {thumbnail ? (
          <Poster src={thumbnail} alt={title} className="vds-poster" />
        ) : null}
        {chaptersContent ? (
          <Track
            type="json"
            content={chaptersContent}
            kind="chapters"
            default
            label="Chapters"
          />
        ) : null}
      </MediaProvider>
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}
