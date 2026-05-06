import Link from "next/link";
import { avatarUrl } from "@/lib/avatars";
import type { Row } from "@/lib/supabase/types";

const ACCENT_RINGS = [
  { from: "#58CC02", to: "#89E219" },
  { from: "#1CB0F6", to: "#00CD9C" },
  { from: "#CE82FF", to: "#FF4B4B" },
  { from: "#FF9600", to: "#FFC800" },
  { from: "#FF4B4B", to: "#FF9600" },
  { from: "#FFC800", to: "#58CC02" },
  { from: "#00CD9C", to: "#1CB0F6" },
];

export function CreatorAvatar({
  creator,
  index,
}: {
  creator: Row<"creators">;
  index: number;
}) {
  const accent = ACCENT_RINGS[index % ACCENT_RINGS.length];
  const eager = index < 8;
  const src = avatarUrl(creator.avatar_path);

  return (
    <div
      className="home-creator-item group relative flex flex-col items-center gap-3"
      style={
        {
          "--accent-from": accent.from,
          "--accent-to": accent.to,
        } as React.CSSProperties
      }
    >
      <Link
        href={`/shows/${creator.slug}`}
        className="absolute inset-0 z-10 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={creator.name}
      />

      <div className="home-avatar-ring relative size-[100px] sm:size-[120px] lg:size-[140px]">
        <div className="home-avatar-inner">
          {src ? (
            <img
              src={src}
              alt={creator.name}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              className="absolute inset-0 h-full w-full rounded-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-full"
              style={{
                backgroundImage: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
              }}
            >
              <span className="font-heading text-3xl text-white drop-shadow-sm sm:text-4xl">
                {creator.name.charAt(0)}
              </span>
            </div>
          )}
        </div>
      </div>

      <span className="home-creator-label font-heading line-clamp-2 w-[110px] text-center text-base leading-tight sm:w-[140px] sm:text-lg">
        {creator.name}
      </span>
    </div>
  );
}
