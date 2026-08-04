/**
 * Derived performance metrics.
 *
 * Everything here is computed from data callers already fetched (views +
 * publish time), so none of it costs an extra request. Pure functions,
 * no I/O — safe to import from client components.
 */

export type VideoStat = {
  videoId: string;
  title: string;
  publishedAt: string;
  views: number | null;
  rating?: number | null;
  ratingCount?: number | null;
  /**
   * Exact like count from `getInfo`, when the deep/precise-stats path fetched
   * it. Undefined (not fetched) is distinct from null (fetched, unavailable —
   * e.g. the creator hid the count); `engagementRate` only trusts a number.
   */
  likes?: number | null;
  /** The creator's own tags, when the precise-stats path fetched them. */
  keywords?: string[];
};

export type VideoMetrics = VideoStat & {
  /** Hours since publication, floored at 1 to avoid divide-by-zero. */
  ageHours: number;
  ageDays: number;
  /** Views per hour since publish — momentum, the signal the algorithm reacts to. */
  vph: number | null;
  /** Views per day, friendlier for older videos. */
  vpd: number | null;
  /**
   * How far this video beats its own channel's typical performance.
   * 1.0 = exactly typical, 3.0 = three times the baseline.
   */
  outlierScore: number | null;
  /** Bucketed reading of `outlierScore` for badges. */
  performance: 'breakout' | 'over' | 'typical' | 'under' | null;
  /**
   * True while the video is too young to judge on cumulative views, so the
   * score was derived from velocity instead.
   */
  provisional: boolean;
};

/** An (age, views) pair, used to compare a young video against its peers. */
export type AgePoint = { videoId: string; ageHours: number; views: number };

export type ChannelBaseline = {
  /** Median cumulative views across mature videos. */
  medianViews: number | null;
  /**
   * Median lifetime views-per-hour across mature videos.
   *
   * Display only — deliberately NOT used for scoring. Views are front-loaded,
   * so a video's lifetime average VPH falls the longer it lives: a two-year-old
   * video sits near zero however well it did. Dividing a fresh upload's VPH by
   * that produced scores in the hundreds.
   */
  medianVph: number | null;
  /**
   * Age/views pairs for the whole sample, so a young video can be scored
   * against videos of a *similar age* instead of against settled ones.
   */
  agePoints: AgePoint[];
  /** How many videos fed the baseline. Below ~5 the score is noise. */
  sampleSize: number;
  reliable: boolean;
};

/** A video is "mature" once its view count has mostly settled. */
const MATURITY_HOURS = 7 * 24;

/** Fewer samples than this and we refuse to call anything an outlier. */
const MIN_SAMPLE = 5;

/**
 * A young video is compared against peers within this multiplicative band of
 * its own age — half as old to twice as old. Wide enough to find peers on a
 * 15-video feed, narrow enough that the comparison stays like-for-like.
 */
const PEER_AGE_FACTOR = 2;

/** Below this many age-peers, a young video gets no score rather than a wrong one. */
const MIN_PEERS = 3;

