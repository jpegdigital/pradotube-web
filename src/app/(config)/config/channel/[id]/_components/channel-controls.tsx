"use client";

import { Archive, ClipboardCheck, CloudCog, Library, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";
import type { ChannelDetailRow } from "../_lib/get-channel-detail";

type ChannelPatch = Database["pradotube"]["Tables"]["channels"]["Update"];

const FRACTION_EPSILON = 0.005;
const SHARE_COMMIT_MS = 350;

function formatGb(gb: number): string {
  if (!Number.isFinite(gb) || gb <= 0) return "0 GB";
  if (gb >= 100) return `${gb.toFixed(0)} GB`;
  if (gb >= 10) return `${gb.toFixed(1)} GB`;
  return `${gb.toFixed(2)} GB`;
}

const SYNC_MODES = [
  {
    key: "sync" as const,
    label: "Sync",
    icon: <CloudCog className="h-4 w-4" />,
    description: "Rolling window — auto-downloads new uploads.",
  },
  {
    key: "archive" as const,
    label: "Archive",
    icon: <Archive className="h-4 w-4" />,
    description: "Keeps every video permanently.",
  },
  {
    key: "review" as const,
    label: "Review",
    icon: <ClipboardCheck className="h-4 w-4" />,
    description: "Every new video waits for human approval.",
  },
];

interface ChannelControlsProps {
  channel: ChannelDetailRow;
}

export function ChannelControls({ channel }: ChannelControlsProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [syncMode, setSyncMode] = useState(channel.sync_mode);
  const [minDuration, setMinDuration] = useState(
    channel.min_duration_override != null
      ? String(channel.min_duration_override)
      : ""
  );
  const [maxDuration, setMaxDuration] = useState(
    String(channel.max_duration_seconds)
  );
  const [catalogFraction, setCatalogFraction] = useState<number>(
    Number(channel.catalog_fraction)
  );
  const [storageBudget, setStorageBudget] = useState<string>(
    String(Number(channel.storage_budget_gb))
  );

  const storageBudgetGb = Number(storageBudget) || 0;
  const catalogGb = storageBudgetGb * catalogFraction;
  const freshGb = Math.max(0, storageBudgetGb - catalogGb);

  async function update(
    patch: ChannelPatch,
    successMsg?: string
  ): Promise<boolean> {
    setPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("channels")
        .update(patch)
        .eq("youtube_id", channel.youtube_id);
      if (error) {
        toast.error("Couldn't save change");
        return false;
      }
      if (successMsg) toast.success(successMsg);
      startTransition(() => router.refresh());
      return true;
    } finally {
      setPending(false);
    }
  }

  async function handleSyncMode(next: "sync" | "archive" | "review") {
    if (next === syncMode) return;
    const previous = syncMode;
    setSyncMode(next);

    const supabase = createClient();
    const { error } = await supabase
      .from("channels")
      .update({ sync_mode: next })
      .eq("youtube_id", channel.youtube_id);
    if (error) {
      setSyncMode(previous);
      toast.error("Couldn't change sync mode");
      return;
    }

    // Switching INTO review demotes pending auto-downloads so the kid feed
    // doesn't get a flood while the parent is still deciding.
    if (next === "review") {
      const { data: demoted } = await supabase
        .from("videos")
        .update({ decision: "pending" })
        .eq("channel_id", channel.youtube_id)
        .eq("decision", "auto")
        .is("r2_synced_at", null)
        .select("youtube_id");
      const count = demoted?.length ?? 0;
      toast.success(
        count > 0
          ? `Review mode — ${count} video${count === 1 ? "" : "s"} sent to review`
          : "Sync mode: review"
      );
    } else {
      toast.success(`Sync mode: ${next}`);
    }
    startTransition(() => router.refresh());
  }

  // Slider: update local state on every input event so the readout tracks the
  // thumb, but debounce the DB write so we don't spam updates while dragging.
  const shareCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedFraction = useRef(catalogFraction);

  useEffect(() => {
    return () => {
      if (shareCommitTimer.current) clearTimeout(shareCommitTimer.current);
    };
  }, []);

  function handleShareInput(rawPct: number) {
    const next = Math.max(0, Math.min(1, rawPct / 100));
    setCatalogFraction(next);
    if (shareCommitTimer.current) clearTimeout(shareCommitTimer.current);
    shareCommitTimer.current = setTimeout(() => {
      void commitShare(next);
    }, SHARE_COMMIT_MS);
  }

  async function commitShare(next: number) {
    if (Math.abs(next - lastCommittedFraction.current) < FRACTION_EPSILON) {
      return;
    }
    const previous = lastCommittedFraction.current;
    lastCommittedFraction.current = next;
    const ok = await update(
      { catalog_fraction: next },
      `Catalog share: ${Math.round(next * 100)}%`
    );
    if (!ok) {
      lastCommittedFraction.current = previous;
      setCatalogFraction(previous);
    }
  }

  function flushShareCommit() {
    if (shareCommitTimer.current) {
      clearTimeout(shareCommitTimer.current);
      shareCommitTimer.current = null;
    }
    void commitShare(catalogFraction);
  }

  function commitMinDuration() {
    const trimmed = minDuration.trim();
    const next = trimmed === "" ? null : parseInt(trimmed, 10);
    const prev = channel.min_duration_override ?? null;
    const normalized = next != null && Number.isNaN(next) ? null : next;
    if (normalized === prev) return;
    void update(
      { min_duration_override: normalized },
      normalized
        ? `Min duration: ${normalized}s`
        : "Min duration: default (300s)"
    );
  }

  async function commitMaxDuration() {
    const trimmed = maxDuration.trim();
    const parsed = parseInt(trimmed, 10);
    const previousValue = channel.max_duration_seconds;
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMaxDuration(String(previousValue));
      return;
    }
    if (parsed === previousValue) return;
    setMaxDuration(String(parsed));
    const ok = await update(
      { max_duration_seconds: parsed },
      `Max duration: ${parsed}s`
    );
    if (!ok) setMaxDuration(String(previousValue));
  }

  async function commitStorageBudget() {
    const trimmed = storageBudget.trim();
    const parsed = trimmed === "" ? NaN : parseFloat(trimmed);
    const previousValue = Number(channel.storage_budget_gb);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setStorageBudget(String(previousValue));
      return;
    }
    const rounded = Math.round(parsed * 10) / 10;
    if (Math.abs(rounded - previousValue) < 0.05) {
      setStorageBudget(String(rounded));
      return;
    }
    setStorageBudget(String(rounded));
    const ok = await update(
      { storage_budget_gb: rounded },
      `Budget: ${formatGb(rounded)}`
    );
    if (!ok) setStorageBudget(String(previousValue));
  }

  const sharePct = Math.round(catalogFraction * 100);

  return (
    <section className="channel-control-bar" aria-busy={pending || undefined}>
      <div className="channel-control-row">
        <div className="channel-control-block">
          <span className="channel-control-label font-body">Mode</span>
          <div role="tablist" className="channel-control-mode-row">
            {SYNC_MODES.map((mode) => (
              <button
                key={mode.key}
                type="button"
                role="tab"
                aria-selected={syncMode === mode.key}
                onClick={() => handleSyncMode(mode.key)}
                className={`channel-control-mode channel-control-mode-${mode.key}`}
                data-active={syncMode === mode.key || undefined}
                title={mode.description}
              >
                {mode.icon}
                <span>{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="channel-control-divider" aria-hidden />

        <div className="channel-control-block channel-control-block-duration">
          <span
            className="channel-control-label font-body"
            title="Min/max video duration in seconds (defaults: 300 / 3600)"
          >
            Duration
          </span>
          <div className="config-limits">
            <span className="config-limits-segment">
              <span className="config-limits-prefix">≥</span>
              <input
                type="number"
                min={0}
                step={30}
                placeholder="300"
                value={minDuration}
                onChange={(e) => setMinDuration(e.target.value)}
                onBlur={commitMinDuration}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                aria-label="Minimum video duration in seconds"
              />
              <span className="config-limits-suffix">sec</span>
            </span>
            <span className="config-limits-divider" aria-hidden />
            <span className="config-limits-segment">
              <span className="config-limits-prefix">≤</span>
              <input
                type="number"
                min={1}
                step={60}
                placeholder="3600"
                value={maxDuration}
                onChange={(e) => setMaxDuration(e.target.value)}
                onBlur={() => void commitMaxDuration()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                aria-label="Maximum video duration in seconds"
              />
              <span className="config-limits-suffix">sec</span>
            </span>
          </div>
        </div>
      </div>

      <div className="channel-control-row channel-control-row-budget">
        <div className="channel-control-block channel-control-block-share">
          <span
            className="channel-control-label font-body"
            title="Drag to adjust the catalog/fresh storage split"
          >
            Share
          </span>
          <div className="share-slider">
            <span className="share-slider-chip share-slider-chip-catalog">
              <Library className="h-3 w-3" />
              <span className="share-slider-chip-num">
                {formatGb(catalogGb)}
              </span>
              <span className="share-slider-chip-label">catalog</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={sharePct}
              onChange={(e) => handleShareInput(Number(e.target.value))}
              onPointerUp={flushShareCommit}
              onKeyUp={flushShareCommit}
              onBlur={flushShareCommit}
              disabled={pending}
              className="share-slider-input"
              style={
                {
                  "--share-pct": `${sharePct}%`,
                } as React.CSSProperties
              }
              aria-label={`Catalog share: ${sharePct} percent`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={sharePct}
            />
            <span className="share-slider-chip share-slider-chip-fresh">
              <span className="share-slider-chip-label">fresh</span>
              <span className="share-slider-chip-num">{formatGb(freshGb)}</span>
              <Sparkles className="h-3 w-3" />
            </span>
            <span className="share-slider-pct font-heading" aria-hidden>
              {sharePct}%
            </span>
          </div>
        </div>

        <div className="channel-control-divider" aria-hidden />

        <div className="channel-control-block channel-control-block-budget-only">
          <span
            className="channel-control-label font-body"
            title="Total storage allowance for this channel"
          >
            Budget
          </span>
          <div className="config-limits">
            <span className="config-limits-segment">
              <input
                type="number"
                min={0.5}
                step={0.5}
                placeholder="10"
                value={storageBudget}
                onChange={(e) => setStorageBudget(e.target.value)}
                onBlur={() => void commitStorageBudget()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                aria-label="Storage budget in gigabytes"
              />
              <span className="config-limits-suffix">GB</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
