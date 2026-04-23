import { router, publicProcedure } from '../trpc.js';
import { db, profiles, posts, reactions, channels, saves, postTags } from '@repo/db';
import { and, desc, eq, sql } from 'drizzle-orm';

const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry<T> = { data: T; expiresAt: number };

let statsCache: CacheEntry<{
  totalMembers: number;
  monthlyPosts: number;
  monthlyReactions: number;
  monthlySaves: number;
}> | null = null;

let topicsCache: CacheEntry<{ topic: string; count: number }[]> | null = null;

let activeChannelsCache: CacheEntry<{ id: string; slug: string; name: string; postCount: number }[]> | null = null;

export const trendingRouter = router({
  /**
   * Get high-level community stats for the feed sidebar.
   * Cached for 5 minutes to avoid full-table scans on every page load.
   */
  getCommunityStats: publicProcedure.query(async () => {
    const now = Date.now();
    if (statsCache && statsCache.expiresAt > now) return statsCache.data;

    const [totalMembers, monthlyPosts, monthlyReactions, monthlySaves] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(profiles).then((r) => r[0]?.count ?? 0),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(posts)
        .where(and(eq(posts.isDeleted, false), sql`${posts.createdAt} >= date_trunc('month', now())`))
        .then((r) => r[0]?.count ?? 0),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(reactions)
        .where(sql`${reactions.createdAt} >= date_trunc('month', now())`)
        .then((r) => r[0]?.count ?? 0),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(saves)
        .where(sql`${saves.createdAt} >= date_trunc('month', now())`)
        .then((r) => r[0]?.count ?? 0),
    ]);

    const data = { totalMembers, monthlyPosts, monthlyReactions, monthlySaves };
    statsCache = { data, expiresAt: now + CACHE_TTL_MS };
    return data;
  }),

  /**
   * Get the most used hashtags from the last 24 hours.
   * Cached for 5 minutes.
   */
  getTrendingTopics: publicProcedure.query(async () => {
    const now = Date.now();
    if (topicsCache && topicsCache.expiresAt > now) return topicsCache.data;

    const rows = await db
      .select({
        topic: postTags.tag,
        count: sql<number>`count(*)::int`,
      })
      .from(postTags)
      .innerJoin(posts, eq(postTags.postId, posts.id))
      .where(
        and(
          eq(posts.isDeleted, false),
          sql`${postTags.createdAt} >= now() - interval '24 hours'`
        )
      )
      .groupBy(postTags.tag)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    const data = rows
      .filter((row) => Boolean(row.topic?.trim()))
      .map((row) => ({ topic: row.topic?.trim() ?? '', count: row.count }));

    topicsCache = { data, expiresAt: now + CACHE_TTL_MS };
    return data;
  }),

  /**
   * Get the most active channels from posts created in the last 24 hours.
   * Cached for 5 minutes.
   */
  getActiveChannels: publicProcedure.query(async () => {
    const now = Date.now();
    if (activeChannelsCache && activeChannelsCache.expiresAt > now) return activeChannelsCache.data;

    const rows = await db
      .select({
        id: channels.id,
        slug: channels.slug,
        name: channels.name,
        postCount: sql<number>`count(*)::int`,
      })
      .from(posts)
      .innerJoin(channels, eq(posts.channelId, channels.id))
      .where(and(eq(posts.isDeleted, false), sql`${posts.createdAt} >= now() - interval '24 hours'`))
      .groupBy(channels.id, channels.slug, channels.name)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    activeChannelsCache = { data: rows, expiresAt: now + CACHE_TTL_MS };
    return rows;
  }),
});
