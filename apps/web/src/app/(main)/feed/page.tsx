'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { InfinitePostList } from '@/components/InfinitePostList';
import { PostCreateModal } from '@/components/PostCreateModal';
import { OnboardingCard } from '@/components/OnboardingCard';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth';
import { usePresence } from '@/hooks/usePresence';
import { CHANNEL_LIST_QUERY } from '@/lib/channel-directory';

export default function FeedPage() {
  const searchParams = useSearchParams();
  const channelId = searchParams.get('channel') ?? undefined;
  const [showModal, setShowModal] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const { user } = useAuthStore();

  const { data: channelsData } = trpc.channels.getList.useQuery(CHANNEL_LIST_QUERY, {
    enabled: !!channelId,
  });
  const { data: myChannelIds, refetch: refetchMemberships } = trpc.channels.getMyMemberships.useQuery(undefined, {
    enabled: !!user,
  });
  const join = trpc.channels.join.useMutation({ onSuccess: () => refetchMemberships() });
  const leave = trpc.channels.leave.useMutation({ onSuccess: () => refetchMemberships() });

  const activeChannel = useMemo(
    () => channelsData?.items.find((channel) => channel.id === channelId),
    [channelsData?.items, channelId]
  );

  const isSpace = activeChannel?.type === 'space';
  const isMember = channelId ? myChannelIds?.includes(channelId) : false;
  const presenceRoom = channelId ? `channel:${channelId}` : 'feed:global';
  const onlineUserIds = usePresence(user?.id, presenceRoom);
  const presenceLabel = activeChannel?.name ?? '전체 피드';

  function handleCreated() {
    setFeedKey((key) => key + 1);
  }

  function FeedShell({ children }: { children: React.ReactNode }) {
    return <div className="space-y-5">{children}</div>;
  }

  if (!activeChannel && !channelId) {
    return (
      <FeedShell>
        <OnboardingCard />

        <section className="rounded-[var(--cc-radius-card)] border border-slate-200 bg-white p-5 shadow-[var(--cc-shadow-soft)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">전체 보드</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">회사 커뮤니티 보드</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                지금 가장 많이 오가는 글과 채널을 한 화면에서 볼 수 있습니다.
              </p>
              <PresenceBadge label="지금 이 피드에" count={onlineUserIds.length} />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              글 작성
            </button>
          </div>
        </section>

        <InfinitePostList key={feedKey} onStartPost={() => setShowModal(true)} />

        {showModal && <PostCreateModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
      </FeedShell>
    );
  }

  if (isSpace) {
    return (
      <FeedShell>
        <section className="rounded-[var(--cc-radius-card)] border border-indigo-100 bg-indigo-50 p-5 shadow-[var(--cc-shadow-soft)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">공간</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                {activeChannel?.name ?? '공간'}
              </h1>
              {activeChannel?.description && (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{activeChannel.description}</p>
              )}
              <div className="mt-3 flex items-center gap-3 text-xs text-indigo-600">
                <span>{(activeChannel?.memberCount ?? 0).toLocaleString()}명 참여 중</span>
                <span>·</span>
                <span>{(activeChannel?.postCount ?? 0).toLocaleString()}개 글</span>
              </div>
              <PresenceBadge label={`지금 ${presenceLabel}에`} count={onlineUserIds.length} tone="indigo" />
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              {isMember ? (
                <>
                  <button
                    onClick={() => setShowModal(true)}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    글 작성
                  </button>
                  <button
                    onClick={() => channelId && leave.mutate({ channelId })}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    공간 나가기
                  </button>
                </>
              ) : (
                <button
                  onClick={() => channelId && join.mutate({ channelId })}
                  className="rounded-lg border border-indigo-400 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  참여하기
                </button>
              )}
            </div>
          </div>
        </section>

        <InfinitePostList
          key={feedKey}
          channelId={channelId}
          onStartPost={() => setShowModal(true)}
        />

        {showModal && (
          <PostCreateModal
            onClose={() => setShowModal(false)}
            onCreated={handleCreated}
            defaultChannelId={channelId}
          />
        )}
      </FeedShell>
    );
  }

  return (
    <FeedShell>
      <section className="rounded-[var(--cc-radius-card)] border border-slate-200 bg-white p-5 shadow-[var(--cc-shadow-soft)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              {activeChannel ? '게시판' : '전체 보드'}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              {activeChannel?.name ?? '회사 커뮤니티 보드'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {activeChannel?.description ?? '게시판별 글을 빠르게 확인할 수 있습니다.'}
            </p>
            {activeChannel && (
              <div className="mt-2 text-xs text-slate-400">
                {(activeChannel.memberCount ?? 0).toLocaleString()}명 · {(activeChannel.postCount ?? 0).toLocaleString()}
                개 글
              </div>
            )}
            <PresenceBadge label={`지금 ${presenceLabel}에`} count={onlineUserIds.length} />
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
        channelId={channelId}
        onStartPost={() => setShowModal(true)}
      />

      {showModal && (
        <PostCreateModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
          defaultChannelId={channelId}
        />
      )}
    </FeedShell>
  );
}

function PresenceBadge({
  label,
  count,
  tone = 'blue',
}: {
  label: string;
  count: number;
  tone?: 'blue' | 'indigo';
}) {
  const toneClasses =
    tone === 'indigo'
      ? 'border-indigo-200 bg-white text-indigo-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${toneClasses}`}>
      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]" />
      {label} {count.toLocaleString()}명
    </div>
  );
}
