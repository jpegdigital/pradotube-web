"use client";

import { useState } from "react";

const VISIBLE_LIMIT = 8;

export function TagsList({ tags }: { tags: string[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? tags : tags.slice(0, VISIBLE_LIMIT);
  const hasMore = tags.length > VISIBLE_LIMIT;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((tag) => (
        <span
          key={tag}
          className="font-body inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground ring-1 ring-border/50"
        >
          {tag}
        </span>
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="font-body inline-flex items-center rounded-full bg-primary/8 px-3 py-1 text-xs text-primary ring-1 ring-primary/20 hover:bg-primary/15 transition-colors"
        >
          {showAll ? "Show less" : `+${tags.length - VISIBLE_LIMIT} more`}
        </button>
      )}
    </div>
  );
}
