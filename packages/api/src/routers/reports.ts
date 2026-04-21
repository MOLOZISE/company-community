import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { db, reports, profiles } from '@repo/db';
import { eq, and, desc } from 'drizzle-orm';

async function assertVerified(userId: string) {
  const [profile] = await db.select({ isVerified: profiles.isVerified }).from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (!profile?.isVerified) throw new TRPCError({ code: 'FORBIDDEN', message: 'Verified users only' });
}

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
   * List all reports (admin: verified users only)
   */
  getList: protectedProcedure
    .input(z.object({ status: z.enum(['pending', 'resolved', 'dismissed']).optional(), limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      await assertVerified(ctx.userId);

      const rows = await db
        .select()
        .from(reports)
        .where(input.status ? eq(reports.status, input.status) : undefined)
        .orderBy(desc(reports.createdAt))
        .limit(input.limit);
      return rows;
    }),

  /**
   * Update report status (admin: verified users only)
   */
  updateStatus: protectedProcedure
    .input(z.object({ id: z.string(), status: z.enum(['pending', 'resolved', 'dismissed']) }))
    .mutation(async ({ ctx, input }) => {
      await assertVerified(ctx.userId);
      await db.update(reports).set({ status: input.status }).where(eq(reports.id, input.id));
      return { success: true };
    }),
});
