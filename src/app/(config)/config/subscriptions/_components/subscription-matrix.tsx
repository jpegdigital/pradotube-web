"use client";

import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Check,
  Copy,
  Equal,
  GitFork,
  Keyboard,
  Search,
  Sparkles,
  Undo2,
  Users,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast, Toaster } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import type {
  SubscriptionMatrixData,
  SubsCreator,
  SubsUser,
} from "../_lib/get-subscription-matrix";

const ACCENTS = [
  { from: "#FF4B4B", to: "#FF9600" }, // coral → peach
  { from: "#1CB0F6", to: "#00CD9C" }, // sky → teal
  { from: "#FFC800", to: "#58CC02" }, // sunflower → mint
  { from: "#CE82FF", to: "#FF4B4B" }, // lavender → coral
  { from: "#00CD9C", to: "#1CB0F6" }, // teal → sky
  { from: "#FF9600", to: "#FFC800" }, // peach → sunflower
];

function accentFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return ACCENTS[hash % ACCENTS.length];
}

function userDisplayName(u: SubsUser): string {
  return u.firstName ?? u.email.split("@")[0] ?? "User";
}

type SortKey = "name" | "most" | "least";
type FilterKey = "all" | "mismatch" | "common";

interface HistoryEntry {
  userId: string;
  creatorId: string;
  wasSubscribed: boolean;
}

interface Props {
  data: SubscriptionMatrixData;
}

