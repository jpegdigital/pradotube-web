"use client";

import { Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

interface RenameDialogProps {
  creatorId: string;
  currentName: string;
  currentSlug: string;
}

export function RenameDialog({
  creatorId,
  currentName,
  currentSlug,
}: RenameDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const nextSlug = slugify(trimmed);
  const slugChanged = nextSlug !== currentSlug;
  const valid = nextSlug.length > 0;
  const dirty = trimmed !== currentName;

  async function handleSave() {
    if (!valid || !dirty || saving) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("creators")
        .update({
          name: trimmed,
          slug: nextSlug,
          sort_name: trimmed.toLowerCase(),
        })
        .eq("id", creatorId);

      if (error) {
        toast.error(
          error.code === "23505"
            ? `A creator at /shows/${nextSlug} already exists`
            : "Failed to rename creator"
        );
        return;
      }

      toast.success(`Renamed to "${trimmed}"`);
      setOpen(false);
      if (slugChanged) {
        router.replace(`/config/creator/${nextSlug}`);
      } else {
        router.refresh();
      }
    } catch {
      toast.error("Failed to rename creator");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setName(currentName);
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="config-action-btn"
            title="Rename creator"
            aria-label="Rename creator"
          />
        }
      >
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename creator</DialogTitle>
          <DialogDescription>
            Updates the display name and the URL slug. Existing links to the
            old slug will 404.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="font-body flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">
              Name
            </span>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setOpen(false);
              }}
              disabled={saving}
            />
          </label>

          <div className="font-body flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs">
            <span className="text-muted-foreground">New URL</span>
            {valid ? (
              <code className="font-mono text-sm text-foreground">
                /shows/{nextSlug}
              </code>
            ) : (
              <span className="text-destructive">
                Name must contain at least one letter or number
              </span>
            )}
            {valid && slugChanged && (
              <span className="text-[var(--peach)]">
                ⚠ Old URL <code>/shows/{currentSlug}</code> will 404
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!valid || !dirty || saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
