'use client';

import { useEffect, useRef, useState, useCallback, startTransition } from 'react';
import { trpc } from '@/lib/trpc';
import { PostCard } from './PostCard';
import { PostCardSkeleton } from './Skeleton';
import { useAuthStore } from '@/store/auth';
import type { AppRouter } from '@repo/api';
import type { inferRouterOutputs } from '@trpc/server';

type RouterOutput = inferRouterOutputs<AppRouter>;
type FeedPost = RouterOutput['posts']['getFeed']['items'][number];

interface InfinitePostListProps {
  channelId?: string;
  flair?: string;
  tag?: string;
  onStartPost?: (content?: string) => void;
}

const LIMIT = 10;
const MAX_OFFSET = 1000;
const STARTERS = [
  '요즘 본인 업무에서 가장 유용한 팁이 있나요?',
  '사무실 문화나 협업에서 재미있었던 순간을 공유해 주세요.',
  '입사 초반에 알았으면 좋았을 내용이 있다면?',
];

export function InfinitePostList({ channelId, flair, tag, onStartPost }: InfinitePostListProps) {
  const sort = 'hot' as const;
  const [offset, setOffset] = useState(0);
  const [allPosts, setAllPosts] = useState<FeedPost[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  const feedQuery = trpc.posts.getFeed.useQuery(
    { channelId, flair, sort, limit: LIMIT, offset },
    { keepPreviousData: true, retry: false, enabled: !tag }
  );
  const tagQuery = trpc.posts.getByTag.useQuery(
    { tag: tag ?? '', sort, limit: LIMIT, offset },
    { keepPreviousData: true, retry: false, enabled: !!tag }
  );
  const activeQuery = tag ? tagQuery : feedQuery;
  const { data, isFetching, isError, refetch } = activeQuery;

  const postIds = allPosts.map((post) => post.id);
  const { data: savedMap = {} as Record<string, boolean> } = trpc.saves.getIsSavedMap.useQuery(
    { postIds },
    { enabled: !!user && postIds.length > 0 }
  );

  useEffect(() => {
    if (isError) {
      setHasMore(false);
      return;
    }
    if (!data) return;
    startTransition(() => {
      if (offset === 0) {
        setAllPosts(data.items);
      } else {
        setAllPosts((prev) => [...prev, ...data.items]);
      }
      setHasMore(data.hasMore && offset + LIMIT < MAX_OFFSET);
    });
  }, [data, offset, isError]);

  useEffect(() => {
    setOffset(0);
    setAllPosts([]);
    setHasMore(true);
  }, [channelId, flair, tag]);

  const loadMore = useCallback(() => {
    if (!isFetching && !isError && hasMore && offset + LIMIT < MAX_OFFSET) {
      setOffset((prev) => prev + LIMIT);
    }
  }, [isFetching, isError, hasMore, offset]);

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

  const emptyLabel = tag
    ? `#${tag} 태그를 사용한 글이 아직 없어요`
    : '아직 조건에 맞는 글이 없어요';
  const emptyDescription = tag
    ? '다른 해시태그를 살펴보거나, 직접 새 글을 작성해 보세요.'
    : '조금 더 넓게 보거나 다른 채널에서 다시 찾아보세요.';

  return (
    <section className="space-y-4">
      <div className="space-y-3">
        {allPosts.map((post) => (
          <PostCard key={post.id} post={post} onDeleted={handleDeleted} isSaved={savedMap[post.id] ?? false} />
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
            <p className="text-lg font-semibold text-slate-900">{emptyLabel}</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{emptyDescription}</p>
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

        {isError && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-5 py-4 text-center">
            <p className="text-sm text-red-600">글을 불러오는 중 오류가 발생했습니다.</p>
            <button
              onClick={() => {
                setOffset(0);
                setAllPosts([]);
                setHasMore(true);
                refetch();
              }}
              className="mt-2 text-xs font-medium text-red-500 underline hover:text-red-700"
            >
              다시 시도
            </button>
          </div>
        )}

        {!isError && !hasMore && allPosts.length > 0 && (
          <div className="py-4 text-center text-xs text-slate-400">모든 글을 확인했어요</div>
        )}
      </div>

      <div ref={bottomRef} className="h-4" />
    </section>
  );
}
