"use client";

import {
  AlertCircle,
  Check,
  Eye,
  ExternalLink,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/browser";

interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  customUrl: string;
  thumbnailUrl: string;
  bannerUrl: string | null;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
  publishedAt: string;
}

type Mode = "lookup" | "search";

type State =
  | { kind: "idle" }
  | { kind: "loading"; mode: Mode }
  | { kind: "lookup"; channel: YouTubeChannel }
  | { kind: "search"; results: YouTubeChannel[] }
  | { kind: "error"; message: string };

function detectMode(input: string): Mode {
  const trimmed = input.trim();
  if (trimmed === "") return "search";
  if (trimmed.startsWith("@")) return "lookup";
  if (/youtube\.com\/(@|channel\/)/i.test(trimmed)) return "lookup";
  if (/^UC[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return "lookup";
  return "search";
}

function formatCount(value: string | undefined): string {
  if (!value) return "—";
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n <= 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function NewChannelDialog() {
  const router = useRouter();
  const inputId = useId();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const reqRef = useRef(0);

  const detectedMode = useMemo(() => detectMode(input), [input]);

  // Reset on open and pre-load the set of channel ids already in the library
  useEffect(() => {
    if (!open) return;
    setInput("");
    setState({ kind: "idle" });
    setAdding(new Set());

    const supabase = createClient();
    void supabase
      .from("channels")
      .select("youtube_id")
      .then(({ data }) => {
        if (!data) return;
        setExistingIds(new Set(data.map((r) => r.youtube_id)));
      });
  }, [open]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (trimmed === "") return;
    const mode = detectedMode;
    const myReq = ++reqRef.current;
    setState({ kind: "loading", mode });

    try {
      const url =
        mode === "lookup"
          ? `/api/youtube/channel?input=${encodeURIComponent(trimmed)}`
          : `/api/youtube/search?q=${encodeURIComponent(trimmed)}`;
      const res = await fetch(url);
      const body = await res.json();
      if (myReq !== reqRef.current) return;
      if (!res.ok) {
        setState({
          kind: "error",
          message: body?.error || "Couldn't reach the YouTube API",
        });
        return;
      }
      if (mode === "lookup") {
        setState({ kind: "lookup", channel: body as YouTubeChannel });
      } else {
        const results = (body as YouTubeChannel[]) ?? [];
        setState({ kind: "search", results });
      }
    } catch {
      if (myReq !== reqRef.current) return;
      setState({
        kind: "error",
        message: "Network error — check your connection and try again",
      });
    }
  }

  async function addChannel(channel: YouTubeChannel) {
    if (existingIds.has(channel.id) || adding.has(channel.id)) return;
    setAdding((prev) => new Set(prev).add(channel.id));
    try {
      const supabase = createClient();
      const { error } = await supabase.from("channels").insert({
        youtube_id: channel.id,
        title: channel.title,
        description: channel.description,
        custom_url: channel.customUrl || null,
        thumbnail_url: channel.thumbnailUrl || null,
        banner_url: channel.bannerUrl,
        subscriber_count: parseInt(channel.subscriberCount, 10) || 0,
        subscriber_count_hidden:
          channel.subscriberCount === "0" || !channel.subscriberCount,
        video_count: parseInt(channel.videoCount, 10) || 0,
        view_count: parseInt(channel.viewCount, 10) || 0,
        published_at: channel.publishedAt || null,
        fetched_at: new Date().toISOString(),
      });

      if (error) {
        if (error.code === "23505") {
          setExistingIds((prev) => new Set(prev).add(channel.id));
          toast.info(`${channel.title} is already in your library`);
        } else {
          toast.error("Couldn't save channel");
        }
        return;
      }

      // Re-host the YouTube avatar in R2 in the background. The channel
      // insert succeeds even if this fails; admin can upload manually after.
      if (channel.thumbnailUrl) {
        void fetch("/api/avatars/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "channel",
            id: channel.id,
            sourceUrl: channel.thumbnailUrl,
            alsoSetCreator: true,
          }),
        }).catch(() => {});
      }

      setExistingIds((prev) => new Set(prev).add(channel.id));
      toast.success(`Added ${channel.title} to Ungrouped`);
      router.refresh();
    } finally {
      setAdding((prev) => {
        const next = new Set(prev);
        next.delete(channel.id);
        return next;
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="config-fab"
            title="Add channel"
            aria-label="Add channel"
          />
        }
      >
        <Plus className="h-6 w-6" aria-hidden />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px] max-h-[min(820px,90vh)] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="config-add-title">Add a channel</DialogTitle>
          <DialogDescription>
            Paste a YouTube URL, drop in a{" "}
            <code className="config-add-kbd">@handle</code>, or type a name to
            search. New channels land in <strong>Ungrouped</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="config-add-search">
          <Search aria-hidden className="config-add-search-icon" />
          <input
            id={inputId}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="@handle, youtube.com/@…, UCxxxx, or a channel name"
            aria-label="Channel handle, URL, or name"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            className="config-add-search-input"
          />
          <span
            className="config-add-mode-badge"
            data-mode={detectedMode}
            aria-hidden
          >
            {detectedMode === "lookup" ? (
              <>
                <Sparkles className="h-3 w-3" />
                <span>Lookup</span>
              </>
            ) : (
              <>
                <Search className="h-3 w-3" />
                <span>Search</span>
              </>
            )}
          </span>
          <Button
            type="submit"
            disabled={
              input.trim() === "" ||
              (state.kind === "loading" && state.mode === detectedMode)
            }
            className="config-add-submit"
          >
            {state.kind === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : detectedMode === "lookup" ? (
              "Look up"
            ) : (
              "Search"
            )}
          </Button>
        </form>

        <div className="config-add-results" aria-live="polite">
          {state.kind === "idle" && <IdleHints />}

          {state.kind === "loading" && (
            <div className="config-add-skeletons">
              {Array.from({ length: state.mode === "lookup" ? 1 : 4 }).map(
                (_, i) => (
                  <div key={i} className="config-add-skeleton" />
                )
              )}
            </div>
          )}

          {state.kind === "error" && (
            <div className="config-add-error">
              <AlertCircle className="h-4 w-4" />
              <span>{state.message}</span>
            </div>
          )}

          {state.kind === "lookup" && (
            <ChannelCard
              channel={state.channel}
              variant="lookup"
              alreadyAdded={existingIds.has(state.channel.id)}
              adding={adding.has(state.channel.id)}
              onAdd={() => addChannel(state.channel)}
            />
          )}

          {state.kind === "search" && (
            <>
              {state.results.length === 0 ? (
                <p className="config-add-empty">
                  No channels matched &ldquo;{input.trim()}&rdquo;.
                </p>
              ) : (
                <div className="config-add-grid">
                  {state.results.map((c) => (
                    <ChannelCard
                      key={c.id}
                      channel={c}
                      variant="search"
                      alreadyAdded={existingIds.has(c.id)}
                      adding={adding.has(c.id)}
                      onAdd={() => addChannel(c)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IdleHints() {
  return (
    <div className="config-add-hints">
      <p className="config-add-hints-eyebrow">Quick tips</p>
      <ul>
        <li>
          <code className="config-add-kbd">@blippi</code> — direct handle
          lookup
        </li>
        <li>
          <code className="config-add-kbd">youtube.com/@cocomelon</code> —
          paste any channel URL
        </li>
        <li>
          <code className="config-add-kbd">UCbCmjCuTUZos6Inko4u57UQ</code> —
          raw channel ID
        </li>
        <li>
          <code className="config-add-kbd">cocomelon</code> — free text
          searches YouTube
        </li>
      </ul>
    </div>
  );
}

interface ChannelCardProps {
  channel: YouTubeChannel;
  variant: "lookup" | "search";
  alreadyAdded: boolean;
  adding: boolean;
  onAdd: () => void;
}

function ChannelCard({
  channel,
  variant,
  alreadyAdded,
  adding,
  onAdd,
}: ChannelCardProps) {
  const subs = formatCount(channel.subscriberCount);
  const videos = formatCount(channel.videoCount);
  const views = formatCount(channel.viewCount);
  const handle = channel.customUrl || `@${channel.id.slice(0, 12)}`;

  return (
    <article
      className="config-add-card"
      data-variant={variant}
      data-added={alreadyAdded || undefined}
    >
      <div className="config-add-card-avatar">
        {channel.thumbnailUrl ? (
          <img
            src={channel.thumbnailUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span>{channel.title.charAt(0).toUpperCase()}</span>
        )}
      </div>

      <div className="config-add-card-body">
        <h4 className="config-add-card-title">{channel.title}</h4>
        <p className="config-add-card-handle">{handle}</p>
        <div className="config-add-card-meta">
          <span title="Subscribers">
            <Users className="h-3 w-3" aria-hidden />
            {subs}
          </span>
          <span aria-hidden>·</span>
          <span title="Videos">
            <Video className="h-3 w-3" aria-hidden />
            {videos}
          </span>
          {variant === "lookup" && (
            <>
              <span aria-hidden>·</span>
              <span title="Total views">
                <Eye className="h-3 w-3" aria-hidden />
                {views}
              </span>
            </>
          )}
        </div>
        {variant === "lookup" && channel.description && (
          <p className="config-add-card-desc">{channel.description}</p>
        )}
      </div>

      <div className="config-add-card-actions">
        <a
          href={`https://www.youtube.com/${
            channel.customUrl || `channel/${channel.id}`
          }`}
          target="_blank"
          rel="noopener noreferrer"
          className="config-add-card-open"
          title="Open on YouTube"
          aria-label={`Open ${channel.title} on YouTube`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        {alreadyAdded ? (
          <span className="config-add-card-added">
            <Check className="h-3.5 w-3.5" />
            <span>Added</span>
          </span>
        ) : (
          <Button
            type="button"
            onClick={onAdd}
            disabled={adding}
            size="sm"
            className="config-add-card-add"
          >
            {adding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </>
            )}
          </Button>
        )}
      </div>
    </article>
  );
}
