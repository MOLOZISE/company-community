'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth';

const DISMISS_KEY = 'onboarding_dismissed';
const NEW_USER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function OnboardingCard() {
  const { user } = useAuthStore();
  const utils = trpc.useContext();
  const profileQuery = trpc.auth.getMe.useQuery(undefined, { enabled: !!user });
  const membershipsQuery = trpc.channels.getMyMemberships.useQuery(undefined, { enabled: !!user });
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [hiddenChannelIds, setHiddenChannelIds] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === 'true');
  }, []);

  const canShowInitially = useMemo(() => {
    if (dismissed !== false) return false;
    const profile = profileQuery.data;
    const memberships = membershipsQuery.data ?? [];
    return isNewUser(profile?.createdAt) && memberships.length === 0;
  }, [dismissed, membershipsQuery.data, profileQuery.data]);

  useEffect(() => {
    if (initialized) return;
    if (dismissed === null) return;
    if (profileQuery.isLoading || membershipsQuery.isLoading) return;

    setIsVisible(canShowInitially);
    setInitialized(true);
  }, [canShowInitially, dismissed, initialized, membershipsQuery.isLoading, profileQuery.isLoading]);

  const { data: recommended = [], refetch: refetchRecommended } = trpc.channels.getRecommended.useQuery(
    { limit: 3 },
    { enabled: isVisible }
  );

  const join = trpc.channels.join.useMutation({
    onMutate: (input) => {
      setHiddenChannelIds((current) => current.concat(input.channelId));
      return { channelId: input.channelId };
    },
    onSuccess: async () => {
      await Promise.all([
        utils.channels.getMyMemberships.invalidate(),
        utils.channels.getRecommended.invalidate(),
        membershipsQuery.refetch(),
        refetchRecommended(),
      ]);
    },
    onError: (_error, _input, context) => {
      setHiddenChannelIds((current) => current.filter((id) => id !== context?.channelId));
    },
  });

  const visibleRecommendations = useMemo(
    () => recommended.filter((channel) => !hiddenChannelIds.includes(channel.id)),
    [hiddenChannelIds, recommended]
  );

  if (!isVisible || dismissed === null) return null;
  if (visibleRecommendations.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-blue-100/70 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">Onboarding</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950">
            커뮤니티에서 바로 시작해 보세요
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            먼저 가입할 만한 채널을 골라 두었습니다. 관심 있는 곳부터 둘러보면 훨씬 빨리 적응할 수 있어요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem(DISMISS_KEY, 'true');
            setDismissed(true);
            setIsVisible(false);
          }}
          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
          aria-label="온보딩 닫기"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l10 10M15 5 5 15" />
          </svg>
        </button>
      </div>

      <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-3">
          <GuideStep
            number="1"
            title="관심 채널부터 가입"
            description="부서와 맞는 채널을 먼저 들어가면 필요한 소식이 더 빨리 눈에 들어옵니다."
          />
          <GuideStep
            number="2"
            title="첫 글은 가볍게"
            description="자기소개, 질문, 공유할 자료처럼 부담 없는 글로 시작해도 충분합니다."
          />
          <GuideStep
            number="3"
            title="반응을 확인"
            description="댓글과 투표, 저장 기능으로 다른 사람들의 반응을 살펴보면서 분위기를 익혀보세요."
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">추천 채널</p>
            <span className="text-xs text-slate-400">부서 맞춤</span>
          </div>

          <div className="space-y-2">
            {visibleRecommendations.map((channel) => (
              <article key={channel.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/boards/${channel.slug}`} className="block">
                      <h3 className="truncate text-sm font-semibold text-slate-950 hover:text-blue-600">
                        {channel.name}
                      </h3>
                    </Link>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {channel.description ?? '채널 소개가 아직 없어요.'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    {(channel.memberCount ?? 0).toLocaleString()}명
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <Link href={`/boards/${channel.slug}`} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                    둘러보기
                  </Link>
                  <button
                    type="button"
                    onClick={() => join.mutate({ channelId: channel.id })}
                    disabled={join.isPending}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    가입
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function GuideStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
        {number}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function isNewUser(createdAt: Date | string | null | undefined) {
  if (!createdAt) return false;
  const createdAtMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdAtMs)) return false;
  return Date.now() - createdAtMs <= NEW_USER_WINDOW_MS;
}
