"use client";

import {
  Archive,
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ChevronRight,
  ClipboardCheck,
  CloudCog,
  Search,
  Sparkles,
  Tablet,
  Ungroup,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import type {
  ConfigCreatorListItem,
  ConfigSidebarChannel,
  ConfigSidebarData,
} from "../_lib/get-creators";
import { NewCreatorDialog } from "./new-creator-dialog";

type SortKey = "name" | "priority" | "synced";

const SORT_OPTIONS: Array<{ key: SortKey; label: string; icon: React.ReactNode }> = [
  { key: "name", label: "A→Z", icon: <ArrowDownAZ className="h-3.5 w-3.5" /> },
  {
    key: "priority",
    label: "Rating",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  {
    key: "synced",
    label: "Synced",
    icon: <ArrowDownWideNarrow className="h-3.5 w-3.5" />,
  },
];

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

interface ConfigSidebarProps {
  data: ConfigSidebarData;
}

export function ConfigSidebar({ data }: ConfigSidebarProps) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sort, setSort] = useState<SortKey>("name");

  const filteredCreators = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    let list: ConfigCreatorListItem[] = needle
      ? data.creators
          .map((c) => {
            const matchedChannels = c.channels.filter((ch) =>
              ch.title.toLowerCase().includes(needle)
            );
            const creatorMatches = c.name.toLowerCase().includes(needle);
            if (!creatorMatches && matchedChannels.length === 0) return null;
            return {
              ...c,
              // Highlight channel matches by keeping only matching channels when
              // the creator name itself didn't match — makes search precise.
              channels: creatorMatches ? c.channels : matchedChannels,
            };
          })
          .filter((c): c is ConfigCreatorListItem => c !== null)
      : data.creators;

    if (sort === "name") {
      list = [...list].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
    } else if (sort === "priority") {
      list = [...list].sort(
        (a, b) => b.priority - a.priority || a.name.localeCompare(b.name)
      );
    } else if (sort === "synced") {
      list = [...list].sort(
        (a, b) => b.syncedCount - a.syncedCount || a.name.localeCompare(b.name)
      );
    }
    return list;
  }, [data.creators, deferredSearch, sort]);

  return (
    <aside className="config-sidebar" aria-label="Creators">
      <div className="config-sidebar-toolbar">
        <div className="config-sidebar-toolbar-row">
          <div className="config-sidebar-search">
            <Search aria-hidden className="config-sidebar-search-icon" />
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search creators or channels…"
              aria-label="Search creators or channels"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="config-sidebar-search-input"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="config-sidebar-search-clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <NewCreatorDialog />
        </div>

        <div role="tablist" aria-label="Sort creators by" className="config-sidebar-sort">
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.key;
            return (
              <button
                key={opt.key}
                role="tab"
                aria-selected={active}
                onClick={() => setSort(opt.key)}
                className="config-sidebar-sort-pill"
                data-active={active || undefined}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="config-sidebar-meta">
        <span>{data.creators.length} creators</span>
        <span aria-hidden>·</span>
        <span>{data.totalChannelCount} channels</span>
        <span aria-hidden>·</span>
        <span>{data.totalSyncedCount} synced</span>
      </div>

      <nav className="config-sidebar-list" aria-label="Creator list">
        <Link
          href="/config/subscriptions"
          className="config-sidebar-item config-sidebar-item-pinned"
          data-active={
            pathname === "/config/subscriptions" ||
            pathname.startsWith("/config/subscriptions/")
              ? true
              : undefined
          }
          style={
            {
              "--accent-from": "#FF9600",
              "--accent-to": "#FF4B4B",
            } as React.CSSProperties
          }
        >
          <span className="config-sidebar-item-rail" aria-hidden />
          <span className="config-sidebar-avatar config-sidebar-avatar-pinned">
            <Users className="h-5 w-5" />
          </span>
          <span className="config-sidebar-body">
            <span className="config-sidebar-title">Subscriptions</span>
            <span className="config-sidebar-meta-row">
              <span>Manage who watches what</span>
            </span>
          </span>
        </Link>

        <Link
          href="/config/devices"
          className="config-sidebar-item config-sidebar-item-pinned"
          data-active={
            pathname === "/config/devices" ||
            pathname.startsWith("/config/devices/")
              ? true
              : undefined
          }
          style={
            {
              "--accent-from": "#1CB0F6",
              "--accent-to": "#CE82FF",
            } as React.CSSProperties
          }
        >
          <span className="config-sidebar-item-rail" aria-hidden />
          <span className="config-sidebar-avatar config-sidebar-avatar-pinned">
            <Tablet className="h-5 w-5" />
          </span>
          <span className="config-sidebar-body">
            <span className="config-sidebar-title">Devices</span>
            <span className="config-sidebar-meta-row">
              <span>Pair &amp; revoke iPads</span>
            </span>
          </span>
        </Link>

        {filteredCreators.length === 0 && (
          <div className="config-sidebar-empty">
            <p>
              {search.trim()
                ? `No matches for “${search.trim()}”`
                : "No creators yet — add one to get started."}
            </p>
          </div>
        )}

        {filteredCreators.map((creator) => {
          const creatorHref = `/config/creator/${creator.slug}`;
          const onCreatorPage = pathname === creatorHref;
          const onChildChannel = creator.channels.some(
            (ch) => pathname === `/config/channel/${ch.youtube_id}`
          );
          const isActive = onCreatorPage || onChildChannel;
          const accent = accentFor(creator.slug);
          // Auto-open the group when on a child route or when the user
          // searched into it (matched channels list collapses to just hits).
          const open = isActive || deferredSearch.trim().length > 0;
          return (
            <CreatorBranch
              key={creator.id}
              creator={creator}
              creatorHref={creatorHref}
              isActive={isActive}
              accent={accent}
              open={open}
              pathname={pathname}
            />
          );
        })}

        {data.ungroupedChannels.length > 0 && (
          <UngroupedBranch
            channels={data.ungroupedChannels}
            syncedCount={data.ungroupedSyncedCount}
            pathname={pathname}
            open={
              pathname === "/config/ungrouped" ||
              pathname.startsWith("/config/ungrouped/") ||
              data.ungroupedChannels.some(
                (ch) => pathname === `/config/channel/${ch.youtube_id}`
              )
            }
          />
        )}
      </nav>
    </aside>
  );
}

