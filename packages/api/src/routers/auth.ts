import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { db, profiles, posts } from '@repo/db';
import { eq, and, sql, ilike, or } from 'drizzle-orm';

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

    return profile ?? null;
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
   * Get activity stats for the current user
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await db
      .select({
        postCount: sql<number>`count(*)::int`,
        totalUpvotes: sql<number>`coalesce(sum(upvote_count), 0)::int`,
      })
      .from(posts)
      .where(and(eq(posts.authorId, ctx.userId), eq(posts.isDeleted, false)));

    return {
      postCount: row?.postCount ?? 0,
      totalUpvotes: row?.totalUpvotes ?? 0,
    };
  }),

  /**
   * Search public profiles by display name or department
   */
  search: publicProcedure
    .input(z.object({ q: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      const term = `%${input.q}%`;
      return db
        .select({
          id: profiles.id,
          displayName: profiles.displayName,
          department: profiles.department,
          jobTitle: profiles.jobTitle,
          avatarUrl: profiles.avatarUrl,
        })
        .from(profiles)
        .where(or(ilike(profiles.displayName, term), ilike(profiles.department, term)))
        .limit(10);
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
      const [existing] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(profiles)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(profiles.id, ctx.userId))
          .returning();

        return updated;
      }

      const email = ctx.user?.email?.trim();
      if (!email) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Email is required to create a profile' });
      }

      const displayName = input.displayName?.trim() || email.split('@')[0] || 'User';

      const [created] = await db
        .insert(profiles)
        .values({
          id: ctx.userId,
          email,
          displayName,
          department: input.department,
          jobTitle: input.jobTitle,
          avatarUrl: input.avatarUrl ?? null,
        })
        .returning();

      return created;
    }),
});
