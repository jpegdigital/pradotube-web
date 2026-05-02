"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { cn } from "@/lib/utils";
import type { Chapter } from "../_lib/get-video";
import {
  PLAYER_TIME_EVENT,
  type TimeEventDetail,
  dispatchPlayerSeek,
} from "../_lib/player-events";

interface ChapterListProps {
  chapters: Chapter[];
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const sPad = s.toString().padStart(2, "0");
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sPad}`;
  return `${m}:${sPad}`;
}

export function ChapterList({ chapters }: ChapterListProps) {
  const [currentTime, setCurrentTime] = useState(0);

  useMountEffect(() => {
    const onTime = (e: Event) => {
      setCurrentTime((e as CustomEvent<TimeEventDetail>).detail.time);
    };
    window.addEventListener(PLAYER_TIME_EVENT, onTime);
    return () => window.removeEventListener(PLAYER_TIME_EVENT, onTime);
  });

  const activeIndex = chapters.findIndex(
    (c) => currentTime >= c.start_time && currentTime < c.end_time
  );

  return (
    <ol className="grid gap-2 sm:grid-cols-2 sm:gap-x-3">
      {chapters.map((ch, i) => {
        const isActive = i === activeIndex;
        const span = Math.max(ch.end_time - ch.start_time, 1);
        const progress = isActive
          ? Math.min(Math.max((currentTime - ch.start_time) / span, 0), 1) * 100
          : 0;

        return (
          <li key={ch.start_time} className="h-full">
            <button
              type="button"
              onClick={() => dispatchPlayerSeek(ch.start_time)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "group relative flex h-full w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-left",
                "ring-1 transition-all duration-200 ease-out",
                "hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:scale-[0.995]",
                isActive
                  ? "bg-primary/10 ring-primary/30 hover:bg-primary/12"
                  : "bg-card ring-border/40 hover:bg-secondary hover:ring-border/70"
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                    : "bg-secondary text-muted-foreground ring-1 ring-border/40 group-hover:bg-primary/12 group-hover:text-primary group-hover:ring-primary/25"
                )}
              >
                {isActive ? (
                  <Play
                    className="ml-0.5 h-3.5 w-3.5 fill-current"
                    aria-hidden="true"
                  />
                ) : (
                  <>
                    <span className="font-body text-xs font-bold tabular-nums group-hover:hidden">
                      {i + 1}
                    </span>
                    <Play
                      className="ml-0.5 hidden h-3.5 w-3.5 fill-current group-hover:block"
                      aria-hidden="true"
                    />
                  </>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "line-clamp-2 font-body text-sm leading-tight transition-colors",
                    isActive
                      ? "font-semibold text-foreground"
                      : "text-foreground/90"
                  )}
                >
                  {ch.title}
                </p>
                <p
                  className={cn(
                    "mt-0.5 font-body text-xs tabular-nums transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {formatTimestamp(ch.start_time)}
                </p>
              </div>

              {isActive ? (
                <div
                  className="flex shrink-0 items-center gap-1.5 pr-1"
                  aria-hidden="true"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  <span className="font-body text-[10px] font-bold uppercase tracking-wider text-primary">
                    Now
                  </span>
                </div>
              ) : (
                <span
                  className="font-body text-xs text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden="true"
                >
                  Jump
                </span>
              )}

              {isActive ? (
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-primary/15"
                  aria-hidden="true"
                >
                  <span
                    className="block h-full bg-primary transition-[width] duration-150 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