export function median(values: number[]): number | null {
  const sorted = values.filter((v) => Number.isFinite(v)).toSorted((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function hoursSince(iso: string, now: number = Date.now()): number {
  const published = new Date(iso).getTime();
  if (!Number.isFinite(published)) return 1;
  return Math.max(1, (now - published) / 36e5);
}

/**
 * Builds the channel's own performance baseline.
 *
 * Deliberately uses the median rather than the mean: one breakout video would
 * drag a mean upward and make every subsequent video look like an underperformer.
 */
export function buildBaseline(videos: VideoStat[], now: number = Date.now()): ChannelBaseline {
  const mature = videos.filter(
    (v) => v.views !== null && hoursSince(v.publishedAt, now) >= MATURITY_HOURS
  );

  const viewSamples = mature.map((v) => v.views as number);
  const vphSamples = mature.map((v) => (v.views as number) / hoursSince(v.publishedAt, now));

  // Every video with a view count, mature or not — young videos are precisely
  // the peers a young video needs to be compared against.
  const agePoints: AgePoint[] = videos
    .filter((v) => v.views !== null)
    .map((v) => ({
      videoId: v.videoId,
      ageHours: hoursSince(v.publishedAt, now),
      views: v.views as number
    }));

  return {
    medianViews: median(viewSamples),
    medianVph: median(vphSamples),
    agePoints,
    sampleSize: mature.length,
    reliable: mature.length >= MIN_SAMPLE
  };
}

function classify(score: number | null): VideoMetrics['performance'] {
  if (score === null) return null;
  if (score >= 3) return 'breakout';
  if (score >= 1.25) return 'over';
  if (score >= 0.75) return 'typical';
  return 'under';
}

/**
 * Scores one video against a baseline.
 *
 * Mature videos are judged on cumulative views. Younger ones can't be — they
 * simply haven't had time — so they're compared against the channel's other
 * videos *of a similar age* and flagged `provisional`. That keeps brand-new
 * uploads from reading as catastrophic underperformers without the inflation
 * that comparing raw velocity against settled videos caused.
 */
export function scoreVideo(
  video: VideoStat,
  baseline: ChannelBaseline,
  now: number = Date.now()
): VideoMetrics {
  const ageHours = hoursSince(video.publishedAt, now);
  const views = video.views;
  const vph = views === null ? null : views / ageHours;
  const isMature = ageHours >= MATURITY_HOURS;

  let outlierScore: number | null = null;
  let provisional = false;

  if (baseline.reliable && views !== null) {
    if (isMature && baseline.medianViews) {
      outlierScore = views / baseline.medianViews;
    } else {
      // Peers of comparable age, excluding the video itself — otherwise a
      // channel's only recent upload would score exactly 1.0 against itself.
      // Tolerates a baseline missing `agePoints` — one can arrive from a cache
      // written before the field existed, and a stale entry must degrade to
      // "no score" rather than throw.
      const peers = (baseline.agePoints ?? []).filter(
        (p) =>
          p.videoId !== video.videoId &&
          p.ageHours >= ageHours / PEER_AGE_FACTOR &&
          p.ageHours <= ageHours * PEER_AGE_FACTOR
      );

      const peerMedian = peers.length >= MIN_PEERS ? median(peers.map((p) => p.views)) : null;

      if (peerMedian) {
        outlierScore = views / peerMedian;
        provisional = true;
      }
    }
  }

  return {
    ...video,
    ageHours,
    ageDays: ageHours / 24,
    vph,
    vpd: vph === null ? null : vph * 24,
    outlierScore: outlierScore === null ? null : Number(outlierScore.toFixed(2)),
    performance: classify(outlierScore),
    provisional
  };
}

export function scoreVideos(videos: VideoStat[], now: number = Date.now()) {
  const baseline = buildBaseline(videos, now);
  return {
    baseline,
    videos: videos.map((v) => scoreVideo(v, baseline, now))
  };
}

/**
 * Median gap between consecutive uploads, in days. Median again, so one
 * holiday break doesn't distort the cadence.
 */
export function uploadCadenceDays(videos: VideoStat[]): number | null {
  const times = videos
    .map((v) => new Date(v.publishedAt).getTime())
    .filter((t) => Number.isFinite(t))
    .toSorted((a, b) => b - a);

  if (times.length < 2) return null;

  const gaps: number[] = [];
  for (let i = 0; i < times.length - 1; i += 1) {
    gaps.push((times[i] - times[i + 1]) / 864e5);
  }

  const m = median(gaps);
  return m === null ? null : Number(m.toFixed(1));
}

/**
 * Straight-line projection of total views over `days`, from recent velocity.
 *
 * Intentionally simple and labelled as such in the UI: with only 15 RSS videos
 * there isn't enough history to justify anything more sophisticated.
 */
export function projectViews(videos: VideoStat[], days: number, now: number = Date.now()) {
  const recent = videos.filter(
    (v) => v.views !== null && hoursSince(v.publishedAt, now) <= 30 * 24
  );
  if (recent.length === 0) return null;

  const totalViews = recent.reduce((sum, v) => sum + (v.views as number), 0);

  // The window is bounded by the OLDEST video in the sample. Feed order is not
  // guaranteed to be sorted, so take the max age explicitly — indexing the last
  // element silently produced a 1-day window and ~30x over-projection.
  const oldestAgeDays = Math.max(...recent.map((v) => hoursSince(v.publishedAt, now) / 24));
  const windowDays = Math.max(1, Math.min(30, oldestAgeDays));

  const perDay = totalViews / windowDays;
  return {
    perDay: Math.round(perDay),
    projected: Math.round(perDay * days),
    basedOnVideos: recent.length,
    windowDays: Number(windowDays.toFixed(1))
  };
}

/**
 * Engagement proxy: likes/views when an exact like count was fetched, falling
 * back to the RSS star rating count otherwise.
 *
 * Likes are the stronger signal — YouTube barely populates the RSS rating
 * fields anymore — but they cost a `getInfo` request per video, so they're
 * only available for the newest slice of a channel's videos (see
 * `fetchPreciseStats`). The fallback keeps every other video's engagement
 * figure non-null rather than losing it outright.
 */
export function engagementRate(video: VideoStat): number | null {
  if (!video.views) return null;

  if (typeof video.likes === 'number') {
    return Number(((video.likes / video.views) * 100).toFixed(3));
  }

  if (!video.ratingCount) return null;
  return Number(((video.ratingCount / video.views) * 100).toFixed(3));
}

export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(abs >= 1e10 ? 0 : 1)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`;
  return String(Math.round(value));
}
