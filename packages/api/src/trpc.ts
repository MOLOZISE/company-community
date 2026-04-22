import { initTRPC, TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { db, profiles, MissingDatabaseUrlError } from '@repo/db';
import type { Context } from './context.js';

const t = initTRPC.context<Context>().create();
const DEFAULT_ADMIN_EMAILS = ['wchs0314@gmail.com'];

function mapProcedureError(error: unknown): never {
  if (error instanceof MissingDatabaseUrlError) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Database is not configured for this deployment. Please set DATABASE_URL.',
    });
  }

  throw error instanceof Error ? error : new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
}

function adminEmails() {
  const configured = process.env.ADMIN_EMAILS?.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean) ?? [];
  return new Set([...DEFAULT_ADMIN_EMAILS, ...configured]);
}

async function getProfile(userId: string) {
  const [profile] = await db
    .select({
      email: profiles.email,
      role: profiles.role,
      isVerified: profiles.isVerified,
    })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return profile;
}

export const router = t.router;
export const publicProcedure = t.procedure.use(async (opts) => {
  try {
    return await opts.next();
  } catch (error) {
    mapProcedureError(error);
  }
});

export const protectedProcedure = t.procedure.use(async (opts) => {
  try {
    const { ctx } = opts;

    if (!ctx.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource',
      });
    }

    return await opts.next({
      ctx: {
        ...ctx,
        userId: ctx.userId,
      },
    });
  } catch (error) {
    mapProcedureError(error);
  }
});

export async function assertAdmin(userId: string, authEmail?: string | null) {
  const allowlist = adminEmails();
  const emailFromAuth = authEmail?.toLowerCase();
  if (emailFromAuth && allowlist.has(emailFromAuth)) return;

  const profile = await getProfile(userId);
  if (!profile) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
  }

  if (profile.role === 'admin') return;
  if (allowlist.has(profile.email.toLowerCase())) return;

  throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
}

export async function assertModerator(userId: string) {
  const profile = await getProfile(userId);
  if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Moderator only' });
  }
}

/**
 * @deprecated Use assertAdmin or assertModerator instead.
 */
export async function assertVerified(userId: string) {
  const profile = await getProfile(userId);
  if (!profile?.isVerified) throw new TRPCError({ code: 'FORBIDDEN', message: 'Verified users only' });
}
