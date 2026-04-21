# Company Community - Weekly Development Checklist

Use this to track progress across Weeks 2-6 (Phase 1 MVP).

---

## Week 2: Authentication + Profiles

**Goal**: Email auth, profile creation, persistent sessions

### Backend (packages/api/src/routers/)
- [ ] Create `auth.ts` router
  - [ ] `signup` mutation (email, password, display_name)
  - [ ] `login` mutation (email, password)
  - [ ] `logout` mutation
  - [ ] `getMe` query (current user profile)
  - [ ] `updateProfile` mutation (department, job_title, avatar)
  - [ ] Input: Zod schema for email, password (min 8 chars)
- [ ] Update `context.ts` to extract user from Supabase auth token
- [ ] Ensure `protectedProcedure` enforces auth

### Database (packages/db/)
- [ ] ✓ Schema already has `profiles` table
- [ ] ✓ Supabase Auth linked via `id UUID REFERENCES auth.users(id)`
- [ ] Run `pnpm db:push` to finalize RLS policies

### Frontend (apps/web/src/)
- [ ] Create `app/(auth)/login/page.tsx`
  - [ ] Email + password form
  - [ ] Error handling
  - [ ] Link to signup
- [ ] Create `app/(auth)/signup/page.tsx`
  - [ ] Email + password + display_name form
  - [ ] Verification email redirect
- [ ] Create `app/(main)/profile/[userId]/page.tsx`
  - [ ] Display profile (department, job_title, avatar)
  - [ ] Edit own profile form
- [ ] Update `app/layout.tsx` with auth guard
  - [ ] Redirect `/` → `/feed` if logged in
  - [ ] Redirect `/auth/*` → `/feed` if already logged in
- [ ] Persist session:
  - [ ] Store token in localStorage on login
  - [ ] Restore on page reload
  - [ ] Clear on logout

### Testing
- [ ] Signup → verify email → login → see profile
- [ ] Edit profile → verify update
- [ ] Logout → redirects to `/login`
- [ ] Refresh page → stays logged in
- [ ] Protected routes require auth

### Commit
```bash
git commit -m "feat: implement authentication + profiles (Week 2)

- Supabase Auth email verification
- Profile CRUD (Drizzle schema ready)
- Session persistence via JWT
- Auth-protected tRPC procedures
- Login/signup UI
"
```

---

## Week 3: Channels + Posts

**Goal**: Full CRUD for channels and posts, image upload

### Backend (packages/api/src/routers/)
- [ ] Create `channels.ts` router
  - [ ] `getList` query (paginated, no filter yet)
  - [ ] `getById` query
  - [ ] `create` mutation (name, description, slug)
  - [ ] `join` mutation
  - [ ] `leave` mutation
- [ ] Create `posts.ts` router (already started, expand)
  - [ ] `getFeed` query (channelId optional, sort: hot/new/top)
  - [ ] `getById` query
  - [ ] `create` mutation (content, title optional, isAnonymous toggle, mediaUrls)
  - [ ] `delete` mutation (owner only)
  - [ ] Handle anonymous: set `isAnonymous=true`, generate `anonAlias`

### Database (packages/db/)
- [ ] ✓ Schema has channels, posts, channel_members
- [ ] ✓ Supabase Storage ready for image uploads
- [ ] Verify RLS allows uploads

### Frontend (apps/web/src/)
- [ ] Create `app/(main)/layout.tsx` (main nav)
  - [ ] Sidebar: channel list (join/leave buttons)
  - [ ] Header: logout button, user profile link
- [ ] Create `app/(main)/feed/page.tsx`
  - [ ] Post list (infinite scroll using Intersection Observer)
  - [ ] Sort buttons (hot/new/top)
  - [ ] "Create post" button → modal
- [ ] Create `app/(main)/channels/page.tsx`
  - [ ] Channel directory
  - [ ] Join/leave buttons
  - [ ] Create channel form (admin?)
- [ ] Create `app/(main)/posts/[postId]/page.tsx`
  - [ ] Full post view
  - [ ] Comments section (empty for now)
  - [ ] Delete button (if owner)
- [ ] Create `components/PostCard.tsx`
  - [ ] Display title, content, author (or "익명")
  - [ ] Stats: upvotes, comments, views
  - [ ] Link to detail page
- [ ] Create `components/PostCreateModal.tsx`
  - [ ] Form: title (optional), content, channelId select
  - [ ] Toggle: isAnonymous checkbox
  - [ ] Image upload (multipart to Supabase Storage)
  - [ ] Submit creates post via tRPC
- [ ] Image upload:
  - [ ] Use `@supabase/supabase-js` `storage.from('posts').upload()`
  - [ ] Show preview before submit
  - [ ] Handle errors (file size, format)

### Testing
- [ ] Create post → appears in feed
- [ ] Create anonymous post → shows "익명" instead of name
- [ ] Upload image → preview shows, then posts with image
- [ ] Click post → go to detail page
- [ ] Delete own post → disappears from feed
- [ ] Join channel → appears in sidebar
- [ ] Leave channel → disappears from sidebar

