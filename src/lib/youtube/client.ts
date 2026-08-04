/* eslint-disable typescript/no-explicit-any -- InnerTube renderer payloads are
   undocumented and change shape between layouts. The `any` usage is confined to
   the extraction helpers; ChannelSummary is the typed boundary. */
import 'server-only';

import { Innertube, Log } from 'youtubei.js';

import type { VideoStat } from './metrics';

// InnerTube's renderer parser warns loudly about cosmetic mismatches it then
// recovers from ("Unable to find matching run for attachment run"). Those are
// noise, not failures — keep errors, drop the rest.
Log.setLevel(Log.Level.ERROR);

/**
 * InnerTube (youtubei.js) client — covers everything the RSS feed can't:
 * subscriber counts, `@handle` resolution, full upload history, search.
 *
 * The client does a network handshake on creation, so it's memoised across
 * requests. In dev, Next clears module state on every hot reload, hence the
 * globalThis pin.
 */
const globalForYt = globalThis as unknown as { ytClientSingleton?: Promise<Innertube> };

/**
 * Same reasoning as the RSS feed: without an explicit timeout a hung InnerTube
 * request blocks its caller indefinitely, and the workspace aggregations fan
 * out across every tracked channel.
 */
const REQUEST_TIMEOUT_MS = 20_000;

export function getYouTube(): Promise<Innertube> {
  globalForYt.ytClientSingleton ??= Innertube.create({
    lang: 'en',
    location: 'US',
    retrieve_player: false, // we never stream; skipping this is much faster
    // Cast because youtubei.js types this as the whole `fetch` binding,
    // including runtime extras like Bun's `preconnect` that a wrapper cannot
    // carry. Only the call signature is ever used.
    fetch: ((input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, {
        ...init,
        // Respect a caller-supplied signal; only add ours when there isn't one.
        signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })) as typeof fetch
  });
  return globalForYt.ytClientSingleton;
}

/** Drops the memoised client so the next call builds a fresh session. */
export function resetYouTube() {
  globalForYt.ytClientSingleton = undefined;
}

/**
 * Whether a failure is worth rebuilding the session for.
 *
 * A stale session shows up as a 5xx or a transport error. A 404 means the thing
 * genuinely isn't there — a handle that no longer exists — and retrying it both
 * wastes a round trip and, worse, resets the shared client out from under every
 * other in-flight request. With ~19 channels fanned out, one dead handle would
 * otherwise disrupt the whole batch.
 */
function isRetryable(error: unknown): boolean {
  const info = (error as { info?: unknown })?.info;
  const raw = typeof info === 'string' ? info : JSON.stringify(info ?? '');
  const code = raw.match(/"code"\s*:\s*(\d{3})/)?.[1];

  if (!code) return true; // transport-level failure — a fresh client may help
  return Number(code) >= 500;
}

/**
 * Runs an InnerTube call, rebuilding the client once if it fails.
 *
 * The session token embedded in the memoised client expires. Because the client
 * is pinned to globalThis for the life of the process, a stale session turns
 * every subsequent request into a permanent HTTP 500 — observed here as every
 * channel failing identically until the server was restarted, which in
 * production would look like the app simply breaking overnight.
 *
 * One retry only: a genuine upstream outage or a deleted channel should surface
 * as an error rather than loop.
 */
export async function withYouTube<T>(job: (yt: Innertube) => Promise<T>): Promise<T> {
  try {
    return await job(await getYouTube());
  } catch (error) {
    if (!isRetryable(error)) throw error;

    resetYouTube();
    try {
      return await job(await getYouTube());
    } catch {
      // Surface the original failure — it describes the real problem, while the
      // retry's error is usually just the same thing a second time.
      throw error;
    }
  }
}

export type ChannelSummary = {
  channelId: string;
  handle: string | null;
  title: string;
  description: string;
  avatar: string | null;
  banner: string | null;
  subscribers: number | null;
  subscribersText: string | null;
  totalViews: number | null;
  videoCount: number | null;
  joinedAt: string | null;
  country: string | null;
  isVerified: boolean;
};

