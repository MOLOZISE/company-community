'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { PostCard } from './PostCard';
import { PostCardSkeleton } from './Skeleton';
import type { AppRouter } from '@repo/api';
import type { inferRouterOutputs } from '@trpc/server';

type RouterOutput = inferRouterOutputs<AppRouter>;
type FeedPost = RouterOutput['posts']['getFeed']['items'][number];
type SortOption = 'hot' | 'new' | 'top';

interface InfinitePostListProps {
  channelId?: string;
  flair?: string;
  onStartPost?: (content?: string) => void;
}

const LIMIT = 20;

const SORT_LABELS: Record<SortOption, { label: string; hint: string }> = {
  hot: { label: '인기', hint: '반응이 빠르게 모이는 글' },
  new: { label: '최신', hint: '방금 올라온 이야기' },
  top: { label: '상위', hint: '추천을 많이 받은 글' },
};

const STARTERS = [
  '요즘 우리 회사에서 가장 궁금한 점이 있어요.',
  '업무 효율을 올리는 도구나 루틴을 공유해주세요.',
  '신입이나 이직자가 알면 좋은 팁이 있을까요?',
];

export function InfinitePostList({ channelId, flair, onStartPost }: InfinitePostListProps) {
  const [sort, setSort] = useState<SortOption>('hot');
  const [offset, setOffset] = useState(0);
  const [allPosts, setAllPosts] = useState<FeedPost[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isFetching, refetch } = trpc.posts.getFeed.useQuery(
    { channelId, flair, sort, limit: LIMIT, offset },
    { keepPreviousData: true }
  );

  useEffect(() => {
    if (!data) return;
    if (offset === 0) {
      setAllPosts(data.items);
    } else {
      setAllPosts((prev) => [...prev, ...data.items]);
    }
    setHasMore(data.hasMore);
  }, [data, offset]);

  useEffect(() => {
    setOffset(0);
    setAllPosts([]);
    setHasMore(true);
  }, [sort, channelId, flair]);

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      setOffset((prev) => prev + LIMIT);
    }
  }, [isFetching, hasMore]);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  function handleDeleted() {
    setOffset(0);
    setAllPosts([]);
    setHasMore(true);
    refetch();
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">피드 정렬</p>
          <p className="mt-1 text-sm text-slate-500">{SORT_LABELS[sort].hint}</p>
        </div>
        <div className="flex gap-2">
          {(['hot', 'new', 'top'] as SortOption[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition-colors ${
                sort === s
                  ? 'bg-blue-600 text-white ring-blue-600'
                  : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {SORT_LABELS[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {allPosts.map((post) => (
          <PostCard key={post.id} post={post} onDeleted={handleDeleted} />
        ))}

        {isFetching && allPosts.length === 0 && (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </>
        )}

        {isFetching && allPosts.length > 0 && (
          <div className="py-4 text-center text-sm text-slate-400">다음 글을 불러오는 중...</div>
        )}

        {!isFetching && allPosts.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
            <p className="text-lg font-semibold text-slate-900">아직 이 조건에 맞는 글이 없습니다</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              첫 글은 늘 조금 어렵습니다. 가벼운 질문이나 공유로 흐름을 열어보세요.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  onClick={() => onStartPost?.(starter)}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
                >
                  {starter}
                </button>
              ))}
            </div>
            <button
              onClick={() => onStartPost?.()}
              className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              새 글 작성하기
            </button>
          </div>
        )}

        {!hasMore && allPosts.length > 0 && (
          <div className="py-4 text-center text-xs text-slate-400">모든 글을 확인했습니다</div>
        )}
      </div>

      <div ref={bottomRef} className="h-4" />
    </section>
  );
}
