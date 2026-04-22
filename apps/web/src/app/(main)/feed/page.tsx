'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { InfinitePostList } from '@/components/InfinitePostList';
import { PostCreateModal } from '@/components/PostCreateModal';
import { FlairChips } from '@/components/FlairChips';
import { trpc } from '@/lib/trpc';

export default function FeedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const channelId = searchParams.get('channel') ?? undefined;
  const activeFlair = searchParams.get('flair') ?? undefined;
  const [showModal, setShowModal] = useState(false);
  const [feedKey, setFeedKey] = useState(0);

  const { data: channelsData } = trpc.channels.getList.useQuery({ limit: 50, offset: 0 });
  const activeChannel = useMemo(
    () => channelsData?.items.find((channel) => channel.id === channelId),
    [channelsData?.items, channelId]
  );

  function handleCreated() {
    setFeedKey((k) => k + 1);
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

  function openComposer() {
    setShowModal(true);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              {activeChannel ? `# ${activeChannel.name}` : '전체 피드'}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              {activeChannel ? activeChannel.name : '오늘의 이야기를 나눠봐요'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {activeChannel?.description ??
                '질문, 정보 공유, 가벼운 고민까지 회사 생활의 이야기를 자유롭게 올려보세요.'}
            </p>
          </div>
          <button
            onClick={openComposer}
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            새 글 작성
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
        onStartPost={openComposer}
      />

      {showModal && (
        <PostCreateModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
          defaultChannelId={channelId}
        />
      )}
    </div>
  );
}
