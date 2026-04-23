import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure, assertAdmin } from '../trpc.js';
import { db, channels, channelMembers, channelRequests, posts, profiles } from '@repo/db';
import { eq, desc, and, sql, ilike, or, asc, notInArray } from 'drizzle-orm';

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

function splitDepartment(value: string) {
  return value
    .split(/[\s,\/|·]+/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .slice(0, 4);
}

export const channelsRouter = router({
  /**
   * List channels, optionally filtered by type (board | space)
   */
  getList: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        type: z.enum(['board', 'space']).optional(),
      })
    )
    .query(async ({ input }) => {
      const where = input.type ? eq(channels.type, input.type) : undefined;
      const items = await db
        .select({
          id: channels.id,
          slug: channels.slug,
          name: channels.name,
          description: channels.description,
          iconUrl: channels.iconUrl,
          memberCount: channels.memberCount,
          postCount: channels.postCount,
          type: channels.type,
          scope: channels.scope,
          sidebarSection: channels.sidebarSection,
          postingMode: channels.postingMode,
          membershipType: channels.membershipType,
          isListed: channels.isListed,
          defaultSort: channels.defaultSort,
          purpose: channels.purpose,
          displayOrder: channels.displayOrder,
          parentId: channels.parentId,
          latestPostTitle: sql<string | null>`
            (
              select p.title
              from ${posts} p
              where p.channel_id = ${channels.id}
                and p.is_deleted = false
              order by p.created_at desc
              limit 1
            )
          `,
          topPostTitle: sql<string | null>`
            (
              select p.title
              from ${posts} p
              where p.channel_id = ${channels.id}
                and p.is_deleted = false
              order by p.hot_score desc, p.created_at desc
              limit 1
            )
          `,
        })
        .from(channels)
        .where(where)
        .orderBy(asc(channels.displayOrder), desc(channels.memberCount))
        .limit(input.limit)
        .offset(input.offset);
      return { items, hasMore: items.length === input.limit };
    }),

  /**
   * Lightweight board summary list for the home page.
   * Avoids expensive per-channel post title subqueries.
   */
  getHomeBoards: publicProcedure.query(async () => {
    const items = await db
      .select({
        id: channels.id,
        slug: channels.slug,
        name: channels.name,
        description: channels.description,
        postCount: channels.postCount,
        sidebarSection: channels.sidebarSection,
      })
      .from(channels)
      .where(eq(channels.type, 'board'))
      .orderBy(asc(channels.displayOrder), desc(channels.memberCount))
      .limit(20);

    return { items, hasMore: false };
  }),

  /**
   * Lightweight directory list for sidebars and overview pages.
   * Includes both boards and spaces but skips per-channel post title subqueries.
   */
  getDirectory: publicProcedure.query(async () => {
    const items = await db
      .select({
        id: channels.id,
        slug: channels.slug,
        name: channels.name,
        description: channels.description,
        iconUrl: channels.iconUrl,
        memberCount: channels.memberCount,
        postCount: channels.postCount,
        type: channels.type,
        scope: channels.scope,
        sidebarSection: channels.sidebarSection,
        postingMode: channels.postingMode,
        membershipType: channels.membershipType,
        isListed: channels.isListed,
        defaultSort: channels.defaultSort,
        purpose: channels.purpose,
        displayOrder: channels.displayOrder,
        parentId: channels.parentId,
      })
      .from(channels)
      .orderBy(asc(channels.displayOrder), desc(channels.memberCount));

    return { items, hasMore: false };
  }),

  /**
   * Get single channel by id
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const [channel] = await db
        .select()
        .from(channels)
        .where(eq(channels.id, input.id))
        .limit(1);
      if (!channel) throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' });
      return channel;
    }),

  /**
   * Get single channel by slug
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const [channel] = await db
        .select()
        .from(channels)
        .where(eq(channels.slug, input.slug))
        .limit(1);
      if (!channel) throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' });
      return channel;
    }),

  /**
   * Check whether the current user can review channel requests.
   */
  isAdmin: protectedProcedure.query(async ({ ctx }) => {
    try {
      await assertAdmin(ctx.userId, ctx.user?.email);
      return true;
    } catch {
      return false;
    }
  }),

  /**
   * Request a new channel. Admin approval creates the actual channel.
   */
  requestCreate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        slug: z.string().max(100).optional(),
        description: z.string().max(1000).optional(),
        reason: z.string().max(1000).optional(),
        requestedType: z.enum(['board', 'space']).default('board'),
        requestedScope: z.enum(['company', 'subsidiary', 'department', 'project', 'interest']).default('company'),
        requestedPostingMode: z.enum(['real_only', 'anonymous_allowed', 'anonymous_only']).default('anonymous_allowed'),
        requestedMembershipType: z.enum(['open', 'request', 'invite']).default('open'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const slug = normalizeSlug(input.slug || input.name);
      if (!slug) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Channel slug is required' });
      }

      const [existingChannel] = await db
        .select({ id: channels.id })
        .from(channels)
        .where(eq(channels.slug, slug))
        .limit(1);
      if (existingChannel) {
        throw new TRPCError({ code: 'CONFLICT', message: '이미 사용 중인 채널 주소입니다.' });
      }

      const [pendingRequest] = await db
        .select({ id: channelRequests.id })
        .from(channelRequests)
        .where(and(eq(channelRequests.slug, slug), eq(channelRequests.status, 'pending')))
        .limit(1);
      if (pendingRequest) {
        throw new TRPCError({ code: 'CONFLICT', message: '이미 검토 중인 채널 신청입니다.' });
      }

      const [created] = await db
        .insert(channelRequests)
        .values({
          name: input.name.trim(),
          slug,
          description: input.description?.trim() || null,
          reason: input.reason?.trim() || null,
          requestedBy: ctx.userId,
          requestedType: input.requestedType,
          requestedScope: input.requestedScope,
          requestedPostingMode: input.requestedPostingMode,
          requestedMembershipType: input.requestedMembershipType,
        })
        .returning();

      return created;
    }),

  /**
   * List channel requests for admins.
   */
  getRequests: protectedProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      await assertAdmin(ctx.userId, ctx.user?.email);

      const rows = await db
        .select({
          id: channelRequests.id,
          name: channelRequests.name,
          slug: channelRequests.slug,
          description: channelRequests.description,
          reason: channelRequests.reason,
          status: channelRequests.status,
          requestedBy: channelRequests.requestedBy,
          requesterName: profiles.displayName,
          requesterEmail: profiles.email,
          reviewedBy: channelRequests.reviewedBy,
          reviewedAt: channelRequests.reviewedAt,
          createdChannelId: channelRequests.createdChannelId,
          createdAt: channelRequests.createdAt,
          requestedType: channelRequests.requestedType,
          requestedScope: channelRequests.requestedScope,
          requestedPostingMode: channelRequests.requestedPostingMode,
          requestedMembershipType: channelRequests.requestedMembershipType,
        })
        .from(channelRequests)
        .leftJoin(profiles, eq(channelRequests.requestedBy, profiles.id))
        .where(input.status ? eq(channelRequests.status, input.status) : undefined)
        .orderBy(desc(channelRequests.createdAt))
        .limit(input.limit);

      return rows;
    }),

  /**
   * Approve a channel request and create the channel.
   */
  approveRequest: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertAdmin(ctx.userId, ctx.user?.email);

      const [request] = await db
        .select()
        .from(channelRequests)
        .where(eq(channelRequests.id, input.id))
        .limit(1);

      if (!request) throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel request not found' });
      if (request.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '이미 처리된 신청입니다.' });
      }

      const [existingChannel] = await db
        .select({ id: channels.id })
        .from(channels)
        .where(eq(channels.slug, request.slug))
        .limit(1);
      if (existingChannel) {
        throw new TRPCError({ code: 'CONFLICT', message: '이미 사용 중인 채널 주소입니다.' });
      }

      const [channel] = await db
        .insert(channels)
        .values({
          name: request.name,
          slug: request.slug,
          description: request.description,
          createdBy: request.requestedBy,
          memberCount: 1,
          type: request.requestedType ?? 'board',
          scope: request.requestedScope ?? 'company',
          postingMode: request.requestedPostingMode ?? 'anonymous_allowed',
          membershipType: request.requestedMembershipType ?? 'open',
        })
        .returning();

      await db
        .insert(channelMembers)
        .values({ channelId: channel.id, userId: request.requestedBy, role: 'admin' })
        .onConflictDoNothing();

      await db
        .update(channelRequests)
        .set({
          status: 'approved',
          reviewedBy: ctx.userId,
          reviewedAt: new Date(),
          createdChannelId: channel.id,
        })
        .where(eq(channelRequests.id, input.id));

      return channel;
    }),

  /**
   * Reject a channel request.
   */
  rejectRequest: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertAdmin(ctx.userId, ctx.user?.email);

      await db
        .update(channelRequests)
        .set({ status: 'rejected', reviewedBy: ctx.userId, reviewedAt: new Date() })
        .where(and(eq(channelRequests.id, input.id), eq(channelRequests.status, 'pending')));

      return { success: true };
    }),

  /**
   * Admin-only direct channel creation.
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        slug: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-z0-9가-힣-]+$/, 'Slug must be letters, numbers, Korean characters, or hyphens'),
        description: z.string().max(1000).optional(),
        type: z.enum(['board', 'space']).default('board'),
        scope: z.enum(['company', 'subsidiary', 'department', 'project', 'interest']).default('company'),
        postingMode: z.enum(['real_only', 'anonymous_allowed', 'anonymous_only']).default('anonymous_allowed'),
        membershipType: z.enum(['open', 'request', 'invite']).default('open'),
        isListed: z.boolean().default(true),
        parentId: z.string().optional(),
        defaultSort: z.enum(['latest', 'hot', 'pinned']).default('latest'),
        purpose: z.enum(['discussion', 'knowledge', 'announcement', 'social']).default('discussion'),
        displayOrder: z.number().int().default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertAdmin(ctx.userId, ctx.user?.email);

      const { slug: rawSlug, ...rest } = input;
      const [created] = await db
        .insert(channels)
        .values({ ...rest, slug: normalizeSlug(rawSlug), createdBy: ctx.userId, memberCount: 1 })
        .returning();
      await db
        .insert(channelMembers)
        .values({ channelId: created.id, userId: ctx.userId, role: 'admin' })
        .onConflictDoNothing();
      return created;
    }),

  /**
   * Join a channel
   */
  join: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(channelMembers)
          .values({ channelId: input.channelId, userId: ctx.userId })
          .onConflictDoNothing()
          .returning({ channelId: channelMembers.channelId });

        if (inserted.length > 0) {
          await tx
            .update(channels)
            .set({ memberCount: sql`${channels.memberCount} + 1` })
            .where(eq(channels.id, input.channelId));
        }
      });
      return { success: true };
    }),

  /**
   * Leave a channel
   */
  leave: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await db.transaction(async (tx) => {
        const deleted = await tx
          .delete(channelMembers)
          .where(
            and(
              eq(channelMembers.channelId, input.channelId),
              eq(channelMembers.userId, ctx.userId)
            )
          )
          .returning({ channelId: channelMembers.channelId });

        if (deleted.length > 0) {
          await tx
            .update(channels)
            .set({ memberCount: sql`${channels.memberCount} - 1` })
            .where(eq(channels.id, input.channelId));
        }
      });
      return { success: true };
    }),

  /**
   * Get channel IDs the current user has joined
   */
  getMyMemberships: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await db
      .select({ channelId: channelMembers.channelId })
      .from(channelMembers)
      .where(eq(channelMembers.userId, ctx.userId));
    return memberships.map((m) => m.channelId);
  }),

  /**
   * Recommend onboarding channels for a new member.
   */
  getRecommended: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(10).default(3) }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 3;

      const [profile] = await db
        .select({ department: profiles.department, createdAt: profiles.createdAt })
        .from(profiles)
        .where(eq(profiles.id, ctx.userId))
        .limit(1);

      const joined = await db
        .select({ channelId: channelMembers.channelId })
        .from(channelMembers)
        .where(eq(channelMembers.userId, ctx.userId));

      const joinedIds = joined.map((row) => row.channelId);
      const department = profile?.department?.trim() ?? '';
      const departmentTokens = department ? splitDepartment(department) : [];

      const baseWhere = and(eq(channels.isListed, true), eq(channels.membershipType, 'open'));
      const openQuery = db
        .select({
          id: channels.id,
          slug: channels.slug,
          name: channels.name,
          description: channels.description,
          memberCount: channels.memberCount,
          iconUrl: channels.iconUrl,
        })
        .from(channels)
        .where(
          and(
            baseWhere,
            joinedIds.length > 0 ? notInArray(channels.id, joinedIds) : undefined
          )
        )
        .orderBy(desc(channels.memberCount), asc(channels.displayOrder))
        .limit(limit);

      const departmentQuery = departmentTokens.length
        ? db
            .select({
              id: channels.id,
              slug: channels.slug,
              name: channels.name,
              description: channels.description,
              memberCount: channels.memberCount,
              iconUrl: channels.iconUrl,
            })
            .from(channels)
            .where(
              and(
                eq(channels.isListed, true),
                joinedIds.length > 0 ? notInArray(channels.id, joinedIds) : undefined,
                or(
                  eq(channels.scope, 'department'),
                  ...departmentTokens.flatMap((token) => [
                    ilike(channels.name, `%${token}%`),
                    ilike(channels.description, `%${token}%`),
                  ])
                )
              )
            )
            .orderBy(desc(channels.memberCount), asc(channels.displayOrder))
            .limit(limit)
        : null;

      const departmentRows = departmentQuery ? await departmentQuery : [];
      if (departmentRows.length >= limit || !departmentQuery) {
        return departmentRows.slice(0, limit);
      }

      const fallbackRows = await openQuery;
      const seen = new Set(departmentRows.map((row) => row.id));
      for (const row of fallbackRows) {
        if (seen.has(row.id)) continue;
        departmentRows.push(row);
        if (departmentRows.length >= limit) break;
      }

      return departmentRows;
    }),

  /**
   * Search channels by name or description
   */
  search: publicProcedure
    .input(z.object({ q: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      const term = `%${input.q}%`;
      return db
        .select({
          id: channels.id,
          slug: channels.slug,
          name: channels.name,
          description: channels.description,
          memberCount: channels.memberCount,
          type: channels.type,
        })
        .from(channels)
        .where(or(ilike(channels.name, term), ilike(channels.description, term)))
        .orderBy(desc(channels.memberCount))
        .limit(10);
    }),
});
