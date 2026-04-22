import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext } from '@repo/api';

export const dynamic = 'force-dynamic';
const DATABASE_CONFIG_ERROR =
  'Database is not configured for this deployment. Please set DATABASE_URL.';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    responseMeta({ errors }) {
      if (errors.some((error) => error.message === DATABASE_CONFIG_ERROR)) {
        return {
          status: 503,
          headers: {
            'Retry-After': '300',
          },
        };
      }

      return {};
    },
  });

export { handler as GET, handler as POST };
