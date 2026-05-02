"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useMemo, useRef } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";
import type { UpNextPage, UpNextVideo } from "../_lib/get-up-next";

interface UpNextScrollerProps {
  initialPage: UpNextPage;
  activeId: string;
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const sPad = s.toString().padStart(2, "0");
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sPad}`;
  return `${m}:${sPad}`;
}

class UpNextFetchError extends Error {
  status: number;
  constructor(status: number) {
    super(`up-next ${status}`);
    this.status = status;
  }
}

async function fetchUpNextPage(cursor: number | null): Promise<UpNextPage> {
  const params = new URLSearchParams();
  if (cursor !== null) params.set("cursor", String(cursor));
  const res = await fetch(`/api/up-next?${params.toString()}`);
  if (!res.ok) throw new UpNextFetchError(res.status);
  return res.json();
}

export function UpNextScroller({ initialPage, activeId }: UpNextScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["up-next"],
      queryFn: ({ pageParam }) => fetchUpNextPage(pageParam),
      initialPageParam: null as number | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialData: {
        pages: [initialPage],
        pageParams: [null as number | null],
      },
    });

  const videos: UpNextVideo[] = useMemo(
    () => data?.pages.flatMap((p) => p.videos) ?? [],
    [data]
  );

  useMountEffect(() => {
    const container = scrollerRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(
      `[data-video-id="${CSS.escape(activeId)}"]`
    );
    if (!target) return;
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    container.scrollTop += targetRect.top - containerRect.top;
  });

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        },
        { root: scrollerRef.current, rootMargin: "400px" }
      );
      observer.observe(node);
      return () => observer.disconnect();
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  return (
    <div
      ref={scrollerRef}
      className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2 [scrollbar-gutter:stable]"
    >
      {videos.map((v) => (
        <SidebarItem key={v.id} video={v} isActive={v.id === activeId} />
      ))}
      {hasNextPage ? <div ref={sentinelRef} className="h-px" aria-hidden /> : null}
    </div>
  );
}

function SidebarItem({
  video,
  isActive,
}: {
  video: UpNextVideo;
  isActive: boolean;
}) {
  const thumb = video.thumbnailPath
    ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${video.thumbnailPath}`
    : video.thumbnailUrl;

  return (
    <Link
      href={`/watch/${video.id}`}
      data-video-id={video.id}
      aria-current={isActive ? "true" : undefined}
      className={`group relative flex gap-3 overflow-hidden rounded-xl p-2 transition-all ${
        isActive
          ? "bg-gradient-to-r from-primary/12 via-primary/5 to-transparent ring-1 ring-primary/25"
          : "ring-1 ring-transparent hover:bg-secondary/60 hover:ring-border/40"
      }`}
    >
      {isActive && (
        <span
          aria-hidden
          className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary"
        />
      )}

      <div
        className={`relative aspect-video w-[148px] shrink-0 overflow-hidden rounded-lg bg-secondary ring-1 transition-all ${
          isActive
            ? "ring-primary/40"
            : "ring-border/40 group-hover:ring-primary/30"
        }`}
      >
        {thumb ? (
          <img
            src={thumb}
            alt={video.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <span className="font-heading text-2xl text-muted-foreground/30">
              {video.title.charAt(0)}
            </span>
          </div>
        )}

        {video.durationSeconds > 0 && !isActive && (
          <div className="absolute bottom-1 right-1 rounded-md bg-black/80 px-1.5 py-0.5 font-body text-[10px] font-bold text-white tabular-nums backdrop-blur-sm">
            {formatTimestamp(video.durationSeconds)}
          </div>
        )}

        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[1px]">
            <div className="flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 shadow-lg shadow-primary/40">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-foreground" />
              </span>
              <span className="font-heading text-[9px] font-bold uppercase tracking-[0.12em] text-primary-foreground">
                Now
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <p
          className={`font-body line-clamp-2 text-[13px] font-semibold leading-snug transition-colors ${
            isActive
              ? "text-primary"
              : "text-foreground group-hover:text-primary"
          }`}
        >
          {video.title}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full bg-secondary ring-1 ring-border/40">
            {video.creatorAvatar ? (
              <img
                src={video.creatorAvatar}
                alt={video.creatorName}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/25 to-primary/10">
                <span className="font-heading text-[8px] text-primary">
                  {video.creatorName.charAt(0)}
                </span>
              </div>
            )}
          </div>
          <span className="truncate font-body text-[11px] text-muted-foreground">
            {video.creatorName}
          </span>
        </div>
      </div>
    </Link>
  );
}
