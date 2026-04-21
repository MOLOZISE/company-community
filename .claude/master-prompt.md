# Company Community - Claude Code Master Prompt

Use this prompt when starting any development task in Claude Code.

---

## ⚡ Quick Context

**Project**: Real/anonymous corporate community platform (Blind + Reddit + Karrot hybrid)

**Tech**: 
- Next.js 15 (App Router) + React 18
- tRPC v11 + Drizzle ORM + Supabase (PostgreSQL)
- Turborepo monorepo + pnpm
- Vercel deployment

**Where code lives**:
- Backend API: `packages/api/src/routers/`
- DB schema: `packages/db/src/schema/`
- Shared types: `packages/types/src/`
- Frontend: `apps/web/src/app/` (pages), `apps/web/src/components/`

**Key principle**: Type safety everywhere (Zod + TypeScript = zero guessing at runtime)

---

## 🛠️ Development Checklist

When implementing a feature:

- [ ] **Understand the spec**: Read CLAUDE.md section & phase plan
- [ ] **Check patterns**: Look at similar code in same module (e.g., if adding posts, check existing post router)
- [ ] **Schema first**: If touching DB, define Drizzle schema in `packages/db/src/schema/`
- [ ] **tRPC procedure**: Write backend in `packages/api/src/routers/[feature]/router.ts` with Zod schema
- [ ] **Type export**: Ensure types exported from `packages/types/`
- [ ] **React component**: Build UI in `apps/web/src/components/` using tRPC hooks
- [ ] **Test manually**: `pnpm dev` → http://localhost:3000 → use feature
- [ ] **Verify type safety**: `pnpm type-check` passes
- [ ] **Commit & push**: `git commit -m "feat: ..."` → auto-deploys Vercel

---

## 📝 Common Task Templates

### Add a new tRPC route (e.g., get channels)

1. **Check existing router**: `packages/api/src/routers/channels.ts` (does it exist?)
2. **Add Zod schema**:
```typescript
// packages/api/src/routers/channels.ts
const getListInput = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});
```
3. **Add procedure**:
```typescript
getList: publicProcedure
  .input(getListInput)
  .query(async ({ input }) => {
    const channels = await db.select().from(channels).limit(input.limit).offset(input.offset);
    return channels;
  }),
```
4. **Register**: Add to `packages/api/src/routers/index.ts` if new router
5. **Type check**: `pnpm type-check`

### Add a React component using tRPC

1. **Create file**: `apps/web/src/components/ChannelList.tsx`
2. **Use tRPC hook**:
```typescript
'use client';
import { trpc } from '@/lib/trpc';

export function ChannelList() {
  const { data, isLoading } = trpc.channels.getList.useQuery({
    limit: 20,
  });
  
  if (isLoading) return <div>Loading...</div>;
  return (
    <div>
      {data?.map(ch => (
        <div key={ch.id}>{ch.name}</div>
      ))}
    </div>
  );
}
```
3. **Import in page**: `apps/web/src/app/(main)/page.tsx`
4. **Test**: `pnpm dev` → check browser

### Modify DB schema

1. **Edit**: `packages/db/src/schema/index.ts`
2. **Push**: `pnpm db:push`
3. **Verify**: `pnpm db:studio` → check Supabase UI
4. **Update routers**: If schema changed, update tRPC queries/mutations

### Add authenticated endpoint

1. **Use `protectedProcedure`** (not `publicProcedure`):
```typescript
create: protectedProcedure
  .input(z.object({ content: z.string() }))
  .mutation(async ({ input, ctx }) => {
    // ctx.userId is guaranteed to exist
    const created = await db.insert(posts).values({
      authorId: ctx.userId,
      content: input.content,
    }).returning();
    return created[0];
  }),
```
2. **Frontend handles auth**: Token auto-sent via tRPC client
3. **Test**: Login first, then test mutation

---

## 🔍 Code Navigation

**Find something?** Use these patterns:

