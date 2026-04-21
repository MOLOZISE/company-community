import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { db, reports } from '@repo/db';
import { eq, and } from 'drizzle-orm';

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
});
