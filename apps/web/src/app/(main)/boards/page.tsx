'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { PostCreateModal } from '@/components/PostCreateModal';
import {
  BOARD_SECTION_ORDER,
  BOARD_SECTION_TABS,
  type BoardSectionKey,
  getBoardSectionConfig,
  getBoardSectionHref,
  normalizeBoardSection,
} from '@/lib/channel-groups';

type BoardItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  memberCount: number | null;
  postCount: number | null;
  purpose?: string | null;
  defaultSort?: string | null;
  sidebarSection?: string | null;
};

const PURPOSE_LABELS: Record<string, string> = {
  discussion: '토론',
  knowledge: '지식',
  announcement: '공지',
  social: '소통',
};

const SORT_LABELS: Record<string, string> = {
  latest: '최근',
  hot: '인기',
  pinned: '고정',
};

export default function BoardsPage() {
  const [showModal, setShowModal] = useState(false);
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get('section');

  const { data: channelsData, isLoading } = trpc.channels.getHomeBoards.useQuery(undefined);
  const boards = (channelsData?.items ?? []) as BoardItem[];

  const activeSection = useMemo<'all' | BoardSectionKey>(() => {
    if (!sectionParam || sectionParam === 'all') return 'all';
    return normalizeBoardSection(sectionParam) ?? 'all';
  }, [sectionParam]);

  const sectionedBoards = useMemo(() => {
    return BOARD_SECTION_ORDER.reduce<Record<string, BoardItem[]>>((acc, section) => {
      acc[section.key] = boards.filter((board) => normalizeBoardSection(board.sidebarSection) === section.key);
      return acc;
    }, { all: boards });
  }, [boards]);

  const visibleBoards = activeSection === 'all' ? boards : sectionedBoards[activeSection] ?? [];
  const activeConfig = activeSection === 'all' ? null : getBoardSectionConfig(activeSection);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-700 px-6 py-6 text-white">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">Boards</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">게시판 전체</h1>
              <p className="mt-3 text-sm leading-6 text-white/75">
                주제별 게시판을 빠르게 훑고, 각 게시판에서 글을 확인해보세요.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-blue-50"
            >
              글 쓰기
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {BOARD_SECTION_TABS.map((tab) => {
              const active = tab.key === activeSection;
              const href = getBoardSectionHref(tab.key);
              const count =
                tab.key === 'all'
                  ? boards.length
                  : sectionedBoards[tab.key]?.length ?? 0;

              return (
                <Link
                  key={tab.key}
                  href={href}
                  prefetch={false}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          게시판 목록 불러오는 중...
        </div>
      ) : visibleBoards.length > 0 ? (
        <section className="space-y-4">
          {activeConfig && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">현재 보기</p>
                <h2 className="mt-1 text-base font-semibold text-slate-950">{activeConfig.label}</h2>
                <p className="mt-1 text-sm text-slate-500">{activeConfig.description}</p>
              </div>
              <Link
                href="/boards"
                prefetch={false}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                전체
              </Link>
            </div>
          )}

          <div className="grid gap-3">
            {visibleBoards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          아직 게시판이 없어요. 관리자에게 새 게시판 개설을 요청해보세요.
        </div>
      )}

      {showModal && <PostCreateModal onClose={() => setShowModal(false)} onCreated={() => setShowModal(false)} />}
    </div>
  );
}

function BoardCard({ board }: { board: BoardItem }) {
  const section = normalizeBoardSection(board.sidebarSection);
  const sectionConfig = section ? getBoardSectionConfig(section) : null;

  return (
    <Link
      href={`/boards/${board.slug}`}
      prefetch={false}
      className="group rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.02)] transition-transform duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {sectionConfig && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {sectionConfig.shortLabel}
              </span>
            )}
            {board.defaultSort && (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                {SORT_LABELS[board.defaultSort] ?? board.defaultSort}
              </span>
            )}
            {board.purpose && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                {PURPOSE_LABELS[board.purpose] ?? board.purpose}
              </span>
            )}
          </div>

          <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950 group-hover:text-blue-700">
            {board.name}
          </h3>

          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
            {board.description ?? sectionConfig?.description ?? '게시판 소개가 아직 없어요.'}
          </p>
        </div>

        <div className="flex shrink-0 flex-row gap-2 md:flex-col md:items-end md:gap-1">
          <StatChip label="글" value={board.postCount ?? 0} />
          <StatChip label="멤버" value={board.memberCount ?? 0} />
        </div>
      </div>
    </Link>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
      <span>{label}</span>
      <span className="font-semibold text-slate-900">{value.toLocaleString()}</span>
    </div>
  );
}
