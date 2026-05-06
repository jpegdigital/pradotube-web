import { CalendarClock, Clock3, Filter } from "lucide-react";
import type { ChannelDetailRow } from "../_lib/get-channel-detail";

interface CalibrationCardProps {
  channel: ChannelDetailRow;
}

// Histogram bucket order — `[low, high)` in seconds, matching producer keys.
const BUCKETS: Array<{ key: string; label: string; low: number; high: number }> = [
  { key: "under_1m", label: "<1m", low: 0, high: 60 },
  { key: "1_5m", label: "1–5m", low: 60, high: 300 },
  { key: "5_10m", label: "5–10m", low: 300, high: 600 },
  { key: "10_20m", label: "10–20m", low: 600, high: 1200 },
  { key: "20_30m", label: "20–30m", low: 1200, high: 1800 },
  { key: "30_60m", label: "30–60m", low: 1800, high: 3600 },
  { key: "1_2h", label: "1–2h", low: 3600, high: 7200 },
  { key: "over_2h", label: ">2h", low: 7200, high: Number.POSITIVE_INFINITY },
];

function formatMinutes(seconds: number | null | undefined): string {
  const s = Number(seconds ?? 0);
  if (!Number.isFinite(s) || s <= 0) return "—";
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h${rem}m`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "never";
  const diff = Date.now() - t;
  const day = 86400_000;
  if (diff < day) return "today";
  const days = Math.floor(diff / day);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatNumber(n: number | null | undefined): string {
  const num = Number(n ?? 0);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString();
}

function describeCadence(postsPerWeek: number | null): string {
  const v = Number(postsPerWeek ?? 0);
  if (!Number.isFinite(v) || v <= 0) return "—";
  if (v >= 7) return "daily+";
  if (v >= 4) return "near daily";
  if (v >= 1) return "steady";
  if (v >= 0.25) return "occasional";
  return "rare";
}

export function CalibrationCard({ channel }: CalibrationCardProps) {
  if (!channel.calibrated_at) {
    return (
      <section className="calibration-card calibration-card-empty">
        <span className="calibration-empty-text font-body">
          Channel not yet calibrated — cadence and duration stats will appear after the next sync.
        </span>
      </section>
    );
  }

  const buckets = channel.duration_buckets ?? {};
  const bucketTotal = Object.values(buckets).reduce((a, b) => a + b, 0);
  const bucketMax = Math.max(1, ...Object.values(buckets));
  const sampled = channel.total_videos_sampled ?? bucketTotal;

  const minSec = channel.effective_min_duration;
  const maxSec = channel.effective_max_duration;

  // Yield: prefer the matching pre-computed bucket; otherwise sum buckets that
  // fall within the active window.
  const eligible = (() => {
    if (minSec === 60 && maxSec === 3600) return channel.passing_min60_max3600;
    if (minSec === 300 && maxSec === 3600) return channel.passing_min300_max3600;
    return BUCKETS.reduce((sum, b) => {
      const count = buckets[b.key] ?? 0;
      if (count <= 0) return sum;
      // Unbounded bucket (>2h): we don't know the distribution above 2h, so
      // include it whole when the window's upper edge reaches the bucket's
      // floor, else exclude it entirely. Avoids div-by-near-zero blow-ups.
      if (b.high === Number.POSITIVE_INFINITY) {
        return maxSec > b.low && minSec < b.high ? sum + count : sum;
      }
      const overlap = Math.max(0, Math.min(b.high, maxSec) - Math.max(b.low, minSec));
      const span = b.high - b.low;
      const ratio = span > 0 ? overlap / span : 0;
      return sum + ratio * count;
    }, 0);
  })();
  const eligibleNum = Math.round(eligible ?? 0);
  const eligiblePct =
    sampled > 0 ? Math.round((eligibleNum / sampled) * 100) : 0;

  const postsPerWeek = Number(channel.posts_per_week ?? 0);
  const medianGap = Number(channel.median_gap_days ?? 0);

  return (
    <section className="calibration-card" aria-label="Channel calibration">
      <div className="calibration-card-grid">
        <div className="calibration-stat calibration-stat-cadence">
          <span className="calibration-stat-icon">
            <CalendarClock className="h-4 w-4" />
          </span>
          <div className="calibration-stat-body">
            <span className="calibration-stat-label font-body">Cadence</span>
            <span className="calibration-stat-headline font-heading">
              {postsPerWeek > 0 ? postsPerWeek.toFixed(1) : "—"}
              <span className="calibration-stat-headline-unit">/wk</span>
            </span>
            <span className="calibration-stat-detail font-body">
              {describeCadence(postsPerWeek)}
              {medianGap > 0 && (
                <>
                  <span className="calibration-stat-dot" aria-hidden>·</span>
                  ~{medianGap.toFixed(medianGap < 1 ? 1 : 0)}d gap
                </>
              )}
            </span>
          </div>
        </div>

        <div className="calibration-divider" aria-hidden />

        <div className="calibration-stat calibration-stat-duration">
          <span className="calibration-stat-icon">
            <Clock3 className="h-4 w-4" />
          </span>
          <div className="calibration-stat-body">
            <span className="calibration-stat-label font-body">Duration</span>
            <span className="calibration-stat-headline font-heading">
              {formatMinutes(channel.median_duration_seconds)}
              <span className="calibration-stat-headline-unit">median</span>
            </span>
            <span className="calibration-stat-detail font-body">
              avg {formatMinutes(channel.avg_duration_seconds)}
            </span>
            <div
              className="calibration-histogram"
              role="img"
              aria-label="Duration distribution"
            >
              {BUCKETS.map((b) => {
                const count = buckets[b.key] ?? 0;
                const height = count > 0 ? (count / bucketMax) * 100 : 0;
                const inWindow = b.low < maxSec && b.high > minSec;
                const pctOfTotal =
                  bucketTotal > 0 ? Math.round((count / bucketTotal) * 100) : 0;
                return (
                  <span
                    key={b.key}
                    className="calibration-histogram-bar"
                    data-in-window={inWindow || undefined}
                    title={`${b.label}: ${count.toLocaleString()} (${pctOfTotal}%)`}
                  >
                    <span
                      className="calibration-histogram-fill"
                      style={{ height: `${Math.max(height, count > 0 ? 4 : 0)}%` }}
                    />
                  </span>
                );
              })}
            </div>
            <div className="calibration-histogram-axis font-body" aria-hidden>
              <span>1m</span>
              <span>10m</span>
              <span>1h</span>
              <span>2h+</span>
            </div>
          </div>
        </div>

        <div className="calibration-divider" aria-hidden />

        <div className="calibration-stat calibration-stat-yield">
          <span className="calibration-stat-icon">
            <Filter className="h-4 w-4" />
          </span>
          <div className="calibration-stat-body">
            <span className="calibration-stat-label font-body">In window</span>
            <span className="calibration-stat-headline font-heading">
              {eligiblePct}
              <span className="calibration-stat-headline-unit">%</span>
            </span>
            <span className="calibration-stat-detail font-body">
              {formatNumber(eligibleNum)} of {formatNumber(sampled)}
            </span>
            <div
              className="calibration-yield-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={eligiblePct}
            >
              <span
                className="calibration-yield-bar-fill"
                style={{ width: `${eligiblePct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <p className="calibration-footer font-body">
        Sampled {formatNumber(sampled)} videos · calibrated {formatRelative(channel.calibrated_at)}
      </p>
    </section>
  );
}
