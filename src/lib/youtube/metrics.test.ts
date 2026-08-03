import { describe, expect, test } from 'bun:test';

import {
  buildBaseline,
  engagementRate,
  formatCompact,
  median,
  projectViews,
  scoreVideo,
  scoreVideos,
  uploadCadenceDays,
  type VideoStat
} from './metrics';

const HOUR = 36e5;
const DAY = 24 * HOUR;
const NOW = Date.parse('2026-07-31T12:00:00Z');

/** Builds a video published `ageDays` before the fixed NOW. */
function video(id: string, views: number | null, ageDays: number): VideoStat {
  return {
    videoId: id,
    title: `video ${id}`,
    publishedAt: new Date(NOW - ageDays * DAY).toISOString(),
    views
  };
}

describe('median', () => {
  test('odd and even lengths', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  test('returns null rather than 0 for an empty sample', () => {
    // 0 would flow into a denominator and silently produce Infinity.
    expect(median([])).toBeNull();
  });

  test('ignores non-finite values', () => {
    expect(median([1, Number.NaN, 3])).toBe(2);
  });
});

describe('buildBaseline', () => {
  test('only mature videos feed the median', () => {
    const baseline = buildBaseline(
      [
        video('a', 100, 10),
        video('b', 200, 10),
        video('c', 300, 10),
        video('d', 400, 10),
        video('e', 500, 10),
        // Too young to have settled — must not drag the median down.
        video('young', 1, 0.5)
      ],
      NOW
    );

    expect(baseline.medianViews).toBe(300);
    expect(baseline.sampleSize).toBe(5);
    expect(baseline.reliable).toBe(true);
  });

  test('is unreliable below the minimum sample', () => {
    const baseline = buildBaseline([video('a', 100, 10), video('b', 200, 10)], NOW);
    expect(baseline.reliable).toBe(false);
  });

  test('agePoints include young videos, which mature samples exclude', () => {
    // Young videos are exactly the peers a young video needs to be scored
    // against, so they must survive into agePoints.
    const baseline = buildBaseline([video('a', 100, 10), video('young', 5, 0.5)], NOW);
    expect(baseline.agePoints.map((p) => p.videoId).toSorted()).toEqual(['a', 'young']);
  });
});

describe('scoreVideo', () => {
  const mature = [
    video('a', 100, 30),
    video('b', 200, 30),
    video('c', 300, 30),
    video('d', 400, 30),
    video('e', 500, 30)
  ];

  test('mature videos score on cumulative views', () => {
    const baseline = buildBaseline(mature, NOW);
    const scored = scoreVideo(video('x', 600, 20), baseline, NOW);

    expect(scored.outlierScore).toBe(2); // 600 / median 300
    expect(scored.provisional).toBe(false);
    expect(scored.performance).toBe('over');
  });

  test('young videos are compared against age-peers, not lifetime velocity', () => {
    // Regression: the velocity baseline used lifetime-average VPH, which decays
    // as a video ages. A fresh upload divided by a settled video's average
    // produced scores in the hundreds.
    const sample = [...mature, video('p1', 10, 2), video('p2', 20, 2), video('p3', 30, 2)];
    const baseline = buildBaseline(sample, NOW);
    const scored = scoreVideo(video('fresh', 40, 2), baseline, NOW);

    expect(scored.provisional).toBe(true);
    expect(scored.outlierScore).toBe(2); // 40 / peer median 20
    expect(scored.outlierScore!).toBeLessThan(10);
  });

  test('a young video with too few age-peers gets no score at all', () => {
    // Better to say nothing than to publish a confident wrong number.
    const baseline = buildBaseline([...mature, video('p1', 10, 2)], NOW);
    const scored = scoreVideo(video('fresh', 40, 2), baseline, NOW);

    expect(scored.outlierScore).toBeNull();
    expect(scored.performance).toBeNull();
  });

  test('a video is never its own peer', () => {
    const self = video('self', 100, 2);
    const baseline = buildBaseline([...mature, self], NOW);
    const scored = scoreVideo(self, baseline, NOW);

    // With only itself in the age band there are no peers, so no score —
    // rather than a tautological 1.0.
    expect(scored.outlierScore).toBeNull();
  });

  test('an unreliable baseline suppresses scoring entirely', () => {
    const baseline = buildBaseline([video('a', 100, 30)], NOW);
    expect(scoreVideo(video('x', 900, 30), baseline, NOW).outlierScore).toBeNull();
  });

  test('null view counts never produce a score', () => {
    const baseline = buildBaseline(mature, NOW);
    expect(scoreVideo(video('x', null, 30), baseline, NOW).outlierScore).toBeNull();
  });
});

describe('projectViews', () => {
  test('window is bounded by the oldest video regardless of array order', () => {
    // Regression: the window was taken from the last array element on the
    // assumption the feed was sorted. An unsorted feed yielded a 1-day window
    // and roughly 30x over-projection.
    const ordered = [video('a', 300, 30), video('b', 300, 15), video('c', 300, 1)];
    const shuffled = [ordered[2], ordered[0], ordered[1]];

    const fromOrdered = projectViews(ordered, 30, NOW);
    const fromShuffled = projectViews(shuffled, 30, NOW);

    expect(fromOrdered).not.toBeNull();
    expect(fromShuffled?.projected).toBe(fromOrdered!.projected);
    expect(fromOrdered!.windowDays).toBeCloseTo(30, 5);
  });

  test('projects from the per-day rate over that window', () => {
    const result = projectViews([video('a', 300, 30), video('b', 300, 1)], 30, NOW);
    // 600 views over a 30-day window = 20/day => 600 over the next 30.
    expect(result?.perDay).toBeCloseTo(20, 5);
    expect(result?.projected).toBeCloseTo(600, 5);
  });

  test('returns null when there is nothing to project from', () => {
    expect(projectViews([], 30, NOW)).toBeNull();
  });
});

describe('uploadCadenceDays', () => {
  test('uses the median gap so one break does not distort it', () => {
    const videos = [
      video('a', 1, 0),
      video('b', 1, 1),
      video('c', 1, 2),
      video('d', 1, 60) // long hiatus
    ];
    expect(uploadCadenceDays(videos)).toBeCloseTo(1, 5);
  });

  test('needs at least two uploads', () => {
    expect(uploadCadenceDays([video('a', 1, 0)])).toBeNull();
  });
});

describe('scoreVideos', () => {
  test('returns one scored entry per input video', () => {
    const input = [video('a', 100, 30), video('b', 200, 30)];
    expect(scoreVideos(input, NOW).videos).toHaveLength(2);
  });
});

describe('engagementRate', () => {
  test('prefers exact likes over the RSS rating count when both are present', () => {
    // Regression: an earlier version used ratingCount unconditionally, even
    // when a precise like count had already been fetched for the same video.
    const rate = engagementRate({
      videoId: 'a',
      title: 't',
      publishedAt: new Date(NOW).toISOString(),
      views: 1000,
      ratingCount: 500, // would give 50% if wrongly preferred
      likes: 50
    });
    expect(rate).toBe(5);
  });

  test('falls back to the RSS rating count when likes were never fetched', () => {
    // `likes` is undefined here, not null — "not fetched", the common case for
    // any video outside the precise-stats slice.
    const rate = engagementRate({
      videoId: 'a',
      title: 't',
      publishedAt: new Date(NOW).toISOString(),
      views: 1000,
      ratingCount: 40
    });
    expect(rate).toBe(4);
  });

  test('likes: null (fetched, but the creator hid the count) still falls back', () => {
    const rate = engagementRate({
      videoId: 'a',
      title: 't',
      publishedAt: new Date(NOW).toISOString(),
      views: 1000,
      ratingCount: 40,
      likes: null
    });
    expect(rate).toBe(4);
  });

  test('a like count of exactly zero is trusted, not treated as missing', () => {
    // 0 is a valid, meaningful like count and must not fall through to the
    // rating-count fallback the way a falsy check would cause.
    const rate = engagementRate({
      videoId: 'a',
      title: 't',
      publishedAt: new Date(NOW).toISOString(),
      views: 1000,
      ratingCount: 40,
      likes: 0
    });
    expect(rate).toBe(0);
  });

  test('no views means no rate, regardless of likes', () => {
    expect(
      engagementRate({
        videoId: 'a',
        title: 't',
        publishedAt: new Date(NOW).toISOString(),
        views: 0,
        likes: 10
      })
    ).toBeNull();
  });
});

describe('formatCompact', () => {
  test('abbreviates by magnitude', () => {
    expect(formatCompact(999)).toBe('999');
    expect(formatCompact(1500)).toBe('1.5K');
    expect(formatCompact(2_600_000)).toBe('2.6M');
  });

  test('renders an em dash for missing values rather than "null"', () => {
    expect(formatCompact(null)).toBe('—');
  });
});
