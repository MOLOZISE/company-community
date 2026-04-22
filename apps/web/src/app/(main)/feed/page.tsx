'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { InfinitePostList } from '@/components/InfinitePostList';
import { PostCreateModal } from '@/components/PostCreateModal';
import { FlairChips } from '@/components/FlairChips';
import { CommunityStatsCard } from '@/components/CommunityStatsCard';
import { TrendingTopicsCard } from '@/components/TrendingTopicsCard';
import { ActiveChannelsCard } from '@/components/ActiveChannelsCard';
import { OnboardingCard } from '@/components/OnboardingCard';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth';

export default function FeedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const channelId = searchParams.get('channel') ?? undefined;
  const activeFlair = searchParams.get('flair') ?? undefined;
  const [showModal, setShowModal] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const { user } = useAuthStore();

  const { data: channelsData } = trpc.channels.getList.useQuery({ limit: 50, offset: 0 });
  const { data: myChannelIds, refetch: refetchMemberships } = trpc.channels.getMyMemberships.useQuery(undefined, {
    enabled: !!user,
  });
  const join = trpc.channels.join.useMutation({ onSuccess: () => refetchMemberships() });
  const leave = trpc.channels.leave.useMutation({ onSuccess: () => refetchMemberships() });

  const { data: communityStats } = trpc.trending.getCommunityStats.useQuery();
  const { data: trendingTopics } = trpc.trending.getTrendingTopics.useQuery();
  const { data: activeChannels } = trpc.trending.getActiveChannels.useQuery();

  const activeChannel = useMemo(
    () => channelsData?.items.find((channel) => channel.id === channelId),
    [channelsData?.items, channelId]
  );

  const isSpace = activeChannel?.type === 'space';
  const isMember = channelId ? myChannelIds?.includes(channelId) : false;

  function handleCreated() {
    setFeedKey((key) => key + 1);
  }

  function handleFlairChange(flair: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (flair) {
      params.set('flair', flair);
    } else {
      params.delete('flair');
    }
    const query = params.toString();
    router.push(query ? `/feed?${query}` : '/feed');
  }

  const sidebar = (
    <aside className="hidden xl:block xl:w-80 xl:shrink-0">
      <div className="sticky top-6 space-y-4">
        <CommunityStatsCard stats={communityStats} />
        <TrendingTopicsCard topics={trendingTopics} />
        <ActiveChannelsCard channels={activeChannels} />
      </div>
    </aside>
  );

  function FeedShell({ children }: { children: React.ReactNode }) {
    return (
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-6">
        <div className="min-w-0 space-y-5">{children}</div>
        {sidebar}
      </div>
    );
  }

  if (!activeChannel && !channelId) {
    return (
      <FeedShell>
        <OnboardingCard />

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">전체 피드</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">회사 커뮤니티 피드</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                지금 가장 많이 올라오는 글과 채널 활동을 한눈에 볼 수 있습니다.
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

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <FlairChips activeFlair={activeFlair} onChange={handleFlairChange} />
        </section>

        <InfinitePostList key={feedKey} flair={activeFlair} onStartPost={() => setShowModal(true)} />

        {showModal && <PostCreateModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
      </FeedShell>
    );
  }

  if (isSpace) {
    return (
      <FeedShell>
        <section className="rounded-lg border border-indigo-100 bg-indigo-50 p-5">
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

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <FlairChips activeFlair={activeFlair} onChange={handleFlairChange} />
        </section>

        <InfinitePostList
          key={feedKey}
          channelId={channelId}
          flair={activeFlair}
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
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              {activeChannel ? '게시판' : '전체 피드'}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              {activeChannel?.name ?? '회사 커뮤니티 피드'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {activeChannel?.description ?? '게시판별 최신 글을 확인할 수 있습니다.'}
            </p>
            {activeChannel && (
              <div className="mt-2 text-xs text-slate-400">
                {(activeChannel.memberCount ?? 0).toLocaleString()}명 · {(activeChannel.postCount ?? 0).toLocaleString()}
                개 글
              </div>
            )}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            글 작성
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <FlairChips activeFlair={activeFlair} onChange={handleFlairChange} />
      </section>

      <InfinitePostList
        key={feedKey}
        channelId={channelId}
        flair={activeFlair}
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
