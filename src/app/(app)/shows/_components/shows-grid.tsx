"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  DEFAULT_SHOWS_DIR,
  DEFAULT_SHOWS_SORT,
  NATURAL_DIR,
  type ShowCreator,
  type ShowsPage,
  type ShowsSortDir,
  type ShowsSortField,
  type ShowVideo,
} from "../_lib/types";
import { CreatorChips } from "./creator-chips";
import { SortToolbar } from "./sort-toolbar";
import { VideoCard } from "./video-card";

interface ShowsGridProps {
  initialPage: ShowsPage;
  creators: ShowCreator[];
  activeSlug: string | null;
}

const SEARCH_DEBOUNCE_MS = 300;

class ShowsFetchError extends Error {
  status: number;
  constructor(status: number) {
    super(`shows ${status}`);
    this.status = status;
  }
}

async function fetchShowsPage(
  slug: string | null,
  cursor: number | null,
  sort: ShowsSortField,
  dir: ShowsSortDir,
  q: string
): Promise<ShowsPage> {
  const params = new URLSearchParams();
  if (slug) params.set("creator", slug);
  if (cursor !== null) params.set("cursor", String(cursor));
  params.set("sort", sort);
  params.set("dir", dir);
  if (q) params.set("q", q);
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
  const [sortField, setSortField] = useState<ShowsSortField>(DEFAULT_SHOWS_SORT);
  const [sortDir, setSortDir] = useState<ShowsSortDir>(DEFAULT_SHOWS_DIR);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (trimmed === "") {
      setDebouncedSearch("");
      return;
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(trimmed);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const isDefaultQuery =
    sortField === DEFAULT_SHOWS_SORT &&
    sortDir === DEFAULT_SHOWS_DIR &&
    debouncedSearch === "";

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } =
    useInfiniteQuery({
      queryKey: ["shows", activeSlug, sortField, sortDir, debouncedSearch],
      queryFn: ({ pageParam }) =>
        fetchShowsPage(activeSlug, pageParam, sortField, sortDir, debouncedSearch),
      initialPageParam: null as number | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      placeholderData: keepPreviousData,
      // Only the default sort with no search matches the server-rendered initialPage.
      initialData: isDefaultQuery
        ? {
            pages: [initialPage],
            pageParams: [null as number | null],
          }
        : undefined,
    });

  const videos: ShowVideo[] = useMemo(
    () => data?.pages.flatMap((p) => p.videos) ?? [],
    [data]
  );

  // The displayed results are stale whenever the input is ahead of the
  // debounced value, or the refetch for the latest search is still in
  // flight. We surface that as a spinner in the search input rather than
  // mutating the grid, so the card count doesn't jump as server matches
  // (often a superset of loaded matches) arrive.
  const trimmedInput = searchInput.trim();
  const isRefetching = isFetching && !isFetchingNextPage;
  const dataMatchesSearch = !isRefetching && trimmedInput === debouncedSearch;
  const isSearching = trimmedInput !== "" && !dataMatchesSearch;

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

  const hasSearch = trimmedInput !== "" || debouncedSearch !== "";
  const showSearchEmpty =
    videos.length === 0 && hasSearch && !isRefetching && dataMatchesSearch;
  const showCreatorEmpty =
    videos.length === 0 && !hasSearch && activeSlug !== null;

  return (
    <div data-canvas="muted" className="px-5 pb-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="-mt-1 pb-3 sm:mt-0 sm:pt-0 sm:pb-4">
          <CreatorChips
            creators={creators}
            activeSlug={activeSlug}
            onSelect={handleSelectCreator}
          />
        </div>

        <div className="mb-5 sm:mb-6">
          <SortToolbar
            field={sortField}
            dir={sortDir}
            search={searchInput}
            isSearching={isSearching}
            onFieldChange={(f) => {
              setSortField(f);
              setSortDir(NATURAL_DIR[f]);
            }}
            onDirChange={setSortDir}
            onSearchChange={handleSearchChange}
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

        {showSearchEmpty && (
          <div className="flex justify-center pt-12 pb-4 text-center">
            <p className="font-body text-muted-foreground">
              No videos match{" "}
              <span className="font-bold text-foreground">
                &ldquo;{debouncedSearch || searchInput.trim()}&rdquo;
              </span>
              .
            </p>
          </div>
        )}

        {showCreatorEmpty && (
          <div className="flex justify-center pt-12 pb-4 text-center">
            <p className="font-body text-muted-foreground">
              No videos here yet — check back soon!
            </p>
          </div>
        )}

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
