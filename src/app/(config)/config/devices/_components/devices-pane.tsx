"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Copy,
  Loader2,
  PlusCircle,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  DevicesKid,
  DevicesPaneData,
  DevicesRow,
} from "../_lib/get-devices";

/* ─── Per-kid accent palette (matches subscription matrix) ─── */
const ACCENTS = [
  { from: "#FF4B4B", to: "#FF9600" },
  { from: "#1CB0F6", to: "#00CD9C" },
  { from: "#FFC800", to: "#58CC02" },
  { from: "#CE82FF", to: "#FF4B4B" },
  { from: "#00CD9C", to: "#1CB0F6" },
  { from: "#FF9600", to: "#FFC800" },
];

function accentFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return ACCENTS[hash % ACCENTS.length];
}

function kidDisplayName(k: DevicesKid): string {
  return k.firstName ?? k.email.split("@")[0] ?? "Kid";
}

interface PairResponse {
  code: string;
  expiresAt: string;
}

interface ActiveCode extends PairResponse {
  kidUserId: string;
  kidLabel: string;
  accent: { from: string; to: string };
}

async function generateCode(kidUserId: string): Promise<PairResponse> {
  const res = await fetch("/api/devices/pair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kidUserId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Could not generate code");
  }
  return (await res.json()) as PairResponse;
}

async function revokeDevice(deviceId: string): Promise<void> {
  const res = await fetch("/api/devices/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Could not revoke device");
  }
}

