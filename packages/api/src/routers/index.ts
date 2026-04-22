import { router } from '../trpc.js';
import { postsRouter } from './posts.js';
import { authRouter } from './auth.js';
import { channelsRouter } from './channels.js';
import { commentsRouter } from './comments.js';
import { votesRouter } from './votes.js';
import { notificationsRouter } from './notifications.js';
import { reportsRouter } from './reports.js';
import { reactionsRouter } from './reactions.js';
import { trendingRouter } from './trending.js';
import { savesRouter } from './saves.js';
import { pollsRouter } from './polls.js';

export const appRouter = router({
  auth: authRouter,
  channels: channelsRouter,
  posts: postsRouter,
  comments: commentsRouter,
  votes: votesRouter,
  notifications: notificationsRouter,
  reports: reportsRouter,
  reactions: reactionsRouter,
  trending: trendingRouter,
  saves: savesRouter,
  polls: pollsRouter,
});

export type AppRouter = typeof appRouter;
