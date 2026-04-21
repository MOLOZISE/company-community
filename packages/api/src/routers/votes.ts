import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { db, votes, posts, comments } from '@repo/db';
import { eq, and, sql, inArray } from 'drizzle-orm';

const voteTargetSchema = z.object({
  targetType: z.enum(['post', 'comment']),
  targetId: z.string(),
  voteType: z.enum(['up', 'down']),
});

export const votesRouter = router({
  /**
   * Vote on a post or comment. Re-voting same type removes the vote (toggle).
   * Voting opposite type switches the vote.
   */
  vote: protectedProcedure.input(voteTargetSchema).mutation(async ({ input, ctx }) => {
    const { targetType, targetId, voteType } = input;
    const userId = ctx.userId;

    const [existing] = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.userId, userId),
          eq(votes.targetType, targetType),
          eq(votes.targetId, targetId)
        )
      )
      .limit(1);

    if (existing) {
      if (existing.voteType === voteType) {
        await db.delete(votes).where(eq(votes.id, existing.id));
        await adjustCount(targetType, targetId, voteType, -1);
        return { action: 'removed' as const };
      } else {
        await db.update(votes).set({ voteType }).where(eq(votes.id, existing.id));
        await Promise.all([
          adjustCount(targetType, targetId, existing.voteType as 'up' | 'down', -1),
          adjustCount(targetType, targetId, voteType, 1),
        ]);
        return { action: 'switched' as const };
      }
    }

    await db.insert(votes).values({ userId, targetType, targetId, voteType });
    await adjustCount(targetType, targetId, voteType, 1);
    return { action: 'added' as const };
  }),

  /**
   * Get the current user's vote on a single target
   */
  getMyVote: protectedProcedure
    .input(z.object({ targetType: z.enum(['post', 'comment']), targetId: z.string() }))
    .query(async ({ input, ctx }) => {
      const [vote] = await db
        .select()
        .from(votes)
        .where(
          and(
            eq(votes.userId, ctx.userId),
            eq(votes.targetType, input.targetType),
            eq(votes.targetId, input.targetId)
          )
        )
        .limit(1);
      return (vote?.voteType ?? null) as 'up' | 'down' | null;
    }),

  /**
   * Batch fetch vote status for multiple comment IDs in one query
   */
  getMyVotesForComments: protectedProcedure
    .input(z.object({ commentIds: z.array(z.string()) }))
    .query(async ({ input, ctx }) => {
      if (input.commentIds.length === 0) return {};
      const rows = await db
        .select({ targetId: votes.targetId, voteType: votes.voteType })
        .from(votes)
        .where(
          and(
            eq(votes.userId, ctx.userId),
            eq(votes.targetType, 'comment'),
            inArray(votes.targetId, input.commentIds)
          )
        );
      return Object.fromEntries(rows.map((r) => [r.targetId, r.voteType as 'up' | 'down']));
    }),
});

async function adjustCount(
  targetType: string,
  targetId: string,
  voteType: 'up' | 'down',
  delta: 1 | -1
) {
  if (targetType === 'post') {
    const field = voteType === 'up' ? posts.upvoteCount : posts.downvoteCount;
    const key = voteType === 'up' ? 'upvoteCount' : 'downvoteCount';
    await db
      .update(posts)
      .set({ [key]: sql`${field} + ${delta}` })
      .where(eq(posts.id, targetId));
  } else if (targetType === 'comment' && voteType === 'up') {
    await db
      .update(comments)
      .set({ upvoteCount: sql`${comments.upvoteCount} + ${delta}` })
      .where(eq(comments.id, targetId));
  }
}