### Commit
```bash
git commit -m "feat: add channels + posts CRUD with image upload (Week 3)

- Channels: list, create, join/leave
- Posts: full CRUD, infinite scroll feed
- Image upload to Supabase Storage
- Anonymous post support (anonymize author name)
- Post detail page
- Responsive UI with Tailwind
"
```

---

## Week 4: Votes + Comments

**Goal**: Interactive features (upvotes, downvotes, emoji reactions, hierarchical comments)

### Backend (packages/api/src/routers/)
- [ ] Create `votes.ts` router
  - [ ] `upvote` mutation (targetType: post|comment, targetId)
  - [ ] `downvote` mutation
  - [ ] `removeVote` mutation
  - [ ] Prevent duplicate votes (UNIQUE constraint)
  - [ ] Update post/comment vote counts
- [ ] Create `reactions.ts` router
  - [ ] `addReaction` mutation (emoji: like|heart|laugh|wow|sad|angry)
  - [ ] `removeReaction` mutation
- [ ] Create `comments.ts` router
  - [ ] `getList` query (postId, hierarchical tree)
  - [ ] `create` mutation (postId, content, parentId optional, isAnonymous toggle)
  - [ ] `delete` mutation (owner only)
  - [ ] Assign `anonNumber` for same-post anonymous consistency

### Database (packages/db/)
- [ ] ✓ Schema has votes, reactions, comments
- [ ] Verify UNIQUE constraints on votes
- [ ] Add trigger to update post.comment_count on comment insert/delete

### Frontend (apps/web/src/)
- [ ] Create `components/VoteButton.tsx`
  - [ ] Up/down arrow buttons
  - [ ] Show score
  - [ ] Highlight if user voted
  - [ ] Disable if not logged in
- [ ] Create `components/ReactionPicker.tsx`
  - [ ] 6 emoji buttons
  - [ ] Show reaction counts
  - [ ] Click to toggle
- [ ] Create `components/CommentTree.tsx`
  - [ ] Display hierarchical comments (depth 0, 1, 2)
  - [ ] Threading via indentation
  - [ ] Reply button → reply form
  - [ ] Vote buttons on each comment
- [ ] Update `PostCard.tsx` to show vote/reaction buttons
- [ ] Update `PostDetail` page
  - [ ] Comments section with tree view
  - [ ] "Add comment" form
  - [ ] Handle nested replies

### Testing
- [ ] Upvote post → score increases, highlight applied
- [ ] Downvote → score decreases
- [ ] Remove vote → reverts
- [ ] Add emoji reaction → appears on post
- [ ] Create comment → shows in tree
- [ ] Reply to comment → nested under parent
- [ ] Delete own comment → removed from tree
- [ ] Anonymous comment → shows "익명2" (consistent within post)

### Commit
```bash
git commit -m "feat: implement votes, reactions, hierarchical comments (Week 4)

- Upvote/downvote on posts & comments
- Emoji reactions (6 types)
- Hierarchical comments (2 levels: reply to post, reply to comment)
- Anonymous comment numbering consistency
- Vote/reaction UI with toggle state
"
```

---

## Week 5: Realtime + Notifications

**Goal**: Live comment updates, notification system

### Backend (packages/api/src/routers/)
- [ ] Create `notifications.ts` router
  - [ ] `getList` query (recipientId, unread filter)
  - [ ] `markAsRead` mutation
  - [ ] Trigger notification on: comment reply, vote, mention (@user)
- [ ] Database triggers (Supabase SQL)
  - [ ] On comment insert → create notification for post author
  - [ ] On vote insert → create notification for post/comment author
  - [ ] On comment with @mention → create notification for mentioned user

### Database (packages/db/)
- [ ] ✓ Schema has notifications table
- [ ] Add SQL triggers to `packages/db/migrations/`
  - [ ] Trigger: new comment → notify post author
  - [ ] Trigger: new upvote → notify target author
- [ ] Test triggers in Drizzle Studio

### Frontend (apps/web/src/)
- [ ] Create `components/NotificationBell.tsx`
  - [ ] Bell icon in header
  - [ ] Badge with unread count
  - [ ] Dropdown list of notifications
  - [ ] Mark as read on click
  - [ ] Link to post/comment
- [ ] Update `PostDetail` page with Supabase Realtime
  - [ ] Subscribe to new comments on `post:${postId}:comments` channel
  - [ ] New comment arrives → auto-add to tree (no refresh)
  - [ ] Unsubscribe on unmount
- [ ] Create `app/(main)/notifications/page.tsx` (full page list)

### Testing
- [ ] Create comment on your own post → get notification
- [ ] Someone upvotes your post → notification
- [ ] Real-time: open detail page in 2 browsers, comment in one → appears in other instantly
- [ ] Mark notification as read → gone from badge count
- [ ] Refresh page → notifications persisted

