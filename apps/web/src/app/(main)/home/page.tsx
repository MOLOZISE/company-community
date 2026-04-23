'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth';
import { PostCard } from '@/components/PostCard';
import { PostCardSkeleton } from '@/components/Skeleton';
import { PostCreateModal } from '@/components/PostCreateModal';
import { normalizeBoardSection } from '@/lib/channel-groups';
import { BOARD_LIST_QUERY } from '@/lib/channel-directory';

export default function HomePage() {
  const { user } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const utils = trpc.useContext();

  useEffect(() => {
    setReady(true);
  }, []);

  const hotFeed = trpc.posts.getFeed.useQuery({ sort: 'hot', limit: 5, offset: 0 }, { enabled: ready });
  const boardsData = trpc.channels.getList.useQuery(BOARD_LIST_QUERY, { enabled: ready });

  const hotPostIds = useMemo(() => hotFeed.data?.items.map((post) => post.id) ?? [], [hotFeed.data?.items]);
  const { data: hotSavedMap = {} as Record<string, boolean> } = trpc.saves.getIsSavedMap.useQuery(
    { postIds: hotPostIds },
    { enabled: ready && !!user && hotPostIds.length > 0 }
  );

  const quickBoards = useMemo(() => {
    const items = boardsData.data?.items ?? [];
    return {
      announcement: items.find((b) => normalizeBoardSection(b.sidebarSection) === 'announcement'),
      anonymous: items.find((b) => normalizeBoardSection(b.sidebarSection) === 'anonymous'),
    };
  }, [boardsData.data]);

  const displayName =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (user as any)?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '회원';

  function handleCreated() {
    utils.posts.getFeed.invalidate();
    setShowModal(false);
  }

  const quickLinks = [
    {
      label: '모아보기',
      desc: '인기 게시판 보기',
      icon: '🔥',
      href: '/popular',
      accent: 'border-orange-100 bg-orange-50 hover:bg-orange-100 text-orange-700',
    },
    {
      label: '공지사항',
      desc: '회사 공지 확인',
      icon: '📌',
      href: quickBoards.announcement ? `/boards/${quickBoards.announcement.slug}` : '/boards?section=announcement',
      accent: 'border-blue-100 bg-blue-50 hover:bg-blue-100 text-blue-700',
    },
    {
      label: '익명게시판',
      desc: '익명으로 이야기하기',
      icon: '🕶️',
      href: quickBoards.anonymous ? `/boards/${quickBoards.anonymous.slug}` : '/boards?section=anonymous',
      accent: 'border-amber-100 bg-amber-50 hover:bg-amber-100 text-amber-700',
    },
    {
      label: '게시판 둘러보기',
      desc: '전체 게시판 확인',
      icon: '🗂️',
      href: '/boards',
      accent: 'border-emerald-100 bg-emerald-50 hover:bg-emerald-100 text-emerald-700',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">Company Community</p>
        <h1 className="mt-1 text-xl font-bold text-slate-950">
          {displayName}님, 오늘은 어떤 이야기를 볼까요?
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-slate-500">
          게시판, 공지, 익명 이야기, 인기 글을 한곳에서 빠르게 확인해보세요.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            익명으로 글쓰기
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
          >
            실명으로 글쓰기
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickLinks.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col gap-1.5 rounded-xl border p-4 transition-colors ${item.accent}`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-sm font-semibold">{item.label}</span>
            <span className="text-xs opacity-70">{item.desc}</span>
          </Link>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-950">🔥 핫한 글 5개</h2>
          <Link href="/popular" className="text-xs font-medium text-blue-600 hover:text-blue-700">
            더보기
          </Link>
        </div>

        {hotFeed.isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <PostCardSkeleton key={i} />)
        ) : (hotFeed.data?.items ?? []).length > 0 ? (
          (hotFeed.data?.items ?? []).map((post) => (
            <PostCard key={post.id} post={post} isSaved={hotSavedMap[post.id] ?? false} />
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
            아직 핫한 글이 없어요. 첫 번째 글을 작성해보세요!
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-950">게시판 둘러보기</h2>
          <Link href="/boards" className="text-xs font-medium text-blue-600 hover:text-blue-700">
            전체 보기
          </Link>
        </div>

        {boardsData.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(boardsData.data?.items ?? []).slice(0, 6).map((board) => (
              <Link
                key={board.id}
                href={`/boards/${board.slug}`}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <p className="truncate font-semibold text-slate-900">{board.name}</p>
                {board.description && (
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{board.description}</p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  {(board.postCount ?? 0).toLocaleString()}개 글
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {showModal && <PostCreateModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
    </div>
  );
}
