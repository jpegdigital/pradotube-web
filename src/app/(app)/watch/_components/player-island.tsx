"use client";

import dynamic from "next/dynamic";
import type { Chapter } from "../_lib/get-video";

const LocalPlayer = dynamic(
  () => import("./local-player").then((m) => ({ default: m.LocalPlayer })),
  { ssr: false }
);

interface PlayerIslandProps {
  mediaPath: string;
  thumbnail: string;
  title: string;
  chapters: Chapter[];
}

export function PlayerIsland(props: PlayerIslandProps) {
  return <LocalPlayer {...props} />;
}
