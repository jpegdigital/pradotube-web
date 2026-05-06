"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import {
  Check,
  FolderInput,
  FolderPlus,
  Search,
  Ungroup,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { OtherCreatorOption } from "../_lib/get-creator-detail";

interface MoveToGroupProps {
  channelTitle: string;
  currentCreatorId: string | null;
  currentCreatorName: string;
  otherCreators: OtherCreatorOption[];
  onMove: (nextCreatorId: string | null) => void;
}

interface OptionRow {
  id: string | null;
  name: string;
  kind: "ungrouped" | "creator";
}

export function MoveToGroup({
  channelTitle,
  currentCreatorId,
  currentCreatorName,
  otherCreators,
  onMove,
}: MoveToGroupProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset query + active index when transitioning open=false → true so each
  // re-open starts clean. Doing it in the change handler avoids a setState-
  // in-effect cascade.
  const handleOpenChange = useCallback((next: boolean) => {
    if (next) {
      setQuery("");
      setActiveIdx(0);
    }
    setOpen(next);
  }, []);

  const allOptions: OptionRow[] = useMemo(() => {
    const sortedCreators = otherCreators
      .filter((c) => c.id !== currentCreatorId)
      .map<OptionRow>((c) => ({ id: c.id, name: c.name, kind: "creator" }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
    return [
      { id: null, name: "Ungrouped", kind: "ungrouped" },
      ...sortedCreators,
    ];
  }, [otherCreators, currentCreatorId]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return allOptions;
    return allOptions.filter((opt) =>
      opt.name.toLowerCase().includes(needle)
    );
  }, [allOptions, query]);

  // Clamp on render so activeIdx never points past the filtered list.
  // Filter shrinks only via search input, which already resets to 0 — this
  // is just a render-time safety net.
  const safeIdx = filtered.length === 0 ? -1 : Math.min(activeIdx, filtered.length - 1);

  // Scroll active row into view on keyboard nav
  useEffect(() => {
    const list = listRef.current;
    if (!list || safeIdx < 0) return;
    const el = list.querySelector<HTMLElement>(`[data-row-idx="${safeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [safeIdx]);

  function handleSelect(opt: OptionRow) {
    onMove(opt.id);
    setOpen(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIdx(Math.max(0, filtered.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const choice = filtered[safeIdx];
      if (choice) handleSelect(choice);
    }
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger
        className="config-action-btn"
        aria-label={`Move "${channelTitle}" to a different creator`}
        title="Move to another creator"
      >
        <FolderInput className="h-4 w-4" />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner sideOffset={6} align="end" className="z-50">
          <PopoverPrimitive.Popup className="config-move-popup">
            <div className="config-move-header">
              <p className="config-move-eyebrow">Move to</p>
              <span className="config-move-count">
                {filtered.length}
                <span aria-hidden>/</span>
                {allOptions.length}
              </span>
            </div>

            <div className="config-move-search">
              <Search aria-hidden className="config-move-search-icon" />
              <input
                type="search"
                inputMode="search"
                enterKeyHint="go"
                autoComplete="off"
                spellCheck={false}
                placeholder="Search creators…"
                aria-label="Search creators"
                aria-controls="config-move-listbox"
                aria-activedescendant={
                  filtered[safeIdx]
                    ? `config-move-opt-${safeIdx}`
                    : undefined
                }
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIdx(0);
                }}
                onKeyDown={handleKey}
                autoFocus
              />
            </div>

            <div className="config-move-current-row">
              <span className="config-move-current-label">Currently in</span>
              <span className="config-move-current-pill">
                {currentCreatorId === null ? (
                  <Ungroup className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <FolderPlus className="h-3.5 w-3.5" aria-hidden />
                )}
                <span className="truncate">
                  {currentCreatorId === null ? "Ungrouped" : currentCreatorName}
                </span>
                <Check
                  className="h-3.5 w-3.5"
                  style={{ color: "var(--mint)" }}
                  aria-hidden
                />
              </span>
            </div>

            <div
              id="config-move-listbox"
              role="listbox"
              aria-label="Move target"
              ref={listRef}
              className="config-move-list"
            >
              {filtered.length === 0 ? (
                <div className="config-move-empty">
                  <p>No creators match &ldquo;{query.trim()}&rdquo;</p>
                </div>
              ) : (
                filtered.map((opt, idx) => {
                  const active = idx === safeIdx;
                  return (
                    <button
                      key={opt.id ?? "__ungrouped"}
                      id={`config-move-opt-${idx}`}
                      role="option"
                      aria-selected={active}
                      type="button"
                      data-row-idx={idx}
                      data-active={active || undefined}
                      data-kind={opt.kind}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => handleSelect(opt)}
                      className="config-move-row"
                    >
                      {opt.kind === "ungrouped" ? (
                        <Ungroup
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      ) : (
                        <FolderPlus
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      )}
                      <span className="truncate">{opt.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