export function SubscriptionMatrix({ data }: Props) {
  const { users, creators } = data;

  const [subs, setSubs] = useState<Set<string>>(
    () => new Set(data.pairs.map(([u, c]) => `${u}:${c}`))
  );
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [focus, setFocus] = useState<{ row: number; col: number }>({
    row: 0,
    col: 0,
  });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copyMenu, setCopyMenu] = useState<string | null>(null); // userId
  const [hint, setHint] = useState(false);

  const matrixRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* ── Stable per-user accent (used by header + every cell in their column) ── */
  const userAccents = useMemo(
    () => users.map((u) => accentFor(u.id)),
    [users]
  );

  /* ── Derived: counts per creator + per user ── */
  const subCountByCreator = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of creators) map.set(c.id, 0);
    for (const key of subs) {
      const cid = key.split(":")[1];
      map.set(cid, (map.get(cid) ?? 0) + 1);
    }
    return map;
  }, [creators, subs]);

  const subCountByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of users) map.set(u.id, 0);
    for (const key of subs) {
      const uid = key.split(":")[0];
      map.set(uid, (map.get(uid) ?? 0) + 1);
    }
    return map;
  }, [users, subs]);

  /* ── Filter + sort creators (rows) ── */
  const visibleCreators = useMemo(() => {
    const needle = search.trim().toLowerCase();
    let list: SubsCreator[] = needle
      ? creators.filter((c) => c.name.toLowerCase().includes(needle))
      : creators;

    if (filter !== "all") {
      list = list.filter((c) => {
        const n = subCountByCreator.get(c.id) ?? 0;
        if (filter === "mismatch") return n > 0 && n < users.length;
        // common: all-on or all-off
        return n === 0 || n === users.length;
      });
    }

    if (sort === "name") {
      list = [...list].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
    } else if (sort === "most") {
      list = [...list].sort(
        (a, b) =>
          (subCountByCreator.get(b.id) ?? 0) -
            (subCountByCreator.get(a.id) ?? 0) ||
          a.name.localeCompare(b.name)
      );
    } else if (sort === "least") {
      list = [...list].sort(
        (a, b) =>
          (subCountByCreator.get(a.id) ?? 0) -
            (subCountByCreator.get(b.id) ?? 0) ||
          a.name.localeCompare(b.name)
      );
    }
    return list;
  }, [creators, search, sort, filter, subCountByCreator, users.length]);

  /* ── Keep focus inside visible bounds ── */
  useEffect(() => {
    if (focus.row >= visibleCreators.length && visibleCreators.length > 0) {
      setFocus((f) => ({ ...f, row: visibleCreators.length - 1 }));
    }
    if (focus.col >= users.length && users.length > 0) {
      setFocus((f) => ({ ...f, col: users.length - 1 }));
    }
  }, [visibleCreators.length, users.length, focus.row, focus.col]);

  /* ── Mutation primitives ── */
  const applyDiff = useCallback(
    async (changes: HistoryEntry[]) => {
      if (changes.length === 0) return;
      // Optimistic
      setSubs((prev) => {
        const next = new Set(prev);
        for (const ch of changes) {
          const key = `${ch.userId}:${ch.creatorId}`;
          if (ch.wasSubscribed) next.delete(key);
          else next.add(key);
        }
        return next;
      });

      const supabase = createClient();
      const toAdd = changes.filter((ch) => !ch.wasSubscribed);
      const toDel = changes.filter((ch) => ch.wasSubscribed);

      try {
        if (toAdd.length > 0) {
          const { error } = await supabase
            .from("user_subscriptions")
            .insert(
              toAdd.map((ch) => ({
                user_id: ch.userId,
                creator_id: ch.creatorId,
              }))
            );
          if (error) throw error;
        }
        for (const ch of toDel) {
          const { error } = await supabase
            .from("user_subscriptions")
            .delete()
            .eq("user_id", ch.userId)
            .eq("creator_id", ch.creatorId);
          if (error) throw error;
        }
      } catch (err) {
        // Rollback
        setSubs((prev) => {
          const next = new Set(prev);
          for (const ch of changes) {
            const key = `${ch.userId}:${ch.creatorId}`;
            if (ch.wasSubscribed) next.add(key);
            else next.delete(key);
          }
          return next;
        });
        toast.error(
          err instanceof Error ? err.message : "Failed to update subscriptions"
        );
      }
    },
    []
  );

  const toggleCell = useCallback(
    (userId: string, creatorId: string) => {
      const key = `${userId}:${creatorId}`;
      const wasSubscribed = subs.has(key);
      const entry: HistoryEntry = { userId, creatorId, wasSubscribed };
      setHistory((h) => [...h.slice(-19), entry]);
      void applyDiff([entry]);
    },
    [subs, applyDiff]
  );

  const bulkRow = useCallback(
    (creatorId: string, target: boolean) => {
      const changes: HistoryEntry[] = [];
      for (const u of users) {
        const key = `${u.id}:${creatorId}`;
        const wasSubscribed = subs.has(key);
        if (wasSubscribed === target) continue;
        changes.push({ userId: u.id, creatorId, wasSubscribed });
      }
      if (changes.length === 0) return;
      setHistory((h) => [...h.slice(-19), ...changes]);
      void applyDiff(changes);
      toast.success(
        target
          ? `Subscribed ${changes.length} user${changes.length === 1 ? "" : "s"}`
          : `Unsubscribed ${changes.length} user${changes.length === 1 ? "" : "s"}`
      );
    },
    [users, subs, applyDiff]
  );

  const bulkColVisible = useCallback(
    (userId: string, target: boolean) => {
      const changes: HistoryEntry[] = [];
      for (const c of visibleCreators) {
        const key = `${userId}:${c.id}`;
        const wasSubscribed = subs.has(key);
        if (wasSubscribed === target) continue;
        changes.push({ userId, creatorId: c.id, wasSubscribed });
      }
      if (changes.length === 0) {
        toast.info("Nothing to change");
        return;
      }
      setHistory((h) => [...h.slice(-19), ...changes]);
      void applyDiff(changes);
      toast.success(
        target
          ? `Subscribed to ${changes.length} creator${changes.length === 1 ? "" : "s"}`
          : `Unsubscribed from ${changes.length} creator${changes.length === 1 ? "" : "s"}`
      );
    },
    [visibleCreators, subs, applyDiff]
  );

  const copyColumn = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      const changes: HistoryEntry[] = [];
      // Use ALL creators (not just visible) so a copy is faithful end-to-end
      for (const c of creators) {
        const fromHas = subs.has(`${fromId}:${c.id}`);
        const toHas = subs.has(`${toId}:${c.id}`);
        if (fromHas === toHas) continue;
        changes.push({
          userId: toId,
          creatorId: c.id,
          wasSubscribed: toHas,
        });
      }
      if (changes.length === 0) {
        toast.info("Already identical");
        setCopyMenu(null);
        return;
      }
      setHistory((h) => [...h.slice(-19), ...changes]);
      void applyDiff(changes);
      const fromUser = users.find((u) => u.id === fromId);
      const toUser = users.find((u) => u.id === toId);
      toast.success(
        `Copied ${userDisplayName(fromUser!)} → ${userDisplayName(toUser!)} (${changes.length} change${changes.length === 1 ? "" : "s"})`
      );
      setCopyMenu(null);
    },
    [creators, subs, users, applyDiff]
  );

  const undo = useCallback(() => {
    if (history.length === 0) {
      toast.info("Nothing to undo");
      return;
    }
    const last = history[history.length - 1];
    // Find all entries from the same "burst" — bulk operations push as a group;
    // a simple approach: undo only the very last entry. Keeps mental model
    // predictable for the kid-account caretaker.
    const reverse: HistoryEntry = {
      ...last,
      wasSubscribed: !last.wasSubscribed,
    };
    setHistory((h) => h.slice(0, -1));
    void applyDiff([reverse]);
  }, [history, applyDiff]);

  /* ── Crosshair hover (no React re-render of cells) ── */
  const onCellEnter = useCallback((row: number, col: number) => {
    const root = matrixRef.current;
    if (!root) return;
    root.dataset.hoverRow = String(row);
    root.dataset.hoverCol = String(col);
  }, []);
  const onMatrixLeave = useCallback(() => {
    const root = matrixRef.current;
    if (!root) return;
    delete root.dataset.hoverRow;
    delete root.dataset.hoverCol;
  }, []);

  /* ── Keyboard navigation ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (e.key === "/" && !inField) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (e.key === "Escape") {
        if (copyMenu) {
          setCopyMenu(null);
          return;
        }
        if (inField) (target as HTMLInputElement).blur();
        return;
      }

      if ((e.key === "z" || e.key === "Z") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        undo();
        return;
      }

      if (inField) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocus((f) => ({ ...f, row: Math.max(0, f.row - 1) }));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocus((f) => ({
          ...f,
          row: Math.min(visibleCreators.length - 1, f.row + 1),
        }));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocus((f) => ({ ...f, col: Math.max(0, f.col - 1) }));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocus((f) => ({
          ...f,
          col: Math.min(users.length - 1, f.col + 1),
        }));
      } else if (e.key === " " || e.key === "Enter") {
        const c = visibleCreators[focus.row];
        const u = users[focus.col];
        if (c && u) {
          e.preventDefault();
          toggleCell(u.id, c.id);
        }
      } else if (e.key === "s" || e.key === "S") {
        const c = visibleCreators[focus.row];
        if (c) {
          e.preventDefault();
          bulkRow(c.id, true);
        }
      } else if (e.key === "u" || e.key === "U") {
        const c = visibleCreators[focus.row];
        if (c) {
          e.preventDefault();
          bulkRow(c.id, false);
        }
      } else if (e.key === "?") {
        e.preventDefault();
        setHint((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    visibleCreators,
    users,
    focus,
    toggleCell,
    bulkRow,
    undo,
    copyMenu,
  ]);

  /* ── Stats ── */
  const totalActive = subs.size;

  return (
    <div className="config-subs" data-canvas="muted">
      <Toaster position="top-center" richColors />

      {/* ─── Toolbar ─── */}
      <header className="config-subs-toolbar">
        <div className="config-subs-toolbar-headline">
          <div className="config-subs-headline-text">
            <span className="config-subs-eyebrow font-body">
              <Users className="h-3.5 w-3.5" aria-hidden />
              Subscriptions
            </span>
            <h1 className="config-subs-title font-heading">
              {users.length} {users.length === 1 ? "kid" : "kids"} ·{" "}
              {creators.length} creators ·{" "}
              <span className="config-subs-stat-strong">
                {totalActive} active
              </span>
            </h1>
          </div>
          <div className="config-subs-headline-actions">
            <button
              type="button"
              onClick={undo}
              disabled={history.length === 0}
              className="config-subs-icon-btn font-body"
              title="Undo last change (⌘Z)"
            >
              <Undo2 className="h-4 w-4" aria-hidden />
              <span>Undo</span>
              {history.length > 0 && (
                <span className="config-subs-icon-btn-count">
                  {history.length > 99 ? "99+" : history.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setHint((v) => !v)}
              className="config-subs-icon-btn font-body"
              data-active={hint || undefined}
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="h-4 w-4" aria-hidden />
              <span>Keys</span>
            </button>
          </div>
        </div>

        <div className="config-subs-toolbar-controls">
          <div className="config-subs-search">
            <Search className="config-subs-search-icon" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              inputMode="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search creators…  (press / to jump here)"
              aria-label="Search creators"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="config-subs-search-input"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="config-subs-search-clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div role="tablist" aria-label="Filter" className="config-subs-pills">
            <Pill
              active={filter === "all"}
              onClick={() => setFilter("all")}
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label="All"
            />
            <Pill
              active={filter === "mismatch"}
              onClick={() => setFilter("mismatch")}
              icon={<GitFork className="h-3.5 w-3.5" />}
              label="Mismatches"
            />
            <Pill
              active={filter === "common"}
              onClick={() => setFilter("common")}
              icon={<Equal className="h-3.5 w-3.5" />}
              label="Aligned"
            />
          </div>

          <div role="tablist" aria-label="Sort" className="config-subs-pills">
            <Pill
              active={sort === "name"}
              onClick={() => setSort("name")}
              icon={<ArrowDownAZ className="h-3.5 w-3.5" />}
              label="A→Z"
            />
            <Pill
              active={sort === "most"}
              onClick={() => setSort("most")}
              icon={<ArrowDownWideNarrow className="h-3.5 w-3.5" />}
              label="Most"
            />
            <Pill
              active={sort === "least"}
              onClick={() => setSort("least")}
              icon={<ArrowUpWideNarrow className="h-3.5 w-3.5" />}
              label="Least"
            />
          </div>
        </div>

        {hint && (
          <div className="config-subs-hint font-body">
            <span>
              <kbd>↑↓←→</kbd> move
            </span>
            <span>
              <kbd>Space</kbd> toggle
            </span>
            <span>
              <kbd>S</kbd> subscribe row
            </span>
            <span>
              <kbd>U</kbd> unsubscribe row
            </span>
            <span>
              <kbd>/</kbd> search
            </span>
            <span>
              <kbd>⌘Z</kbd> undo
            </span>
          </div>
        )}
      </header>

      {/* ─── Matrix ─── */}
      <div
        className="config-subs-grid-wrap"
        onMouseLeave={onMatrixLeave}
      >
        <div
          ref={matrixRef}
          className="config-subs-grid"
          style={
            {
              "--user-count": users.length,
            } as React.CSSProperties
          }
        >
          {/* corner */}
          <div className="config-subs-corner">
            <span className="config-subs-corner-label font-body">
              {visibleCreators.length} of {creators.length}
            </span>
          </div>

          {/* user header row */}
          {users.map((u, c) => {
            const count = subCountByUser.get(u.id) ?? 0;
            return (
              <UserHeader
                key={u.id}
                user={u}
                colIndex={c}
                count={count}
                creatorTotal={creators.length}
                copyMenuOpen={copyMenu === u.id}
                onOpenCopyMenu={() =>
                  setCopyMenu(copyMenu === u.id ? null : u.id)
                }
                onCloseCopyMenu={() => setCopyMenu(null)}
                onSubscribeAll={() => bulkColVisible(u.id, true)}
                onUnsubscribeAll={() => bulkColVisible(u.id, false)}
                allUsers={users}
                onCopyFrom={(fromId) => copyColumn(fromId, u.id)}
              />
            );
          })}

          {/* body rows */}
          {visibleCreators.map((creator, rowIndex) => {
            const accent = accentFor(creator.slug);
            const subbed = subCountByCreator.get(creator.id) ?? 0;
            return (
              <CreatorRow
                key={creator.id}
                creator={creator}
                accent={accent}
                rowIndex={rowIndex}
                users={users}
                userAccents={userAccents}
                subs={subs}
                subbedCount={subbed}
                isFocusedRow={rowIndex === focus.row}
                focusCol={focus.col}
                onCellEnter={onCellEnter}
                onCellClick={(uId) => {
                  setFocus({ row: rowIndex, col: users.findIndex((u) => u.id === uId) });
                  toggleCell(uId, creator.id);
                }}
                onSubscribeAll={() => bulkRow(creator.id, true)}
                onUnsubscribeAll={() => bulkRow(creator.id, false)}
              />
            );
          })}

          {visibleCreators.length === 0 && (
            <div className="config-subs-empty font-body">
              <p>
                {search.trim()
                  ? `No creators match "${search.trim()}"`
                  : filter === "mismatch"
                    ? "Every creator is aligned across kids — no mismatches to show."
                    : filter === "common"
                      ? "Every creator is split — no aligned creators."
                      : "No creators yet."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Subcomponents ─── */

interface PillProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}
function Pill({ active, onClick, icon, label }: PillProps) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="config-subs-pill"
      data-active={active || undefined}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

interface UserHeaderProps {
  user: SubsUser;
  colIndex: number;
  count: number;
  creatorTotal: number;
  copyMenuOpen: boolean;
  onOpenCopyMenu: () => void;
  onCloseCopyMenu: () => void;
  onSubscribeAll: () => void;
  onUnsubscribeAll: () => void;
  allUsers: SubsUser[];
  onCopyFrom: (fromId: string) => void;
}
function UserHeader({
  user,
  colIndex,
  count,
  creatorTotal,
  copyMenuOpen,
  onOpenCopyMenu,
  onCloseCopyMenu,
  onSubscribeAll,
  onUnsubscribeAll,
  allUsers,
  onCopyFrom,
}: UserHeaderProps) {
  const initial = userDisplayName(user).charAt(0).toUpperCase();
  const accent = accentFor(user.id);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!copyMenuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) onCloseCopyMenu();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [copyMenuOpen, onCloseCopyMenu]);

  return (
    <div
      ref={wrapRef}
      className="config-subs-user"
      data-col={colIndex}
      style={
        {
          "--accent-from": accent.from,
          "--accent-to": accent.to,
        } as React.CSSProperties
      }
    >
      <button
        type="button"
        onClick={onOpenCopyMenu}
        className="config-subs-user-trigger"
        aria-haspopup="menu"
        aria-expanded={copyMenuOpen}
      >
        <span className="config-subs-user-avatar">
          <span className="config-subs-user-avatar-letter">{initial}</span>
          {user.isAdmin && (
            <span className="config-subs-user-admin" aria-label="Admin" />
          )}
        </span>
        <span className="config-subs-user-name font-heading">
          {userDisplayName(user)}
        </span>
        <span className="config-subs-user-count font-body">
          {count}
          <span className="config-subs-user-count-divider">/</span>
          <span className="config-subs-user-count-total">{creatorTotal}</span>
        </span>
      </button>

      {copyMenuOpen && (
        <div className="config-subs-popover" role="menu">
          <button
            type="button"
            className="config-subs-popover-action"
            onClick={() => {
              onSubscribeAll();
              onCloseCopyMenu();
            }}
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            <span>Subscribe to all visible</span>
          </button>
          <button
            type="button"
            className="config-subs-popover-action"
            onClick={() => {
              onUnsubscribeAll();
              onCloseCopyMenu();
            }}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            <span>Unsubscribe from all visible</span>
          </button>
          {allUsers.length > 1 && (
            <>
              <div className="config-subs-popover-label font-body">
                <Copy className="h-3 w-3" aria-hidden />
                Copy from
              </div>
              {allUsers
                .filter((other) => other.id !== user.id)
                .map((other) => {
                  const a = accentFor(other.id);
                  return (
                    <button
                      key={other.id}
                      type="button"
                      className="config-subs-popover-action config-subs-popover-action-user"
                      onClick={() => onCopyFrom(other.id)}
                      style={
                        {
                          "--accent-from": a.from,
                          "--accent-to": a.to,
                        } as React.CSSProperties
                      }
                    >
                      <span className="config-subs-popover-avatar">
                        {userDisplayName(other).charAt(0).toUpperCase()}
                      </span>
                      <span>{userDisplayName(other)}</span>
                    </button>
                  );
                })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface CreatorRowProps {
  creator: SubsCreator;
  accent: { from: string; to: string };
  rowIndex: number;
  users: SubsUser[];
  userAccents: Array<{ from: string; to: string }>;
  subs: Set<string>;
  subbedCount: number;
  isFocusedRow: boolean;
  focusCol: number;
  onCellEnter: (row: number, col: number) => void;
  onCellClick: (userId: string) => void;
  onSubscribeAll: () => void;
  onUnsubscribeAll: () => void;
}
function CreatorRow({
  creator,
  accent,
  rowIndex,
  users,
  userAccents,
  subs,
  subbedCount,
  isFocusedRow,
  focusCol,
  onCellEnter,
  onCellClick,
  onSubscribeAll,
  onUnsubscribeAll,
}: CreatorRowProps) {
  const allOn = subbedCount === users.length;
  const allOff = subbedCount === 0;

  return (
    <>
      {/* Row label */}
      <div
        className="config-subs-creator"
        data-row={rowIndex}
        data-focused={isFocusedRow || undefined}
        style={
          {
            "--accent-from": accent.from,
            "--accent-to": accent.to,
          } as React.CSSProperties
        }
      >
        <span className="config-subs-creator-rail" aria-hidden />
        <span className="config-subs-creator-avatar">
          {creator.avatar ? (
            <img
              src={creator.avatar}
              alt=""
              loading="lazy"
              className="config-subs-creator-avatar-img"
            />
          ) : (
            <span className="config-subs-creator-avatar-fallback">
              {creator.name.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        <span className="config-subs-creator-body">
          <span className="config-subs-creator-name font-heading">
            {creator.name}
          </span>
          <span className="config-subs-creator-meta font-body">
            <span
              className="config-subs-creator-meter"
              aria-label={`${subbedCount} of ${users.length} subscribed`}
            >
              <span
                className="config-subs-creator-meter-fill"
                style={{
                  width: `${
                    users.length === 0
                      ? 0
                      : (subbedCount / users.length) * 100
                  }%`,
                }}
              />
            </span>
            <span>
              {subbedCount}/{users.length}
            </span>
          </span>
        </span>
        <span className="config-subs-creator-actions">
          <button
            type="button"
            onClick={onSubscribeAll}
            disabled={allOn}
            className="config-subs-row-btn"
            title="Subscribe all kids (S)"
            aria-label="Subscribe all kids"
          >
            <Check className="h-3 w-3" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onUnsubscribeAll}
            disabled={allOff}
            className="config-subs-row-btn config-subs-row-btn-off"
            title="Unsubscribe all kids (U)"
            aria-label="Unsubscribe all kids"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </span>
      </div>

      {/* Cells — colored by user (column) so each kid owns one color downward */}
      {users.map((u, colIndex) => {
        const isOn = subs.has(`${u.id}:${creator.id}`);
        const isFocused = isFocusedRow && colIndex === focusCol;
        const userAccent = userAccents[colIndex];
        return (
          <button
            type="button"
            key={u.id}
            data-row={rowIndex}
            data-col={colIndex}
            data-on={isOn || undefined}
            data-focused={isFocused || undefined}
            onMouseEnter={() => onCellEnter(rowIndex, colIndex)}
            onClick={() => onCellClick(u.id)}
            className="config-subs-cell"
            style={
              {
                "--accent-from": userAccent.from,
                "--accent-to": userAccent.to,
              } as React.CSSProperties
            }
            aria-pressed={isOn}
            aria-label={`${userDisplayName(u)} ${isOn ? "subscribed to" : "not subscribed to"} ${creator.name}`}
          >
            <span className="config-subs-cell-dot" aria-hidden />
          </button>
        );
      })}
    </>
  );
}
