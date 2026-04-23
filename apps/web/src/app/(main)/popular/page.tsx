'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth';
import { PostCard } from '@/components/PostCard';
import { PostCardSkeleton } from '@/components/Skeleton';

export default function PopularPage() {
  const { user } = useAuthStore();
  const { data: posts, isLoading } = trpc.trending.getFeaturedPosts.useQuery({ limit: 20 });

  const postIds = useMemo(() => posts?.map((post) => post.id) ?? [], [posts]);
  const { data: savedMap = {} as Record<string, boolean> } = trpc.saves.getIsSavedMap.useQuery(
    { postIds },
    { enabled: !!user && postIds.length > 0 }
  );

  return (
    <div className="space-y-5">
      <section className="rounded-[var(--cc-radius-card)] border border-slate-200 bg-white p-5 shadow-[var(--cc-shadow-soft)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Popular</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">오늘의 인기글</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          조회수 기준으로 인기글 큐에 올라온 게시글만 모아 보여줍니다. 원본 글은 그대로 유지되고, 홈과 이 페이지에서만
          빠르게 읽습니다.
        </p>
      </section>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} isSaved={savedMap[post.id] ?? false} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
          <p className="text-lg font-semibold text-slate-900">아직 인기글이 없어요</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            글이 1000회 이상 조회되면 이 목록에 자동으로 올라옵니다.
          </p>
          <Link href="/feed" className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            피드 보기
          </Link>
        </div>
      )}
    </div>
  );
}
