import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { db, reactions } from '@repo/db';
import { eq, and, sql } from 'drizzle-orm';

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'] as const;
type Emoji = (typeof ALLOWED_EMOJIS)[number];

export const reactionsRouter = router({
  /**
   * Get aggregated emoji reactions for a post
   */
  getForPost: publicProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ input }) => {
      const rows = await db
        .select({ emoji: reactions.emoji, count: sql<number>`count(*)::int` })
        .from(reactions)
        .where(eq(reactions.postId, input.postId))
        .groupBy(reactions.emoji);

      // Build a full map with zeros for emojis with no reactions
      const map: Record<string, number> = Object.fromEntries(
        ALLOWED_EMOJIS.map((e) => [e, 0])
      );
      for (const r of rows) map[r.emoji] = r.count;
      return map as Record<Emoji, number>;
    }),

  /**
   * Get current user's reaction on a post (or null)
   */
  getMyReaction: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ input, ctx }) => {
      const [row] = await db
        .select()
        .from(reactions)
        .where(and(eq(reactions.userId, ctx.userId), eq(reactions.postId, input.postId)))
        .limit(1);
      return (row?.emoji ?? null) as Emoji | null;
    }),

  /**
   * Toggle a reaction on a post. Selecting the same emoji removes it; different emoji replaces it.
   */
  toggle: protectedProcedure
    .input(z.object({ postId: z.string(), emoji: z.enum(ALLOWED_EMOJIS) }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await db
        .select()
        .from(reactions)
        .where(and(eq(reactions.userId, ctx.userId), eq(reactions.postId, input.postId)))
        .limit(1);

      if (existing) {
        if (existing.emoji === input.emoji) {
          await db.delete(reactions).where(eq(reactions.id, existing.id));
          return { action: 'removed' as const };
        }
        await db.update(reactions).set({ emoji: input.emoji }).where(eq(reactions.id, existing.id));
        return { action: 'switched' as const };
      }

      await db.insert(reactions).values({
        userId: ctx.userId,
        postId: input.postId,
        emoji: input.emoji,
      });
      return { action: 'added' as const };
    }),
});
