"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ListVideo, X } from "lucide-react";
import { useState } from "react";
import type { UpNextPage } from "../_lib/get-up-next";
import type { WatchCreator } from "../_lib/get-watch-creators";
import { UpNextScroller } from "./up-next-scroller";

interface UpNextDrawerProps {
  initialPage: UpNextPage;
  creators: WatchCreator[];
}

// Same rotation as /shows so a creator's color identity stays
// consistent across the app.
const ACCENT_RINGS = [
  { from: "#58CC02", to: "#89E219" },
  { from: "#1CB0F6", to: "#00CD9C" },
  { from: "#CE82FF", to: "#FF4B4B" },
  { from: "#FF9600", to: "#FFC800" },
  { from: "#FF4B4B", to: "#FF9600" },
  { from: "#FFC800", to: "#58CC02" },
  { from: "#00CD9C", to: "#1CB0F6" },
];

export function UpNextDrawer({ initialPage, creators }: UpNextDrawerProps) {
  const [open, setOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={setOpen}
      disablePointerDismissal
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="What's next?"
        aria-haspopup="dialog"
        className={`up-next-fab ${open ? "up-next-fab--hidden" : ""}`}
      >
        <ListVideo className="h-5 w-5" aria-hidden />
        <span className="hidden font-heading text-sm font-semibold sm:inline">
          What&rsquo;s next?
        </span>
      </button>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Popup className="up-next-drawer fixed z-50 flex flex-col bg-background ring-1 ring-border/40 outline-none inset-x-0 bottom-0 h-[78dvh] rounded-t-3xl shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.25)] lg:inset-y-0 lg:right-0 lg:left-auto lg:h-dvh lg:w-[420px] lg:rounded-l-3xl lg:rounded-tr-none lg:shadow-[-12px_0_40px_-12px_rgba(0,0,0,0.25)]">
          <header className="relative flex items-center justify-between px-5 pt-5 pb-3 lg:px-6 lg:pt-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky/12 text-sky ring-1 ring-sky/20">
                <ListVideo className="h-4 w-4" aria-hidden />
              </span>
              <DialogPrimitive.Title className="font-heading text-lg leading-none text-foreground">
                What&rsquo;s next?
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close
              render={
                <button
                  type="button"
                  aria-label="Close"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/60 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                />
              }
            >
              <X className="h-4 w-4" aria-hidden />
            </DialogPrimitive.Close>
          </header>

          {creators.length > 0 && (
            <div className="creator-chips-rail flex shrink-0 gap-3 overflow-x-auto px-4 pb-3 lg:px-5">
              <ChipButton
                isActive={activeSlug === null}
                onClick={() => setActiveSlug(null)}
                label="All"
                rainbow
              />
              {creators.map((creator, index) => {
                const accent = ACCENT_RINGS[index % ACCENT_RINGS.length];
                const isActive = activeSlug === creator.slug;
                return (
                  <ChipButton
                    key={creator.slug}
                    isActive={isActive}
                    onClick={() =>
                      setActiveSlug(isActive ? null : creator.slug)
                    }
                    label={creator.name}
                    avatar={creator.avatar}
                    accent={accent}
                  />
                );
              })}
            </div>
          )}

          <div className="relative flex min-h-0 flex-1 flex-col">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-background to-transparent"
            />
            <UpNextScroller
              initialPage={initialPage}
              creatorSlug={activeSlug}
            />
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

interface ChipButtonProps {
  isActive: boolean;
  onClick: () => void;
  label: string;
  avatar?: string;
  accent?: { from: string; to: string };
  rainbow?: boolean;
}

function ChipButton({
  isActive,
  onClick,
  label,
  avatar,
  accent,
  rainbow,
}: ChipButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className="creator-chip flex shrink-0 cursor-pointer snap-start flex-col items-center gap-1.5 group"
      style={
        accent
          ? ({
              "--accent-from": accent.from,
              "--accent-to": accent.to,
            } as React.CSSProperties)
          : undefined
      }
    >
      <div
        className={`creator-chip-ring creator-chip-ring--sm ${
          rainbow ? "creator-chip-ring-rainbow" : ""
        } ${isActive ? "creator-chip-ring-active" : ""}`}
      >
        <div className="creator-chip-inner flex items-center justify-center bg-background">
          {rainbow ? (
            <span className="font-heading text-sm font-bold text-foreground">
              All
            </span>
          ) : avatar ? (
            <img
              src={avatar}
              alt={label}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <span className="font-heading text-sm font-bold text-foreground">
              {label.charAt(0)}
            </span>
          )}
        </div>
      </div>
      <span
        className={`max-w-16 truncate font-body text-[11px] leading-tight ${
          isActive
            ? "font-bold text-foreground"
            : "font-semibold text-muted-foreground group-hover:text-foreground"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