| Looking for | Path | Example |
|-------------|------|---------|
| tRPC router | `packages/api/src/routers/[feature]` | `packages/api/src/routers/posts.ts` |
| DB schema | `packages/db/src/schema/index.ts` | Search `export const channels = pgTable(...)` |
| Type definitions | `packages/types/src/index.ts` | `export interface Post { ... }` |
| React component | `apps/web/src/components/` | `apps/web/src/components/PostCard.tsx` |
| Page/route | `apps/web/src/app/` | `apps/web/src/app/(main)/feed/page.tsx` |
| Utils/hooks | `apps/web/src/lib/` | `apps/web/src/lib/trpc.ts`, `apps/web/src/lib/supabase.ts` |
| Styles | Global: `apps/web/src/styles/globals.css`, Inline: `className="..."` with Tailwind |

---

## 🧪 Testing & Verification

**Before committing**:

```bash
pnpm type-check          # Catch TypeScript errors
pnpm lint                # ESLint check
pnpm build               # Full build (all workspaces)
pnpm dev                 # Test in browser
```

**In browser** (http://localhost:3000):
- Test happy path (e.g., create post → see it in feed)
- Test error path (e.g., submit empty → show error)
- Test auth (e.g., logout → can't create post)
- Check console for errors/warnings

---

## 🚀 Deployment

**Automatic**:
1. `git push` to `main`
2. Vercel detects push
3. Runs `pnpm build` + deploys `apps/web/.next`
4. Live at https://company-community.vercel.app

**Manual checks**:
- Environment variables set in Vercel dashboard
- `pnpm build` succeeds locally first
- No TypeScript errors

---

## 📋 Phase 1 Implementation Order

**Week 2**: Auth (Supabase signup/login/profiles)  
**Week 3**: Channels + Posts CRUD  
**Week 4**: Votes + Comments  
**Week 5**: Realtime comments + Notifications  
**Week 6**: Search + Polish + Deploy  

Start task with: **"Implement [feature] for Week [X]"**

---

## ❓ Common Gotchas

| Issue | Solution |
|-------|----------|
| "tRPC query returns undefined" | Check Zod input matches call. Check async/await. |
| "Component not re-rendering" | Use `trpc.hook.useQuery()` not direct function call. |
| "Type mismatch: string vs UUID" | Drizzle schema defines UUID, but input comes as string. Cast if needed. |
| "Can't find component/type" | Check `@repo/*` path aliases in tsconfig. May need `pnpm install`. |
| "Auth not working" | Verify `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| "Supabase RLS blocking query" | Check `packages/db/migrations/001_initial_schema.sql` policies match your operation. |

---

## 💡 Pro Tips

1. **Always check existing code first** - Patterns are already established. Copy, don't reinvent.
2. **Zod first, implementation second** - Define input schema before writing logic.
3. **Use Drizzle Studio** (`pnpm db:studio`) - Visual DB inspection saves debugging time.
4. **Component composition** - Split into small reusable components. Use composition over props drilling.
5. **Type inference** - Let TypeScript & Zod infer types. Less explicit types = less duplication.
6. **Meaningful commit messages** - "feat: add post creation" beats "update router.ts".

---

## 🎯 When Starting a Session

**Say this to Claude Code**:

> Implement [feature] for [Week X].
> Reference: CLAUDE.md for setup, .claude/master-prompt.md for workflow, check packages/api/src/routers/[similar] for patterns.

**Claude will**:
1. Read CLAUDE.md (project structure + conventions)
2. Check similar code (copy patterns)
3. Write schema (Drizzle)
4. Write tRPC procedure (backend)
5. Write React component (frontend)
6. Verify types (`pnpm type-check`)
7. Commit to GitHub

---

## 📞 Quick Reference

| Need | Command |
|------|---------|
| Start dev | `pnpm dev` |
| Type check | `pnpm type-check` |
| Lint | `pnpm lint` |
| Push schema | `pnpm db:push` |
| View DB | `pnpm db:studio` |
| Build all | `pnpm build` |
| Deploy | `git push` (auto on Vercel) |

---

**Last Updated**: 2026-04-21  
**Phase**: MVP Phase 1 (Week 2+)  
**AI Dev Ready**: ✅ Claude Code + Codex
