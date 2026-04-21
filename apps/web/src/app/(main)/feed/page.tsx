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
  const [initialContent, setInitialContent] = useState('');
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

  function openComposer(content = '') {
    setInitialContent(content);
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
              {activeChannel ? activeChannel.name : '오늘 회사에서 오가는 이야기'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {activeChannel?.description ??
                '익명 질문, 팀 밖의 정보, 가벼운 잡담까지 동료들의 흐름을 한곳에서 확인하세요.'}
            </p>
          </div>
          <button
            onClick={() => openComposer()}
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            새 글 작성
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <PromptCard title="질문하기" body="혼자 막힌 업무나 회사 생활 궁금증을 가볍게 물어보세요." onClick={() => openComposer('궁금한 점이 있어요. ')} />
          <PromptCard title="정보 공유" body="유용했던 도구, 문서, 루틴을 동료에게 알려주세요." onClick={() => openComposer('요즘 도움이 된 정보를 공유합니다. ')} />
          <PromptCard title="익명 고민" body="실명으로 말하기 어려운 주제도 안전하게 시작할 수 있습니다." onClick={() => openComposer('익명으로 의견을 듣고 싶어요. ')} />
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
          initialContent={initialContent}
        />
      )}
    </div>
  );
}

function PromptCard({
  title,
  body,
  onClick,
}: {
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg bg-slate-50 p-3 text-left ring-1 ring-slate-100 hover:bg-slate-100"
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{body}</p>
    </button>
  );
}