// Clipboard API requires a secure context; fall back to legacy copy on
// http://*.test dev hosts where navigator.clipboard is undefined.
async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through
    }
  }
  if (typeof document === "undefined") return false;
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.round(ms / 1000);
  if (sec < 45) return "just now";
  if (sec < 90) return "a minute ago";
  const min = Math.round(sec / 60);
  if (min < 45) return `${min} minutes ago`;
  if (min < 90) return "an hour ago";
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hours ago`;
  const day = Math.round(hr / 24);
  if (day < 2) return "yesterday";
  if (day < 14) return `${day} days ago`;
  if (day < 60) return `${Math.round(day / 7)} weeks ago`;
  return `${Math.round(day / 30)} months ago`;
}

function freshness(lastSeenAt: string | null): "fresh" | "warm" | "stale" {
  if (!lastSeenAt) return "stale";
  const ms = Date.now() - new Date(lastSeenAt).getTime();
  const hr = ms / 3_600_000;
  if (hr < 24) return "fresh";
  if (hr < 7 * 24) return "warm";
  return "stale";
}

interface Props {
  data: DevicesPaneData;
}

export function DevicesPane({ data }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { kids, devices } = data;
  const [activeCode, setActiveCode] = useState<ActiveCode | null>(null);

  const devicesByKid = useMemo(() => {
    const m = new Map<string, DevicesRow[]>();
    for (const d of devices) {
      const arr = m.get(d.kidUserId) ?? [];
      arr.push(d);
      m.set(d.kidUserId, arr);
    }
    return m;
  }, [devices]);

  const totals = useMemo(() => {
    let active = 0;
    let revoked = 0;
    for (const d of devices) {
      if (d.revokedAt === null) active += 1;
      else revoked += 1;
    }
    return { active, revoked };
  }, [devices]);

  const pairMutation = useMutation({
    mutationFn: async (kid: DevicesKid) => {
      const result = await generateCode(kid.id);
      return {
        ...result,
        kidUserId: kid.id,
        kidLabel: kidDisplayName(kid),
        accent: accentFor(kid.id),
      } satisfies ActiveCode;
    },
    onSuccess: (active) => setActiveCode(active),
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Pairing failed");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeDevice,
    onSuccess: () => {
      toast.success("Device revoked");
      // Server data — refresh the page tree so the layout/sidebar see fresh
      // state, plus invalidate any react-query caches just in case other
      // surfaces are subscribed.
      queryClient.invalidateQueries({ queryKey: ["admin-devices"] });
      router.refresh();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Revoke failed");
    },
  });

  return (
    <div className="config-devices" data-canvas="muted">
      <Toaster position="top-center" richColors />

      {/* ── Toolbar ── */}
      <header className="config-devices-toolbar">
        <div className="config-devices-headline-text">
          <span className="config-devices-eyebrow font-body">
            <Tablet className="h-3.5 w-3.5" aria-hidden />
            Devices
          </span>
          <h1 className="config-devices-title font-heading">
            {kids.length} {kids.length === 1 ? "kid" : "kids"} ·{" "}
            <span className="config-devices-stat-strong">
              {totals.active} active
            </span>
            {totals.revoked > 0 && (
              <>
                {" "}·{" "}
                <span className="config-devices-stat-muted">
                  {totals.revoked} revoked
                </span>
              </>
            )}
          </h1>
          <p className="config-devices-sub font-body">
            Pair an iPad with a 6-digit code. Revoke any time to sign that
            iPad out everywhere.
          </p>
        </div>
      </header>

      {/* ── Kid grid ── */}
      {kids.length === 0 ? (
        <div className="config-devices-empty-global font-body">
          <Sparkles className="h-5 w-5" aria-hidden />
          <p>
            No member accounts yet. Create kids in the Supabase dashboard
            first, then come back here to pair their iPads.
          </p>
        </div>
      ) : (
        <div className="config-devices-grid">
          {kids.map((kid) => {
            const accent = accentFor(kid.id);
            const kidDevices = devicesByKid.get(kid.id) ?? [];
            const active = kidDevices.filter((d) => d.revokedAt === null);
            const revoked = kidDevices.filter((d) => d.revokedAt !== null);
            const sorted = [...active, ...revoked];
            const isPairing =
              pairMutation.isPending && pairMutation.variables?.id === kid.id;

            return (
              <article
                key={kid.id}
                className="config-devices-kid"
                style={
                  {
                    "--accent-from": accent.from,
                    "--accent-to": accent.to,
                  } as React.CSSProperties
                }
              >
                <span className="config-devices-kid-rail" aria-hidden />

                <div className="config-devices-kid-head">
                  <div className="config-devices-kid-identity">
                    <span
                      className="config-devices-kid-avatar"
                      aria-hidden
                    >
                      {kidDisplayName(kid).charAt(0).toUpperCase()}
                    </span>
                    <div className="config-devices-kid-name-block">
                      <h2 className="config-devices-kid-name font-heading">
                        {kidDisplayName(kid)}
                      </h2>
                      <span className="config-devices-kid-meta font-body">
                        {active.length === 0
                          ? "No active iPads"
                          : `${active.length} active iPad${
                              active.length === 1 ? "" : "s"
                            }`}
                        {revoked.length > 0 && (
                          <>
                            <span aria-hidden>·</span>
                            <span className="config-devices-kid-meta-muted">
                              {revoked.length} revoked
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => pairMutation.mutate(kid)}
                    disabled={pairMutation.isPending}
                    className="config-devices-pair-btn font-heading"
                  >
                    {isPairing ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <PlusCircle className="h-4 w-4" aria-hidden />
                    )}
                    <span>Pair iPad</span>
                  </button>
                </div>

                {sorted.length === 0 ? (
                  <div className="config-devices-empty-kid font-body">
                    <Tablet className="h-4 w-4" aria-hidden />
                    <span>
                      Tap <strong>Pair iPad</strong> to add this kid&rsquo;s
                      first device.
                    </span>
                  </div>
                ) : (
                  <ul className="config-devices-list" aria-label="Devices">
                    {sorted.map((d) => (
                      <DeviceRow
                        key={d.id}
                        device={d}
                        onRevoke={() => revokeMutation.mutate(d.id)}
                        revoking={
                          revokeMutation.isPending &&
                          revokeMutation.variables === d.id
                        }
                      />
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}

      <PairCodeDialog
        active={activeCode}
        onClose={() => {
          setActiveCode(null);
          // Refresh page data — the new pairing will materialize as a row
          // once the kid claims it; nothing to do until then. But invalidate
          // anyway so a quick re-open shows up if claimed.
          router.refresh();
        }}
      />
    </div>
  );
}

/* ─── Device row ─── */

interface DeviceRowProps {
  device: DevicesRow;
  onRevoke: () => void;
  revoking: boolean;
}

function DeviceRow({ device, onRevoke, revoking }: DeviceRowProps) {
  const isRevoked = device.revokedAt !== null;
  const fresh = freshness(device.lastSeenAt);
  const label = device.deviceLabel?.trim() || "iPad";
  const seen = device.lastSeenAt
    ? `Last seen ${formatRelative(device.lastSeenAt)}`
    : `Paired ${formatRelative(device.createdAt)}`;

  return (
    <li
      className="config-devices-device"
      data-revoked={isRevoked || undefined}
      data-fresh={isRevoked ? undefined : fresh}
    >
      <span className="config-devices-device-icon" aria-hidden>
        <Smartphone className="h-4 w-4" />
      </span>
      <div className="config-devices-device-body">
        <span className="config-devices-device-label font-body">
          {label}
          {isRevoked && (
            <span className="config-devices-device-tag">revoked</span>
          )}
        </span>
        <span className="config-devices-device-meta font-body">
          <span
            className="config-devices-device-pulse"
            aria-hidden
            data-fresh={isRevoked ? undefined : fresh}
          />
          <span>{seen}</span>
        </span>
      </div>
      {!isRevoked && (
        <button
          type="button"
          onClick={onRevoke}
          disabled={revoking}
          className="config-devices-revoke-btn font-body"
          title="Revoke this device"
          aria-label="Revoke device"
        >
          {revoking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          )}
          <span>Revoke</span>
        </button>
      )}
    </li>
  );
}

/* ─── Pair code dialog ─── */

interface PairCodeDialogProps {
  active: ActiveCode | null;
  onClose: () => void;
}

function PairCodeDialog({ active, onClose }: PairCodeDialogProps) {
  const [remaining, setRemaining] = useState<number>(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      if (interval.current) clearInterval(interval.current);
      interval.current = null;
      return;
    }
    const expires = new Date(active.expiresAt).getTime();
    const tick = () => {
      const ms = expires - Date.now();
      setRemaining(Math.max(0, Math.ceil(ms / 1000)));
    };
    tick();
    interval.current = setInterval(tick, 250);
    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, [active]);

  const expired = active !== null && remaining === 0;

  return (
    <Dialog
      open={active !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="config-devices-dialog text-center sm:max-w-md"
        style={
          active
            ? ({
                "--accent-from": active.accent.from,
                "--accent-to": active.accent.to,
              } as React.CSSProperties)
            : undefined
        }
      >
        <DialogHeader className="items-center">
          <span className="config-devices-dialog-eyebrow font-body">
            Pairing code
          </span>
          <DialogTitle className="config-devices-dialog-title font-heading">
            {active?.kidLabel}
          </DialogTitle>
          <DialogDescription className="config-devices-dialog-sub font-body">
            On the iPad, open{" "}
            <span className="config-devices-dialog-route">/pair</span> and
            enter this code.
          </DialogDescription>
        </DialogHeader>
        {active && (
          <div className="config-devices-code-wrap">
            <div className="config-devices-code" data-expired={expired || undefined}>
              {active.code.split("").map((digit, i) => (
                <span key={i} className="config-devices-code-cell font-heading">
                  {digit}
                </span>
              ))}
            </div>

            <div className="config-devices-code-foot">
              <span
                className="config-devices-code-timer font-body"
                data-expired={expired || undefined}
              >
                {expired
                  ? "Expired — close and try again"
                  : `${Math.floor(remaining / 60)}:${String(
                      remaining % 60
                    ).padStart(2, "0")} left`}
              </span>
              <button
                type="button"
                onClick={async () => {
                  if (await copyToClipboard(active.code)) {
                    toast.success("Code copied");
                  } else {
                    toast.error("Copy failed — read it from the screen");
                  }
                }}
                disabled={expired}
                className="config-devices-code-copy font-body"
              >
                <Copy className="h-3 w-3" aria-hidden />
                <span>Copy</span>
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

