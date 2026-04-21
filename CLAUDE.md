# Company Community Platform - Development Guide

## Project Overview

**실명/익명 기반 사내 게시판 플랫폼** - Blind, Reddit, Karrot을 벤치마킹한 커뮤니티 앱.

### Key Stack
- **Frontend**: Next.js 15 (App Router) + React 18 + Tailwind CSS v4
- **Backend**: tRPC v11 + Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **Auth**: Supabase Auth (email verification)
- **Monorepo**: Turborepo + pnpm workspaces
- **Deployment**: Vercel (web) + Expo EAS (mobile Phase 2)
- **AI Dev**: Claude Code + Codex (gstack)

## Project Structure

```
company-community/
├── apps/
│   ├── web/                    # Next.js 15 main app
│   └── mobile/                 # Expo (Phase 2)
├── packages/
│   ├── api/                    # tRPC routers + middleware
│   ├── db/                     # Drizzle ORM schema + migrations
│   ├── types/                  # Shared TypeScript types
│   ├── ui/                     # Shared UI components (Phase 2)
│   └── typescript-config/      # Shared TS configs
├── .claude/                    # Claude Code settings
├── CLAUDE.md                   # This file
├── package.json                # Root workspace config
├── pnpm-workspace.yaml         # Workspace definition
├── turbo.json                  # Turborepo config
└── .env.local                  # Local env vars (git-ignored)
```

## Development Workflow

### 1. Getting Started

```bash
# Terminal setup
cd company-community
pnpm install

# Environment
# Edit .env.local - ensure DATABASE_URL is set from Supabase

# Database (first time only)
pnpm db:push                   # Push schema to Supabase
pnpm db:studio                 # View DB in Drizzle Studio

# Start dev
pnpm dev                       # Starts all apps in parallel
# → Next.js: http://localhost:3000
# → Drizzle Studio: http://localhost:3001 (if running)
```

### 2. Code Organization Principles

**File Structure Per Feature**:
```
packages/api/src/routers/[feature]/
├── router.ts           # tRPC procedure definitions
├── queries.ts          # Read operations (optional)
├── mutations.ts        # Write operations (optional)
└── validation.ts       # Zod schemas

apps/web/src/
├── app/                # Next.js App Router pages
├── components/         # React components
├── lib/                # Utilities (trpc.ts, supabase.ts, etc.)
└── styles/             # CSS (globals only, use Tailwind inline)
```

**Naming Conventions**:
- Components: PascalCase (Button.tsx, UserCard.tsx)
- Functions: camelCase (fetchPosts, validateEmail)
- Constants: UPPER_SNAKE_CASE (API_URL, MAX_RETRIES)
- Types: PascalCase, prefixed with type (UserProfile, PostData)
- Zod schemas: camelCase ending with Schema (userSchema, postSchema)

### 3. Type Safety (Critical for AI Development)

Every tRPC procedure MUST have:
1. Input Zod schema
2. Output TypeScript type
3. JSDoc comment

**Example** (packages/api/src/routers/posts.ts):
```typescript
/**
 * Get paginated feed with filtering & sorting
 * @returns Posts with metadata (no author details for anon posts)
 */
getFeed: publicProcedure
  .input(
    z.object({
      channelId: z.string().optional(),
      sort: z.enum(['hot', 'new', 'top']),
      limit: z.number().min(1).max(50),
    })
  )
  .query(async ({ input }) => {
    // implementation
  }),
```

### 4. Authentication & Authorization

**Supabase Auth Flow**:
```
User signs up with email
  ↓
Supabase sends verification link
  ↓
User confirms email
  ↓
JWT token stored in browser localStorage
  ↓
All API calls include: Authorization: Bearer [token]
  ↓
tRPC context extracts userId from token
  ↓
protectedProcedure checks auth
```

**Key Files**:
- `packages/api/src/context.ts` - Auth context setup
- `packages/api/src/trpc.ts` - publicProcedure vs protectedProcedure
- `apps/web/src/lib/supabase.ts` - Client initialization

### 5. Database: Drizzle ORM

**Schema Rules**:
- All schemas in `packages/db/src/schema/index.ts`
- Automatic type inference → zero manual DTO typing
- Use Drizzle's relations for joins (Phase 2)

**Common Operations**:
```typescript
import { db, posts } from '@repo/db';
import { eq, desc } from 'drizzle-orm';

// Read
const allPosts = await db.select().from(posts);
const one = await db.query.posts.findFirst({
  where: eq(posts.id, id),
});

// Write
const created = await db.insert(posts).values({ ... }).returning();

// Update
await db.update(posts).set({ ... }).where(eq(posts.id, id));

// Delete
await db.delete(posts).where(eq(posts.id, id));
```

**Type Safety**:
Drizzle auto-generates types from schema → TypeScript catches DB errors at compile time.

### 6. tRPC Router Patterns

**File: packages/api/src/routers/[feature].ts**
```typescript
import { router, publicProcedure, protectedProcedure } from '../trpc';

export const featureRouter = router({
  // Public queries (no auth required)
  getList: publicProcedure
    .input(z.object({ ... }))
    .query(async ({ input }) => { ... }),

  // Protected mutations (auth required)
  create: protectedProcedure
    .input(z.object({ ... }))
    .mutation(async ({ input, ctx }) => {
      // ctx.userId is available, guaranteed
      // ctx.user has auth user object
      const result = await db.insert(...);
      return result;
    }),
});
```

