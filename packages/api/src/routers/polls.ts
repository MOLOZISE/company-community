import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { db, posts, pollOptions, pollVotes } from '@repo/db';
import { and, asc, count, eq, sql } from 'drizzle-orm';

function normalizePollOptions(options: string[]): string[] {
  return options.map((option) => option.trim()).filter(Boolean);
}

function assertPollOptionCount(options: string[]) {
  if (options.length < 2 || options.length > 5) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Poll options must be between 2 and 5 items' });
  }
}

async function ensurePollPost(postId: string, userId?: string) {
  const [post] = await db
    .select({ id: posts.id, authorId: posts.authorId, kind: posts.kind, isDeleted: posts.isDeleted })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post || post.isDeleted || post.kind !== 'poll') {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Poll not found' });
  }

  if (userId && post.authorId !== userId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your poll' });
  }

  return post;
}

export const pollsRouter = router({
  /**
   * Create poll options for a poll post.
   */
  create: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        options: z.array(z.string().min(1).max(200)).min(2).max(5),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ensurePollPost(input.postId, ctx.userId);
      const options = normalizePollOptions(input.options);
      assertPollOptionCount(options);

      const existing = await db
        .select({ id: pollOptions.id })
        .from(pollOptions)
        .where(eq(pollOptions.postId, input.postId))
        .limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Poll options already exist' });
      }

      await db.transaction(async (tx) => {
        await tx.insert(pollOptions).values(
          options.map((label, index) => ({
            postId: input.postId,
            label,
            orderIdx: index,
          }))
        );
      });

      return { success: true };
    }),

  /**
   * Get poll results for a post.
   */
  getResults: publicProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ input, ctx }) => {
      await ensurePollPost(input.postId);

      const rows = await db
        .select({
          id: pollOptions.id,
          label: pollOptions.label,
          orderIdx: pollOptions.orderIdx,
          voteCount: sql<number>`count(${pollVotes.userId})::int`,
        })
        .from(pollOptions)
        .leftJoin(pollVotes, eq(pollVotes.pollOptionId, pollOptions.id))
        .where(eq(pollOptions.postId, input.postId))
        .groupBy(pollOptions.id, pollOptions.label, pollOptions.orderIdx)
        .orderBy(asc(pollOptions.orderIdx));

      const [totalVotesRow] = await db
        .select({ totalVotes: count() })
        .from(pollVotes)
        .where(eq(pollVotes.postId, input.postId));

      let myVoteOptionId: string | null = null;
      if (ctx.userId) {
        const [myVote] = await db
          .select({ pollOptionId: pollVotes.pollOptionId })
          .from(pollVotes)
          .where(and(eq(pollVotes.postId, input.postId), eq(pollVotes.userId, ctx.userId)))
          .limit(1);
        myVoteOptionId = myVote?.pollOptionId ?? null;
      }

      return {
        options: rows,
        totalVotes: totalVotesRow?.totalVotes ?? 0,
        myVoteOptionId,
      };
    }),

  /**
   * Vote on a poll option.
   */
  vote: protectedProcedure
    .input(z.object({ postId: z.string(), optionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ensurePollPost(input.postId);

      const [option] = await db
        .select({ id: pollOptions.id, postId: pollOptions.postId })
        .from(pollOptions)
        .where(and(eq(pollOptions.id, input.optionId), eq(pollOptions.postId, input.postId)))
        .limit(1);

      if (!option) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Poll option not found' });
      }

      await db
        .insert(pollVotes)
        .values({
          userId: ctx.userId,
          postId: input.postId,
          pollOptionId: input.optionId,
        })
        .onConflictDoUpdate({
          target: [pollVotes.userId, pollVotes.postId],
          set: {
            pollOptionId: input.optionId,
            createdAt: sql`now()`,
          },
        });

      return { success: true as const, myVoteOptionId: input.optionId };
    }),
});

export { normalizePollOptions };