function CreatorBranch({
  creator,
  creatorHref,
  isActive,
  accent,
  open,
  pathname,
}: {
  creator: ConfigCreatorListItem;
  creatorHref: string;
  isActive: boolean;
  accent: { from: string; to: string };
  open: boolean;
  pathname: string;
}) {
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const isOpen = manualOpen ?? open;
  const hasChildren = creator.channels.length > 0;

  return (
    <div className="config-sidebar-branch" data-open={isOpen || undefined}>
      <Link
        href={creatorHref}
        className={
          hasChildren
            ? "config-sidebar-item config-sidebar-item-branchable"
            : "config-sidebar-item"
        }
        data-active={isActive || undefined}
        aria-current={isActive ? "page" : undefined}
        style={
          {
            "--accent-from": accent.from,
            "--accent-to": accent.to,
          } as React.CSSProperties
        }
      >
        <span className="config-sidebar-item-rail" aria-hidden />
        {hasChildren && (
          <button
            type="button"
            className="config-sidebar-twirl"
            data-open={isOpen || undefined}
            aria-label={isOpen ? "Collapse channels" : "Expand channels"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setManualOpen(!isOpen);
            }}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
        <span className="config-sidebar-avatar">
          {creator.avatar ? (
            <img
              src={creator.avatar}
              alt=""
              loading="lazy"
              className="config-sidebar-avatar-img"
            />
          ) : (
            <span className="config-sidebar-avatar-fallback">
              {creator.name.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        <span className="config-sidebar-body">
          <span className="config-sidebar-title">{creator.name}</span>
          <span className="config-sidebar-meta-row">
            <span>
              {creator.channelCount} channel
              {creator.channelCount === 1 ? "" : "s"}
            </span>
            <span aria-hidden>·</span>
            <span>{creator.syncedCount} synced</span>
            {creator.pendingCount > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="config-sidebar-pending-inline">
                  {creator.pendingCount} pending
                </span>
              </>
            )}
          </span>
        </span>
      </Link>

      {hasChildren && isOpen && (
        <ul className="config-sidebar-channels" aria-label={`${creator.name} channels`}>
          {creator.channels.map((channel) => (
            <ChannelLeaf
              key={channel.youtube_id}
              channel={channel}
              pathname={pathname}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function UngroupedBranch({
  channels,
  syncedCount,
  pathname,
  open,
}: {
  channels: ConfigSidebarChannel[];
  syncedCount: number;
  pathname: string;
  open: boolean;
}) {
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const isOpen = manualOpen ?? open;
  const isActive =
    pathname === "/config/ungrouped" ||
    pathname.startsWith("/config/ungrouped/");

  return (
    <div className="config-sidebar-branch" data-open={isOpen || undefined}>
      <Link
        href="/config/ungrouped"
        className={
          channels.length > 0
            ? "config-sidebar-item config-sidebar-item-ungrouped config-sidebar-item-branchable"
            : "config-sidebar-item config-sidebar-item-ungrouped"
        }
        data-active={isActive || undefined}
      >
        <span className="config-sidebar-item-rail" aria-hidden />
        {channels.length > 0 && (
          <button
            type="button"
            className="config-sidebar-twirl"
            data-open={isOpen || undefined}
            aria-label={isOpen ? "Collapse channels" : "Expand channels"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setManualOpen(!isOpen);
            }}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
        <span className="config-sidebar-avatar config-sidebar-avatar-ungrouped">
          <Ungroup className="h-5 w-5" />
        </span>
        <span className="config-sidebar-body">
          <span className="config-sidebar-title">Ungrouped</span>
          <span className="config-sidebar-meta-row">
            <span>
              {channels.length} channel{channels.length === 1 ? "" : "s"}
            </span>
            <span aria-hidden>·</span>
            <span>{syncedCount} synced</span>
          </span>
        </span>
      </Link>

      {isOpen && channels.length > 0 && (
        <ul className="config-sidebar-channels" aria-label="Ungrouped channels">
          {channels.map((channel) => (
            <ChannelLeaf
              key={channel.youtube_id}
              channel={channel}
              pathname={pathname}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

const SYNC_MODE_ICONS: Record<string, React.ReactNode> = {
  sync: <CloudCog className="h-3 w-3" />,
  archive: <Archive className="h-3 w-3" />,
  review: <ClipboardCheck className="h-3 w-3" />,
};

function ChannelLeaf({
  channel,
  pathname,
}: {
  channel: ConfigSidebarChannel;
  pathname: string;
}) {
  const href = `/config/channel/${channel.youtube_id}`;
  const isActive = pathname === href;
  const fallback = channel.avatar ?? channel.thumbnail_url;
  const icon = SYNC_MODE_ICONS[channel.sync_mode] ?? null;

  return (
    <li>
      <Link
        href={href}
        className="config-sidebar-subitem"
        data-active={isActive || undefined}
        data-mode={channel.sync_mode}
        aria-current={isActive ? "page" : undefined}
      >
        <span className="config-sidebar-subitem-rail" aria-hidden />
        <span className="config-sidebar-subavatar">
          {fallback ? (
            <img
              src={fallback}
              alt=""
              loading="lazy"
              className="config-sidebar-subavatar-img"
            />
          ) : (
            <span className="config-sidebar-subavatar-fallback">
              {channel.title.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        <span className="config-sidebar-subitem-body">
          <span className="config-sidebar-subitem-title">{channel.title}</span>
          <span className="config-sidebar-subitem-meta">
            <span
              className="config-sidebar-mode-dot"
              data-mode={channel.sync_mode}
              aria-hidden
            />
            <span className="config-sidebar-mode-label">
              {icon}
              <span>{channel.sync_mode}</span>
            </span>
            <span aria-hidden>·</span>
            <span>{channel.uploaded} on R2</span>
          </span>
        </span>
        {channel.pending > 0 && (
          <span
            className="config-sidebar-subitem-badge"
            title={`${channel.pending} pending review`}
          >
            {channel.pending}
          </span>
        )}
      </Link>
    </li>
  );
}
