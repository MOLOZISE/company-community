'use client';

import { use, useState, type ReactNode } from 'react';
import { InfinitePostList } from '@/components/InfinitePostList';
import { PostCreateModal } from '@/components/PostCreateModal';
import { trpc } from '@/lib/trpc';

const POSTING_MODE_LABELS: Record<string, string> = {
  real_only: '실명 전용',
  anonymous_allowed: '익명 허용',
  anonymous_only: '익명 전용',
};

export default function BoardDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [showModal, setShowModal] = useState(false);
  const [feedKey, setFeedKey] = useState(0);

  const { data: channel, isLoading, error } = trpc.channels.getBySlug.useQuery({ slug });

  function BoardShell({ children }: { children: ReactNode }) {
    return (
      <div className="min-w-0 space-y-5">{children}</div>
    );
  }

  if (isLoading) {
    return (
      <BoardShell>
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
        </div>
      </BoardShell>
    );
  }

  if (error || !channel) {
    return (
      <BoardShell>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          게시판을 찾을 수 없습니다.
        </div>
      </BoardShell>
    );
  }

  return (
    <BoardShell>
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">게시판</p>
              {channel.postingMode && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {POSTING_MODE_LABELS[channel.postingMode] ?? channel.postingMode}
                </span>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{channel.name}</h1>
            {channel.description && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{channel.description}</p>
            )}
            <p className="mt-2 text-xs text-slate-400">
              {(channel.memberCount ?? 0).toLocaleString()}명 · {(channel.postCount ?? 0).toLocaleString()}개 글
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            글 작성
          </button>
        </div>
      </section>

      <InfinitePostList
        key={feedKey}
        channelId={channel.id}
        onStartPost={() => setShowModal(true)}
      />

      {showModal && (
        <PostCreateModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setFeedKey((k) => k + 1);
            setShowModal(false);
          }}
          defaultChannelId={channel.id}
        />
      )}
    </BoardShell>
  );
}
