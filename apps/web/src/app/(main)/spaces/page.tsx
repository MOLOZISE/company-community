'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { PostCreateModal } from '@/components/PostCreateModal';
import { useAuthStore } from '@/store/auth';
import { CHANNEL_LIST_QUERY } from '@/lib/channel-directory';

export default function SpacesPage() {
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuthStore();

  const { data: channelsData, isLoading } = trpc.channels.getList.useQuery(CHANNEL_LIST_QUERY);
  const { data: myChannelIds } = trpc.channels.getMyMemberships.useQuery(undefined, {
    enabled: !!user,
  });
  const join = trpc.channels.join.useMutation();

  const spaces = (channelsData?.items ?? []).filter((channel) => channel.type === 'space');
  const mySpaces = spaces.filter((s) => myChannelIds?.includes(s.id));
  const otherSpaces = spaces.filter((s) => !myChannelIds?.includes(s.id));

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">공간</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">내 공간</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              프로젝트, 스터디, TF — 목적 중심의 팀 공간에 참여하거나 글을 남겨보세요.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            새 글 작성
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          공간 목록 불러오는 중...
        </div>
      ) : (
        <>
          {mySpaces.length > 0 && (
            <SpaceGroup title="참여 중인 공간" spaces={mySpaces} joined />
          )}
          {otherSpaces.length > 0 && (
            <SpaceGroup
              title={mySpaces.length > 0 ? '참여 가능한 공간' : '전체 공간'}
              spaces={otherSpaces}
              joined={false}
              onJoin={(id) => join.mutate({ channelId: id })}
            />
          )}
          {spaces.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              아직 공간이 없습니다. 관리자에게 개설을 요청해 보세요.
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

type SpaceItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  memberCount: number | null;
  postCount: number | null;
  purpose?: string | null;
};

function SpaceGroup({
  title,
  spaces,
  joined,
  onJoin,
}: {
  title: string;
  spaces: SpaceItem[];
  joined: boolean;
  onJoin?: (id: string) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {spaces.map((space) => (
          <div key={space.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
            <Link href={`/spaces/${space.slug}`} className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">{space.name}</p>
              {space.description && (
                <p className="mt-0.5 truncate text-sm text-slate-500">{space.description}</p>
              )}
              <p className="mt-1 text-xs text-slate-400">
                {(space.memberCount ?? 0).toLocaleString()}명 · {(space.postCount ?? 0).toLocaleString()}개 글
              </p>
            </Link>
            {joined ? (
              <span className="ml-4 shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                참여 중
              </span>
            ) : (
              <button
                onClick={() => onJoin?.(space.id)}
                className="ml-4 shrink-0 rounded-full border border-indigo-300 px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
              >
                참여하기
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
