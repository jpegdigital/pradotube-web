import { PlayerIsland } from "../_components/player-island";
import { WatchDetails } from "../_components/watch-details";
import { getVideo } from "../_lib/get-video";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const video = await getVideo(id);

  return (
    <>
      <div className="relative mt-3 aspect-video max-h-[75vh] overflow-hidden rounded-2xl bg-black shadow-xl ring-1 ring-border/30">
        <PlayerIsland
          mediaPath={video.media_path}
          thumbnail={video.thumbnail_url ?? ""}
          title={video.title ?? ""}
        />
      </div>
      <WatchDetails video={video} />
    </>
  );
}
