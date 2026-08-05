import { describe, expect, test } from 'bun:test';

import { diffReadings, type PriorReading, type SnapshotVideo } from './snapshot-diff';

const NOW = new Date('2026-08-01T00:00:00Z');

function prior(videoId: string, title: string, thumbnail: string | null = null): PriorReading {
  return { videoId, title, thumbnail };
}

function current(
  videoId: string,
  title: string,
  thumbnail: string | null = null,
  views = 100
): SnapshotVideo {
  return { videoId, title, thumbnail, views };
}

describe('diffReadings', () => {
  test('identical readings produce no changes', () => {
    const before = [prior('a', 'Same title')];
    const after = [current('a', 'Same title')];
    expect(diffReadings(before, after, NOW)).toEqual([]);
  });

  test('a genuine title edit is detected', () => {
    const changes = diffReadings(
      [prior('a', 'Old title')],
      [current('a', 'New title', null, 500)],
      NOW
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      videoId: 'a',
      field: 'title',
      previousValue: 'Old title',
      newValue: 'New title',
      viewsAtChange: 500
    });
  });

  test('a first sighting is not an edit', () => {
    // Regression guard: treating "no prior reading" as a change would report an
    // edit for every video the first time a channel is ever read.
    expect(diffReadings([], [current('new', 'A title')], NOW)).toEqual([]);
  });

  test('only the newest prior reading is compared against', () => {
    // `previous` arrives newest-first. Using an older row would resurrect a
    // stale title and report an edit that already happened.
    const before = [prior('a', 'Current title'), prior('a', 'Ancient title')];
    expect(diffReadings(before, [current('a', 'Current title')], NOW)).toEqual([]);
  });

  test('a thumbnail-only difference is not reported', () => {
    // Thumbnail swaps used to be detected by comparing normalised paths, but a
    // genuine creator thumbnail replacement keeps the same CDN path — YouTube
    // serves the new image from the same URL — so path-diffing only ever
    // fired on unrelated processing-state noise, never a real edit, and the
    // before/after images it reported were often visibly identical.
    const changes = diffReadings(
      [prior('a', 'T', 'https://i.ytimg.com/vi/a/old.jpg')],
      [current('a', 'T', 'https://i.ytimg.com/vi/a/new.jpg')],
      NOW
    );
    expect(changes).toEqual([]);
  });

  test('a title change is still detected when the thumbnail also differs', () => {
    const changes = diffReadings(
      [prior('a', 'Old', 'https://x/old.jpg')],
      [current('a', 'New', 'https://x/new.jpg')],
      NOW
    );
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ field: 'title', previousValue: 'Old', newValue: 'New' });
  });

  test('videos are compared independently', () => {
    const changes = diffReadings(
      [prior('a', 'A old'), prior('b', 'B same')],
      [current('a', 'A new'), current('b', 'B same')],
      NOW
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].videoId).toBe('a');
  });

  test('a video that disappeared from the current reading is not a change', () => {
    // Videos drop out of a 15-item feed constantly; that is not an edit.
    expect(diffReadings([prior('gone', 'Old title')], [current('a', 'A')], NOW)).toEqual([]);
  });

  test('every change carries the timestamp it was observed at', () => {
    const changes = diffReadings([prior('a', 'Old')], [current('a', 'New')], NOW);
    expect(changes[0].detectedAt).toBe(NOW);
  });

  test('returning to a previously seen title is flapping, not an edit', () => {
    // YouTube serves rotating title variants from the same endpoint. Each flip
    // back to a value already recorded would otherwise be logged as a fresh
    // creator edit — which is how 31 phantom "edits" were once recorded.
    const before = [prior('a', 'Variant B'), prior('a', 'Variant A'), prior('a', 'Variant B')];
    expect(diffReadings(before, [current('a', 'Variant A')], NOW)).toEqual([]);
  });

  test('a genuinely new title is still reported despite past flapping', () => {
    const before = [prior('a', 'Variant B'), prior('a', 'Variant A')];
    const changes = diffReadings(before, [current('a', 'Brand new title')], NOW);
    expect(changes).toHaveLength(1);
    expect(changes[0].newValue).toBe('Brand new title');
  });

  test('null views are preserved rather than coerced to zero', () => {
    // 0 would read as "changed at zero views", which is a different claim.
    const changes = diffReadings(
      [prior('a', 'Old')],
      [{ ...current('a', 'New'), views: null }],
      NOW
    );
    expect(changes[0].viewsAtChange).toBeNull();
  });
});
