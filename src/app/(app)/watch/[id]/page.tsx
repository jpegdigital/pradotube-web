import { WatchView } from "../_components/watch-view";
import { getUpNext } from "../_lib/get-up-next";
import { getVideo } from "../_lib/get-video";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [video, upNext] = await Promise.all([getVideo(id), getUpNext()]);

  return <WatchView video={video} upNext={upNext} />;
}
