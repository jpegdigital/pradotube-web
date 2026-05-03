"use client";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

import {
  isHLSProvider,
  MediaPlayer,
  MediaProvider,
  type MediaProviderAdapter,
  Poster,
} from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import Hls from "hls.js";

interface LocalPlayerProps {
  mediaPath: string;
  thumbnail: string;
  title: string;
}

function onProviderChange(provider: MediaProviderAdapter | null) {
  if (isHLSProvider(provider)) {
    provider.library = Hls;
  }
}

export function LocalPlayer({ mediaPath, thumbnail, title }: LocalPlayerProps) {
  const src = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${mediaPath}`;

  return (
    <MediaPlayer
      src={src}
      title={title}
      autoPlay
      playsInline
      crossOrigin
      logLevel="warn"
      onProviderChange={onProviderChange}
      className="h-full w-full bg-black"
    >
      <MediaProvider>
        {thumbnail ? (
          <Poster src={thumbnail} alt={title} className="vds-poster" />
        ) : null}
      </MediaProvider>
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}
