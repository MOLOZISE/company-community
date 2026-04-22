'use client';

import type { ReactNode } from 'react';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { Skeleton } from '@/components/Skeleton';
import { relativeTime } from '@/lib/time';
import { trpc } from '@/lib/trpc';

type Tab = 'posts' | 'channels' | 'users';

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = use(searchParams);
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q ?? '';
  const query = rawQuery.trim();
  const hasQuery = query.length > 0;
  const [tab, setTab] = useState<Tab>('posts');

  useEffect(() => {
    setTab('posts');
  }, [query]);

  const postsQuery = trpc.posts.search.useQuery({ q: query, limit: 10 }, { enabled: hasQuery });
  const channelsQuery = trpc.channels.search.useQuery({ q: query }, { enabled: hasQuery });
  const usersQuery = trpc.auth.search.useQuery({ q: query }, { enabled: hasQuery });

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'posts', label: 'Posts' },
    { key: 'channels', label: 'Channels' },
    { key: 'users', label: 'Users' },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Search</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
          {hasQuery ? `Search results for "${query}"` : 'Search something'}
        </h1>
        {!hasQuery && (
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Search posts, channels, and users from one place.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 sm:px-6">
          <div className="-mb-px flex gap-1 overflow-x-auto">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  tab === item.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {tab === 'posts' && (
            <ResultArea
              isLoading={postsQuery.isLoading || postsQuery.isFetching}
              isEmpty={!postsQuery.data?.length}
              errorMessage={postsQuery.error?.message}
              loadingFallback={<PostSkeletonList />}
              emptyLabel={hasQuery ? 'No results found.' : 'Type something to see post results.'}
            >
              <div className="space-y-3">
                {postsQuery.data?.map((post) => (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="block rounded-lg border border-slate-200 p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      {post.channelName && <span>#{post.channelName}</span>}
                      {post.createdAt && <span>{relativeTime(post.createdAt)}</span>}
                    </div>
                    {post.title && (
                      <h2 className="mt-1.5 text-base font-semibold text-slate-950">{post.title}</h2>
                    )}
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{post.content}</p>
                  </Link>
                ))}
              </div>
            </ResultArea>
          )}

          {tab === 'channels' && (
            <ResultArea
              isLoading={channelsQuery.isLoading || channelsQuery.isFetching}
              isEmpty={!channelsQuery.data?.length}
              errorMessage={channelsQuery.error?.message}
              loadingFallback={<ChannelSkeletonList />}
              emptyLabel={hasQuery ? 'No results found.' : 'Type something to see channel results.'}
            >
              <div className="space-y-3">
                {channelsQuery.data?.map((channel) => (
                  <Link
                    key={channel.id}
                    href={`/feed?channel=${channel.id}`}
                    className="block rounded-lg border border-slate-200 p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-slate-950">#{channel.name}</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-600 line-clamp-2">
                          {channel.description ?? 'No description'}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        Members {channel.memberCount}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </ResultArea>
          )}

          {tab === 'users' && (
            <ResultArea
              isLoading={usersQuery.isLoading || usersQuery.isFetching}
              isEmpty={!usersQuery.data?.length}
              errorMessage={usersQuery.error?.message}
              loadingFallback={<UserSkeletonList />}
              emptyLabel={hasQuery ? 'No results found.' : 'Type something to see user results.'}
            >
              <div className="space-y-3">
                {usersQuery.data?.map((user) => (
                  <Link
                    key={user.id}
                    href={`/users/${user.id}`}
                    className="block rounded-lg border border-slate-200 p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={user.avatarUrl} name={user.displayName} size="md" />
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-slate-950">{user.displayName}</h2>
                        <p className="mt-1 text-sm text-slate-600">
                          {user.department ?? 'No department'}
                          {user.jobTitle ? ` - ${user.jobTitle}` : ''}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </ResultArea>
          )}
        </div>
      </section>
    </div>
  );
}

function ResultArea({
  isLoading,
  isEmpty,
  errorMessage,
  loadingFallback,
  emptyLabel,
  children,
}: {
  isLoading: boolean;
  isEmpty: boolean;
  errorMessage?: string | null;
  loadingFallback: ReactNode;
  emptyLabel: string;
  children: ReactNode;
}) {
  if (isLoading) return loadingFallback;
  if (errorMessage) return <ErrorState label={errorMessage} />;
  if (isEmpty) return <EmptyState label={emptyLabel} />;
  return <>{children}</>;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8">
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

function ErrorState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 py-8">
      <p className="text-sm text-rose-700">{label || 'Something went wrong while searching.'}</p>
    </div>
  );
}

function PostSkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
          <Skeleton className="mt-3 h-5 w-2/3" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}

function ChannelSkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-1.5 h-3 w-5/6" />
            </div>
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function UserSkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-2 h-3 w-40" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
