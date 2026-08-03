/**
 * Snapshot comparison.
 *
 * Pure — no database, no `server-only` — because this is the logic worth
 * testing directly. It once reported edits that never happened, and that
 * failure mode is invisible without explicit cases.
 */

export type SnapshotVideo = {
  videoId: string;
  title: string;
  thumbnail: string | null;
  views: number | null;
};

/** Which endpoint a reading came from. Comparisons must not cross this line. */
export type SnapshotSource = 'rss' | 'deep';

export type DetectedChange = {
  videoId: string;
  field: 'title' | 'thumbnail';
  previousValue: string | null;
  newValue: string | null;
  viewsAtChange: number | null;
  detectedAt: Date;
};

/**
 * Reduces a thumbnail URL to the parts that identify the *image*.
 *
 * Two things vary without the picture changing:
 *  - per-request signing params (`?sqp=…&rs=…`)
 *  - the CDN host, which rotates between `i.ytimg.com`, `i2.ytimg.com`, etc.
 *
 * Both were being recorded as thumbnail swaps. What actually identifies the
 * image is the path — `/vi/<videoId>/<name>.jpg`.
 */
export function normaliseThumb(url: string | null): string | null {
  if (!url) return null;

  const withoutQuery = url.split('?')[0];
  // Keep the path only; the host carries no information about the image.
  const path = withoutQuery.replace(/^https?:\/\/[^/]+/, '');
  return path || withoutQuery;
}

/** A stored reading, reduced to the fields the diff actually compares. */
export type PriorReading = {
  videoId: string;
  title: string;
  thumbnail: string | null;
};

/**
 * Compares the newest reading against the previous one, per video.
 *
 * Pure so it can be tested directly — this logic produced a false-positive bug
 * that was only caught by eye, and the failure mode (reporting edits that never
 * happened) is invisible without explicit cases.
 *
 * `previous` must already be filtered to a single source and ordered
 * newest-first; mixing sources is exactly what caused that bug.
 */
export function diffReadings(
  previous: PriorReading[],
  current: SnapshotVideo[],
  now: Date
): DetectedChange[] {
  // Newest row per video wins, so a long history doesn't resurrect old values.
  const lastByVideo = new Map<string, PriorReading>();
  for (const row of previous) {
    if (!lastByVideo.has(row.videoId)) lastByVideo.set(row.videoId, row);
  }

  // Every value previously seen per video. A genuine edit moves to something
  // new; returning to a value already recorded is flapping, not an edit.
  const seenTitles = new Map<string, Set<string>>();
  const seenThumbs = new Map<string, Set<string>>();
  for (const row of previous) {
    if (!seenTitles.has(row.videoId)) {
      seenTitles.set(row.videoId, new Set());
      seenThumbs.set(row.videoId, new Set());
    }
    seenTitles.get(row.videoId)!.add(row.title);
    const t = normaliseThumb(row.thumbnail);
    if (t) seenThumbs.get(row.videoId)!.add(t);
  }

  const changes: DetectedChange[] = [];

  for (const video of current) {
    const before = lastByVideo.get(video.videoId);
    // No prior reading means this is the first sighting, not an edit.
    if (!before) continue;

    // YouTube returns rotating title variants for the same video from the same
    // endpoint — an experiment, or caches converging after a real edit. Either
    // way each flip is not a separate edit, so a value we have already recorded
    // is ignored and only genuinely new text is reported.
    const titleIsNew = !seenTitles.get(video.videoId)?.has(video.title);

    if (before.title !== video.title && titleIsNew) {
      changes.push({
        videoId: video.videoId,
        field: 'title',
        previousValue: before.title,
        newValue: video.title,
        viewsAtChange: video.views,
        detectedAt: now
      });
    }

    const beforeThumb = normaliseThumb(before.thumbnail);
    const afterThumb = normaliseThumb(video.thumbnail);
    const thumbIsNew = afterThumb ? !seenThumbs.get(video.videoId)?.has(afterThumb) : false;
    // Both sides must be known — a missing thumbnail is absence of evidence.
    if (beforeThumb && afterThumb && beforeThumb !== afterThumb && thumbIsNew) {
      changes.push({
        videoId: video.videoId,
        field: 'thumbnail',
        previousValue: beforeThumb,
        newValue: afterThumb,
        viewsAtChange: video.views,
        detectedAt: now
      });
    }
  }

  return changes;
}
