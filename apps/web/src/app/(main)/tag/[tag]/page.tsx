'use client';

import { use, useState, useMemo } from 'react';
import Link from 'next/link';
import { InfinitePostList } from '@/components/InfinitePostList';
import { PostCreateModal } from '@/components/PostCreateModal';

export default function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: rawTag } = use(params);
  const tag = useMemo(() => normalizeTag(rawTag), [rawTag]);
  const [showModal, setShowModal] = useState(false);
  const [listKey, setListKey] = useState(0);

  function handleCreated() {
    setListKey((key) => key + 1);
  }

  if (!tag) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-lg font-semibold text-slate-900">잘못된 태그예요</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">태그 이름을 확인하고 다시 시도해 주세요.</p>
        <Link href="/feed" className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          피드로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hashtag</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">#{tag}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              이 태그가 포함된 글을 모아봤어요. 태그를 눌러 비슷한 글들을 더 찾아볼 수 있어요.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/feed" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              전체 피드
            </Link>
            <button
              onClick={() => setShowModal(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              새 글 작성
            </button>
          </div>
        </div>
      </section>

      <InfinitePostList key={listKey} tag={tag} onStartPost={() => setShowModal(true)} />

      {showModal && <PostCreateModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
    </div>
  );
}

function normalizeTag(value: string) {
  return value.replace(/^#/, '').trim().toLowerCase();
}