**Register in packages/api/src/routers/index.ts**:
```typescript
export const appRouter = router({
  posts: postsRouter,
  comments: commentsRouter,
  channels: channelsRouter,
  // ... all routers
});
```

### 7. Frontend: Using tRPC

**Setup (apps/web/src/lib/trpc.ts)**: Already configured.

**In React Components**:
```typescript
'use client';
import { trpc } from '@/lib/trpc';

export function PostList() {
  const { data, isLoading } = trpc.posts.getFeed.useQuery({
    sort: 'hot',
    limit: 20,
  });

  const createPost = trpc.posts.create.useMutation();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {data?.items.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
      <button onClick={() => createPost.mutate({ ... })}>
        Create
      </button>
    </div>
  );
}
```

### 8. Realtime Features (Supabase)

**Supabase Realtime** (Phase 1, Week 5):
```typescript
// Subscribe to new comments on a post
const channel = supabase
  .channel(`post:${postId}:comments`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'comments',
    filter: `post_id=eq.${postId}`,
  }, (payload) => {
    // New comment arrived → update UI
    queryClient.setQueryData(['comments', postId], old => ({
      ...old,
      pages: addComment(old.pages, payload.new),
    }));
  })
  .subscribe();
```

### 9. Testing

**Unit Tests**: `src/**/*.test.ts`
```bash
pnpm test
```

**E2E Tests** (Phase 1, Week 6):
- Use Playwright to test full flows
- Test auth, post creation, voting, realtime updates

### 10. Deployment

**Vercel (Web)**:
```bash
# Automatic on push to main
# Env vars configured in Vercel dashboard
# Check: Settings → Environment Variables
```

**Database Migrations**:
```bash
# After schema changes:
pnpm db:push          # Push to Supabase
# Vercel will use updated DATABASE_URL
```

---

## Phase 1 MVP Checklist (6 weeks)

### Week 2: Auth + Profiles
- [ ] Supabase Auth signup/login UI
- [ ] Email verification flow
- [ ] Profile creation (department, job title)
- [ ] Anonymous mode toggle
- [ ] Session persistence (localStorage)

### Week 3: Channels + Posts
- [ ] Channel list page
- [ ] Post creation (text + image)
- [ ] Post list (infinite scroll)
- [ ] Post detail page
- [ ] Image upload to Supabase Storage

### Week 4: Votes + Comments
- [ ] Upvote/downvote
- [ ] Emoji reactions
- [ ] Hierarchical comments (2 levels)
- [ ] Comment upvotes

### Week 5: Realtime + Notifications
- [ ] Supabase Realtime comment stream
- [ ] Notification inbox
- [ ] Mark as read
- [ ] Notification types: comment, vote, mention

### Week 6: Polish + Deploy
- [ ] Hot/new/top sorting
- [ ] Basic search
- [ ] Report feature
- [ ] Mobile responsive (Tailwind)
- [ ] Performance: image lazy load, page cache
- [ ] QA + bug fixes
- [ ] Deploy to Vercel

---

## Common Issues & Solutions

### Issue: "DATABASE_URL not set"
**Solution**: Check `.env.local` has valid Supabase connection string.

### Issue: "tRPC type mismatch"
**Solution**: Ensure Zod schema in router matches return type.

### Issue: "Supabase auth not persisting"
**Solution**: Check localStorage has token. Verify Supabase client initialized with correct URL/key.

### Issue: "Drizzle schema sync error"
**Solution**: Run `pnpm db:push` to update Supabase schema.

---

## Git Workflow

**Branches**:
- `main` → production (Vercel auto-deploys)
- `feature/week-X-[description]` → development branch

**Commit Style**:
```
feat: Add post creation flow
fix: Resolve auth token expiry
refactor: Simplify comment nesting logic
```

**PR Process**:
1. Feature branch → PR
2. Claude Code review (via gstack `/review`)
3. Merge to main → Vercel deploy

---

## Tools & Commands Reference

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start all apps (Next.js + Drizzle Studio) |
| `pnpm build` | Build all packages for production |
| `pnpm type-check` | TypeScript verification |
| `pnpm lint` | ESLint check |
| `pnpm db:push` | Sync schema to Supabase |
| `pnpm db:studio` | Open Drizzle Studio UI |
| `pnpm format` | Format code (Prettier) |

---

## For Claude Code / Codex Sessions

**Quick Context**:
- This is a **Turborepo monorepo** with Next.js + tRPC + Drizzle
- **Type safety everywhere** - Zod schemas + TypeScript = zero runtime surprises
- **Auth via Supabase** - all requests have userId from JWT
- **Realtime via Supabase** - PostgreSQL triggers + WebSocket
- **Deploy: Vercel** - pnpm build → .next folder

**Typical AI Development Flow**:
1. Understand feature requirements (read this file + plan doc)
2. Check existing code patterns in same module
3. Write Zod schema first (type safety)
4. Write tRPC procedure (backend)
5. Write React component (frontend)
6. Test in browser

**Ask questions about**:
- DB schema changes → check `packages/db/src/schema/index.ts`
- Router logic → check `packages/api/src/routers/`
- Component patterns → check `apps/web/src/components/`
- Types → check `packages/types/src/index.ts`

---

## Additional Resources

- [Turborepo Docs](https://turbo.build/)
- [Next.js 15 App Router](https://nextjs.org/docs/app)
- [tRPC Docs](https://trpc.io/)
- [Drizzle ORM Guide](https://orm.drizzle.team/)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Last Updated**: 2026-04-21  
**Phase**: MVP (Phase 1)  
**AI Dev**: Claude Code + Codex via gstack
