import { Tv } from "lucide-react";
import { notFound } from "next/navigation";
import { getCreatorDetail } from "./_lib/get-creator-detail";
import { ChannelCard } from "./_components/channel-card";
import { CreatorHero } from "./_components/creator-hero";

interface CreatorDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CreatorDetailPage({
  params,
}: CreatorDetailPageProps) {
  const { slug } = await params;
  const detail = await getCreatorDetail(slug);
  if (!detail) notFound();

  const { creator, channels, otherCreators } = detail;
  const syncedTotal = channels.reduce((s, c) => s + c.uploaded, 0);

  return (
    <div className="config-detail" data-canvas="muted">
      <CreatorHero
        creator={creator}
        channelCount={channels.length}
        syncedTotal={syncedTotal}
      />

      <section className="config-detail-section">
        <div className="config-detail-section-head">
          <h2 className="config-detail-section-title font-heading">
            Channels
          </h2>
          <span className="config-detail-section-count font-body">
            {channels.length}
          </span>
        </div>

        {channels.length === 0 ? (
          <div className="config-detail-empty">
            <span className="config-detail-empty-icon">
              <Tv className="h-5 w-5" />
            </span>
            <p className="font-body">
              No channels under this creator yet. Use the{" "}
              <strong>+</strong> in the bottom right to add one — it lands in{" "}
              <em>Ungrouped</em> and you can move it here.
            </p>
          </div>
        ) : (
          <div className="config-channel-grid-list">
            {channels.map((ch) => (
              <ChannelCard
                key={ch.youtube_id}
                channel={ch}
                currentCreatorId={creator.id}
                currentCreatorName={creator.name}
                otherCreators={otherCreators}
                pendingCount={ch.pending}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
