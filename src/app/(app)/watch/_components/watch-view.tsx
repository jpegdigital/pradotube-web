import { Play } from "lucide-react";
import type { UpNextPage } from "../_lib/get-up-next";
import type { Video } from "../_lib/get-video";
import { PlayerIsland } from "./player-island";
import { UpNextSidebar } from "./up-next-sidebar";
import { WatchDetails } from "./watch-details";

interface WatchViewProps {
  video: Video;
  upNext: UpNextPage;
}

export function WatchView({ video, upNext }: WatchViewProps) {
  return (
    <div data-canvas="muted" className="px-2 pb-16 sm:px-3 lg:px-4">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-3 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-4">
        <div className="min-w-0">
          <div className="relative mt-3 aspect-video max-h-[75vh] overflow-hidden rounded-2xl bg-black shadow-xl ring-1 ring-border/30">
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt={video.title ?? ""}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
                <Play className="h-8 w-8 translate-x-0.5 fill-white text-white" />
              </div>
            </div>
            <div className="absolute inset-0">
              <PlayerIsland
                mediaPath={video.media_path}
                thumbnail={video.thumbnail_url ?? ""}
                title={video.title ?? ""}
                chapters={video.chapters}
              />
            </div>
          </div>
          <WatchDetails video={video} />
        </div>

        <UpNextSidebar initialPage={upNext} activeId={video.youtube_id} />
      </div>
    </div>
  );
}
