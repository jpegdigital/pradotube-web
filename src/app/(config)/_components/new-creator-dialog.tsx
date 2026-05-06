"use client";

import {
  AlertCircle,
  Check,
  Loader2,
  Lock,
  Pencil,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";
import { slugify } from "@/lib/slugify";

type SlugStatus =
  | { kind: "idle" }
  | { kind: "invalid" }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "taken" };

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export function NewCreatorDialog() {
  const router = useRouter();
  const nameId = useId();
  const slugId = useId();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugLocked, setSlugLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<SlugStatus>({ kind: "idle" });

  // Reset every time the dialog opens
  useEffect(() => {
    if (!open) return;
    setName("");
    setSlug("");
    setSlugLocked(false);
    setSubmitting(false);
    setStatus({ kind: "idle" });
  }, [open]);

  // Auto-derive slug from name unless the user has manually edited it
  useEffect(() => {
    if (slugLocked) return;
    setSlug(slugify(name));
  }, [name, slugLocked]);

  // Debounced availability check
  const requestRef = useRef(0);
  useEffect(() => {
    if (!open) return;
    const trimmed = slug.trim();
    if (trimmed === "") {
      setStatus({ kind: "idle" });
      return;
    }
    if (!SLUG_PATTERN.test(trimmed)) {
      setStatus({ kind: "invalid" });
      return;
    }
    setStatus({ kind: "checking" });
    const myReq = ++requestRef.current;
    const handle = setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("creators")
        .select("id")
        .eq("slug", trimmed)
        .maybeSingle();
      // ignore if a newer request started after this fired
      if (myReq !== requestRef.current) return;
      if (error) {
        // network/RLS hiccup — don't block submit, surface at submit time
        setStatus({ kind: "idle" });
        return;
      }
      setStatus(data ? { kind: "taken" } : { kind: "available" });
    }, 250);
    return () => clearTimeout(handle);
  }, [slug, open]);

  const trimmedName = name.trim();
  const trimmedSlug = slug.trim();
  const canSubmit =
    trimmedName.length > 0 &&
    SLUG_PATTERN.test(trimmedSlug) &&
    status.kind !== "taken" &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("creators").insert({
        name: trimmedName,
        slug: trimmedSlug,
        sort_name: trimmedName.toLowerCase(),
      });

      if (error) {
        if (error.code === "23505") {
          setStatus({ kind: "taken" });
          toast.error(`A creator at /shows/${trimmedSlug} already exists`);
        } else {
          toast.error("Couldn't create creator");
        }
        return;
      }

      toast.success(`Created "${trimmedName}"`);
      setOpen(false);
      router.refresh();
      router.push(`/config/creator/${trimmedSlug}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="config-sidebar-new"
            title="New creator"
            aria-label="New creator"
          />
        }
      >
        <Plus className="h-4 w-4" aria-hidden />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>New creator</DialogTitle>
          <DialogDescription>
            Creators group channels under a shared identity in the kid feed.
            You can add channels and tweak settings after.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <label className="font-body flex flex-col gap-1.5" htmlFor={nameId}>
            <span className="text-xs font-semibold text-muted-foreground">
              Name
            </span>
            <Input
              id={nameId}
              autoFocus
              placeholder="e.g. Blippi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={submitting}
              autoComplete="off"
              spellCheck={false}
              maxLength={120}
            />
          </label>

          <div className="font-body flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor={slugId}
                className="text-xs font-semibold text-muted-foreground"
              >
                URL slug
              </label>
              <button
                type="button"
                onClick={() => {
                  if (slugLocked) {
                    setSlugLocked(false);
                    setSlug(slugify(name));
                  } else {
                    setSlugLocked(true);
                  }
                }}
                disabled={submitting}
                className="config-slug-lock-btn"
                aria-pressed={slugLocked}
                title={
                  slugLocked
                    ? "Resume auto-generating slug from name"
                    : "Edit slug manually"
                }
              >
                {slugLocked ? (
                  <>
                    <Lock className="h-3 w-3" aria-hidden />
                    <span>Manual</span>
                  </>
                ) : (
                  <>
                    <Pencil className="h-3 w-3" aria-hidden />
                    <span>Edit</span>
                  </>
                )}
              </button>
            </div>

            <div
              className="config-slug-input"
              data-status={status.kind}
              data-locked={slugLocked || undefined}
            >
              <span className="config-slug-prefix">/shows/</span>
              <input
                id={slugId}
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugLocked(true);
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]+/g, "-")
                      .replace(/-{2,}/g, "-")
                      .slice(0, 64)
                  );
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                readOnly={!slugLocked && name === ""}
                disabled={submitting}
                placeholder="creator-slug"
                autoComplete="off"
                spellCheck={false}
                aria-describedby={`${slugId}-status`}
              />
              <span
                className="config-slug-status"
                aria-hidden={status.kind === "idle"}
              >
                {status.kind === "checking" && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin opacity-60" />
                )}
                {status.kind === "available" && (
                  <Check
                    className="h-3.5 w-3.5"
                    style={{ color: "var(--mint)" }}
                  />
                )}
                {(status.kind === "taken" || status.kind === "invalid") && (
                  <AlertCircle
                    className="h-3.5 w-3.5"
                    style={{ color: "var(--coral, var(--destructive))" }}
                  />
                )}
              </span>
            </div>

            <p
              id={`${slugId}-status`}
              className="text-xs"
              role="status"
              aria-live="polite"
            >
              {status.kind === "taken" && (
                <span className="text-destructive">
                  Slug already in use — try another
                </span>
              )}
              {status.kind === "invalid" && trimmedSlug.length > 0 && (
                <span className="text-destructive">
                  Use lowercase letters, numbers, and dashes (start &amp; end with
                  a letter or number)
                </span>
              )}
              {status.kind === "available" && (
                <span style={{ color: "var(--mint)" }}>
                  ✓ Available
                </span>
              )}
              {status.kind === "checking" && (
                <span className="text-muted-foreground">
                  Checking availability…
                </span>
              )}
              {status.kind === "idle" && (
                <span className="text-muted-foreground">
                  This becomes the URL on the kid feed.
                </span>
              )}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create creator"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
