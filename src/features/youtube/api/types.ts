import type { ChannelSummary } from '@/lib/youtube/client';
import type { ChannelBaseline, VideoMetrics } from '@/lib/youtube/metrics';

export type { ChannelSummary, ChannelBaseline, VideoMetrics };

export type ScoredVideo = VideoMetrics & {
  thumbnail: string | null;
  url: string | null;
  engagement: number | null;
};

export type Projection = {
  perDay: number;
  projected: number;
  basedOnVideos: number;
  windowDays: number;
} | null;

/**
 * Wire shapes for the snapshot data.
 *
 * Defined here rather than imported from `@/lib/youtube/snapshots`: that module
 * is `server-only`, and its `detectedAt` is a `Date` that JSON-serialises to a
 * string — reusing the server type would quietly mistype every date the client
 * reads.
 */
export type ChannelDelta = {
  spanHours: number;
  subscribers: number | null;
  totalViews: number | null;
} | null;

/** A title swap detected between two snapshots, as sent over the wire. */
export type PersistedChange = {
  id: string;
  videoId: string;
  field: 'title';
  previousValue: string | null;
  newValue: string | null;
  viewsAtChange: number | null;
  detectedAt: string;
};

export type ChannelAnalytics = {
  channel: ChannelSummary;
  baseline: ChannelBaseline;
  /** Whether the sample came from the RSS feed or a deep history walk. */
  sampleSource: 'rss' | 'deep';
  sampleSize: number;
  cadenceDays: number | null;
  projection: { next7: Projection; next30: Projection };
  /** Null until two snapshots at least an hour apart exist. */
  delta: ChannelDelta;
  /** Changes spotted on this request. */
  changes: Omit<PersistedChange, 'id'>[];
  /** Changes recorded previously, newest first. */
  recentChanges: PersistedChange[];
  breakouts: ScoredVideo[];
  videos: ScoredVideo[];
};

export type Idea = {
  title: string;
  format: string;
  rationale: string;
  evidence: string;
};

export type IdeasResult = {
  ideas: Idea[];
  source: 'azure-openai' | 'template';
  standard: string;
  seed: string | null;
};

export type KeywordVideo = {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string | null;
  channel: string;
  views: number | null;
  publishedText: string | null;
  durationText: string | null;
  isShort: boolean;
};

export type KeywordResearch = {
  keyword: string;
  estimatedResults: number | null;
  sampleSize: number;
  demandProxy: number | null;
  entryBarProxy: number | null;
  freshShare: number;
  topChannelShare: number;
  distinctChannels: number;
  dominantFormat: string | null;
  dominantIntent: string | null;
  videos: KeywordVideo[];
};

export type TopicResearch = {
  seed: string;
  suggestions: string[];
  results: KeywordResearch[];
};

export type LeaderboardRow = {
  channelId: string;
  label: string;
  handle: string | null;
  avatar: string | null;
  subscribers: number | null;
  uploads: number;
  uploadsTruncated: boolean;
  windowViews: number;
  subscriberGain: number | null;
  gainStatus: 'measured' | 'no-history' | 'within-rounding';
  spanHours: number | null;
};

export type Leaderboard = {
  windowDays: number;
  rows: LeaderboardRow[];
  failed: string[];
  measuredCount: number;
};

export type WatchEvent =
  | {
      kind: 'upload';
      at: string;
      channelLabel: string;
      isOwn: boolean;
      title: string;
      url: string;
      thumbnail: string | null;
      views: number | null;
      outlierScore: number | null;
      format: string | null;
      intent: string;
    }
  | {
      kind: 'edit';
      at: string;
      channelLabel: string;
      isOwn: boolean;
      field: 'title' | 'thumbnail';
      previousValue: string | null;
      newValue: string | null;
      viewsAtChange: number | null;
      url: string;
    };

export type WatchFeed = {
  standard: string;
  windowHours: number;
  channelCount: number;
  failed: string[];
  uploadCount: number;
  editCount: number;
  events: WatchEvent[];
  growth: Array<{
    channelLabel: string;
    spanHours: number;
    subscribers: number | null;
    totalViews: number | null;
  }>;
};

export type InsightBucket = { key: string; median: number; count: number; share: number };

/** Ranked buckets plus the ones too small to rank, kept separate on purpose. */
export type InsightAxis = { ranked: InsightBucket[]; thin: InsightBucket[] };

export type WorkspaceInsights = {
  standard: string;
  channelCount: number;
  sampleSize: number;
  failed: string[];
  minBucket: number;
  format: InsightAxis;
  subject: InsightAxis;
  exam: InsightAxis;
  intent: InsightAxis;
  top: Array<{
    title: string;
    channelLabel: string;
    score: number;
    url: string;
    format: string | null;
    intent: string;
    subject: string | null;
  }>;
  contentMix: {
    own: Array<{ key: string; share: number }>;
    rival: Array<{ key: string; share: number }>;
    ownSample: number;
    rivalSample: number;
  };
};

/** One row of the cross-channel video feed. */
export type WorkspaceVideo = {
  channelId: string;
  channelLabel: string;
  videoId: string;
  title: string;
  url: string;
  thumbnail: string | null;
  publishedAt: string;
  views: number | null;
  vph: number | null;
  outlierScore: number | null;
  performance: string | null;
  provisional: boolean;
  engagement: number | null;
  subject: string | null;
  format: string | null;
  exam: string | null;
  intent: string;
  grade: number | null;
  medium: string | null;
};

export type WorkspaceVideos = {
  standard: string;
  channelCount: number;
  videoCount: number;
  failed: string[];
  /** Channel label → subscribers, for share-of-workspace charts. */
  subscribers: Array<[string, number | null]>;
  videos: WorkspaceVideo[];
};

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

export type ChannelSearchResponse = {
  query: string;
  results: ChannelSearchResult[];
};

export type TrackedChannel = {
  /** `UC…` id — the stable key we store. */
  id: string;
  /** Display handle or title captured at add-time, for rendering before load. */
  label: string;
  addedAt: string;
};

export type CandidateScore = {
  id: string;
  predictedCtr: number;
  confidence: number;
  strengths: string[];
  weaknesses: string[];
};

export type ThumbnailComparison = {
  scores: CandidateScore[];
  winnerId: string;
  reasoning: string;
  suggestions: string[];
  source: 'azure-openai' | 'heuristic';
  aiEnabled: boolean;
};

export type ChannelDigest = {
  headline: string;
  body: string;
  source: 'azure-openai' | 'template';
  aiEnabled: boolean;
};

export type ThumbnailCandidateInput = {
  id: string;
  title: string;
  imageUrl?: string;
};
