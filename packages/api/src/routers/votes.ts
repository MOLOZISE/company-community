import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { db, votes, posts, comments } from '@repo/db';
import { eq, and, sql } from 'drizzle-orm';

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
        // Toggle off — remove vote
        await db.delete(votes).where(eq(votes.id, existing.id));
        await adjustCount(targetType, targetId, voteType, -1);
        return { action: 'removed' as const };
      } else {
        // Switch vote
        await db.update(votes).set({ voteType }).where(eq(votes.id, existing.id));
        await adjustCount(targetType, targetId, existing.voteType as 'up' | 'down', -1);
        await adjustCount(targetType, targetId, voteType, 1);
        return { action: 'switched' as const };
      }
    }

    // New vote
    await db.insert(votes).values({ userId, targetType, targetId, voteType });
    await adjustCount(targetType, targetId, voteType, 1);
    return { action: 'added' as const };
  }),

  /**
   * Get the current user's vote on a target
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
      return vote?.voteType ?? null;
    }),
});

async function adjustCount(
  targetType: string,
  targetId: string,
  voteType: 'up' | 'down',
  delta: 1 | -1
) {
  const col = voteType === 'up' ? 'upvote_count' : 'downvote_count';
  if (targetType === 'post') {
    const field = voteType === 'up' ? posts.upvoteCount : posts.downvoteCount;
    await db
      .update(posts)
      .set({ [col === 'upvote_count' ? 'upvoteCount' : 'downvoteCount']: sql`${field} + ${delta}` })
      .where(eq(posts.id, targetId));
  } else if (targetType === 'comment') {
    if (voteType === 'up') {
      await db
        .update(comments)
        .set({ upvoteCount: sql`${comments.upvoteCount} + ${delta}` })
        .where(eq(comments.id, targetId));
    }
  }
}
