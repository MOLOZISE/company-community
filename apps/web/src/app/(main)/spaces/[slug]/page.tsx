'use client';

import { useState } from 'react';
import { use } from 'react';
import { InfinitePostList } from '@/components/InfinitePostList';
import { PostCreateModal } from '@/components/PostCreateModal';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth';

const MEMBERSHIP_LABELS: Record<string, string> = {
  open: '자유 참여',
  request: '승인 후 참여',
  invite: '초대 전용',
};

export default function SpaceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [showModal, setShowModal] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const { user } = useAuthStore();

  const { data: channel, isLoading, error } = trpc.channels.getBySlug.useQuery({ slug });
  const { data: myChannelIds, refetch: refetchMemberships } = trpc.channels.getMyMemberships.useQuery(undefined, {
    enabled: !!user,
  });
  const join = trpc.channels.join.useMutation({ onSuccess: () => refetchMemberships() });
  const leave = trpc.channels.leave.useMutation({ onSuccess: () => refetchMemberships() });

  const isMember = channel ? myChannelIds?.includes(channel.id) : false;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-lg bg-indigo-50" />
        <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        공간을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-indigo-100 bg-indigo-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">공간</p>
              {channel.membershipType && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-600">
                  {MEMBERSHIP_LABELS[channel.membershipType] ?? channel.membershipType}
                </span>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{channel.name}</h1>
            {channel.description && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{channel.description}</p>
            )}
            <p className="mt-3 text-xs text-indigo-600">
              {(channel.memberCount ?? 0).toLocaleString()}명 참여 중 · {(channel.postCount ?? 0).toLocaleString()}개 글
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {isMember ? (
              <>
                <button
                  onClick={() => setShowModal(true)}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  새 글 작성
                </button>
                <button
                  onClick={() => channel && leave.mutate({ channelId: channel.id })}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  공간 나가기
                </button>
              </>
            ) : (
              <button
                onClick={() => channel && join.mutate({ channelId: channel.id })}
                disabled={join.isLoading}
                className="rounded-lg border border-indigo-400 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                {join.isLoading ? '참여 중...' : '참여하기'}
              </button>
            )}
          </div>
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
          onCreated={() => { setFeedKey((k) => k + 1); setShowModal(false); }}
          defaultChannelId={channel.id}
        />
      )}
    </div>
  );
}
