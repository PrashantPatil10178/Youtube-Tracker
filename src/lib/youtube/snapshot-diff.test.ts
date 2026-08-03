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

  test('a thumbnail swap is detected', () => {
    const changes = diffReadings(
      [prior('a', 'T', 'https://i.ytimg.com/vi/a/old.jpg')],
      [current('a', 'T', 'https://i.ytimg.com/vi/a/new.jpg')],
      NOW
    );

    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe('thumbnail');
  });

  test('query strings on thumbnail URLs are not edits', () => {
    // YouTube appends per-request signing params; comparing raw URLs would
    // report a thumbnail swap on essentially every read.
    const changes = diffReadings(
      [prior('a', 'T', 'https://i.ytimg.com/vi/a/hq.jpg?sqp=ABC&rs=XYZ')],
      [current('a', 'T', 'https://i.ytimg.com/vi/a/hq.jpg?sqp=DIFFERENT&rs=OTHER')],
      NOW
    );
    expect(changes).toEqual([]);
  });

  test('a rotating CDN host is not a thumbnail swap', () => {
    // YouTube serves the same image from i.ytimg.com, i2.ytimg.com and friends.
    // Comparing full URLs recorded those rotations as creator edits.
    const changes = diffReadings(
      [prior('a', 'T', 'https://i2.ytimg.com/vi/abc/hqdefault.jpg')],
      [current('a', 'T', 'https://i.ytimg.com/vi/abc/hqdefault.jpg')],
      NOW
    );
    expect(changes).toEqual([]);
  });

  test('a genuinely different image is still a swap despite host rotation', () => {
    const changes = diffReadings(
      [prior('a', 'T', 'https://i2.ytimg.com/vi/abc/hqdefault.jpg')],
      [current('a', 'T', 'https://i.ytimg.com/vi/abc/maxresdefault.jpg')],
      NOW
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe('thumbnail');
  });

  test('a missing thumbnail on either side is not a swap', () => {
    // Absence of evidence, not evidence of change — one source omitting the
    // field would otherwise look like the creator replaced the image.
    expect(
      diffReadings([prior('a', 'T', null)], [current('a', 'T', 'https://x/new.jpg')], NOW)
    ).toEqual([]);
    expect(
      diffReadings([prior('a', 'T', 'https://x/old.jpg')], [current('a', 'T', null)], NOW)
    ).toEqual([]);
  });

  test('title and thumbnail changing together yield two changes', () => {
    const changes = diffReadings(
      [prior('a', 'Old', 'https://x/old.jpg')],
      [current('a', 'New', 'https://x/new.jpg')],
      NOW
    );
    expect(changes.map((c) => c.field).toSorted()).toEqual(['thumbnail', 'title']);
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

  test('a thumbnail reverting to a seen image is not a swap', () => {
    const before = [prior('a', 'T', 'https://x/b.jpg'), prior('a', 'T', 'https://x/a.jpg')];
    expect(diffReadings(before, [current('a', 'T', 'https://x/a.jpg')], NOW)).toEqual([]);
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