### Commit
```bash
git commit -m "feat: add realtime comments + notifications (Week 5)

- Supabase Realtime subscriptions for live comment stream
- Notification system (comment reply, vote, mention)
- DB triggers auto-create notifications
- Notification bell in header with unread count
- Full notifications page with filtering
"
```

---

## Week 6: Polish + Deploy

**Goal**: Sorting, search, report feature, performance, final QA

### Backend (packages/api/src/routers/)
- [ ] Enhance `posts.getFeed` query
  - [ ] `sort: 'hot'` → sort by hot_score (already in schema)
  - [ ] Hot score calculation: Wilson Score + time decay
  - [ ] Update hot_score hourly via Supabase pg_cron (or manual endpoint)
- [ ] Create `search.ts` router
  - [ ] `searchPosts` query (q: string, limit)
  - [ ] Simple ILIKE match on content + title
  - [ ] (Phase 2: pgvector for semantic search)
- [ ] Create `reports.ts` router
  - [ ] `createReport` mutation (targetType, targetId, reason, description)
  - [ ] `getReports` query (admin only)
  - [ ] `updateReportStatus` mutation (admin only)

### Frontend (apps/web/src/)
- [ ] Optimize images
  - [ ] Use Next.js `Image` component with lazy loading
  - [ ] Responsive srcSet
- [ ] Implement infinite scroll correctly
  - [ ] Intersection Observer on last item
  - [ ] Prevent double-fetch during scroll
- [ ] Add search
  - [ ] Search bar in header
  - [ ] Autocomplete as user types
  - [ ] Results page with filtering
- [ ] Add report feature
  - [ ] "Report" button on posts/comments
  - [ ] Modal: select reason, add description
  - [ ] Submit → confirmation
- [ ] Mobile responsiveness
  - [ ] Test on iPhone 12/14 widths (375px, 390px)
  - [ ] Sidebar → hamburger menu on mobile
  - [ ] Touch-friendly buttons (min 44px)
- [ ] Dark mode (optional, nice-to-have)
  - [ ] Toggle in settings
  - [ ] Persist to localStorage
  - [ ] Use Tailwind dark: prefix

### Testing
- [ ] Hot sorting: Create posts, upvote some, check hot order
- [ ] New sorting: Posts appear in creation order
- [ ] Top sorting: Most upvoted first
- [ ] Search: Type "react" → see related posts
- [ ] Report: Submit report → see confirmation
- [ ] Mobile: Test on Safari DevTools iPhone view
- [ ] Performance: Lighthouse score > 80

### Vercel Deployment
- [ ] Verify env vars in Vercel dashboard
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `DATABASE_URL`
- [ ] Run local build: `pnpm build` succeeds
- [ ] Push to `main` branch
- [ ] Vercel auto-deploys
- [ ] Test live: https://company-community.vercel.app

### Final QA Checklist
- [ ] Signup → email verification → login flow works
- [ ] Create profile, edit, verify update
- [ ] Create post (text + image), see in feed
- [ ] Upvote/downvote, emoji react
- [ ] Create comment, reply to comment
- [ ] See comment in real-time (2 browser tabs)
- [ ] Notification bell shows unread
- [ ] Search finds posts
- [ ] Report submits
- [ ] Anonymous posts show "익명"
- [ ] All forms have error messages
- [ ] No TypeScript errors: `pnpm type-check`
- [ ] No lint errors: `pnpm lint`
- [ ] Mobile responsive (375px+)
- [ ] Page loads under 3 seconds
- [ ] No 404s or console errors

### Commit & Deploy
```bash
git commit -m "feat: sorting, search, report, polish + deploy (Week 6)

- Hot/new/top post sorting with Wilson Score
- Post search with full-text match
- Report feature (spam, hate, inappropriate, other)
- Image lazy loading (Next.js Image component)
- Infinite scroll optimization
- Mobile responsive (Tailwind breakpoints)
- Performance: Lighthouse > 80
- Deployed to Vercel
- Phase 1 MVP complete
"
git push origin main
# Vercel auto-deploys
```

---

## Phase 2 Ready (after Week 6)

Once Phase 1 is complete:
- [ ] Set up Phase 2 roadmap
  - [ ] Palabrifollow system
  - [ ] Trust score calculations
  - [ ] DM system
  - [ ] Video uploads
  - [ ] Native mobile app (Expo)

---

## Weekly Status Template

**Use at end of each week**:

```markdown
## Week [X] Status

**Completed**:
- ✓ Auth + profiles
- ✓ ...

**In Progress**:
- Channel list page
- ...

**Blocked**:
- (none)

**Bugs Found**:
- Comment depth not rendering correctly
- ...

**Next Week Goals**:
- Finish channels
- Start posts
```

---

**Last Updated**: 2026-04-21  
**Track**: Copy/paste this file to a weekly status document in `.claude/status/week-X.md`
