'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { PostCard } from './PostCard';
import { PostCardSkeleton } from './Skeleton';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@repo/api';

type RouterOutput = inferRouterOutputs<AppRouter>;
type SavedPost = RouterOutput['saves']['getMySaves']['items'][number];

const LIMIT = 10;

export function SavedPostsTab() {
  const [offset, setOffset] = useState(0);
  const [allPosts, setAllPosts] = useState<SavedPost[]>([]);

  const { data: postsData, isFetching } = trpc.saves.getMySaves.useQuery(
    { limit: LIMIT, offset },
    {
      onSuccess: (data) => {
        if (offset === 0) {
          setAllPosts(data.items);
        } else {
          setAllPosts((prev) => [...prev, ...data.items]);
        }
      },
    }
  );

  function handleDeleted(id: string) {
    setAllPosts((prev) => prev.filter((post) => post.id !== id));
  }

  if (isFetching && allPosts.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (allPosts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-400">
        아직 저장한 글이 없어요. 카드의 저장 버튼을 눌러 모아보세요.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allPosts.map((post) => (
        <PostCard key={post.id} post={post} isSaved onDeleted={() => handleDeleted(post.id)} />
      ))}

      {postsData?.hasMore && (
        <button
          onClick={() => setOffset((current) => current + LIMIT)}
          disabled={isFetching}
          className="w-full rounded-xl border border-slate-200 py-2.5 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-50"
        >
          {isFetching ? '불러오는 중...' : '더 보기'}
        </button>
      )}
    </div>
  );
}
