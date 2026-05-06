import { notFound } from "next/navigation";
import { CalibrationCard } from "./_components/calibration-card";
import { ChannelHero } from "./_components/channel-hero";
import { ChannelControls } from "./_components/channel-controls";
import { VideoStream } from "./_components/video-stream";
import { getChannelDetail } from "./_lib/get-channel-detail";

interface ChannelDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChannelDetailPage({
  params,
}: ChannelDetailPageProps) {
  const { id } = await params;
  const detail = await getChannelDetail(id);
  if (!detail) notFound();

  const { channel, creator, initialVideos, hasMore, statsEligible, statsAll } =
    detail;

  return (
    <div className="config-detail config-channel-detail" data-canvas="muted">
      <ChannelHero channel={channel} creator={creator} />

      <ChannelControls channel={channel} />

      <CalibrationCard channel={channel} />

      <VideoStream
        channelId={channel.youtube_id}
        syncMode={channel.sync_mode}
        minDuration={channel.effective_min_duration}
        maxDuration={channel.effective_max_duration}
        initialVideos={initialVideos}
        initialHasMore={hasMore}
        statsEligible={statsEligible}
        statsAll={statsAll}
      />
    </div>
  );
}
