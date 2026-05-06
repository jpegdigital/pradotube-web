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

  const thumbnail = video.thumbnail_path
    ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${video.thumbnail_path}`
    : (video.thumbnail_url ?? "");

  return (
    <>
      <div className="relative mt-3 aspect-video max-h-[75vh] overflow-hidden rounded-2xl shadow-xl">
        <PlayerIsland
          key={id}
          mediaPath={video.media_path}
          thumbnail={thumbnail}
          title={video.title ?? ""}
        />
      </div>
      <WatchDetails video={video} />
    </>
  );
}
