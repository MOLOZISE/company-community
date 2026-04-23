'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { PostCreateModal } from '@/components/PostCreateModal';
import { useAuthStore } from '@/store/auth';
import { CHANNEL_LIST_QUERY } from '@/lib/channel-directory';

export default function BoardsPage() {
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuthStore();

  const { data: channelsData, isLoading } = trpc.channels.getList.useQuery(CHANNEL_LIST_QUERY);
  const { data: myChannelIds } = trpc.channels.getMyMemberships.useQuery(undefined, {
    enabled: !!user,
  });

  const boards = (channelsData?.items ?? []).filter((channel) => channel.type === 'board');
  const myBoards = boards.filter((b) => myChannelIds?.includes(b.id));
  const otherBoards = boards.filter((b) => !myChannelIds?.includes(b.id));

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">게시판</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">커뮤니티 게시판</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              질문, 정보 공유, 업무 고민, 익명 제안까지 — 주제별 게시판을 골라 참여하세요.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            새 글 작성
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          게시판 목록 불러오는 중...
        </div>
      ) : (
        <>
          {myBoards.length > 0 && (
            <BoardGroup title="내 게시판" boards={myBoards} />
          )}
          {otherBoards.length > 0 && (
            <BoardGroup title={myBoards.length > 0 ? '다른 게시판' : '전체 게시판'} boards={otherBoards} />
          )}
          {boards.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              아직 게시판이 없습니다. 관리자에게 개설을 요청해 보세요.
            </div>
          )}
        </>
      )}

      {showModal && (
        <PostCreateModal
          onClose={() => setShowModal(false)}
          onCreated={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

type BoardItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  memberCount: number | null;
  postCount: number | null;
  purpose?: string | null;
};

function BoardGroup({ title, boards }: { title: string; boards: BoardItem[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {boards.map((board) => (
          <Link
            key={board.id}
            href={`/boards/${board.slug}`}
            className="flex items-center justify-between px-5 py-4 hover:bg-slate-50"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{board.name}</p>
              {board.description && (
                <p className="mt-0.5 truncate text-sm text-slate-500">{board.description}</p>
              )}
            </div>
            <div className="ml-4 shrink-0 text-right text-xs text-slate-400">
              <p>{(board.postCount ?? 0).toLocaleString()}개 글</p>
              <p>{(board.memberCount ?? 0).toLocaleString()}명</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
