import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { db, comments, posts } from '@repo/db';
import { eq, and, sql, desc } from 'drizzle-orm';

export const commentsRouter = router({
  /**
   * Get top-level comments for a post, with replies nested inside
   */
  getByPost: publicProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ input }) => {
      const allComments = await db
        .select()
        .from(comments)
        .where(and(eq(comments.postId, input.postId), eq(comments.isDeleted, false)))
        .orderBy(desc(comments.createdAt));

      // Build 2-level tree: top-level + replies
      const topLevel = allComments.filter((c) => c.parentId === null);
      const replies = allComments.filter((c) => c.parentId !== null);

      return topLevel.map((parent) => ({
        ...parent,
        replies: replies.filter((r) => r.parentId === parent.id),
      }));
    }),

  /**
   * Create a comment or reply
   */
  create: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        parentId: z.string().optional(),
        content: z.string().min(1).max(3000),
        isAnonymous: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Validate parent exists and is top-level (max 2 levels deep)
      if (input.parentId) {
        const [parent] = await db
          .select()
          .from(comments)
          .where(eq(comments.id, input.parentId))
          .limit(1);
        if (!parent) throw new TRPCError({ code: 'NOT_FOUND', message: 'Parent comment not found' });
        if (parent.depth !== 0)
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Replies can only be 1 level deep' });
      }

      const [comment] = await db
        .insert(comments)
        .values({
          postId: input.postId,
          authorId: ctx.userId,
          parentId: input.parentId ?? null,
          content: input.content,
          isAnonymous: input.isAnonymous,
          depth: input.parentId ? 1 : 0,
        })
        .returning();

      // Increment post comment count
      await db
        .update(posts)
        .set({ commentCount: sql`${posts.commentCount} + 1` })
        .where(eq(posts.id, input.postId));

      return comment;
    }),

  /**
   * Soft delete a comment (owner only)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [comment] = await db
        .select()
        .from(comments)
        .where(eq(comments.id, input.id))
        .limit(1);

      if (!comment) throw new TRPCError({ code: 'NOT_FOUND', message: 'Comment not found' });
      if (comment.authorId !== ctx.userId)
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your comment' });

      await db.update(comments).set({ isDeleted: true }).where(eq(comments.id, input.id));

      await db
        .update(posts)
        .set({ commentCount: sql`${posts.commentCount} - 1` })
        .where(eq(posts.id, comment.postId));

      return { success: true };
    }),
});
