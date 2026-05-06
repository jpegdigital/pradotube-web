"use client";

import { ImageIcon, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { avatarUrl } from "@/lib/avatars";

interface AvatarButtonProps {
  kind: "creator" | "channel";
  id: string;
  avatarPath: string | null;
  fallbackUrl?: string | null;
  fallbackInitial: string;
  size: "sm" | "lg";
  onUploaded: () => void;
}

export function AvatarButton({
  kind,
  id,
  avatarPath,
  fallbackUrl,
  fallbackInitial,
  size,
  onUploaded,
}: AvatarButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [version, setVersion] = useState<number | null>(null);

  const src =
    avatarUrl(avatarPath, version ?? undefined) ?? fallbackUrl ?? null;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("id", id);
      fd.append("file", file);
      const res = await fetch("/api/avatars/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json().catch(() => ({}))) as {
        version?: number;
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error || "Avatar upload failed");
        return;
      }
      setVersion(json.version ?? Date.now());
      toast.success("Avatar updated");
      onUploaded();
    } catch {
      toast.error("Avatar upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      disabled={uploading}
      aria-busy={uploading}
      title="Click to upload new avatar"
      className={`config-avatar-btn config-avatar-btn-${size}`}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" className="config-avatar-img" />
      ) : (
        <span className="config-avatar-fallback">{fallbackInitial}</span>
      )}
      <span className="config-avatar-overlay">
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ImageIcon className="h-3.5 w-3.5" />
        )}
      </span>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
    </button>
  );
}
