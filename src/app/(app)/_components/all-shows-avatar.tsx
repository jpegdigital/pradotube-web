import Link from "next/link";
import { Sparkles } from "lucide-react";

export function AllShowsAvatar() {
  return (
    <div className="home-creator-item all-shows-item group relative flex flex-col items-center gap-3">
      <Link
        href="/shows"
        className="absolute inset-0 z-10 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Browse every show"
      />

      <div className="home-avatar-ring all-shows-ring relative size-[100px] sm:size-[120px] lg:size-[140px]">
        <div className="home-avatar-inner all-shows-inner">
          <div className="all-shows-burst" aria-hidden />
          <div className="relative flex h-full w-full flex-col items-center justify-center">
            <Sparkles className="all-shows-sparkle h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
            <span className="all-shows-text font-heading text-2xl sm:text-3xl lg:text-[2rem] text-foreground leading-none mt-1.5">
              All
            </span>
          </div>
        </div>
      </div>

      <span className="home-creator-label font-heading line-clamp-2 w-[110px] text-center text-base leading-tight sm:w-[140px] sm:text-lg">
        Everything
      </span>
    </div>
  );
}
