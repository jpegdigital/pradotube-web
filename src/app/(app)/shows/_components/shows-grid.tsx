"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import type {
  ShowCreator,
  ShowsPage,
  ShowVideo,
} from "../_lib/get-shows";
import { CreatorChips } from "./creator-chips";
import { VideoCard } from "./video-card";

interface ShowsGridProps {
  initialPage: ShowsPage;
  creators: ShowCreator[];
  activeSlug: string | null;
}

class ShowsFetchError extends Error {
  status: number;
  constructor(status: number) {
    super(`shows ${status}`);
    this.status = status;
  }
}

async function fetchShowsPage(
  slug: string | null,
  cursor: number | null
): Promise<ShowsPage> {
  const params = new URLSearchParams();
  if (slug) params.set("creator", slug);
  if (cursor !== null) params.set("cursor", String(cursor));
  const res = await fetch(`/api/shows?${params.toString()}`);
  if (!res.ok) throw new ShowsFetchError(res.status);
  return res.json();
}

export function ShowsGrid({
  initialPage,
  creators,
  activeSlug,
}: ShowsGridProps) {
  const router = useRouter();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["shows", activeSlug],
      queryFn: ({ pageParam }) => fetchShowsPage(activeSlug, pageParam),
      initialPageParam: null as number | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialData: {
        pages: [initialPage],
        pageParams: [null as number | null],
      },
    });

  const videos: ShowVideo[] = useMemo(
    () => data?.pages.flatMap((p) => p.videos) ?? [],
    [data]
  );

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        },
        { rootMargin: "400px" }
      );
      observer.observe(node);
      return () => observer.disconnect();
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  const handleSelectCreator = useCallback(
    (slug: string | null) => {
      router.push(slug ? `/shows/${slug}` : "/shows");
    },
    [router]
  );

  return (
    <div data-canvas="muted" className="px-5 pb-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="pt-1 pb-4 sm:pt-2 sm:pb-5">
          <CreatorChips
            creators={creators}
            activeSlug={activeSlug}
            onSelect={handleSelectCreator}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
          {videos.map((v) => (
            <VideoCard
              key={v.id}
              id={v.id}
              title={v.title}
              thumbnailUrl={v.thumbnailUrl}
              thumbnailPath={v.thumbnailPath}
              creatorName={v.creatorName}
              creatorAvatar={v.creatorAvatar}
              durationSeconds={v.durationSeconds}
              publishedAt={v.publishedAt}
              viewCount={v.viewCount}
            />
          ))}
        </div>

        {hasNextPage ? (
          <div ref={sentinelRef} className="h-10" aria-hidden />
        ) : (
          videos.length > 0 && (
            <div className="flex justify-center pt-10 pb-4">
              <p className="font-body text-sm text-muted-foreground">
                That&rsquo;s everything!
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
