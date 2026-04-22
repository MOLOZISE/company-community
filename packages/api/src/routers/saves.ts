import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { db, saves, posts, profiles, channels } from '@repo/db';
import { and, desc, eq, getTableColumns, inArray } from 'drizzle-orm';

const postSelect = {
  ...getTableColumns(posts),
  authorName: profiles.displayName,
  authorAvatar: profiles.avatarUrl,
  channelName: channels.name,
  channelSlug: channels.slug,
};

export const savesRouter = router({
  /**
   * Toggle saved state for a post.
   */
  toggle: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [post] = await db
        .select({ id: posts.id, isDeleted: posts.isDeleted })
        .from(posts)
        .where(eq(posts.id, input.postId))
        .limit(1);

      if (!post || post.isDeleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
      }

      const [existing] = await db
        .select({ userId: saves.userId, postId: saves.postId })
        .from(saves)
        .where(and(eq(saves.userId, ctx.userId), eq(saves.postId, input.postId)))
        .limit(1);

      if (existing) {
        await db.delete(saves).where(and(eq(saves.userId, ctx.userId), eq(saves.postId, input.postId)));
        return { saved: false as const };
      }

      await db.insert(saves).values({ userId: ctx.userId, postId: input.postId });
      return { saved: true as const };
    }),

  /**
   * Get the current user's saved posts.
   */
  getMySaves: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20), offset: z.number().min(0).default(0) }))
    .query(async ({ input, ctx }) => {
      const items = await db
        .select({
          ...postSelect,
          savedAt: saves.createdAt,
        })
        .from(saves)
        .innerJoin(posts, eq(saves.postId, posts.id))
        .leftJoin(profiles, eq(posts.authorId, profiles.id))
        .leftJoin(channels, eq(posts.channelId, channels.id))
        .where(and(eq(saves.userId, ctx.userId), eq(posts.isDeleted, false)))
        .orderBy(desc(saves.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { items, hasMore: items.length === input.limit };
    }),

  /**
   * Return a map of postId -> saved for the current user.
   */
  getIsSavedMap: protectedProcedure
    .input(z.object({ postIds: z.array(z.string()).max(100).default([]) }))
    .query(async ({ input, ctx }) => {
      if (input.postIds.length === 0) return {} as Record<string, boolean>;

      const rows = await db
        .select({ postId: saves.postId })
        .from(saves)
        .where(and(eq(saves.userId, ctx.userId), inArray(saves.postId, input.postIds)));

      return Object.fromEntries(rows.map((row) => [row.postId, true])) as Record<string, boolean>;
    }),
});
