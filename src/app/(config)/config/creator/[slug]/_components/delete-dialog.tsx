"use client";

import { Loader2, Trash2 } from "lucide-react";
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

interface DeleteDialogProps {
  creatorId: string;
  creatorName: string;
  channelCount: number;
}

export function DeleteDialog({
  creatorId,
  creatorName,
  channelCount,
}: DeleteDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const canDelete = confirm.trim() === creatorName;

  async function handleDelete() {
    if (!canDelete || saving) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("creators")
        .delete()
        .eq("id", creatorId);

      if (error) {
        toast.error("Failed to delete creator");
        return;
      }

      toast.success(`Removed "${creatorName}" — channels are now ungrouped`);
      router.replace("/config");
      router.refresh();
    } catch {
      toast.error("Failed to delete creator");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setConfirm("");
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="config-action-btn config-action-btn-danger"
            title="Delete creator"
            aria-label="Delete creator"
          />
        }
      >
        <Trash2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{creatorName}&rdquo;?</DialogTitle>
          <DialogDescription>
            {channelCount === 0
              ? "This creator has no channels and can be deleted."
              : `${channelCount} channel${channelCount === 1 ? "" : "s"} under this creator will be moved to Ungrouped — videos and downloads stay intact.`}
          </DialogDescription>
        </DialogHeader>

        <label className="font-body flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">
            Type{" "}
            <code className="font-mono text-foreground">{creatorName}</code> to
            confirm
          </span>
          <Input
            autoFocus
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canDelete) handleDelete();
              if (e.key === "Escape") setOpen(false);
            }}
            disabled={saving}
            placeholder={creatorName}
          />
        </label>

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
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete creator"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
