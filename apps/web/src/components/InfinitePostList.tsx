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
}

const LIMIT = 20;

export function InfinitePostList({ channelId }: InfinitePostListProps) {
  const [sort, setSort] = useState<SortOption>('hot');
  const [offset, setOffset] = useState(0);
  const [allPosts, setAllPosts] = useState<FeedPost[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isFetching, refetch } = trpc.posts.getFeed.useQuery(
    { channelId, sort, limit: LIMIT, offset },
    { keepPreviousData: true }
  );

  useEffect(() => {
    if (data) {
      if (offset === 0) {
        setAllPosts(data.items);
      } else {
        setAllPosts((prev) => [...prev, ...data.items]);
      }
      setHasMore(data.hasMore);
    }
  }, [data, offset]);

  // Reset when sort or channel changes
  useEffect(() => {
    setOffset(0);
    setAllPosts([]);
    setHasMore(true);
  }, [sort, channelId]);

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      setOffset((prev) => prev + LIMIT);
    }
  }, [isFetching, hasMore]);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
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
    <div>
      {/* Sort buttons */}
      <div className="flex gap-2 mb-4">
        {(['hot', 'new', 'top'] as SortOption[]).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sort === s
                ? 'bg-blue-500 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s === 'hot' ? '🔥 인기' : s === 'new' ? '✨ 최신' : '⬆️ 상위'}
          </button>
        ))}
      </div>

      {/* Post list */}
      <div className="space-y-3">
        {allPosts.map((post) => (
          <PostCard key={post.id} post={post} onDeleted={handleDeleted} />
        ))}

        {isFetching && allPosts.length === 0 && (
          <>
            {Array.from({ length: 4 }).map((_, i) => <PostCardSkeleton key={i} />)}
          </>
        )}

        {isFetching && allPosts.length > 0 && (
          <div className="text-center py-4 text-sm text-slate-400">불러오는 중...</div>
        )}

        {!isFetching && allPosts.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg mb-1">아직 게시물이 없습니다</p>
            <p className="text-sm">첫 번째 게시물을 작성해보세요!</p>
          </div>
        )}

        {!hasMore && allPosts.length > 0 && (
          <div className="text-center py-4 text-xs text-slate-400">모든 게시물을 불러왔습니다</div>
        )}
      </div>

      <div ref={bottomRef} className="h-4" />
    </div>
  );
}
