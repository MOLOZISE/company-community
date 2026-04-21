import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { db, profiles } from '@repo/db';
import { eq } from 'drizzle-orm';

export const authRouter = router({
  /**
   * Get current user's profile
   */
  getMe: protectedProcedure.query(async ({ ctx }) => {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, ctx.userId))
      .limit(1);

    if (!profile) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found' });
    }

    return profile;
  }),

  /**
   * Get any user's public profile by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const [profile] = await db
        .select({
          id: profiles.id,
          displayName: profiles.displayName,
          department: profiles.department,
          jobTitle: profiles.jobTitle,
          avatarUrl: profiles.avatarUrl,
          isVerified: profiles.isVerified,
          createdAt: profiles.createdAt,
        })
        .from(profiles)
        .where(eq(profiles.id, input.id))
        .limit(1);

      if (!profile) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      return profile;
    }),

  /**
   * Create profile after Supabase signup (idempotent)
   */
  createProfile: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        displayName: z.string().min(1).max(255),
        department: z.string().max(255).optional(),
        jobTitle: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [existing] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (existing) return existing;

      const [created] = await db
        .insert(profiles)
        .values({
          id: ctx.userId,
          email: input.email,
          displayName: input.displayName,
          department: input.department,
          jobTitle: input.jobTitle,
        })
        .returning();

      return created;
    }),

  /**
   * Update current user's profile fields
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(1).max(255).optional(),
        department: z.string().max(255).optional(),
        jobTitle: z.string().max(255).optional(),
        avatarUrl: z.string().url().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [updated] = await db
        .update(profiles)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(profiles.id, ctx.userId))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found' });
      }

      return updated;
    }),
});
