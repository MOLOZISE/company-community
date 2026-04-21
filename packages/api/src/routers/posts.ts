import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { db, posts, profiles, channels } from '@repo/db';
import { eq, desc, and, sql, ilike, or, getTableColumns } from 'drizzle-orm';

const postSelect = {
  ...getTableColumns(posts),
  authorName: profiles.displayName,
  authorAvatar: profiles.avatarUrl,
  channelName: channels.name,
  channelSlug: channels.slug,
};

const ANON_ANIMALS = [
  '강아지',
  '고양이',
  '여우',
  '사자',
  '호랑이',
  '곰',
  '다람쥐',
  '토끼',
  '코끼리',
  '기린',
  '펭귄',
  '오리',
  '독수리',
  '부엉이',
  '개구리',
  '수달',
  '고슴도치',
  '알파카',
];

// djb2 hash: same seed+postId always produces the same anonymous alias.
function djb2(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function generateDeterministicAlias(anonymousSeed: string, postId: string): string {
  const hash = djb2(anonymousSeed + postId);
  const animal = ANON_ANIMALS[hash % ANON_ANIMALS.length];
  const num = hash % 100;
  return `익명 ${animal}${num}`;
}

export const postsRouter = router({
  /**
   * Get paginated feed with sorting options
   */
  getFeed: publicProcedure
    .input(
      z.object({
        channelId: z.string().optional(),
        flair: z.string().optional(),
        sort: z.enum(['hot', 'new', 'top']).default('hot'),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const conditions = [eq(posts.isDeleted, false)];
      if (input.channelId) conditions.push(eq(posts.channelId, input.channelId));
      if (input.flair) conditions.push(eq(posts.flair, input.flair));
      const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

      const orderCol =
        input.sort === 'new'
          ? desc(posts.createdAt)
          : input.sort === 'top'
            ? desc(posts.upvoteCount)
            : desc(posts.hotScore);

      const items = await db
        .select(postSelect)
        .from(posts)
        .leftJoin(profiles, eq(posts.authorId, profiles.id))
        .leftJoin(channels, eq(posts.channelId, channels.id))
        .where(whereClause)
        .orderBy(orderCol)
        .limit(input.limit)
        .offset(input.offset);

      return { items, hasMore: items.length === input.limit };
    }),

  /**
   * Get single post by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const [post] = await db
        .select(postSelect)
        .from(posts)
        .leftJoin(profiles, eq(posts.authorId, profiles.id))
        .leftJoin(channels, eq(posts.channelId, channels.id))
        .where(eq(posts.id, input.id))
        .limit(1);

      if (!post || post.isDeleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
      }

      return post;
    }),

  /**
   * Create new post (authenticated)
   */
  create: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        title: z.string().max(300).optional(),
        content: z.string().min(1).max(10000),
        isAnonymous: z.boolean().default(false),
        mediaUrls: z.array(z.string()).max(10).default([]),
        flair: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let anonAlias: string | null = null;
      if (input.isAnonymous) {
        const postId = crypto.randomUUID();
        const [profile] = await db
          .select({ anonymousSeed: profiles.anonymousSeed })
          .from(profiles)
          .where(eq(profiles.id, ctx.userId))
          .limit(1);
        anonAlias = generateDeterministicAlias(profile?.anonymousSeed ?? postId, postId);

        const [post] = await db
          .insert(posts)
          .values({
            id: postId,
            channelId: input.channelId,
            authorId: ctx.userId,
            title: input.title,
            content: input.content,
            isAnonymous: true,
            anonAlias,
            mediaUrls: input.mediaUrls,
            flair: input.flair,
          })
          .returning();
        return post;
      }

      const [post] = await db
        .insert(posts)
        .values({
          channelId: input.channelId,
          authorId: ctx.userId,
          title: input.title,
          content: input.content,
          isAnonymous: false,
          anonAlias: null,
          mediaUrls: input.mediaUrls,
          flair: input.flair,
        })
        .returning();
      return post;
    }),

  /**
   * Delete post (owner only, soft delete)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [post] = await db
        .select({ authorId: posts.authorId })
        .from(posts)
        .where(eq(posts.id, input.id))
        .limit(1);

      if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
      if (post.authorId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your post' });
      }

      await db.update(posts).set({ isDeleted: true }).where(eq(posts.id, input.id));
      return { success: true };
    }),

  /**
   * Get all posts by a specific author (non-anonymous only, public)
   */
  getByAuthor: publicProcedure
    .input(
      z.object({
        authorId: z.string(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const items = await db
        .select(postSelect)
        .from(posts)
        .leftJoin(profiles, eq(posts.authorId, profiles.id))
        .leftJoin(channels, eq(posts.channelId, channels.id))
        .where(
          and(
            eq(posts.authorId, input.authorId),
            eq(posts.isDeleted, false),
            eq(posts.isAnonymous, false)
          )
        )
        .orderBy(desc(posts.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      return { items, hasMore: items.length === input.limit };
    }),

  /**
   * Get current user's own posts (all, including anonymous)
   */
  getMyPosts: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20), offset: z.number().default(0) }))
    .query(async ({ input, ctx }) => {
      const items = await db
        .select(postSelect)
        .from(posts)
        .leftJoin(profiles, eq(posts.authorId, profiles.id))
        .leftJoin(channels, eq(posts.channelId, channels.id))
        .where(and(eq(posts.authorId, ctx.userId), eq(posts.isDeleted, false)))
        .orderBy(desc(posts.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      return { items, hasMore: items.length === input.limit };
    }),

  /**
   * Edit post title/content/flair (author only)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().max(300).optional(),
        content: z.string().min(1).max(10000),
        flair: z.string().max(100).nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [post] = await db
        .select({ authorId: posts.authorId })
        .from(posts)
        .where(eq(posts.id, input.id))
        .limit(1);
      if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
      if (post.authorId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your post' });
      }

      const [updated] = await db
        .update(posts)
        .set({ title: input.title, content: input.content, flair: input.flair ?? null })
        .where(eq(posts.id, input.id))
        .returning();
      return updated;
    }),

  /**
   * Search posts by title or content
   */
  search: publicProcedure
    .input(z.object({ q: z.string().min(1).max(100), limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ input }) => {
      const term = `%${input.q}%`;
      return db
        .select(postSelect)
        .from(posts)
        .leftJoin(profiles, eq(posts.authorId, profiles.id))
        .leftJoin(channels, eq(posts.channelId, channels.id))
        .where(
          and(
            eq(posts.isDeleted, false),
            or(ilike(posts.title, term), ilike(posts.content, term))
          )
        )
        .orderBy(desc(posts.createdAt))
        .limit(input.limit);
    }),

  /**
   * Pin/unpin a post (channel creator only)
   */
  pin: protectedProcedure
    .input(z.object({ id: z.string(), pinned: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const [post] = await db.select({ channelId: posts.channelId }).from(posts).where(eq(posts.id, input.id)).limit(1);
      if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });

      const [channel] = await db
        .select({ createdBy: channels.createdBy })
        .from(channels)
        .where(eq(channels.id, post.channelId))
        .limit(1);
      if (!channel || channel.createdBy !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Channel admin only' });
      }

      await db.update(posts).set({ isPinned: input.pinned }).where(eq(posts.id, input.id));
      return { success: true };
    }),

  /**
   * Increment view count (fire-and-forget, unauthenticated)
   */
  incrementViewCount: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .update(posts)
        .set({ viewCount: sql`${posts.viewCount} + 1` })
        .where(eq(posts.id, input.id));
      return { success: true };
    }),
});
