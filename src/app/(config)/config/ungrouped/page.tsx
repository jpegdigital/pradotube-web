import { Tv, Ungroup } from "lucide-react";
import { ChannelCard } from "../creator/[slug]/_components/channel-card";
import { getUngroupedDetail } from "./_lib/get-ungrouped";

export default async function UngroupedPage() {
  const { channels, allCreators } = await getUngroupedDetail();
  const syncedTotal = channels.reduce((s, c) => s + c.uploaded, 0);

  return (
    <div className="config-detail" data-canvas="muted">
      <header className="config-hero config-hero-ungrouped">
        <span className="config-hero-icon" aria-hidden>
          <Ungroup className="h-7 w-7" />
        </span>

        <div className="config-hero-body">
          <span className="config-hero-eyebrow font-body">Holding pen</span>
          <div className="config-hero-name-row">
            <h1 className="config-hero-title font-heading">Ungrouped</h1>
          </div>
          <div className="config-hero-meta font-body">
            <span>
              {channels.length} channel{channels.length === 1 ? "" : "s"} without
              a creator
            </span>
            <span aria-hidden>·</span>
            <span>{syncedTotal} synced</span>
          </div>
        </div>
      </header>

      <section className="config-detail-section">
        <div className="config-detail-section-head">
          <h2 className="config-detail-section-title font-heading">Channels</h2>
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
              No ungrouped channels right now. New channels added via the{" "}
              <strong>+</strong> button land here first so you can sort them
              into a creator.
            </p>
          </div>
        ) : (
          <div className="config-channel-grid-list">
            {channels.map((ch) => (
              <ChannelCard
                key={ch.youtube_id}
                channel={ch}
                currentCreatorId={null}
                currentCreatorName="Ungrouped"
                otherCreators={allCreators}
                pendingCount={ch.pending}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
