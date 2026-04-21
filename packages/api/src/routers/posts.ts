import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { db, posts } from '@repo/db';
import { eq, desc, and, sql, ilike, or } from 'drizzle-orm';

const ANON_ANIMALS = [
  '강아지', '고양이', '토끼', '사자', '호랑이', '곰', '여우', '늑대', '코끼리', '기린',
  '펭귄', '오리', '독수리', '두더지', '너구리', '수달', '고슴도치', '다람쥐',
];

function generateAnonAlias(): string {
  const animal = ANON_ANIMALS[Math.floor(Math.random() * ANON_ANIMALS.length)];
  const num = Math.floor(Math.random() * 100);
  return `익명${animal}${num}`;
}

export const postsRouter = router({
  /**
   * Get paginated feed with sorting options
   */
  getFeed: publicProcedure
    .input(
      z.object({
        channelId: z.string().optional(),
        sort: z.enum(['hot', 'new', 'top']).default('hot'),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const whereClause = input.channelId
        ? and(eq(posts.isDeleted, false), eq(posts.channelId, input.channelId))
        : eq(posts.isDeleted, false);

      const orderCol =
        input.sort === 'new'
          ? desc(posts.createdAt)
          : input.sort === 'top'
            ? desc(posts.upvoteCount)
            : desc(posts.hotScore);

      const items = await db
        .select()
        .from(posts)
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
        .select()
        .from(posts)
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
      const [post] = await db
        .insert(posts)
        .values({
          channelId: input.channelId,
          authorId: ctx.userId,
          title: input.title,
          content: input.content,
          isAnonymous: input.isAnonymous,
          anonAlias: input.isAnonymous ? generateAnonAlias() : null,
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
        .select()
        .from(posts)
        .where(eq(posts.id, input.id))
        .limit(1);

      if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
      if (post.authorId !== ctx.userId)
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your post' });

      await db.update(posts).set({ isDeleted: true }).where(eq(posts.id, input.id));
      return { success: true };
    }),

  /**
   * Get all posts by a specific author (non-anonymous only)
   */
  getByAuthor: publicProcedure
    .input(z.object({ authorId: z.string(), limit: z.number().min(1).max(50).default(20), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const items = await db
        .select()
        .from(posts)
        .where(and(eq(posts.authorId, input.authorId), eq(posts.isDeleted, false), eq(posts.isAnonymous, false)))
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
      const [post] = await db.select().from(posts).where(eq(posts.id, input.id)).limit(1);
      if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
      if (post.authorId !== ctx.userId)
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your post' });

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
        .select()
        .from(posts)
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
