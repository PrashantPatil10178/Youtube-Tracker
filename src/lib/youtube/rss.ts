/* eslint-disable typescript/no-explicit-any -- Atom/media RSS entries are
   dynamically shaped and fast-xml-parser returns untyped objects. The `any`
   usage is confined to normaliseEntry/pick* below; everything that escapes this
   module is typed by RssFeed / RssVideo. */
import 'server-only';

import { XMLParser } from 'fast-xml-parser';

/**
 * YouTube's public RSS feed. No API key, no quota — but capped at the 15 most
 * recent uploads, so it's the cheap path for "what's new" and a poor one for
 * history. Anything deeper goes through the InnerTube client in ./client.ts.
 */
const FEED_BASE = 'https://www.youtube.com/feeds/videos.xml';

/**
 * Node's fetch has no default timeout. A hung upstream would block a request
 * forever, and because the workspace pages fan out across every tracked channel
 * behind a server-side prefetch, one hang means the page never renders at all.
 */
const REQUEST_TIMEOUT_MS = 15_000;

export type RssVideo = {
  videoId: string;
  title: string;
  url: string;
  publishedAt: string;
  updatedAt: string;
  thumbnail: string;
  description: string;
  /** RSS exposes lifetime views and star rating via the media: namespace. */
  views: number | null;
  rating: number | null;
  ratingCount: number | null;
};

export type RssFeed = {
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  publishedAt: string | null;
  videos: RssVideo[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // A feed with a single <entry> would otherwise parse to an object, not an array.
  isArray: (name) => name === 'entry'
});

function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Fetches and normalises a channel's upload feed.
 *
 * @param channelId A `UC…` channel id. Handles must be resolved first.
 */
export async function fetchChannelFeed(
  channelId: string,
  { revalidate = 600 }: { revalidate?: number } = {}
): Promise<RssFeed> {
  const url = `${FEED_BASE}?channel_id=${encodeURIComponent(channelId)}`;
  const res = await fetch(url, {
    next: { revalidate },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!res.ok) {
    throw new Error(`RSS feed request failed for ${channelId} (HTTP ${res.status})`);
  }

  const xml = await res.text();
  const parsed = parser.parse(xml) as { feed?: Record<string, unknown> };
  const feed = parsed.feed;

  if (!feed) {
    throw new Error(`RSS feed for ${channelId} could not be parsed`);
  }

  const entries = (feed.entry ?? []) as Record<string, any>[];
  const channelUrl = pickAlternateLink(feed.link);

  return {
    // Deliberately NOT `feed['yt:channelId']`: YouTube emits that field with the
    // leading `UC` stripped (`BJycsm…` for `UCBJycsm…`). The alternate link and
    // the requested id both carry the canonical form.
    channelId: canonicalChannelId(channelUrl) ?? channelId,
    channelTitle: String(feed.title ?? ''),
    channelUrl,
    publishedAt: feed.published ? String(feed.published) : null,
    videos: entries.map(normaliseEntry)
  };
}

function normaliseEntry(entry: Record<string, any>): RssVideo {
  const media = entry['media:group'] ?? {};
  const community = media['media:community'] ?? {};
  const statistics = community['media:statistics'] ?? {};
  const starRating = community['media:starRating'] ?? {};
  const videoId = String(entry['yt:videoId'] ?? '');

  return {
    videoId,
    title: String(media['media:title'] ?? entry.title ?? ''),
    url: pickAlternateLink(entry.link) || `https://www.youtube.com/watch?v=${videoId}`,
    publishedAt: String(entry.published ?? ''),
    updatedAt: String(entry.updated ?? entry.published ?? ''),
    // The RSS thumbnail is hqdefault; maxres isn't advertised but usually exists.
    thumbnail: String(media['media:thumbnail']?.['@_url'] ?? ''),
    description: String(media['media:description'] ?? ''),
    views: toNumber(statistics['@_views']),
    rating: toNumber(starRating['@_average']),
    ratingCount: toNumber(starRating['@_count'])
  };
}

/** Pulls a `UC…` id out of a `/channel/UC…` URL. */
function canonicalChannelId(url: string): string | null {
  const match = url.match(/\/channel\/(UC[\w-]{22})/);
  return match ? match[1] : null;
}

/** `link` is either one object or an array of them depending on the entry. */
function pickAlternateLink(link: unknown): string {
  if (!link) return '';
  const links = Array.isArray(link) ? link : [link];
  const alternate = links.find((l: any) => l?.['@_rel'] === 'alternate' || l?.['@_href']) as any;
  return alternate?.['@_href'] ? String(alternate['@_href']) : '';
}
