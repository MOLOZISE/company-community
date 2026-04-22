import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, assertModerator } from '../trpc.js';
import { db, reports } from '@repo/db';
import { eq, and, desc } from 'drizzle-orm';

export const reportsRouter = router({
  /**
   * Submit a report on a post or comment
   */
  create: protectedProcedure
    .input(
      z.object({
        targetType: z.enum(['post', 'comment']),
        targetId: z.string(),
        reason: z.enum(['spam', 'harassment', 'misinformation', 'inappropriate', 'other']),
        description: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [existing] = await db
        .select()
        .from(reports)
        .where(
          and(
            eq(reports.reporterId, ctx.userId),
            eq(reports.targetType, input.targetType),
            eq(reports.targetId, input.targetId)
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: '이미 신고한 콘텐츠입니다.' });
      }

      await db.insert(reports).values({
        reporterId: ctx.userId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        description: input.description,
      });

      return { success: true };
    }),

  /**
   * List all reports (moderator or admin)
   */
  getList: protectedProcedure
    .input(z.object({ status: z.enum(['pending', 'resolved', 'dismissed']).optional(), limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      await assertModerator(ctx.userId);

      const rows = await db
        .select()
        .from(reports)
        .where(input.status ? eq(reports.status, input.status) : undefined)
        .orderBy(desc(reports.createdAt))
        .limit(input.limit);
      return rows;
    }),

  /**
   * Update report status (moderator or admin)
   */
  updateStatus: protectedProcedure
    .input(z.object({ id: z.string(), status: z.enum(['pending', 'resolved', 'dismissed']) }))
    .mutation(async ({ ctx, input }) => {
      await assertModerator(ctx.userId);
      await db.update(reports).set({ status: input.status }).where(eq(reports.id, input.id));
      return { success: true };
    }),
});
