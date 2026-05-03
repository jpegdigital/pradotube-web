"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useMountEffect } from "@/hooks/use-mount-effect";
import {
  ArrowLeft,
  Copy,
  Loader2,
  Moon,
  PlusCircle,
  Smartphone,
  Sun,
  Trash2,
  Tv,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/browser";

// Clipboard API requires a secure context (HTTPS or localhost). Local dev runs
// over HTTP on a custom hostname, so navigator.clipboard is undefined there.
// Fall back to the legacy execCommand path so admin Copy still works.
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

interface UserRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
}

interface DeviceRow {
  id: string;
  kid_user_id: string;
  device_label: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
}

interface PairResponse {
  code: string;
  expiresAt: string;
}

async function fetchUsers(): Promise<UserRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("list_users");
  if (error) throw new Error("Failed to load users");
  return (data ?? []) as UserRow[];
}

async function fetchDevices(): Promise<DeviceRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("kid_devices")
    .select(
      "id, kid_user_id, device_label, user_agent, created_at, last_seen_at, revoked_at"
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error("Failed to load devices");
  return (data ?? []) as DeviceRow[];
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

interface ActiveCode extends PairResponse {
  kidUserId: string;
  kidLabel: string;
}

export default function DevicesPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useMountEffect(() => setMounted(true));
  const queryClient = useQueryClient();

  const [activeCode, setActiveCode] = useState<ActiveCode | null>(null);

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000,
  });

  const { data: devices = [], isLoading: loadingDevices } = useQuery({
    queryKey: ["admin-devices"],
    queryFn: fetchDevices,
    staleTime: 30 * 1000,
  });

  const kids = users.filter((u) => !u.is_admin);
  const devicesByKid = new Map<string, DeviceRow[]>();
  for (const d of devices) {
    const arr = devicesByKid.get(d.kid_user_id) ?? [];
    arr.push(d);
    devicesByKid.set(d.kid_user_id, arr);
  }

  const pairMutation = useMutation({
    mutationFn: async (kidUserId: string) => {
      const result = await generateCode(kidUserId);
      const kid = kids.find((k) => k.id === kidUserId);
      const label =
        kid?.first_name ?? kid?.email?.split("@")[0] ?? "this kid";
      return { ...result, kidUserId, kidLabel: label } satisfies ActiveCode;
    },
    onSuccess: (active) => {
      setActiveCode(active);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Pairing failed");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeDevice,
    onSuccess: () => {
      toast.success("Device revoked");
      queryClient.invalidateQueries({ queryKey: ["admin-devices"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Revoke failed");
    },
  });

  const isLoading = loadingUsers || loadingDevices;

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" richColors />

      <header className="player-header sticky top-0 z-50 border-b border-border/50 px-5 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#89E219] shadow-sm">
                <Tv className="h-4.5 w-4.5 text-white" />
              </div>
            </Link>
            <h1 className="font-heading text-lg text-foreground">Devices</h1>
          </div>
          <button
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            className="rounded-xl p-2 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
          >
            {mounted && resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : kids.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-body text-muted-foreground">
              No member accounts yet. Create users in the Supabase Dashboard.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {kids.map((kid) => {
              const kidDevices = devicesByKid.get(kid.id) ?? [];
              const activeDevices = kidDevices.filter(
                (d) => d.revoked_at === null
              );
              const revokedDevices = kidDevices.filter(
                (d) => d.revoked_at !== null
              );
              const displayName =
                kid.first_name ?? kid.email?.split("@")[0] ?? "User";

              return (
                <Card key={kid.id} className="p-6">
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
                        <span className="font-heading text-sm text-primary font-semibold">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h2 className="font-heading text-lg text-foreground">
                          {displayName}
                        </h2>
                        <span className="font-body text-xs text-muted-foreground">
                          {activeDevices.length} active device
                          {activeDevices.length === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => pairMutation.mutate(kid.id)}
                      disabled={pairMutation.isPending}
                      size="lg"
                    >
                      <PlusCircle className="size-4" />
                      Pair iPad
                    </Button>
                  </div>

                  {kidDevices.length === 0 ? (
                    <p className="font-body text-sm text-muted-foreground py-4 text-center">
                      No paired devices yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {[...activeDevices, ...revokedDevices].map((d) => {
                        const isRevoked = d.revoked_at !== null;
                        return (
                          <li
                            key={d.id}
                            className={`flex items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-3 ${
                              isRevoked ? "opacity-50" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="min-w-0">
                                <p className="font-body text-sm font-medium text-foreground truncate">
                                  {d.device_label || "iPad"}
                                  {isRevoked && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      (revoked)
                                    </span>
                                  )}
                                </p>
                                <p className="font-body text-xs text-muted-foreground truncate">
                                  {d.last_seen_at
                                    ? `Last seen ${new Date(
                                        d.last_seen_at
                                      ).toLocaleString()}`
                                    : `Paired ${new Date(
                                        d.created_at
                                      ).toLocaleString()}`}
                                </p>
                              </div>
                            </div>
                            {!isRevoked && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => revokeMutation.mutate(d.id)}
                                disabled={revokeMutation.isPending}
                              >
                                <Trash2 className="size-3.5" />
                                Revoke
                              </Button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog
        open={activeCode !== null}
        onOpenChange={(open) => {
          if (!open) setActiveCode(null);
        }}
      >
        <DialogContent className="text-center sm:max-w-md">
          <DialogHeader className="items-center">
            <DialogTitle className="font-heading text-xl">
              Pairing code for {activeCode?.kidLabel}
            </DialogTitle>
            <DialogDescription>
              Enter this on the iPad at{" "}
              <span className="font-bold text-foreground">/pair</span>. Expires
              in 5 minutes.
            </DialogDescription>
          </DialogHeader>
          {activeCode && (
            <div className="my-4">
              <div className="flex justify-center gap-2">
                {activeCode.code.split("").map((digit, i) => (
                  <span
                    key={i}
                    className="font-heading inline-flex h-16 w-12 items-center justify-center rounded-2xl border-2 border-primary bg-primary/5 text-3xl text-foreground sm:h-20 sm:w-14 sm:text-4xl"
                  >
                    {digit}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (await copyToClipboard(activeCode.code)) {
                    toast.success("Code copied");
                  } else {
                    toast.error("Copy failed — read it from the screen");
                  }
                }}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
