import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { db, comments, posts, notifications } from '@repo/db';
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
      let parentAuthorId: string | null = null;

      if (input.parentId) {
        const [parent] = await db
          .select()
          .from(comments)
          .where(eq(comments.id, input.parentId))
          .limit(1);
        if (!parent) throw new TRPCError({ code: 'NOT_FOUND', message: 'Parent comment not found' });
        if (parent.depth !== 0)
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Replies can only be 1 level deep' });
        parentAuthorId = parent.authorId;
      }

      const [post] = await db
        .select({ authorId: posts.authorId })
        .from(posts)
        .where(eq(posts.id, input.postId))
        .limit(1);

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

      // Fire notifications + count update concurrently
      const tasks: Promise<unknown>[] = [
        db
          .update(posts)
          .set({ commentCount: sql`${posts.commentCount} + 1` })
          .where(eq(posts.id, input.postId)),
      ];

      // Notify post author on new top-level comment
      if (!input.parentId && post && post.authorId !== ctx.userId) {
        tasks.push(
          db.insert(notifications).values({
            recipientId: post.authorId,
            actorId: ctx.userId,
            type: 'comment',
            targetType: 'post',
            targetId: input.postId,
            message: '회원님의 게시물에 댓글이 달렸습니다.',
          })
        );
      }

      // Notify parent comment author on reply
      if (input.parentId && parentAuthorId && parentAuthorId !== ctx.userId) {
        tasks.push(
          db.insert(notifications).values({
            recipientId: parentAuthorId,
            actorId: ctx.userId,
            type: 'reply',
            targetType: 'comment',
            targetId: input.parentId,
            message: '회원님의 댓글에 답글이 달렸습니다.',
          })
        );
      }

      await Promise.all(tasks);

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

      await Promise.all([
        db.update(comments).set({ isDeleted: true }).where(eq(comments.id, input.id)),
        db
          .update(posts)
          .set({ commentCount: sql`${posts.commentCount} - 1` })
          .where(eq(posts.id, comment.postId)),
      ]);

      return { success: true };
    }),
});
