import { Play } from "lucide-react";
import type { UpNextPage } from "../_lib/get-up-next";
import { UpNextScroller } from "./up-next-scroller";

interface UpNextSidebarProps {
  initialPage: UpNextPage;
  activeId: string;
}

export function UpNextSidebar({ initialPage, activeId }: UpNextSidebarProps) {
  return (
    <aside aria-label="Up next" className="hidden lg:block">
      <div className="sticky top-0 flex h-dvh flex-col py-3">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-secondary/20 ring-1 ring-border/40">
          {initialPage.videos.length === 0 ? (
            <SidebarEmpty />
          ) : (
            <UpNextScroller initialPage={initialPage} activeId={activeId} />
          )}
        </div>
      </div>
    </aside>
  );
}

function SidebarEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/15">
        <Play className="h-5 w-5 translate-x-0.5 fill-primary/60 text-primary/60" />
      </div>
      <p className="font-body text-xs text-muted-foreground/70">
        Nothing queued up — explore the feed for more.
      </p>
    </div>
  );
}
