"use client";

import { Play } from "lucide-react";
import dynamic from "next/dynamic";

interface PlayerIslandProps {
  mediaPath: string;
  thumbnail: string;
  title: string;
}

function PlayerSkeleton({
  thumbnail,
  title,
}: {
  thumbnail: string;
  title: string;
}) {
  return (
    <div className="absolute inset-0">
      {thumbnail ? (
        <img
          src={thumbnail}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
          <Play className="h-8 w-8 translate-x-0.5 fill-white text-white" />
        </div>
      </div>
    </div>
  );
}

const LocalPlayer = dynamic(
  () => import("./local-player").then((m) => ({ default: m.LocalPlayer })),
  { ssr: false }
);

export function PlayerIsland(props: PlayerIslandProps) {
  return (
    <>
      <PlayerSkeleton thumbnail={props.thumbnail} title={props.title} />
      <LocalPlayer {...props} />
    </>
  );
}
