'use client';

import Link from 'next/link';

interface TrendingTopicsCardProps {
  topics?: Array<{ topic: string; count: number }> | null;
}

export function TrendingTopicsCard({ topics }: TrendingTopicsCardProps) {
  const items = topics ?? [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Trending Topics</p>
          <h2 className="mt-1 text-base font-semibold text-slate-950">요즘 뜨는 주제</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
          최근 24시간
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm leading-6 text-slate-500">
          아직 트렌딩 토픽이 없어요.
          <br />
          첫 이야기를 시작하면 여기에서 가장 먼저 올라옵니다.
        </div>
      ) : (
        <ol className="space-y-2">
          {items.map((item, index) => (
            <li key={item.topic}>
              <Link
                href={`/tag/${encodeURIComponent(item.topic.toLowerCase())}`}
                className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 transition-colors hover:border-sky-200 hover:bg-sky-50/60"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900 group-hover:text-sky-700">
                    #{item.topic}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">최근 반응이 많은 주제</span>
                </span>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-100">
                  {item.count.toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
