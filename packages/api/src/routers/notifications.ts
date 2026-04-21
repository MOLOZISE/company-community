import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { db, notifications } from '@repo/db';
import { eq, and, desc } from 'drizzle-orm';

export const notificationsRouter = router({
  /**
   * Get notifications for the current user
   */
  getList: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ input, ctx }) => {
      return db
        .select()
        .from(notifications)
        .where(eq(notifications.recipientId, ctx.userId))
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit);
    }),

  /**
   * Count of unread notifications
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.recipientId, ctx.userId), eq(notifications.isRead, false))
      );
    return rows.length;
  }),

  /**
   * Mark a single notification as read
   */
  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(eq(notifications.id, input.id), eq(notifications.recipientId, ctx.userId))
        );
      return { success: true };
    }),

  /**
   * Mark all notifications as read
   */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.recipientId, ctx.userId), eq(notifications.isRead, false))
      );
    return { success: true };
  }),
});