/** Parses "1.23M subscribers" / "12,345 views" into a number. */
export function parseCompactNumber(input: string | null | undefined): number | null {
  if (!input) return null;
  const match = input.replace(/,/g, '').match(/([\d.]+)\s*([KMB])?/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const scale = { k: 1e3, m: 1e6, b: 1e9 }[match[2]?.toLowerCase() ?? ''] ?? 1;
  return Math.round(value * scale);
}

/**
 * Handle → channel id, cached.
 *
 * A handle maps to the same `UC…` id essentially forever, yet this was a live
 * InnerTube round trip on every call — ~120ms each, repeated for every tracked
 * channel on every aggregation, which put seconds of pure repeated work on the
 * critical path of each page.
 *
 * Negative results are cached too, but briefly: a handle that 404s today may be
 * a channel that was renamed, and re-checking hourly is cheap.
 */
const RESOLUTION_TTL_MS = 24 * 60 * 60 * 1000;
const RESOLUTION_MISS_TTL_MS = 60 * 60 * 1000;

const globalForResolution = globalThis as unknown as {
  channelIdResolutionCache?: Map<string, { id: string | null; expiresAt: number }>;
};

const resolutionCache = (globalForResolution.channelIdResolutionCache ??= new Map());

/**
 * Resolves any of: `UC…` id, `@handle`, or a full YouTube URL, to a channel id.
 * Returns null when nothing matches rather than throwing, so callers can turn
 * it into a 404.
 */
export async function resolveChannelId(input: string): Promise<string | null> {
  const key = input.trim().toLowerCase();
  const cached = resolutionCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.id;

  const id = await resolveChannelIdUncached(input);

  resolutionCache.set(key, {
    id,
    expiresAt: Date.now() + (id ? RESOLUTION_TTL_MS : RESOLUTION_MISS_TTL_MS)
  });

  return id;
}

async function resolveChannelIdUncached(input: string): Promise<string | null> {
  const raw = input.trim();

  // Already an id.
  if (/^UC[\w-]{22}$/.test(raw)) return raw;

  // Any URL carrying /channel/UC…
  const fromUrl = raw.match(/\/channel\/(UC[\w-]{22})/);
  if (fromUrl) return fromUrl[1];

  // Handle, with or without the @ and with or without a URL wrapper.
  const handleMatch = raw.match(/(?:youtube\.com\/)?@?([A-Za-z0-9._-]+)\/?$/);
  const handle = handleMatch?.[1];
  if (!handle) return null;

  try {
    const resolved = await withYouTube((client) =>
      client.resolveURL(`https://www.youtube.com/@${handle}`)
    );
    const id = resolved?.payload?.browseId;
    if (typeof id === 'string' && /^UC[\w-]{22}$/.test(id)) return id;
  } catch {
    // Fall through to search — resolveURL 404s on handles that don't exist.
  }

  try {
    const results = await withYouTube((client) => client.search(handle, { type: 'channel' }));
    const first = results.results?.find((r: any) => r?.type === 'Channel') as any;
    const id = first?.id ?? first?.author?.id;
    if (typeof id === 'string' && /^UC[\w-]{22}$/.test(id)) return id;
  } catch {
    // Nothing resolvable.
  }

  return null;
}

export type ChannelSearchResult = {
  channelId: string;
  title: string;
  handle: string | null;
  avatar: string | null;
  subscribersText: string | null;
  subscribers: number | null;
  videoCountText: string | null;
  description: string;
};

/**
 * Searches YouTube for channels by name.
 *
 * The tracked-channel input requires an exact handle or id, which is fine for
 * a channel you already follow and useless for finding one — especially for
 * regional educators whose handle rarely matches their display name.
 */
export async function searchChannels(query: string, limit = 10): Promise<ChannelSearchResult[]> {
  const results = await withYouTube((client) => client.search(query, { type: 'channel' }));

  const out: ChannelSearchResult[] = [];

  for (const item of (results.results ?? []) as any[]) {
    if (item?.type !== 'Channel') continue;

    const channelId: string | undefined = item.id ?? item.author?.id;
    if (typeof channelId !== 'string' || !/^UC[\w-]{22}$/.test(channelId)) continue;

    // Layouts disagree on where each field lives, hence the chains. The
    // subscriber string is sometimes on `video_count` and vice versa depending
    // on which shelf the result came from, so both are surfaced as text and
    // only the one that parses as a count is trusted.
    const subsText: string | null =
      (item.subscriber_count?.text ?? item.video_count?.text?.includes('subscriber'))
        ? (item.video_count?.text ?? null)
        : (item.subscriber_count?.text ?? null);

    out.push({
      channelId,
      title: item.author?.name ?? item.title?.text ?? channelId,
      handle: item.author?.url?.match(/@[\w.-]+/)?.[0] ?? null,
      avatar: item.author?.thumbnails?.[0]?.url ?? null,
      subscribersText: subsText,
      subscribers: parseCompactNumber(subsText),
      videoCountText: item.video_count?.text ?? null,
      description: item.description_snippet?.text ?? item.description ?? ''
    });

    if (out.length >= limit) break;
  }

  return out;
}

export type PreciseStat = {
  videoId: string;
  /** Exact count, not the rounded figure the channel listing returns. */
  views: number | null;
  likes: number | null;
  /**
   * The creator's own tags, from the same `getInfo` call — free alongside the
   * view count. A stronger topic signal than title-regex classification for
   * anything the creator explicitly labelled.
   */
  keywords: string[];
};

/**
 * Exact per-video stats via the watch-page endpoint.
 *
 * The channel listing rounds: a video on 13,982 views is reported as "13K",
 * a 7% error that lands directly in the outlier score's numerator. `getInfo`
 * returns the true count, at the cost of one request per video — hence the
 * concurrency cap and the deliberately small default batch.
 *
 * Failures are swallowed per video: a single unavailable watch page must not
 * cost the caller the rest of the batch.
 */
export async function fetchPreciseStats(
  videoIds: string[],
  concurrency = 6
): Promise<Map<string, PreciseStat>> {
  const out = new Map<string, PreciseStat>();
  const queue = [...videoIds];

  async function worker() {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      try {
        const info: any = await withYouTube((client) => client.getInfo(id));
        const views =
          typeof info?.basic_info?.view_count === 'number'
            ? info.basic_info.view_count
            : parseCompactNumber(info?.primary_info?.view_count?.view_count?.text);
        const likes =
          typeof info?.basic_info?.like_count === 'number' ? info.basic_info.like_count : null;
        const keywords = Array.isArray(info?.basic_info?.keywords) ? info.basic_info.keywords : [];
        out.set(id, { videoId: id, views: views ?? null, likes, keywords });
      } catch {
        // Deleted, private or region-blocked — leave it to the rounded value.
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return out;
}

/** Fetches channel metadata and aggregate stats. */
export async function fetchChannelSummary(channelId: string): Promise<ChannelSummary> {
  const channel = await withYouTube((client) => client.getChannel(channelId));

  const meta = (channel.metadata ?? {}) as any;
  const header = (channel.header ?? {}) as any;
  const about = await safeAbout(channel);

  const subscribersText: string | null =
    header?.content?.metadata?.metadata_rows?.[1]?.metadata_parts?.[0]?.text?.text ??
    header?.subscribers?.text ??
    null;

  const videoCountText: string | null =
    header?.content?.metadata?.metadata_rows?.[1]?.metadata_parts?.[1]?.text?.text ??
    header?.videos_count?.text ??
    null;

  return {
    channelId: meta.external_id ?? channelId,
    handle: normaliseHandle(meta.vanity_channel_url ?? header?.content?.title?.text ?? null),
    title: meta.title ?? header?.content?.title?.text ?? '',
    description: meta.description ?? about?.description ?? '',
    avatar: pickLargestThumbnail(meta.avatar ?? header?.content?.image?.avatar?.image),
    banner: pickLargestThumbnail(header?.content?.banner?.image),
    subscribers: parseCompactNumber(subscribersText),
    subscribersText,
    totalViews: parseCompactNumber(about?.view_count ?? null),
    videoCount: parseCompactNumber(videoCountText),
    joinedAt: about?.joined_date ?? null,
    country: about?.country ?? null,
    isVerified: Boolean(header?.content?.title?.badges?.length)
  };
}

/** The About tab is optional and shape-shifts between layouts; never fatal. */
async function safeAbout(channel: any) {
  try {
    const about = await channel.getAbout();
    const metadata = about?.metadata ?? about;
    return {
      description: metadata?.description?.text ?? metadata?.description ?? null,
      view_count: metadata?.view_count?.text ?? metadata?.view_count ?? null,
      joined_date: metadata?.joined_date?.text ?? null,
      country: metadata?.country?.text ?? metadata?.country ?? null
    };
  } catch {
    return null;
  }
}

function normaliseHandle(value: string | null): string | null {
  if (!value) return null;
  const match = String(value).match(/@([A-Za-z0-9._-]+)/);
  return match ? `@${match[1]}` : null;
}

function pickLargestThumbnail(image: unknown): string | null {
  const list = Array.isArray(image) ? image : (image as any)?.thumbnails;
  if (!Array.isArray(list) || list.length === 0) return null;
  const best = list.toSorted((a: any, b: any) => (b?.width ?? 0) - (a?.width ?? 0))[0];
  const url = best?.url;
  if (!url) return null;
  return url.startsWith('//') ? `https:${url}` : url;
}

export type DeepVideo = {
  videoId: string;
  title: string;
  views: number | null;
  /** Relative age text as YouTube renders it, e.g. "4 days ago". */
  publishedText: string | null;
  /**
   * Derived ISO timestamp — approximate, since YouTube only gives relative age.
   * Null for Shorts: the Shorts shelf renderer carries no date signal at all,
   * relative or otherwise, so it must not be guessed at. Callers that filter or
   * score by age should treat null as "unknown", not "very old" or "now".
   */
  publishedAt: string | null;
  durationSeconds: number | null;
  thumbnail: string | null;
  /**
   * Which tab this came from. The channel's "Videos" tab alone misses Shorts
   * and live streams entirely — on a sampled channel it returned 30 of 108
   * total uploads. `fetchChannelVideos` merges all three tabs so upload counts
   * and history aren't silently missing 70%+ of output.
   */
  contentType: 'video' | 'short' | 'live';
};

const RELATIVE_UNITS: Record<string, number> = {
  second: 1e3,
  minute: 60e3,
  hour: 36e5,
  day: 864e5,
  week: 6048e5,
  month: 2592e6,
  year: 31536e6
};

/** "4 days ago" → an approximate absolute timestamp. */
function parseRelativeDate(text: string | null, now = Date.now()): string | null {
  if (!text) return null;
  const match = text.match(/(\d+)\s*(second|minute|hour|day|week|month|year)/i);
  if (!match) return null;
  const ms = RELATIVE_UNITS[match[2].toLowerCase()];
  if (!ms) return null;
  return new Date(now - Number(match[1]) * ms).toISOString();
}

/** "12:49" or "1:02:33" → seconds. */
function parseDuration(text: string | null): number | null {
  if (!text) return null;
  const parts = text.split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/** Parses a `LockupView` item — the renderer shared by the Videos and Live tabs. */
function parseLockupItem(item: any, contentType: 'video' | 'live', now: number): DeepVideo | null {
  const videoId = item?.content_id;
  if (!videoId) return null;

  const parts = item?.metadata?.metadata?.metadata_rows?.[0]?.metadata_parts ?? [];
  const viewsText = parts[0]?.text?.text ?? null;
  const publishedText = parts[1]?.text?.text ?? null;
  const durationText = item?.content_image?.overlays?.[0]?.badges?.[0]?.text ?? null;

  return {
    videoId,
    title: item?.metadata?.title?.text ?? '',
    views: parseCompactNumber(viewsText),
    publishedText,
    publishedAt: parseRelativeDate(publishedText, now),
    durationSeconds: parseDuration(durationText),
    thumbnail: pickLargestThumbnail(item?.content_image?.image) ?? null,
    contentType
  };
}

/**
 * Parses a `ShortsLockupView` item — a completely different renderer from the
 * Videos/Live tabs, with the video id and title buried under `on_tap_endpoint`
 * and `overlay_metadata` instead of `content_id`/`metadata`.
 *
 * Carries no date of any kind, relative or otherwise — not a parsing gap, the
 * field simply isn't in the renderer. `publishedAt` and `publishedText` are
 * left null rather than guessed at (e.g. from shelf order, which is recency-
 * ordered but not a date).
 */
function parseShortsItem(item: any): DeepVideo | null {
  const videoId = item?.on_tap_endpoint?.payload?.videoId;
  if (!videoId) return null;

  const viewsText = item?.overlay_metadata?.secondary_text?.text ?? null;

  return {
    videoId,
    title: item?.overlay_metadata?.primary_text?.text ?? '',
    views: parseCompactNumber(viewsText),
    publishedText: null,
    publishedAt: null,
    durationSeconds: null,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    contentType: 'short'
  };
}

/** Walks one tab's continuation pages, parsing each item with `parse`. */
async function collectTab(
  tab: any,
  limit: number,
  parse: (item: any) => DeepVideo | null
): Promise<DeepVideo[]> {
  const collected: DeepVideo[] = [];

  while (collected.length < limit && tab) {
    for (const item of (tab.videos ?? []) as any[]) {
      const parsed = parse(item);
      if (parsed) collected.push(parsed);
      if (collected.length >= limit) break;
    }

    if (collected.length >= limit || !tab.has_continuation) break;
    tab = await tab.getContinuation().catch(() => null);
  }

  return collected;
}

/**
 * Full upload history via InnerTube, merging the Videos, Shorts and Live tabs.
 *
 * RSS caps at 15 uploads, which is useless for channels that publish several
 * times a day — every video is under a week old, so no maturity baseline can
 * form and every outlier score comes back null. This walks the channel's
 * tabs instead — all three of them: on a sampled channel, the Videos tab alone
 * returned 30 of 108 total uploads (48 Shorts and 30 live streams live on
 * separate tabs with different renderers and were previously invisible to
 * upload counts, baselines and history entirely).
 *
 * Caveat: YouTube only exposes *relative* publish dates on the Videos/Live
 * tabs ("4 days ago"), so `publishedAt` is approximate there, and Shorts carry
 * no date signal at all (see `parseShortsItem`). Nothing in this app treats
 * that as exact any more — RSS used to, but it turned out to have no uptime
 * guarantee of its own (see `fetchRecentVideos` below).
 */
export async function fetchChannelVideos(channelId: string, limit = 90): Promise<DeepVideo[]> {
  const channel: any = await withYouTube((client) => client.getChannel(channelId));
  const now = Date.now();

  // Each tab is walked up to the full `limit` independently — a channel with
  // few Shorts must not have its Shorts budget starved by a Videos tab that
  // used the whole allowance first.
  const [videos, shorts, live] = await Promise.all([
    channel
      .getVideos()
      .then((tab: any) => collectTab(tab, limit, (item) => parseLockupItem(item, 'video', now)))
      .catch(() => []),
    channel
      .getShorts()
      .then((tab: any) => collectTab(tab, limit, parseShortsItem))
      .catch(() => []),
    channel
      .getLiveStreams()
      .then((tab: any) => collectTab(tab, limit, (item) => parseLockupItem(item, 'live', now)))
      .catch(() => [])
  ]);

  const byId = new Map<string, DeepVideo>();
  for (const item of [...videos, ...live, ...shorts]) {
    if (!byId.has(item.videoId)) byId.set(item.videoId, item);
  }

  // Dated items newest-first; undated Shorts after, in shelf order (which is
  // recency-ordered even without an explicit date) rather than fabricating one.
  const merged = [...byId.values()].toSorted((a, b) => {
    if (a.publishedAt && b.publishedAt)
      return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    if (a.publishedAt) return -1;
    if (b.publishedAt) return 1;
    return 0;
  });

  return merged.slice(0, limit);
}

export type RecentVideo = VideoStat & { thumbnail: string | null };

/**
 * Recent uploads with view counts — the InnerTube replacement for the RSS
 * feed as this app's primary "what's new" source.
 *
 * RSS (`fetchChannelFeed`) is a static file with no uptime guarantee of its
 * own; on 2026-08-04 `www.youtube.com/feeds/videos.xml` started returning
 * 404/500 for every channel, taking down every page that depended on it. This
 * only ever touches the same InnerTube session everything else here already
 * uses.
 *
 * The channel listing's own view counts are rounded ("13K"). By default the
 * slice is enriched with `fetchPreciseStats` — the same exact-views/likes/
 * keywords call the deep-history fallback already used — but that costs one
 * request per video, which is fine for a single channel and expensive fanned
 * out across a whole workspace; pass `precise: false` there and accept the
 * rounded figures. Undated Shorts are dropped either way:
 * `VideoStat.publishedAt` is required, and there is no reliable timestamp to
 * give them (see `DeepVideo.publishedAt`).
 */
export async function fetchRecentVideos(
  channelId: string,
  limit = 15,
  { precise = true }: { precise?: boolean } = {}
): Promise<RecentVideo[]> {
  const deep = await fetchChannelVideos(channelId, limit);
  const dated = deep.filter(
    (v): v is DeepVideo & { publishedAt: string } => v.publishedAt !== null
  );

  const exactStats = precise
    ? await fetchPreciseStats(dated.map((v) => v.videoId)).catch(
        () => new Map<string, PreciseStat>()
      )
    : new Map<string, PreciseStat>();

  return dated.map((v) => {
    const exact = exactStats.get(v.videoId);
    return {
      videoId: v.videoId,
      title: v.title,
      publishedAt: v.publishedAt,
      views: exact?.views ?? v.views,
      likes: exact?.likes,
      keywords: exact?.keywords ?? [],
      thumbnail: v.thumbnail
    };
  });
}
