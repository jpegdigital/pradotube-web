"use client";

import Link from "next/link";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { LogOut, Moon, Sun, SunMoon, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { useCurrentUserSnapshot } from "@/lib/auth/current-user-store";
import { useMountEffect } from "@/hooks/use-mount-effect";

// Rainbow palette borrowed from globals.css feature tokens.
const AVATAR_PALETTE = [
  { from: "#FF4B4B", to: "#FF9600" }, // coral → peach
  { from: "#FF9600", to: "#FFC800" }, // peach → sunflower
  { from: "#58CC02", to: "#00CD9C" }, // mint → teal
  { from: "#1CB0F6", to: "#CE82FF" }, // sky → lavender
  { from: "#CE82FF", to: "#FF4B4B" }, // lavender → coral
  { from: "#00CD9C", to: "#1CB0F6" }, // teal → sky
];

function pickPalette(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function initialsFor(displayName: string, email: string | null) {
  const source = displayName?.trim() || email?.split("@")[0] || "U";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function SettingsMenu() {
  const snapshot = useCurrentUserSnapshot();
  const { resolvedTheme, theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useMountEffect(() => setMounted(true));

  if (snapshot.status === "loading") return <SettingsMenuSkeleton />;
  if (snapshot.status === "anonymous") return null;

  const currentUser = snapshot.user;
  const palette = pickPalette(currentUser.id);
  const initials = initialsFor(currentUser.displayName, currentUser.email);
  const activeTheme = mounted ? (theme ?? resolvedTheme ?? "system") : "system";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = `${process.env.NEXT_PUBLIC_AUTH_URL}/logout`;
  }

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger
        className="settings-pill group inline-flex cursor-pointer items-center gap-2.5 rounded-full py-1 pl-1.5 pr-1.5 sm:pr-4 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-label="Open account menu"
      >
        <span
          className="settings-avatar relative flex h-8 w-8 items-center justify-center rounded-full font-heading text-[12px] font-bold text-white"
          style={{
            backgroundImage: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
          }}
        >
          {initials}
        </span>
        <span className="hidden font-body text-xs font-semibold tracking-tight text-foreground/75 sm:inline">
          {currentUser.displayName}
        </span>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          sideOffset={10}
          align="end"
          className="z-50 outline-none"
        >
          <PopoverPrimitive.Popup className="settings-popup w-[280px] origin-top-right overflow-hidden rounded-3xl bg-popover p-0 text-popover-foreground shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)] outline-none ring-1 ring-foreground/[0.06] data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95 dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]">
            {/* Rainbow accent strip */}
            <div className="settings-rainbow-strip" aria-hidden />

            {/* Identity card */}
            <div className="flex items-center gap-3 px-4 pt-5 pb-4">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-heading text-base font-bold text-white shadow-md"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
                }}
              >
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-heading text-base text-foreground leading-tight truncate">
                  {currentUser.displayName}
                </div>
                {currentUser.email && (
                  <div className="font-body text-[11px] text-muted-foreground truncate mt-0.5">
                    {currentUser.email}
                  </div>
                )}
              </div>
            </div>

            <Divider />

            {/* Theme — segmented switch */}
            <div className="px-4 py-3">
              <div className="font-body text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70 mb-2">
                Appearance
              </div>
              <div
                role="radiogroup"
                aria-label="Theme"
                className="settings-segmented"
              >
                <ThemeSegment
                  active={activeTheme === "light"}
                  onClick={() => setTheme("light")}
                  icon={<Sun className="h-3.5 w-3.5" />}
                  label="Light"
                />
                <ThemeSegment
                  active={activeTheme === "dark"}
                  onClick={() => setTheme("dark")}
                  icon={<Moon className="h-3.5 w-3.5" />}
                  label="Dark"
                />
                <ThemeSegment
                  active={activeTheme === "system"}
                  onClick={() => setTheme("system")}
                  icon={<SunMoon className="h-3.5 w-3.5" />}
                  label="Auto"
                />
              </div>
            </div>

            {currentUser.isAdmin && (
              <>
                <Divider />
                <div className="px-2 py-2">
                  <PopoverPrimitive.Close
                    nativeButton={false}
                    render={
                      <Link
                        href="/config"
                        className="settings-row flex items-center gap-3 rounded-xl px-3 py-2.5 font-body text-sm font-medium text-foreground transition-colors hover:bg-foreground/[0.04]"
                      />
                    }
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Wrench className="h-3.5 w-3.5" />
                    </span>
                    Admin panel
                  </PopoverPrimitive.Close>
                </div>
              </>
            )}

            {/* Sign out is admin-only. Kids are paired to a dedicated device
                via /config/devices — clearing their session locally would
                just bounce them through /api/session/refresh and back into a
                session, since pt_device is still on the device. The parent
                signs them out by revoking the device. */}
            {currentUser.isAdmin && (
              <>
                <Divider />
                <div className="px-2 py-2 pb-3">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-body text-sm font-medium text-destructive transition-colors hover:bg-destructive/8"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                      <LogOut className="h-3.5 w-3.5" />
                    </span>
                    Sign out
                  </button>
                </div>
              </>
            )}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function SettingsMenuSkeleton() {
  return (
    <div
      className="settings-pill inline-flex items-center gap-2.5 rounded-full py-1 pl-1.5 pr-1.5 sm:pr-4"
      aria-hidden
    >
      <span className="h-8 w-8 animate-pulse rounded-full bg-foreground/10" />
      <span className="hidden h-3 w-10 animate-pulse rounded-full bg-foreground/10 sm:inline-block" />
    </div>
  );
}

function Divider() {
  return <div className="mx-4 h-px bg-foreground/[0.06]" aria-hidden />;
}

function ThemeSegment({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      data-active={active || undefined}
      className="settings-segment flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 font-body text-xs font-semibold text-muted-foreground transition-all data-[active]:text-foreground"
    >
      {icon}
      {label}
    </button>
  );
}
