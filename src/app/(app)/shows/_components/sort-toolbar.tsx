"use client";

import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Calendar,
  Heart,
  Loader2,
  Search,
  Sparkles,
  Type,
  X,
} from "lucide-react";
import type { ShowsSortDir, ShowsSortField } from "../_lib/types";

interface SortToolbarProps {
  field: ShowsSortField;
  dir: ShowsSortDir;
  search: string;
  isSearching: boolean;
  onFieldChange: (field: ShowsSortField) => void;
  onDirChange: (dir: ShowsSortDir) => void;
  onSearchChange: (value: string) => void;
}

interface SortOption {
  key: ShowsSortField;
  label: string;
  icon: React.ReactNode;
  desc: string;
  asc: string;
}

const SORT_OPTIONS: SortOption[] = [
  {
    key: "feed_rank",
    label: "Best",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    desc: "rest first",
    asc: "best first",
  },
  {
    key: "published_at",
    label: "Date",
    icon: <Calendar className="h-3.5 w-3.5" />,
    desc: "newest first",
    asc: "oldest first",
  },
  {
    key: "title",
    label: "Title",
    icon: <Type className="h-3.5 w-3.5" />,
    desc: "Z → A",
    asc: "A → Z",
  },
  {
    key: "like_count",
    label: "Likes",
    icon: <Heart className="h-3.5 w-3.5" />,
    desc: "most loved",
    asc: "least loved",
  },
];

export function SortToolbar({
  field,
  dir,
  search,
  isSearching,
  onFieldChange,
  onDirChange,
  onSearchChange,
}: SortToolbarProps) {
  const active = SORT_OPTIONS.find((o) => o.key === field) ?? SORT_OPTIONS[0];

  return (
    <div className="font-body rounded-[28px] border border-border/60 bg-card/70 p-2 sm:px-2.5">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="ml-1 hidden text-[10px] font-extrabold tracking-[0.14em] text-muted-foreground uppercase sm:inline">
          Sort
        </span>

        <div
          role="tablist"
          aria-label="Sort videos by"
          className="flex flex-wrap items-center gap-1"
        >
          {SORT_OPTIONS.map((opt) => {
            const isActive = opt.key === field;
            return (
              <button
                key={opt.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => onFieldChange(opt.key)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs leading-none font-bold transition-all active:scale-[0.97] sm:text-sm",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                ].join(" ")}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative order-last w-full sm:order-none sm:ml-auto sm:w-56">
          {isSearching ? (
            <Loader2
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--peach)]"
            />
          ) : (
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
          )}
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Search videos…"
            aria-label="Search videos"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="font-body h-10 w-full rounded-full border border-border/60 bg-background pr-9 pl-9 text-base font-medium text-foreground outline-none transition placeholder:font-semibold placeholder:text-muted-foreground/80 focus:border-[var(--peach)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--peach)_28%,transparent)] [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-1.5 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground active:scale-95"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => onDirChange(dir === "desc" ? "asc" : "desc")}
          title={`Switch to ${dir === "desc" ? "ascending" : "descending"}`}
          aria-label={`Sort direction: ${dir === "desc" ? active.desc : active.asc}`}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-[11px] leading-none font-bold text-foreground transition-all hover:border-[color-mix(in_srgb,var(--peach)_45%,var(--border))] hover:bg-[color-mix(in_srgb,var(--peach)_10%,var(--card))] active:scale-[0.97] sm:ml-0 sm:text-xs"
        >
          {dir === "desc" ? (
            <ArrowDownWideNarrow className="h-3.5 w-3.5 text-[var(--peach)]" />
          ) : (
            <ArrowUpNarrowWide className="h-3.5 w-3.5 text-[var(--peach)]" />
          )}
          <span>{dir === "desc" ? active.desc : active.asc}</span>
        </button>
      </div>
    </div>
  );
}
